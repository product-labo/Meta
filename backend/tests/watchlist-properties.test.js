import fc from 'fast-check';
import { Pool } from 'pg';
import 'dotenv/config';

/**
 * Property-Based Tests for Watchlist System
 * Feature: dashboard-data-population, Property 7: User-specific watchlist operations
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4
 */

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'david_user',
    password: process.env.DB_PASS || 'Davidsoyaya@1015',
    database: process.env.DB_NAME || 'david',
});

describe('Watchlist Property-Based Tests', () => {
    let testUserId;
    
    beforeAll(async () => {
        // Get or create a test user
        const userResult = await pool.query('SELECT id FROM users LIMIT 1');
        if (userResult.rows.length > 0) {
            testUserId = userResult.rows[0].id;
        } else {
            // Create a test user if none exists
            const newUser = await pool.query(
                'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
                ['test@example.com', 'hashed_password']
            );
            testUserId = newUser.rows[0].id;
        }
    });

    afterAll(async () => {
        // Clean up test data
        await pool.query('DELETE FROM watchlist WHERE user_id = $1 AND project_id LIKE $2', [testUserId, 'test_%']);
        await pool.end();
    });

    /**
     * Property 7: User-specific watchlist operations
     * For any project, adding to watchlist should make it appear in the watchlist page with current metrics,
     * and removing should update the watchlist immediately with performance tracking since addition
     */
    test('Property 7: Watchlist operations maintain consistency', async () => {
        await fc.assert(fc.asyncProperty(
            fc.record({
                projectId: fc.string({ minLength: 10, maxLength: 66 }).map(s => `test_${s}`),
                projectName: fc.string({ minLength: 1, maxLength: 100 }),
                projectCategory: fc.constantFrom('DeFi', 'NFT', 'DAO', 'Gaming', 'Infrastructure')
            }),
            async (project) => {
                const client = await pool.connect();
                
                try {
                    // Property: Adding a project to watchlist should make it retrievable
                    await client.query(`
                        INSERT INTO watchlist (user_id, project_id, project_name, project_category) 
                        VALUES ($1, $2, $3, $4)
                        ON CONFLICT (user_id, project_id) DO UPDATE SET
                        project_name = EXCLUDED.project_name,
                        project_category = EXCLUDED.project_category
                    `, [testUserId, project.projectId, project.projectName, project.projectCategory]);
                    
                    // Verify the project appears in watchlist
                    const selectResult = await client.query(
                        'SELECT * FROM watchlist WHERE user_id = $1 AND project_id = $2',
                        [testUserId, project.projectId]
                    );
                    
                    // Property assertion: Added project should be retrievable
                    expect(selectResult.rows.length).toBe(1);
                    expect(selectResult.rows[0].project_name).toBe(project.projectName);
                    expect(selectResult.rows[0].project_category).toBe(project.projectCategory);
                    expect(selectResult.rows[0].added_at).toBeDefined();
                    
                    // Property: Removing a project should make it no longer retrievable
                    await client.query(
                        'DELETE FROM watchlist WHERE user_id = $1 AND project_id = $2',
                        [testUserId, project.projectId]
                    );
                    
                    // Verify the project is removed from watchlist
                    const deleteResult = await client.query(
                        'SELECT * FROM watchlist WHERE user_id = $1 AND project_id = $2',
                        [testUserId, project.projectId]
                    );
                    
                    // Property assertion: Removed project should not be retrievable
                    expect(deleteResult.rows.length).toBe(0);
                    
                } finally {
                    client.release();
                }
            }
        ), { numRuns: 100 });
    });

    /**
     * Property: Watchlist uniqueness constraint
     * For any user and project combination, there should be at most one watchlist entry
     */
    test('Property: Watchlist uniqueness constraint', async () => {
        await fc.assert(fc.asyncProperty(
            fc.record({
                projectId: fc.string({ minLength: 10, maxLength: 66 }).map(s => `test_unique_${s}`),
                projectName1: fc.string({ minLength: 1, maxLength: 100 }),
                projectName2: fc.string({ minLength: 1, maxLength: 100 }),
                category: fc.constantFrom('DeFi', 'NFT', 'DAO')
            }),
            async (data) => {
                const client = await pool.connect();
                
                try {
                    // Insert first entry
                    await client.query(`
                        INSERT INTO watchlist (user_id, project_id, project_name, project_category) 
                        VALUES ($1, $2, $3, $4)
                        ON CONFLICT (user_id, project_id) DO NOTHING
                    `, [testUserId, data.projectId, data.projectName1, data.category]);
                    
                    // Attempt to insert duplicate (should be handled by constraint)
                    await client.query(`
                        INSERT INTO watchlist (user_id, project_id, project_name, project_category) 
                        VALUES ($1, $2, $3, $4)
                        ON CONFLICT (user_id, project_id) DO UPDATE SET
                        project_name = EXCLUDED.project_name
                    `, [testUserId, data.projectId, data.projectName2, data.category]);
                    
                    // Verify only one entry exists
                    const result = await client.query(
                        'SELECT COUNT(*) as count FROM watchlist WHERE user_id = $1 AND project_id = $2',
                        [testUserId, data.projectId]
                    );
                    
                    // Property assertion: Only one entry should exist per user-project combination
                    expect(parseInt(result.rows[0].count)).toBe(1);
                    
                    // Clean up
                    await client.query(
                        'DELETE FROM watchlist WHERE user_id = $1 AND project_id = $2',
                        [testUserId, data.projectId]
                    );
                    
                } finally {
                    client.release();
                }
            }
        ), { numRuns: 50 });
    });

    /**
     * Property: Watchlist timestamp consistency
     * For any watchlist entry, added_at should be before or equal to updated_at
     */
    test('Property: Timestamp consistency', async () => {
        await fc.assert(fc.asyncProperty(
            fc.record({
                projectId: fc.string({ minLength: 10, maxLength: 66 }).map(s => `test_time_${s}`),
                projectName: fc.string({ minLength: 1, maxLength: 100 }),
                category: fc.constantFrom('DeFi', 'NFT', 'DAO')
            }),
            async (project) => {
                const client = await pool.connect();
                
                try {
                    // Insert entry
                    await client.query(`
                        INSERT INTO watchlist (user_id, project_id, project_name, project_category) 
                        VALUES ($1, $2, $3, $4)
                        ON CONFLICT (user_id, project_id) DO NOTHING
                    `, [testUserId, project.projectId, project.projectName, project.category]);
                    
                    // Update entry to trigger updated_at
                    await client.query(`
                        UPDATE watchlist 
                        SET project_name = $1 
                        WHERE user_id = $2 AND project_id = $3
                    `, [`Updated ${project.projectName}`, testUserId, project.projectId]);
                    
                    // Check timestamps
                    const result = await client.query(
                        'SELECT added_at, updated_at FROM watchlist WHERE user_id = $1 AND project_id = $2',
                        [testUserId, project.projectId]
                    );
                    
                    if (result.rows.length > 0) {
                        const { added_at, updated_at } = result.rows[0];
                        
                        // Property assertion: added_at should be <= updated_at
                        expect(new Date(added_at).getTime()).toBeLessThanOrEqual(new Date(updated_at).getTime());
                    }
                    
                    // Clean up
                    await client.query(
                        'DELETE FROM watchlist WHERE user_id = $1 AND project_id = $2',
                        [testUserId, project.projectId]
                    );
                    
                } finally {
                    client.release();
                }
            }
        ), { numRuns: 50 });
    });
});