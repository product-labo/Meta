const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    user: 'zcash_user', 
    password: 'yourpassword',
    database: 'zcash_indexer',
});

async function testAuth() {
    try {
        console.log('🧪 Testing Auth Flow with Zcash Indexer...');
        
        // Test 1: Create test user
        const testEmail = 'test@zcash.com';
        const testPassword = 'test123';
        const hashedPassword = await bcrypt.hash(testPassword, 10);
        
        // Clean up first
        await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
        
        // Create user
        const result = await pool.query(`
            INSERT INTO users (email, password_hash, is_verified, roles, onboarding_completed)
            VALUES ($1, $2, true, $3, false) 
            RETURNING id, email, roles
        `, [testEmail, hashedPassword, ['startup']]);
        
        console.log('✅ User created:', result.rows[0]);
        
        // Test 2: Login verification
        const loginResult = await pool.query('SELECT * FROM users WHERE email = $1', [testEmail]);
        const user = loginResult.rows[0];
        const passwordValid = await bcrypt.compare(testPassword, user.password_hash);
        
        console.log('✅ Login test:', passwordValid ? 'PASS' : 'FAIL');
        console.log('✅ User ID type:', typeof user.id, user.id);
        
        // Cleanup
        await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
        console.log('✅ Test cleanup complete');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Auth test failed:', err.message);
        process.exit(1);
    }
}

testAuth();
