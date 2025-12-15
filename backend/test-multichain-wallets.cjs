const { Pool } = require('pg');

const pool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    user: 'zcash_user', 
    password: 'yourpassword',
    database: 'zcash_indexer',
});

async function testMultiChainWallets() {
    try {
        console.log('🧪 Testing Multi-Chain Custodial Wallet Creation...');
        
        const testEmail = 'multichain@zcash.com';
        
        // Clean up first
        await pool.query('DELETE FROM custodial_wallets WHERE user_id IN (SELECT id FROM users WHERE email = $1)', [testEmail]);
        await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
        
        // Step 1: Create user
        console.log('\n📝 Step 1: Create User');
        const userResult = await pool.query(`
            INSERT INTO users (email, is_verified, roles, onboarding_completed)
            VALUES ($1, true, $2, false) 
            RETURNING id, email
        `, [testEmail, ['startup']]);
        
        const user = userResult.rows[0];
        console.log('✅ User created:', user.id);
        
        // Step 2: Check current wallet creation (single mainnet)
        console.log('\n🔍 Step 2: Current Wallet Creation Behavior');
        
        // Simulate what happens during signup (single wallet)
        const networks = ['mainnet']; // Current behavior
        
        for (const network of networks) {
            console.log(`Creating wallet for network: ${network}`);
            
            // This would be the current generateCustodialWalletService call
            // But we need to check if it actually works with our database
        }
        
        // Step 3: Check what wallets exist
        const existingWallets = await pool.query(
            'SELECT network, address, created_at FROM custodial_wallets WHERE user_id = $1',
            [user.id]
        );
        
        console.log('✅ Current wallets:', existingWallets.rows);
        
        // Step 4: What SHOULD be created for multi-chain
        console.log('\n🌐 Step 3: Required Multi-Chain Wallets');
        const requiredNetworks = ['lisk', 'starknet', 'zcash'];
        console.log('Required networks:', requiredNetworks);
        
        // Cleanup
        await pool.query('DELETE FROM custodial_wallets WHERE user_id = $1', [user.id]);
        await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
        console.log('\n✅ Multi-chain wallet test complete');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Multi-chain wallet test failed:', err.message);
        process.exit(1);
    }
}

testMultiChainWallets();
