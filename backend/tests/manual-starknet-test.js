
import axios from 'axios';
import readline from 'readline';

const BASE_URL = 'http://localhost:3002'; // Verify port
const API_URL = `${BASE_URL}/api`;
const AUTH_URL = `${BASE_URL}/auth`;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (query) => new Promise(resolve => rl.question(query, resolve));

async function runTest() {
    console.log('=== Starknet Subscription Verification Test ===');

    try {
        // 1. Signup / Login
        const email = `stark_test_${Date.now()}@example.com`;
        const password = 'TestPassword123!';

        console.log(`\n1. Creating Test User: ${email}`);
        const signupRes = await axios.post(`${AUTH_URL}/signup`, { email, password });
        const token = signupRes.data.token;
        const userId = signupRes.data.user.id;

        console.log('   [PASS] User created.');

        const authHeader = { headers: { Authorization: `Bearer ${token}` } };

        // 2. Create Starknet Wallet
        console.log('\n2. Creating Custodial Starknet Wallet');
        const walletRes = await axios.post(`${BASE_URL}/custody/wallets`, {
            network: 'starknet-sepolia'
        }, authHeader);

        const wallet = walletRes.data.data;
        console.log(`   [PASS] Starknet Address: ${wallet.address}`);
        console.log(`   [PASS] Network: ${wallet.network}`);

        // 3. User Funding
        console.log('\n================================================================');
        console.log(`PLEASE FUND THIS STARKNET ADDRESS: ${wallet.address}`);
        console.log('Send at least 0.02 ETH (Sepolia) to cover "Deployment" + "Transfer".');
        console.log('Use Starknet Faucet or Bridge.');
        console.log('================================================================');

        await askQuestion('Press ENTER once you have sent the funds and confirmed they are on-chain...');

        // 4. Test Subscription (Starknet ETH)
        console.log('\n4. Testing Subscription via Starknet Transfer');
        try {
            const subRes = await axios.post(`${API_URL}/subscription/subscribe`, {
                tier: 2, // Pro
                cycle: 0, // Monthly
                currency: 'starknet_eth' // NEW PARAM
            }, authHeader);
            console.log('   [PASS] Starknet Tx Sent:', subRes.data.data.txHash);
            console.log('   [PASS] Message:', subRes.data.data.message);
        } catch (e) {
            console.error('   [FAIL] Subscribe failed:', e.response ? e.response.data : e.message);
        }

        console.log('\n=== Test Complete ===');

    } catch (error) {
        console.error('\n[CRITICAL ERROR]', error.response ? error.response.data : error.message);
    } finally {
        rl.close();
    }
}

runTest();
