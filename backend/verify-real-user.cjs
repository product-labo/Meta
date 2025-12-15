require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    user: 'zcash_user', 
    password: 'yourpassword',
    database: 'zcash_indexer',
});

async function verifyRealUser(otpFromEmail) {
    try {
        console.log('🧪 Verifying Real User: soyaya1015@gmail.com');
        
        const email = 'soyaya1015@gmail.com';
        
        // Step 1: Get user and verify OTP
        console.log('\n🔍 Checking user and OTP...');
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
            console.log('❌ User not found');
            return;
        }
        
        const user = result.rows[0];
        console.log('  Database OTP:', user.otp_secret);
        console.log('  Provided OTP:', otpFromEmail);
        
        if (user.otp_secret !== otpFromEmail) {
            console.log('❌ Invalid OTP');
            return;
        }
        
        console.log('✅ OTP verified!');
        
        // Step 2: Mark user as verified
        console.log('\n✅ Marking user as verified...');
        await pool.query('UPDATE users SET is_verified = true, otp_secret = null WHERE id = $1', [user.id]);
        
        // Step 3: Create multi-chain custodial wallets
        console.log('\n🌐 Creating multi-chain custodial wallets...');
        
        const networks = ['lisk', 'starknet', 'zcash'];
        
        for (const network of networks) {
            console.log(`  Creating ${network} wallet...`);
            
            const mockAddress = `${network}_0x${Math.random().toString(16).substr(2, 40)}`;
            const mockPrivateKey = `encrypted_${network}_private_key`;
            const mockIV = `iv_${network}`;
            
            await pool.query(`
                INSERT INTO custodial_wallets (user_id, address, encrypted_private_key, iv, network)
                VALUES ($1, $2, $3, $4, $5)
            `, [user.id, mockAddress, mockPrivateKey, mockIV, network]);
        }
        
        // Step 4: Final verification
        const finalUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const wallets = await pool.query('SELECT network, address FROM custodial_wallets WHERE user_id = $1 ORDER BY network', [user.id]);
        
        console.log('\n✅ Verification Complete!');
        console.log('\n👤 Final User State:');
        console.log('  Email:', finalUser.rows[0].email);
        console.log('  Verified:', finalUser.rows[0].is_verified);
        console.log('  Onboarding Complete:', finalUser.rows[0].onboarding_completed);
        
        console.log('\n💼 Created Wallets:');
        wallets.rows.forEach(wallet => {
            console.log(`  ${wallet.network}: ${wallet.address}`);
        });
        
        console.log('\n🎯 User is now ready for onboarding (project creation)!');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Verification failed:', err.message);
        process.exit(1);
    }
}

// Get OTP from command line argument
const otpFromEmail = process.argv[2];

if (!otpFromEmail) {
    console.log('Usage: node verify-real-user.cjs <OTP_FROM_EMAIL>');
    console.log('Example: node verify-real-user.cjs 6529');
    process.exit(1);
}

verifyRealUser(otpFromEmail);
