/**
 * Property-based tests for authorization middleware
 * Feature: fullstack-integration
 * 
 * Tests universal properties that should hold across all authorization scenarios
 */

import fc from 'fast-check';
import { pool } from '../../src/config/appConfig.js';
import {
  requireOwnership,
  requireAdmin,
  requireAccess,
  requireSelfOrAdmin
} from '../../src/middleware/authorization.js';
import { ForbiddenError, NotFoundError } from '../../src/errors/index.js';

describe('Authorization Properties', () => {
  let testUsers = [];
  let testProjects = [];

  beforeAll(async () => {
    // Create a pool of test users (some admin, some not)
    for (let i = 0; i < 5; i++) {
      const isAdmin = i < 2; // First 2 are admins
      const result = await pool.query(
        'INSERT INTO users (name, email, password_hash, is_admin) VALUES ($1, $2, $3, $4) RETURNING *',
        [`User ${i}`, `user${i}@test.com`, 'hashed_password', isAdmin]
      );
      testUsers.push(result.rows[0]);
    }

    // Create projects for each user
    for (const user of testUsers) {
      const result = await pool.query(
        'INSERT INTO projects (user_id, name, category) VALUES ($1, $2, $3) RETURNING *',
        [user.id, `Project for ${user.name}`, 'defi']
      );
      testProjects.push(result.rows[0]);
    }
  });

  afterAll(async () => {
    // Clean up
    await pool.query('DELETE FROM projects WHERE user_id = ANY($1)', [testUsers.map(u => u.id)]);
    await pool.query('DELETE FROM users WHERE id = ANY($1)', [testUsers.map(u => u.id)]);
    await pool.end();
  });

  // Feature: fullstack-integration, Property 63: Invalid token rejection
  // Validates: Requirements 15.2
  test('Property 63: For any request without authentication, authorization should fail', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...testProjects.map(p => p.id)),
        async (projectId) => {
          const req = {
            user: null, // No authentication
            params: { id: projectId }
          };
          const res = {};
          const next = jest.fn();

          const middleware = requireOwnership('project');
          await middleware(req, res, next);

          // Should always call next with an error
          expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: fullstack-integration, Property 64: Cross-user access prevention
  // Validates: Requirements 15.3
  test('Property 64: For any user and any project they do not own, access should be denied', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: testUsers.length - 1 }),
        fc.integer({ min: 0, max: testProjects.length - 1 }),
        async (userIndex, projectIndex) => {
          const user = testUsers[userIndex];
          const project = testProjects[projectIndex];

          // Skip if user owns the project or is admin
          if (project.user_id === user.id || user.is_admin) {
            return true;
          }

          const req = {
            user: { id: user.id },
            params: { id: project.id }
          };
          const res = {};
          const next = jest.fn();

          const middleware = requireOwnership('project');
          await middleware(req, res, next);

          // Should always deny access
          expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: fullstack-integration, Property 65: Authorized data access
  // Validates: Requirements 15.4
  test('Property 65: For any user accessing their own project, access should be granted', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: testUsers.length - 1 }),
        async (userIndex) => {
          const user = testUsers[userIndex];
          const project = testProjects[userIndex]; // User's own project

          const req = {
            user: { id: user.id },
            params: { id: project.id }
          };
          const res = {};
          const next = jest.fn();

          const middleware = requireOwnership('project');
          await middleware(req, res, next);

          // Should always grant access
          expect(next).toHaveBeenCalledWith();
          expect(next).not.toHaveBeenCalledWith(expect.any(Error));
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: fullstack-integration, Property 66: Admin permission verification
  // Validates: Requirements 15.5
  test('Property 66: For any admin user, admin endpoints should be accessible', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...testUsers.filter(u => u.is_admin)),
        async (adminUser) => {
          const req = {
            user: { id: adminUser.id }
          };
          const res = {};
          const next = jest.fn();

          await requireAdmin(req, res, next);

          // Should always grant access
          expect(next).toHaveBeenCalledWith();
          expect(next).not.toHaveBeenCalledWith(expect.any(Error));
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 66 (inverse): For any non-admin user, admin endpoints should be denied', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...testUsers.filter(u => !u.is_admin)),
        async (regularUser) => {
          const req = {
            user: { id: regularUser.id }
          };
          const res = {};
          const next = jest.fn();

          await requireAdmin(req, res, next);

          // Should always deny access
          expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property: Admin users can access any resource via requireAccess', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...testUsers.filter(u => u.is_admin)),
        fc.constantFrom(...testProjects),
        async (adminUser, project) => {
          const req = {
            user: { id: adminUser.id },
            params: { id: project.id }
          };
          const res = {};
          const next = jest.fn();

          const middleware = requireAccess('project');
          await middleware(req, res, next);

          // Admin should always have access
          expect(next).toHaveBeenCalledWith();
          expect(next).not.toHaveBeenCalledWith(expect.any(Error));
          expect(req.isAdmin).toBe(true);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property: Non-existent resources always return NotFoundError', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...testUsers),
        fc.uuid(),
        async (user, fakeId) => {
          // Ensure the ID doesn't exist
          const exists = await pool.query('SELECT id FROM projects WHERE id = $1', [fakeId]);
          if (exists.rows.length > 0) {
            return true; // Skip this case
          }

          const req = {
            user: { id: user.id },
            params: { id: fakeId }
          };
          const res = {};
          const next = jest.fn();

          const middleware = requireOwnership('project');
          await middleware(req, res, next);

          // Should always return NotFoundError
          expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property: requireSelfOrAdmin allows users to access their own data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...testUsers),
        async (user) => {
          const req = {
            user: { id: user.id },
            params: { userId: user.id }
          };
          const res = {};
          const next = jest.fn();

          const middleware = requireSelfOrAdmin('params', 'userId');
          await middleware(req, res, next);

          // Should always grant access to own data
          expect(next).toHaveBeenCalledWith();
          expect(next).not.toHaveBeenCalledWith(expect.any(Error));
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property: requireSelfOrAdmin denies cross-user access for non-admins', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...testUsers.filter(u => !u.is_admin)),
        fc.constantFrom(...testUsers),
        async (user, targetUser) => {
          // Skip if same user
          if (user.id === targetUser.id) {
            return true;
          }

          const req = {
            user: { id: user.id },
            params: { userId: targetUser.id }
          };
          const res = {};
          const next = jest.fn();

          const middleware = requireSelfOrAdmin('params', 'userId');
          await middleware(req, res, next);

          // Should always deny access
          expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
