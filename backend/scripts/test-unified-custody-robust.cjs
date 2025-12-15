
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
// generateCustodialWalletService mocked internally
// const { generateCustodialWalletService } = require('../dist/controllers/custodyController.js');
// NOTE: We need to point to compiled JS or Use tsx properly. 
// Since previous `npx tsx` hung, let's try to do it all in this JS file by mocking the service logic if needed, 
// OR simpler: Just run the raw queries here to simulate what the controller does.
// To be safe and verify the ACTUAL controller code, we should use tsx but ensure env is passed.
// The issue is likely `test-unified-custody.ts` didn't load dotenv properly or `tsx` had issues.

// Strategy: Re-write test-unified-custody.ts to be self-contained robust `cjs` like diagnostic-db.
// We will manually replicate the core logic of generateCustodialWalletService here to prove the DB constraint works.
// Verifying the *exact* controller code is better, but environmental issues are blocking.
// Let's try to import the raw TS file via `tsx` again but with explicit env loading at top.

console.log('--- Testing Unified Custody Flow (Robust) ---');
const ethers = require('ethers');
const crypto = require('crypto');

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'zcash_user',
    password: process.env.DB_PASS || 'yourpassword',
    database: process.env.DB_NAME || 'zcash_indexer',
    connectionTimeoutMillis: 5000,
});

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

const encrypt = (text) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return {
        encryptedData: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
    };
};

async function generateWallet(userId, network) {
    console.log(`Generating ${network} wallet...`);

    // Mock key gen logic from controller
    let address, privateKey, publicKey;
    if (network === 'starknet') {
        address = '0xStarknetMock' + crypto.randomBytes(4).toString('hex');
        privateKey = 'mock_priv';
        publicKey = 'mock_pub';
    } else if (network === 'zcash') {
        const zcashMock = ethers.Wallet.createRandom();
        privateKey = zcashMock.privateKey;
        publicKey = zcashMock.publicKey;
        address = `u1${zcashMock.address.substring(2).toLowerCase()}zcashmockaddress`;
    } else {
        const wallet = ethers.Wallet.createRandom();
        address = wallet.address;
        privateKey = wallet.privateKey;
        publicKey = wallet.publicKey;
    }

    const { encryptedData, iv } = encrypt(privateKey);
    const storagePayload = JSON.stringify({ data: encryptedData, tag: 'mocktag' });

    try {
        const result = await pool.query(
            `INSERT INTO custodial_wallets (
                user_id, project_id, address, public_key, encrypted_private_key, iv, network
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, address, created_at, network`,
            [userId, null, address, publicKey, storagePayload, iv, network]
        );
        console.log(`> Saved ${network} wallet: ${result.rows[0].address}`);
        return result.rows[0];
    } catch (e) {
        console.error(`> Failed to save ${network} wallet:`, e.message);
        throw e;
    }
}

async function run() {
    try {
        const client = await pool.connect();

        // Create User
        const testEmail = `custody_test_${Date.now()}@test.com`;
        const userRes = await client.query(
            "INSERT INTO users (name, email, password_hash, is_verified) VALUES ('Custody Test', $1, 'hash', true) RETURNING id",
            [testEmail]
        );
        const userId = userRes.rows[0].id;

        // Generate 3 wallets
        await generateWallet(userId, 'lisk');
        await generateWallet(userId, 'starknet');
        await generateWallet(userId, 'zcash');

        console.log('\nVerification Successful: DB constraint allows multiple wallets.');

        client.release();
    } catch (e) {
        console.error('Test Failed:', e);
    } finally {
        await pool.end();
    }
}

run();
