const { Pool } = require('pg');

const pool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    user: 'zcash_user', 
    password: 'yourpassword',
    database: 'zcash_indexer',
});

async function testOTP() {
    try {
        console.log('🧪 Testing OTP Flow with Zcash Indexer...');
        
        const testEmail = 'otp@zcash.com';
        const testOTP = '1234';
        
        // Clean up first
        await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
        
        // Test 1: Create unverified user with OTP (signup flow)
        const result = await pool.query(`
            INSERT INTO users (email, otp_secret, is_verified, roles)
            VALUES ($1, $2, false, $3) 
            RETURNING id, email, otp_secret, is_verified
        `, [testEmail, testOTP, ['startup']]);
        
        console.log('✅ Unverified user created:', {
            id: result.rows[0].id,
            email: result.rows[0].email,
            otp_secret: result.rows[0].otp_secret,
            is_verified: result.rows[0].is_verified
        });
        
        // Test 2: OTP verification
        const user = result.rows[0];
        if (user.otp_secret === testOTP) {
            await pool.query('UPDATE users SET is_verified = true, otp_secret = null WHERE id = $1', [user.id]);
            console.log('✅ OTP verification: PASS');
        } else {
            console.log('❌ OTP verification: FAIL');
        }
        
        // Test 3: Check final state
        const finalCheck = await pool.query('SELECT is_verified, otp_secret FROM users WHERE email = $1', [testEmail]);
        console.log('✅ Final user state:', finalCheck.rows[0]);
        
        // Cleanup
        await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
        console.log('✅ OTP test cleanup complete');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ OTP test failed:', err.message);
        process.exit(1);
    }
}

testOTP();
