const { Pool } = require('pg');

const pool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    user: 'zcash_user',
    password: 'yourpassword',
    database: 'zcash_indexer',
});

async function testZcashConnection() {
    try {
        const res = await pool.query('SELECT NOW() as time, current_database() as db, current_user as user');
        console.log('✅ Zcash Indexer connected:');
        console.log('  Database:', res.rows[0].db);
        console.log('  User:', res.rows[0].user);
        
        // Test users table structure
        const userFields = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        `);
        console.log('  Users table fields:', userFields.rows.length);
        
        // Check for our new fields
        const newFields = userFields.rows.filter(f => 
            ['otp_secret', 'phone_number', 'roles', 'google_id'].includes(f.column_name)
        );
        console.log('  Auth fields added:', newFields.map(f => f.column_name));
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Zcash connection failed:', err.message);
        process.exit(1);
    }
}

testZcashConnection();
