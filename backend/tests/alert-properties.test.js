import fc from 'fast-check';
import { Pool } from 'pg';
import 'dotenv/config';

/**
 * Property-Based Tests for Alert System
 * Feature: dashboard-data-population, Property 16: Alert creation and management
 * Validates: Requirements 4.1, 4.3
 */

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'david_user',
    password: process.env.DB_PASS || 'Davidsoyaya@1015',
    database: process.env.DB_NAME || 'david',
});

describe('Alert System Property-Based Tests', () => {
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
        await pool.query('DELETE FROM alerts WHERE user_id = $1 AND project_id LIKE $2', [testUserId, 'test_%']);
        await pool.end();
    });

    /**
     * Property 16: Alert creation and management
     * For any valid alert configuration, the system should store and retrieve alert settings correctly
     */
    test('Property 16: Alert creation and retrieval consistency', async () => {
        await fc.assert(fc.asyncProperty(
            fc.record({
                projectId: fc.string({ minLength: 10, maxLength: 66 }).map(s => `test_${s}`),
                type: fc.constantFrom('adoption', 'retention', 'revenue', 'feature_usage', 'wallet_anomalies'),
                condition: fc.constantFrom('above', 'below', 'equals', 'change'),
                threshold: fc.float({ min: 0.01, max: 1000.00 }),
                thresholdUnit: fc.constantFrom('percent', 'absolute', 'usd', 'eth'),
                frequency: fc.constantFrom('immediate', 'weekly', 'monthly')
            }),
            async (alert) => {
                const client = await pool.connect();
                
                try {
                    // Property: Creating an alert should make it retrievable with same properties
                    const insertResult = await client.query(`
                        INSERT INTO alerts (user_id, project_id, type, condition, threshold, threshold_unit, frequency, is_active) 
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        RETURNING id
                    `, [testUserId, alert.projectId, alert.type, alert.condition, alert.threshold, alert.thresholdUnit, alert.frequency, true]);
                    
                    const alertId = insertResult.rows[0].id;
                    
                    // Verify the alert can be retrieved with correct properties
                    const selectResult = await client.query(
                        'SELECT * FROM alerts WHERE id = $1',
                        [alertId]
                    );
                    
                    // Property assertions: Retrieved alert should match created alert
                    expect(selectResult.rows.length).toBe(1);
                    const retrievedAlert = selectResult.rows[0];
                    
                    expect(retrievedAlert.user_id).toBe(testUserId);
                    expect(retrievedAlert.project_id).toBe(alert.projectId);
                    expect(retrievedAlert.type).toBe(alert.type);
                    expect(retrievedAlert.condition).toBe(alert.condition);
                    expect(parseFloat(retrievedAlert.threshold)).toBeCloseTo(alert.threshold, 2);
                    expect(retrievedAlert.threshold_unit).toBe(alert.thresholdUnit);
                    expect(retrievedAlert.frequency).toBe(alert.frequency);
                    expect(retrievedAlert.is_active).toBe(true);
                    expect(retrievedAlert.trigger_count).toBe(0);
                    expect(retrievedAlert.created_at).toBeDefined();
                    expect(retrievedAlert.updated_at).toBeDefined();
                    
                    // Clean up
                    await client.query('DELETE FROM alerts WHERE id = $1', [alertId]);
                    
                } finally {
                    client.release();
                }
            }
        ), { numRuns: 100 });
    });

    /**
     * Property: Alert activation/deactivation
     * For any alert, toggling is_active should change the alert's active status
     */
    test('Property: Alert activation toggle', async () => {
        await fc.assert(fc.asyncProperty(
            fc.record({
                projectId: fc.string({ minLength: 10, maxLength: 66 }).map(s => `test_toggle_${s}`),
                type: fc.constantFrom('adoption', 'retention', 'revenue'),
                condition: fc.constantFrom('above', 'below'),
                threshold: fc.float({ min: 1.0, max: 100.0 }),
                initialActive: fc.boolean()
            }),
            async (data) => {
                const client = await pool.connect();
                
                try {
                    // Create alert with initial active status
                    const insertResult = await client.query(`
                        INSERT INTO alerts (user_id, project_id, type, condition, threshold, threshold_unit, frequency, is_active) 
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        RETURNING id
                    `, [testUserId, data.projectId, data.type, data.condition, data.threshold, 'percent', 'immediate', data.initialActive]);
                    
                    const alertId = insertResult.rows[0].id;
                    
                    // Toggle the active status
                    await client.query(
                        'UPDATE alerts SET is_active = $1 WHERE id = $2',
                        [!data.initialActive, alertId]
                    );
                    
                    // Verify the status was toggled
                    const result = await client.query(
                        'SELECT is_active FROM alerts WHERE id = $1',
                        [alertId]
                    );
                    
                    // Property assertion: Active status should be toggled
                    expect(result.rows[0].is_active).toBe(!data.initialActive);
                    
                    // Clean up
                    await client.query('DELETE FROM alerts WHERE id = $1', [alertId]);
                    
                } finally {
                    client.release();
                }
            }
        ), { numRuns: 50 });
    });

    /**
     * Property: Alert trigger count increment
     * For any alert, incrementing trigger_count should increase the count by exactly 1
     */
    test('Property: Trigger count increment', async () => {
        await fc.assert(fc.asyncProperty(
            fc.record({
                projectId: fc.string({ minLength: 10, maxLength: 66 }).map(s => `test_count_${s}`),
                type: fc.constantFrom('adoption', 'retention', 'revenue'),
                initialCount: fc.integer({ min: 0, max: 10 })
            }),
            async (data) => {
                const client = await pool.connect();
                
                try {
                    // Create alert with initial trigger count
                    const insertResult = await client.query(`
                        INSERT INTO alerts (user_id, project_id, type, condition, threshold, threshold_unit, frequency, trigger_count) 
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        RETURNING id
                    `, [testUserId, data.projectId, data.type, 'above', 50.0, 'percent', 'immediate', data.initialCount]);
                    
                    const alertId = insertResult.rows[0].id;
                    
                    // Increment trigger count
                    await client.query(
                        'UPDATE alerts SET trigger_count = trigger_count + 1, last_triggered_at = NOW() WHERE id = $1',
                        [alertId]
                    );
                    
                    // Verify the count was incremented
                    const result = await client.query(
                        'SELECT trigger_count, last_triggered_at FROM alerts WHERE id = $1',
                        [alertId]
                    );
                    
                    // Property assertions: Count should be incremented by 1, timestamp should be set
                    expect(result.rows[0].trigger_count).toBe(data.initialCount + 1);
                    expect(result.rows[0].last_triggered_at).toBeDefined();
                    
                    // Clean up
                    await client.query('DELETE FROM alerts WHERE id = $1', [alertId]);
                    
                } finally {
                    client.release();
                }
            }
        ), { numRuns: 50 });
    });

    /**
     * Property: Alert constraint validation
     * For any alert, the type and condition should be within allowed values
     */
    test('Property: Alert constraint validation', async () => {
        await fc.assert(fc.asyncProperty(
            fc.record({
                projectId: fc.string({ minLength: 10, maxLength: 66 }).map(s => `test_constraint_${s}`),
                type: fc.constantFrom('adoption', 'retention', 'revenue', 'feature_usage', 'wallet_anomalies'),
                condition: fc.constantFrom('above', 'below', 'equals', 'change'),
                frequency: fc.constantFrom('immediate', 'weekly', 'monthly')
            }),
            async (data) => {
                const client = await pool.connect();
                
                try {
                    // Create alert with valid constraint values
                    const insertResult = await client.query(`
                        INSERT INTO alerts (user_id, project_id, type, condition, threshold, threshold_unit, frequency) 
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        RETURNING id, type, condition, frequency
                    `, [testUserId, data.projectId, data.type, data.condition, 25.0, 'percent', data.frequency]);
                    
                    const alertId = insertResult.rows[0].id;
                    const alert = insertResult.rows[0];
                    
                    // Property assertions: Stored values should match valid constraint values
                    expect(['adoption', 'retention', 'revenue', 'feature_usage', 'wallet_anomalies']).toContain(alert.type);
                    expect(['above', 'below', 'equals', 'change']).toContain(alert.condition);
                    expect(['immediate', 'weekly', 'monthly']).toContain(alert.frequency);
                    
                    // Clean up
                    await client.query('DELETE FROM alerts WHERE id = $1', [alertId]);
                    
                } finally {
                    client.release();
                }
            }
        ), { numRuns: 50 });
    });

    /**
     * Property: Alert timestamp consistency
     * For any alert, created_at should be before or equal to updated_at
     */
    test('Property: Alert timestamp consistency', async () => {
        await fc.assert(fc.asyncProperty(
            fc.record({
                projectId: fc.string({ minLength: 10, maxLength: 66 }).map(s => `test_timestamp_${s}`),
                type: fc.constantFrom('adoption', 'retention', 'revenue'),
                threshold: fc.float({ min: 1.0, max: 100.0 })
            }),
            async (data) => {
                const client = await pool.connect();
                
                try {
                    // Create alert
                    const insertResult = await client.query(`
                        INSERT INTO alerts (user_id, project_id, type, condition, threshold, threshold_unit, frequency) 
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        RETURNING id
                    `, [testUserId, data.projectId, data.type, 'above', data.threshold, 'percent', 'immediate']);
                    
                    const alertId = insertResult.rows[0].id;
                    
                    // Update alert to trigger updated_at
                    await client.query(
                        'UPDATE alerts SET threshold = $1 WHERE id = $2',
                        [data.threshold + 1, alertId]
                    );
                    
                    // Check timestamps
                    const result = await client.query(
                        'SELECT created_at, updated_at FROM alerts WHERE id = $1',
                        [alertId]
                    );
                    
                    if (result.rows.length > 0) {
                        const { created_at, updated_at } = result.rows[0];
                        
                        // Property assertion: created_at should be <= updated_at
                        expect(new Date(created_at).getTime()).toBeLessThanOrEqual(new Date(updated_at).getTime());
                    }
                    
                    // Clean up
                    await client.query('DELETE FROM alerts WHERE id = $1', [alertId]);
                    
                } finally {
                    client.release();
                }
            }
        ), { numRuns: 50 });
    });
});