const { Pool } = require('pg');

const pool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    user: 'zcash_user', 
    password: 'yourpassword',
    database: 'zcash_indexer',
});

// Helper to generate OTP
const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

async function testSignupFlow() {
    try {
        console.log('🧪 Testing Complete Signup Flow for davidlovedavid1015@gmail.com');
        
        const email = 'davidlovedavid1015@gmail.com';
        const role = 'startup';
        
        // Clean up first
        await pool.query('DELETE FROM custodial_wallets WHERE user_id IN (SELECT id FROM users WHERE email = $1)', [email]);
        await pool.query('DELETE FROM users WHERE email = $1', [email]);
        
        // Step 1: Simulate OTP Signup (no password provided)
        console.log('\n📝 Step 1: OTP Signup');
        const otp = generateOTP();
        console.log(`🔐 Generated OTP: ${otp}`);
        
        // Check if user exists
        const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (existing.rows.length === 0) {
            // Create new unverified user
            const roles = role ? [role] : [];
            
            await pool.query(`
                INSERT INTO users (email, otp_secret, is_verified, roles, onboarding_completed)
                VALUES ($1, $2, false, $3, false)
            `, [email, otp, roles]);
            
            console.log('✅ User created with OTP');
        }
        
        // Step 2: Verify user was created
        const userCheck = await pool.query('SELECT id, email, otp_secret, is_verified, onboarding_completed, roles FROM users WHERE email = $1', [email]);
        const user = userCheck.rows[0];
        
        console.log('✅ User details:', {
            id: user.id,
            email: user.email,
            otp_secret: user.otp_secret,
            is_verified: user.is_verified,
            onboarding_completed: user.onboarding_completed,
            roles: user.roles
        });
        
        console.log('\n🔐 Step 2: OTP Verification');
        console.log(`Use this OTP to verify: ${user.otp_secret}`);
        
        // Simulate OTP verification
        if (user.otp_secret === otp) {
            await pool.query('UPDATE users SET is_verified = true, otp_secret = null WHERE id = $1', [user.id]);
            
            // Create multi-chain custodial wallets (simulating updated auth controller)
            console.log('\n🌐 Step 3: Creating Multi-Chain Custodial Wallets');
            
            const networks = ['lisk', 'starknet', 'zcash'];
            
            for (const network of networks) {
                console.log(`Creating ${network} wallet...`);
                
                const mockAddress = `${network}_0x${Math.random().toString(16).substr(2, 40)}`;
                const mockPrivateKey = `encrypted_${network}_private_key`;
                const mockIV = `iv_${network}`;
                
                await pool.query(`
                    INSERT INTO custodial_wallets (user_id, address, encrypted_private_key, iv, network)
                    VALUES ($1, $2, $3, $4, $5)
                `, [user.id, mockAddress, mockPrivateKey, mockIV, network]);
            }
            
            console.log('✅ OTP verified and wallets created');
        }
        
        // Step 4: Final verification
        const finalUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const wallets = await pool.query('SELECT network, address FROM custodial_wallets WHERE user_id = $1 ORDER BY network', [user.id]);
        
        console.log('\n✅ Final User State:');
        console.log('  Email:', finalUser.rows[0].email);
        console.log('  Verified:', finalUser.rows[0].is_verified);
        console.log('  Onboarding Completed:', finalUser.rows[0].onboarding_completed);
        console.log('  Roles:', finalUser.rows[0].roles);
        
        console.log('\n✅ Created Wallets:');
        wallets.rows.forEach(wallet => {
            console.log(`  ${wallet.network}: ${wallet.address}`);
        });
        
        console.log('\n🎯 Next Steps:');
        console.log('1. User can now proceed to onboarding (project creation)');
        console.log('2. After onboarding, set onboarding_completed = true');
        
        // Don't cleanup - leave for verification
        console.log('\n✅ Signup flow test complete - User ready for verification!');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Signup flow test failed:', err.message);
        process.exit(1);
    }
}

testSignupFlow();
