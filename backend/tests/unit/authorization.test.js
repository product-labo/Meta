/**
 * Unit tests for authorization middleware
 * Tests ownership verification, admin checking, and resource access control
 */

import { pool } from '../../src/config/appConfig.js';
import {
  requireOwnership,
  requireAdmin,
  requireAccess,
  requireSelfOrAdmin
} from '../../src/middleware/authorization.js';
import { ForbiddenError, NotFoundError } from '../../src/errors/index.js';

describe('Authorization Middleware', () => {
  let testUser;
  let testAdmin;
  let testProject;
  let testWallet;

  beforeAll(async () => {
    // Create test users
    const userResult = await pool.query(
      'INSERT INTO users (name, email, password_hash, is_admin) VALUES ($1, $2, $3, $4) RETURNING *',
      ['Test User', 'test@example.com', 'hashed_password', false]
    );
    testUser = userResult.rows[0];

    const adminResult = await pool.query(
      'INSERT INTO users (name, email, password_hash, is_admin) VALUES ($1, $2, $3, $4) RETURNING *',
      ['Admin User', 'admin@example.com', 'hashed_password', true]
    );
    testAdmin = adminResult.rows[0];

    // Create test project
    const projectResult = await pool.query(
      'INSERT INTO projects (user_id, name, category) VALUES ($1, $2, $3) RETURNING *',
      [testUser.id, 'Test Project', 'defi']
    );
    testProject = projectResult.rows[0];

    // Create test wallet
    const walletResult = await pool.query(
      'INSERT INTO wallets (project_id, address, type, network) VALUES ($1, $2, $3, $4) RETURNING *',
      [testProject.id, 't1TestAddress123', 't', 'testnet']
    );
    testWallet = walletResult.rows[0];
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM wallets WHERE id = $1', [testWallet.id]);
    await pool.query('DELETE FROM projects WHERE id = $1', [testProject.id]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [testUser.id, testAdmin.id]);
    await pool.end();
  });

  describe('requireOwnership', () => {
    test('should allow owner to access their project', async () => {
      const req = {
        user: { id: testUser.id },
        params: { id: testProject.id }
      };
      const res = {};
      const next = jest.fn();

      const middleware = requireOwnership('project');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(next).not.toHaveBeenCalledWith(expect.any(Error));
    });

    test('should deny non-owner access to project', async () => {
      const req = {
        user: { id: testAdmin.id },
        params: { id: testProject.id }
      };
      const res = {};
      const next = jest.fn();

      const middleware = requireOwnership('project');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    test('should return NotFoundError for non-existent project', async () => {
      const req = {
        user: { id: testUser.id },
        params: { id: '00000000-0000-0000-0000-000000000000' }
      };
      const res = {};
      const next = jest.fn();

      const middleware = requireOwnership('project');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });

    test('should allow owner to access wallet through project ownership', async () => {
      const req = {
        user: { id: testUser.id },
        params: { walletId: testWallet.id }
      };
      const res = {};
      const next = jest.fn();

      const middleware = requireOwnership('wallet', 'walletId');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(next).not.toHaveBeenCalledWith(expect.any(Error));
    });

    test('should deny access without authentication', async () => {
      const req = {
        user: null,
        params: { id: testProject.id }
      };
      const res = {};
      const next = jest.fn();

      const middleware = requireOwnership('project');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });
  });

  describe('requireAdmin', () => {
    test('should allow admin user to proceed', async () => {
      const req = {
        user: { id: testAdmin.id }
      };
      const res = {};
      const next = jest.fn();

      await requireAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(next).not.toHaveBeenCalledWith(expect.any(Error));
    });

    test('should deny non-admin user', async () => {
      const req = {
        user: { id: testUser.id }
      };
      const res = {};
      const next = jest.fn();

      await requireAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
      const error = next.mock.calls[0][0];
      expect(error.message).toContain('Admin privileges required');
    });

    test('should deny access without authentication', async () => {
      const req = {
        user: null
      };
      const res = {};
      const next = jest.fn();

      await requireAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });
  });

  describe('requireAccess', () => {
    test('should allow owner to access their resource', async () => {
      const req = {
        user: { id: testUser.id },
        params: { id: testProject.id }
      };
      const res = {};
      const next = jest.fn();

      const middleware = requireAccess('project');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(next).not.toHaveBeenCalledWith(expect.any(Error));
    });

    test('should allow admin to access any resource', async () => {
      const req = {
        user: { id: testAdmin.id },
        params: { id: testProject.id }
      };
      const res = {};
      const next = jest.fn();

      const middleware = requireAccess('project');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(next).not.toHaveBeenCalledWith(expect.any(Error));
      expect(req.isAdmin).toBe(true);
    });

    test('should deny non-owner non-admin access', async () => {
      // Create another user
      const otherUserResult = await pool.query(
        'INSERT INTO users (name, email, password_hash, is_admin) VALUES ($1, $2, $3, $4) RETURNING *',
        ['Other User', 'other@example.com', 'hashed_password', false]
      );
      const otherUser = otherUserResult.rows[0];

      const req = {
        user: { id: otherUser.id },
        params: { id: testProject.id }
      };
      const res = {};
      const next = jest.fn();

      const middleware = requireAccess('project');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));

      // Clean up
      await pool.query('DELETE FROM users WHERE id = $1', [otherUser.id]);
    });
  });

  describe('requireSelfOrAdmin', () => {
    test('should allow user to access their own data', async () => {
      const req = {
        user: { id: testUser.id },
        params: { userId: testUser.id }
      };
      const res = {};
      const next = jest.fn();

      const middleware = requireSelfOrAdmin('params', 'userId');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(next).not.toHaveBeenCalledWith(expect.any(Error));
    });

    test('should allow admin to access any user data', async () => {
      const req = {
        user: { id: testAdmin.id },
        params: { userId: testUser.id }
      };
      const res = {};
      const next = jest.fn();

      const middleware = requireSelfOrAdmin('params', 'userId');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(next).not.toHaveBeenCalledWith(expect.any(Error));
      expect(req.isAdmin).toBe(true);
    });

    test('should deny user from accessing other user data', async () => {
      const req = {
        user: { id: testUser.id },
        params: { userId: testAdmin.id }
      };
      const res = {};
      const next = jest.fn();

      const middleware = requireSelfOrAdmin('params', 'userId');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
      const error = next.mock.calls[0][0];
      expect(error.message).toContain('You can only access your own data');
    });

    test('should work with body location', async () => {
      const req = {
        user: { id: testUser.id },
        body: { userId: testUser.id },
        params: {}
      };
      const res = {};
      const next = jest.fn();

      const middleware = requireSelfOrAdmin('body', 'userId');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(next).not.toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
