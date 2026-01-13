/**
 * Simple Watchlist Test to verify functionality
 */

import { Pool } from 'pg';

const pool = new Pool({
    user: 'david_user',
    host: 'localhost',
    database: 'david',
    password: 'Davidsoyaya@1015',
    port: 5432,
});

async function testBasicWatchlistOperations() {
    console.log('🧪 Testing Basic Watchlist Operations...');
    
    try {
        // Test database connection
        await pool.query('SELECT 1');
        console.log('✅ Database connected');
        
        // Check if tables exist
        const tablesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('users', 'watchlist', 'alerts')
        `);
        
        const tables = tablesResult.rows.map(row => row.table_name);
        console.log('✅ Found tables:', tables);
        
        if (!tables.includes('watchlist') || !tables.includes('alerts')) {
            console.log('❌ Required tables missing');
            return false;
        }
        
        // Create a test user
        const testUserId = Math.floor(Math.random() * 1000000);
        const testEmail = `test${testUserId}@example.com`;
        
        await pool.query(
            'INSERT INTO users (id, email, password_hash, is_verified) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
            [testUserId, testEmail, 'hashed_password', true]
        );
        console.log('✅ Test user created');
        
        // Test watchlist operations
        const projectId = `test-project-${Date.now()}`;
        const projectName = 'Test Project';
        const projectCategory = 'DeFi';
        
        // Add to watchlist
        const addResult = await pool.query(
            `INSERT INTO watchlist (user_id, project_id, project_name, project_category) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`,
            [testUserId, projectId, projectName, projectCategory]
        );
        
        console.log('✅ Added to watchlist:', addResult.rows[0].id);
        
        // Get watchlist
        const getResult = await pool.query(
            `SELECT * FROM watchlist WHERE user_id = $1`,
            [testUserId]
        );
        
        console.log('✅ Retrieved watchlist:', getResult.rows.length, 'items');
        
        // Test alert creation
        const alertResult = await pool.query(
            `INSERT INTO alerts (user_id, project_id, type, condition, threshold, threshold_unit, frequency) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING *`,
            [testUserId, projectId, 'retention', 'below', 20, 'percent', 'immediate']
        );
        
        console.log('✅ Created alert:', alertResult.rows[0].id);
        
        // Get alerts
        const alertsResult = await pool.query(
            `SELECT * FROM alerts WHERE user_id = $1`,
            [testUserId]
        );
        
        console.log('✅ Retrieved alerts:', alertsResult.rows.length, 'items');
        
        // Cleanup
        await pool.query('DELETE FROM alerts WHERE user_id = $1', [testUserId]);
        await pool.query('DELETE FROM watchlist WHERE user_id = $1', [testUserId]);
        await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
        
        console.log('✅ Cleanup completed');
        console.log('🎉 All basic operations successful!');
        
        return true;
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    }
}

async function main() {
    const success = await testBasicWatchlistOperations();
    await pool.end();
    process.exit(success ? 0 : 1);
}

main();