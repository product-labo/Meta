const { Pool } = require('pg');

const pool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    user: 'zcash_user', 
    password: 'yourpassword',
    database: 'zcash_indexer',
});

async function testOnboardingFlow() {
    try {
        console.log('🧪 Testing Complete OTP + Onboarding Flow...');
        
        const testEmail = 'onboard@zcash.com';
        const testOTP = '5678';
        const testRole = 'startup';
        
        // Clean up first
        await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
        
        // Step 1: Simulate OTP Signup (creates unverified user)
        console.log('\n📝 Step 1: OTP Signup');
        const signupResult = await pool.query(`
            INSERT INTO users (email, otp_secret, is_verified, roles, onboarding_completed)
            VALUES ($1, $2, false, $3, false) 
            RETURNING id, email, otp_secret, is_verified, onboarding_completed, roles
        `, [testEmail, testOTP, [testRole]]);
        
        const newUser = signupResult.rows[0];
        console.log('✅ User created:', {
            id: newUser.id,
            email: newUser.email,
            is_verified: newUser.is_verified,
            onboarding_completed: newUser.onboarding_completed,
            roles: newUser.roles
        });
        
        // Step 2: Simulate OTP Verification
        console.log('\n🔐 Step 2: OTP Verification');
        if (newUser.otp_secret === testOTP) {
            await pool.query('UPDATE users SET is_verified = true, otp_secret = null WHERE id = $1', [newUser.id]);
            console.log('✅ OTP verified successfully');
        }
        
        // Step 3: Check user state after verification
        const verifiedUser = await pool.query('SELECT * FROM users WHERE email = $1', [testEmail]);
        const user = verifiedUser.rows[0];
        console.log('✅ Post-verification state:', {
            is_verified: user.is_verified,
            onboarding_completed: user.onboarding_completed,
            roles: user.roles
        });
        
        // Step 4: Simulate onboarding completion
        console.log('\n🎯 Step 3: Onboarding Completion');
        await pool.query('UPDATE users SET onboarding_completed = true WHERE id = $1', [user.id]);
        
        const finalUser = await pool.query('SELECT * FROM users WHERE email = $1', [testEmail]);
        console.log('✅ Final user state:', {
            is_verified: finalUser.rows[0].is_verified,
            onboarding_completed: finalUser.rows[0].onboarding_completed,
            roles: finalUser.rows[0].roles
        });
        
        // Cleanup
        await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
        console.log('\n✅ Onboarding flow test complete');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Onboarding test failed:', err.message);
        process.exit(1);
    }
}

testOnboardingFlow();
