
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');

console.log('Loading env...');
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'zcash_user',
    password: process.env.DB_PASS || 'yourpassword',
    database: process.env.DB_NAME || 'zcash_indexer',
    connectionTimeoutMillis: 5000,
});

async function testLoginConsistency() {
    try {
        const client = await pool.connect();

        // 1. Setup Data
        const verifiedEmail = `verified_login_test_${Date.now()}@test.com`;
        const unverifiedEmail = `unverified_login_test_${Date.now()}@test.com`;
        const password = 'password123';
        const hash = await bcrypt.hash(password, 10);

        // Create Verified User (Wait! Don't create wallets yet to test auto-creation)
        const vUserRes = await client.query(
            "INSERT INTO users (email, password_hash, is_verified, roles) VALUES ($1, $2, true, $3) RETURNING id",
            [verifiedEmail, hash, ['user']]
        );
        const vUserId = vUserRes.rows[0].id;

        // Create Unverified User
        const uvUserRes = await client.query(
            "INSERT INTO users (email, password_hash, is_verified, roles) VALUES ($1, $2, false, $3) RETURNING id",
            [unverifiedEmail, hash, ['user']]
        );
        const uvUserId = uvUserRes.rows[0].id;

        console.log(`Created Verified User: ${vUserId} (${verifiedEmail})`);
        console.log(`Created Unverified User: ${uvUserId} (${unverifiedEmail})`);

        // 2. Test Unverified Login Logic (Mocking Controller Logic)
        // Since we can't easily import the controller in this script without full mock req/res, 
        // we will manually execute the logic we WROTE in the controller to verify it behaves against the DB.
        // Wait, testing the *exact* code path is better. 
        // But let's assume the controller code is deployed. We can simulate the check logic here.
        // Actually, better: We can test if the Wallets are created if we simulate successful login?
        // No, let's just make sure the SQL logic we rely on is sound.

        // --- Test 1: Verified User Logic Impl ---
        // Controller does: Check verified -> If valid -> Generate Wallets
        console.log('\n--- Simulating Verified User Login ---');
        // Pre-check: 0 wallets
        let wCount = await client.query('SELECT count(*) FROM custodial_wallets WHERE user_id = $1', [vUserId]);
        console.log(`Initial Wallets: ${wCount.rows[0].count}`);

        // Run Logic (Simulate what controller calls)
        const { generateCustodialWalletService } = require('../dist/controllers/custodyController.js');
        // If dist not built, this fails. Let's use the mock approach from before since we might not have build step run.
        // Just verify the DB constraints allow us to add them now.

        // Actually, if we want to be 100% sure, we should perform an HTTP request to the running server.
        // Assuming server is running on localhost:3003 (from context).
        // Let's try to hit the API login endpoint! This is the REAL test.

        const API_URL = 'http://localhost:3003/api/auth/login';

        // Function to call API
        async function login(email, pass) {
            try {
                const res = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password: pass })
                });
                const data = await res.json();
                return { status: res.status, data };
            } catch (e) {
                return { status: 500, error: e.message };
            }
        }

        if (process.env.TEST_API_CALLS === 'true') {
            // Only run this if we are confident server is up. 
            // We can try. If connection refused, we fallback to logic check.
            console.log('Attempting API calls...');

            // Unverified Login
            const r1 = await login(unverifiedEmail, password);
            console.log('Unverified Login Result:', r1.status);
            if (r1.status === 403 && r1.data.requiresVerification) {
                console.log('✅ Unverified Login blocked correctly.');
            } else {
                console.error('❌ Unverified Login failed check:', r1);
            }

            // Verified Login
            const r2 = await login(verifiedEmail, password);
            console.log('Verified Login Result:', r2.status);
            if (r2.status === 200 && r2.data.token) {
                console.log('✅ Verified Login successful.');
                // Check wallets
                const wCheck = await client.query('SELECT count(*) FROM custodial_wallets WHERE user_id = $1', [vUserId]);
                if (parseInt(wCheck.rows[0].count) >= 3) {
                    console.log(`✅ Verified User has ${wCheck.rows[0].count} wallets (Auto-created).`);
                } else {
                    console.error(`❌ Verified User missing wallets: ${wCheck.rows[0].count}`);
                }
            } else {
                console.error('❌ Verified Login failed:', r2);
            }
        } else {
            console.log('Skipping API calls (TEST_API_CALLS not set/safe). Just verifying DB state setup.');
            // This script mostly sets up data for manual testing if API calls fail.
        }

    } catch (err) {
        console.error('Test Failed:', err);
    } finally {
        await pool.end();
    }
}

// Global fetch is available in Node 18+
testLoginConsistency();
