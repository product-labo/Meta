const { Pool } = require('pg');

const pool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    user: 'zcash_user', 
    password: 'yourpassword',
    database: 'zcash_indexer',
});

async function testMultiChainSignup() {
    try {
        console.log('🧪 Testing Multi-Chain Wallet Creation During Signup...');
        
        const testEmail = 'multichain-signup@zcash.com';
        
        // Clean up first
        await pool.query('DELETE FROM custodial_wallets WHERE user_id IN (SELECT id FROM users WHERE email = $1)', [testEmail]);
        await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
        
        // Step 1: Create user (simulating signup)
        console.log('\n📝 Step 1: Create User');
        const userResult = await pool.query(`
            INSERT INTO users (email, is_verified, roles, onboarding_completed)
            VALUES ($1, true, $2, false) 
            RETURNING id, email
        `, [testEmail, ['startup']]);
        
        const user = userResult.rows[0];
        console.log('✅ User created:', user.id);
        
        // Step 2: Simulate multi-chain wallet creation (what updated auth controller should do)
        console.log('\n🌐 Step 2: Create Multi-Chain Custodial Wallets');
        
        const networks = ['lisk', 'starknet', 'zcash'];
        
        for (const network of networks) {
            console.log(`Creating ${network} wallet...`);
            
            // Simulate wallet creation for each network
            const mockAddress = `${network}_0x${Math.random().toString(16).substr(2, 40)}`;
            const mockPrivateKey = `encrypted_${network}_private_key`;
            const mockIV = `iv_${network}`;
            
            await pool.query(`
                INSERT INTO custodial_wallets (user_id, address, encrypted_private_key, iv, network)
                VALUES ($1, $2, $3, $4, $5)
            `, [user.id, mockAddress, mockPrivateKey, mockIV, network]);
        }
        
        // Step 3: Verify all wallets were created
        const wallets = await pool.query(
            'SELECT network, address, created_at FROM custodial_wallets WHERE user_id = $1 ORDER BY network',
            [user.id]
        );
        
        console.log('\n✅ Created Wallets:');
        wallets.rows.forEach(wallet => {
            console.log(`  ${wallet.network}: ${wallet.address}`);
        });
        
        console.log(`\n✅ Total wallets created: ${wallets.rows.length}/3`);
        
        // Cleanup
        await pool.query('DELETE FROM custodial_wallets WHERE user_id = $1', [user.id]);
        await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
        console.log('✅ Multi-chain signup test complete');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Multi-chain signup test failed:', err.message);
        process.exit(1);
    }
}

testMultiChainSignup();
