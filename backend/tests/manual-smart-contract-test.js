
import axios from 'axios';
import readline from 'readline';

const BASE_URL = 'http://localhost:3002'; // Verify port in .env
const API_URL = `${BASE_URL}/api`;
const AUTH_URL = `${BASE_URL}/auth`;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (query) => new Promise(resolve => rl.question(query, resolve));

async function runTest() {
    console.log('=== Smart Contract Live Verification Test ===');
    console.log('This script tests the full lifecycle: Signup -> Fund -> Subscribe -> Upgrade -> Cancel');

    try {
        // 1. Signup / Login
        const email = `contract_test_${Date.now()}@example.com`;
        const password = 'TestPassword123!';

        console.log(`\n1. Creating Test User: ${email}`);
        const signupRes = await axios.post(`${AUTH_URL}/signup`, { email, password });
        const token = signupRes.data.token;
        const userId = signupRes.data.user.id;

        console.log('   [PASS] User created.');

        const authHeader = { headers: { Authorization: `Bearer ${token}` } };

        // 2. Get Wallet Address
        console.log('\n2. Fetching Custodial Wallet');
        const walletRes = await axios.get(`${BASE_URL}/custody/wallets`, authHeader);
        const wallet = walletRes.data.data[0];

        if (!wallet) throw new Error('No wallet created!');

        console.log(`   [PASS] Wallet Address: ${wallet.address}`);
        console.log(`   [PASS] Network: ${wallet.network}`);

        // 3. User Funding Step
        console.log('\n================================================================');
        console.log(`PLEASE FUND THIS ADDRESS ON LISK SEPOLIA: ${wallet.address}`);
        console.log('1. Send at least 0.01 LSK (ETH) for gas.');
        console.log('2. Send at least 1000 MGT (MetaGaugeToken) for subscriptions.');
        console.log('================================================================');

        await askQuestion('Press ENTER once you have sent the funds and confirmed they are on-chain...');

        // 4. Test Subscription (Tier 1: Starter, Cycle 0: Monthly)
        // Price should be handled by logic
        console.log('\n4. Testing PRIMARY Flow: Subscribe (Starter / Monthly)');
        try {
            const subRes = await axios.post(`${API_URL}/subscription/subscribe`, {
                tier: 1, // Starter
                cycle: 0  // Monthly
            }, authHeader);
            console.log('   [PASS] Subscription Tx Sent:', subRes.data.data.txHash);
        } catch (e) {
            console.error('   [FAIL] Subscribe failed:', e.response ? e.response.data : e.message);
            // Don't exit, might be Insufficient funds, useful for debugging
        }

        // 5. Verify Status (Secondary)
        console.log('\n5. Testing SECONDARY Flow: Get Status');
        const statusRes = await axios.get(`${API_URL}/subscription/status`, authHeader);
        const status = statusRes.data.data;
        console.log('   [INFO] On-Chain Status:', JSON.stringify(status, null, 2));

        if (status.isActive) {
            console.log('   [PASS] Subscription is ACTIVE on-chain.');
        } else {
            console.log('   [WARN] Subscription is NOT active (Tx might have failed or pending).');
        }

        // 6. Test Upgrade (Tier 2: Pro, Cycle 1: Yearly)
        console.log('\n6. Testing TERTIARY Flow: Upgrade (Pro / Yearly)');
        try {
            const upRes = await axios.put(`${API_URL}/subscription/upgrade`, {
                newTier: 2,
                newCycle: 1
            }, authHeader);
            console.log('   [PASS] Upgrade Tx Sent:', upRes.data.data.txHash);
        } catch (e) {
            console.error('   [FAIL] Upgrade failed:', e.response ? e.response.data : e.message);
        }

        // 7. Verify DB Reflection (CRUD)
        console.log('\n7. Verifying Database Reflection');
        // We'll call the profile or verify via API if possible, usually /auth/me or profile endpoint
        // Assuming we can check the user object again (login to refresh)
        const loginRes = await axios.post(`${AUTH_URL}/login`, { email, password });
        console.log('   [INFO] DB Subscription Status:', loginRes.data.user.subscription_status); // or similar field

        // 8. Test Cancel
        console.log('\n8. Testing TERTIARY Flow: Cancel');
        try {
            const cancelRes = await axios.post(`${API_URL}/subscription/cancel`, {}, authHeader);
            console.log('   [PASS] Cancel Tx Sent:', cancelRes.data.data.txHash);
        } catch (e) {
            console.error('   [FAIL] Cancel failed:', e.response ? e.response.data : e.message);
        }

        console.log('\n=== Test Complete ===');

    } catch (error) {
        console.error('\n[CRITICAL ERROR]', error.response ? error.response.data : error.message);
    } finally {
        rl.close();
    }
}

runTest();
