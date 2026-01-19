const pg = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new pg.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'zcash_user',
    password: process.env.DB_PASS || 'yourpassword',
    database: process.env.DB_NAME || 'zcash_indexer',
});

async function runMigration() {
    try {
        console.log('🚀 Running analytics tables migration...');
        
        const sqlPath = path.join(__dirname, 'migrations', '001_add_analytics_tables.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        await pool.query(sql);
        console.log('✅ Analytics tables migration completed successfully');
        
        // Test that tables were created
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('project_metrics', 'notifications', 'tasks', 'user_cohorts', 'wallet_analytics')
            ORDER BY table_name
        `);
        
        console.log('📊 Created tables:', result.rows.map(r => r.table_name).join(', '));
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Full error:', error);
    } finally {
        await pool.end();
    }
}

runMigration();