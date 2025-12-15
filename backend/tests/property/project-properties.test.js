/**
 * Property-based tests for project management
 * Feature: fullstack-integration
 * 
 * Tests universal properties that should hold across all project management scenarios
 */

import fc from 'fast-check';
import { pool } from '../../src/config/appConfig.js';
import { createProject } from '../../src/models/project.js';
import bcrypt from 'bcryptjs';

describe('Project Management Properties', () => {
  // Track test data for cleanup
  const testUserIds = [];
  const testProjectIds = [];

  afterAll(async () => {
    // Clean up test data in reverse order of dependencies
    try {
      if (testProjectIds.length > 0) {
        await pool.query('DELETE FROM projects WHERE id = ANY($1)', [testProjectIds]);
      }
      if (testUserIds.length > 0) {
        await pool.query('DELETE FROM users WHERE id = ANY($1)', [testUserIds]);
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
    
    // Close the pool connection
    try {
      await pool.end();
    } catch (error) {
      console.error('Pool end error:', error);
    }
  });

  // Helper function to create a test user
  async function createTestUser() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const email = `test-project-${timestamp}-${random}@example.com`;
    const password = 'TestPassword123!';
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [`Test User ${random}`, email, passwordHash]
    );

    const user = result.rows[0];
    testUserIds.push(user.id);
    return user;
  }

  // Arbitraries for generating test data
  const projectCategoryArb = fc.constantFrom(
    'defi', 'social_fi', 'gamefi', 'nft', 'infrastructure', 
    'governance', 'cefi', 'metaverse', 'dao', 'identity', 
    'storage', 'ai_ml', 'other'
  );

  const projectStatusArb = fc.constantFrom(
    'draft', 'active', 'paused', 'completed', 'cancelled'
  );

  // Generate valid URLs (validator.isURL requires proper domain names)
  const websiteUrlArb = fc.option(
    fc.constantFrom(
      'https://example.com',
      'https://myproject.io',
      'https://web3project.org',
      'https://test-project.dev',
      'https://boardling.app',
      'https://zcash.com'
    ),
    { nil: null }
  );

  const githubUrlArb = fc.option(
    fc.constantFrom(
      'https://github.com/zcash/zcash',
      'https://github.com/bitcoin/bitcoin',
      'https://github.com/ethereum/go-ethereum',
      'https://github.com/test-user/test-repo',
      'https://github.com/example/example-project'
    ),
    { nil: null }
  );

  const logoUrlArb = fc.option(
    fc.constantFrom(
      'https://example.com/logo.png',
      'https://cdn.example.com/images/logo.svg',
      'https://myproject.io/assets/logo.jpg'
    ),
    { nil: null }
  );

  const tagsArb = fc.option(
    fc.array(
      fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
      { minLength: 0, maxLength: 5 }
    ),
    { nil: [] }
  );

  // Feature: fullstack-integration, Property 10: Project creation stores all fields
  // Validates: Requirements 4.1
  test('Property 10: For any valid project data, creating a project should store all provided fields in the projects table', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          description: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
          category: projectCategoryArb,
          website_url: websiteUrlArb,
          github_url: githubUrlArb,
          logo_url: logoUrlArb,
          tags: tagsArb
        }),
        async (projectData) => {
          // Create a test user
          const user = await createTestUser();

          // Create the project
          const project = await createProject({
            user_id: user.id,
            name: projectData.name,
            description: projectData.description,
            category: projectData.category,
            website_url: projectData.website_url,
            github_url: projectData.github_url,
            logo_url: projectData.logo_url,
            tags: projectData.tags || []
          });

          // Track created project for cleanup
          testProjectIds.push(project.id);

          // Property 1: Project should be created successfully
          expect(project).toBeDefined();
          expect(project.id).toBeDefined();

          // Property 2: Project should be linked to the correct user
          expect(project.user_id).toBe(user.id);

          // Property 3: Name should be stored correctly
          expect(project.name).toBe(projectData.name);

          // Property 4: Description should be stored correctly (or as null/empty string)
          if (projectData.description !== null && projectData.description !== undefined && projectData.description !== '') {
            expect(project.description).toBe(projectData.description);
          } else {
            // Empty strings may be stored as empty strings or null depending on implementation
            expect([null, '']).toContain(project.description);
          }

          // Property 5: Category should be stored correctly
          expect(project.category).toBe(projectData.category);

          // Property 6: Website URL should be stored correctly (or as null)
          if (projectData.website_url !== null && projectData.website_url !== undefined) {
            expect(project.website_url).toBe(projectData.website_url);
          } else {
            expect(project.website_url).toBeNull();
          }

          // Property 7: GitHub URL should be stored correctly (or as null)
          if (projectData.github_url !== null && projectData.github_url !== undefined) {
            expect(project.github_url).toBe(projectData.github_url);
          } else {
            expect(project.github_url).toBeNull();
          }

          // Property 8: Logo URL should be stored correctly (or as null)
          if (projectData.logo_url !== null && projectData.logo_url !== undefined) {
            expect(project.logo_url).toBe(projectData.logo_url);
          } else {
            expect(project.logo_url).toBeNull();
          }

          // Property 9: Tags should be stored correctly (or as empty array)
          if (projectData.tags && projectData.tags.length > 0) {
            expect(project.tags).toEqual(projectData.tags);
          } else {
            expect(project.tags).toEqual([]);
          }

          // Property 10: Default status should be 'draft'
          expect(project.status).toBe('draft');

          // Property 11: Timestamps should be set
          expect(project.created_at).toBeDefined();
          expect(project.updated_at).toBeDefined();

          // Property 12: launched_at should be null for new projects
          expect(project.launched_at).toBeNull();

          // Property 13: Verify data persists in database
          const dbResult = await pool.query(
            'SELECT * FROM projects WHERE id = $1',
            [project.id]
          );

          expect(dbResult.rows.length).toBe(1);
          const dbProject = dbResult.rows[0];

          // Property 14: All fields should match in database
          expect(dbProject.id).toBe(project.id);
          expect(dbProject.user_id).toBe(user.id);
          expect(dbProject.name).toBe(projectData.name);
          expect(dbProject.category).toBe(projectData.category);
          expect(dbProject.status).toBe('draft');

          // Property 15: Optional fields should match in database
          if (projectData.description !== null && projectData.description !== undefined && projectData.description !== '') {
            expect(dbProject.description).toBe(projectData.description);
          }
          if (projectData.website_url !== null && projectData.website_url !== undefined) {
            expect(dbProject.website_url).toBe(projectData.website_url);
          }
          if (projectData.github_url !== null && projectData.github_url !== undefined) {
            expect(dbProject.github_url).toBe(projectData.github_url);
          }
          if (projectData.logo_url !== null && projectData.logo_url !== undefined) {
            expect(dbProject.logo_url).toBe(projectData.logo_url);
          }
          if (projectData.tags && projectData.tags.length > 0) {
            expect(dbProject.tags).toEqual(projectData.tags);
          }

          return true;
        }
      ),
      { numRuns: 20 } // Test with 20 different project configurations
    );
  }, 120000); // 120 second timeout for this property test

  // Additional property: Verify required fields are enforced
  test('Property: For any project, name and user_id are required fields', async () => {
    const user = await createTestUser();

    // Test missing name
    await expect(
      createProject({
        user_id: user.id,
        category: 'defi'
      })
    ).rejects.toThrow();

    // Test missing user_id
    await expect(
      createProject({
        name: 'Test Project',
        category: 'defi'
      })
    ).rejects.toThrow();
  }, 30000);

  // Additional property: Verify category is required (model level)
  test('Property: For any project, category is a required field at the model level', async () => {
    const user = await createTestUser();

    // Test missing category - should fail at model level
    await expect(
      createProject({
        user_id: user.id,
        name: 'Test Project'
        // No category provided
      })
    ).rejects.toThrow(/category/i);
  }, 30000);

  // Additional property: Verify URL validation
  test('Property: For any project with invalid URLs, creation should fail', async () => {
    const user = await createTestUser();

    // Test invalid website URL
    await expect(
      createProject({
        user_id: user.id,
        name: 'Test Project',
        category: 'defi',
        website_url: 'not-a-valid-url'
      })
    ).rejects.toThrow(/invalid.*url/i);

    // Test invalid GitHub URL
    await expect(
      createProject({
        user_id: user.id,
        name: 'Test Project',
        category: 'defi',
        github_url: 'not-a-valid-url'
      })
    ).rejects.toThrow(/invalid.*url/i);

    // Test invalid logo URL
    await expect(
      createProject({
        user_id: user.id,
        name: 'Test Project',
        category: 'defi',
        logo_url: 'not-a-valid-url'
      })
    ).rejects.toThrow(/invalid.*url/i);
  }, 30000);

  // Additional property: Verify multiple projects can be created for the same user
  test('Property: For any user, multiple projects can be created and stored independently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            category: projectCategoryArb
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (projectsData) => {
          const user = await createTestUser();
          const createdProjects = [];

          // Create all projects
          for (const projectData of projectsData) {
            const project = await createProject({
              user_id: user.id,
              name: projectData.name,
              category: projectData.category
            });
            createdProjects.push(project);
            testProjectIds.push(project.id);
          }

          // Property 1: All projects should be created
          expect(createdProjects.length).toBe(projectsData.length);

          // Property 2: All projects should have unique IDs
          const projectIds = createdProjects.map(p => p.id);
          const uniqueIds = new Set(projectIds);
          expect(uniqueIds.size).toBe(projectIds.length);

          // Property 3: All projects should belong to the same user
          for (const project of createdProjects) {
            expect(project.user_id).toBe(user.id);
          }

          // Property 4: All projects should exist in database
          const dbResult = await pool.query(
            'SELECT * FROM projects WHERE user_id = $1',
            [user.id]
          );
          expect(dbResult.rows.length).toBe(projectsData.length);

          return true;
        }
      ),
      { numRuns: 10 }
    );
  }, 60000);

  // Additional property: Verify tags are stored as arrays
  test('Property: For any project with tags, tags should be stored as an array', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          { minLength: 1, maxLength: 5 }
        ),
        async (tags) => {
          const user = await createTestUser();

          const project = await createProject({
            user_id: user.id,
            name: 'Test Project',
            category: 'defi',
            tags: tags
          });

          testProjectIds.push(project.id);

          // Property 1: Tags should be stored as array
          expect(Array.isArray(project.tags)).toBe(true);

          // Property 2: Tags should match input
          expect(project.tags).toEqual(tags);

          // Property 3: Tags should persist in database
          const dbResult = await pool.query(
            'SELECT tags FROM projects WHERE id = $1',
            [project.id]
          );
          expect(dbResult.rows[0].tags).toEqual(tags);

          return true;
        }
      ),
      { numRuns: 10 }
    );
  }, 60000);

  // Additional property: Verify timestamps are set correctly
  test('Property: For any project, created_at and updated_at should be set to current time', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        async (projectName) => {
          const user = await createTestUser();
          const beforeCreate = new Date();

          const project = await createProject({
            user_id: user.id,
            name: projectName,
            category: 'defi'
          });

          testProjectIds.push(project.id);
          const afterCreate = new Date();

          // Property 1: created_at should be between before and after timestamps
          const createdAt = new Date(project.created_at);
          expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime() - 1000); // 1 second tolerance
          expect(createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime() + 1000);

          // Property 2: updated_at should be between before and after timestamps
          const updatedAt = new Date(project.updated_at);
          expect(updatedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime() - 1000);
          expect(updatedAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime() + 1000);

          // Property 3: created_at and updated_at should be very close (within seconds)
          const timeDiff = Math.abs(updatedAt.getTime() - createdAt.getTime());
          expect(timeDiff).toBeLessThan(5000); // Within 5 seconds

          return true;
        }
      ),
      { numRuns: 10 }
    );
  }, 60000);
});
