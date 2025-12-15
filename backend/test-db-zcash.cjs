const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'zcash_user',
    password: process.env.DB_PASS || 'yourpassword',
    database: process.env.DB_NAME || 'zcash_indexer',
});

async function testConnection() {
    try {
        const res = await pool.query('SELECT NOW() as time, current_database() as db, current_user as user');
        console.log('✅ Database connected successfully:');
        console.log('  Database:', res.rows[0].db);
        console.log('  User:', res.rows[0].user);
        console.log('  Time:', res.rows[0].time);
        
        // Test users table
        const userCheck = await pool.query('SELECT COUNT(*) as count FROM users');
        console.log('  Users table:', userCheck.rows[0].count, 'records');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
        process.exit(1);
    }
}

testConnection();
