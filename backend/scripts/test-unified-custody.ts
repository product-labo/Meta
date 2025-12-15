
import { pool } from '../src/config/database';
import { generateCustodialWalletService } from '../src/controllers/custodyController';
import { v4 as uuidv4 } from 'uuid';

async function testUnifiedFlow() {
    console.log('--- Testing Unified Custody Flow ---');
    const client = await pool.connect();

    try {
        // 1. Create a dummy user (or find one)
        // We'll insert a quick dummy user directly to avoid auth/controller complexity
        const testEmail = `custody_test_${Date.now()}@test.com`;
        const testUserRes = await client.query(
            "INSERT INTO users (name, email, password_hash, is_verified) VALUES ('Custody Test', $1, 'hash', true) RETURNING id",
            [testEmail]
        );
        const userId = testUserRes.rows[0].id; // UUID or Serial (Schema says Serial in init-auth-tables.sql but migration added social might have changed it to UUID? Actually older migration might have changed PK to UUID. Let's assume ID is returned correctly)
        // Wait, init-auth-tables.sql said SERIAL... but migration add_social_and_custody.sql had `user_id uuid`. 
        // This implies users table ID IS UUID. If it's serial, the FK would fail or type mismatch.
        // Let's check `users` table type from schema output earlier (StartLine 161).
        // Ah, I ran check-schema.cjs output didn't show in artifact. 
        // Safer way: Check if ID returns a number or string. Controller code uses string for ID.

        console.log(`Created test user: ${userId} (${testEmail})`);

        // 2. Simulate Signup Flow (creates 3 wallets)
        console.log('Generating Lisk Wallet...');
        const w1 = await generateCustodialWalletService(userId, null, 'lisk');
        console.log(`> Lisk Wallet: ${w1.address} (Network: ${w1.network})`);

        console.log('Generating Starknet Wallet...');
        const w2 = await generateCustodialWalletService(userId, null, 'starknet');
        console.log(`> Starknet Wallet: ${w2.address} (Network: ${w2.network})`);

        console.log('Generating Zcash Wallet...');
        const w3 = await generateCustodialWalletService(userId, null, 'zcash');
        console.log(`> Zcash Wallet: ${w3.address} (Network: ${w3.network})`);

        // 3. Verify in DB
        const countRes = await client.query('SELECT count(*) FROM custodial_wallets WHERE user_id = $1', [userId]);
        console.log(`\nTotal Wallets for User: ${countRes.rows[0].count}`);

        if (parseInt(countRes.rows[0].count) === 3) {
            console.log('✅ SUCCESS: All 3 wallets created for single user.');
        } else {
            console.error('❌ FAILURE: Incorrect number of wallets.');
        }

    } catch (error) {
        console.error('Test Failed:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

testUnifiedFlow();
