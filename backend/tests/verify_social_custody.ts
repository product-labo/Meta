
import axios from 'axios';
import * as crypto from 'crypto';

const BASE_URL = 'http://localhost:3004';
const AUTH_URL = `${BASE_URL}/auth`;
const CUSTODY_URL = `${BASE_URL}/custody`;

// Mock mock
const mockSocialUser = {
    email: `social-${Date.now()}@example.com`,
    name: 'Social Test User',
    avatar: 'https://example.com/avatar.png',
    provider: 'google',
    providerId: `google-id-${Date.now()}`
};

async function runTests() {
    console.log('=== Testing Social Login & Custody ===\n');

    try {
        // 1. Test Social Login (Create New User)
        console.log('1. Testing Social Login (Signup)...');
        const loginRes = await axios.post(`${AUTH_URL}/social-login`, mockSocialUser);
        console.log('   ✓ Login successful');
        console.log(`   Token: ${loginRes.data.token ? 'Received' : 'Missing'}`);
        console.log(`   User ID: ${loginRes.data.user.id}`);
        console.log(`   Is New: ${loginRes.data.user.is_new}`);

        const token = loginRes.data.token;
        const headers = { Authorization: `Bearer ${token}` };

        // 2. Test Social Login (Existing User)
        console.log('\n2. Testing Social Login (Existing User)...');
        const reloginRes = await axios.post(`${AUTH_URL}/social-login`, mockSocialUser);
        console.log('   ✓ Relogin successful');
        console.log(`   Is New: ${reloginRes.data.user.is_new} (Should be false)`);

        // 3. Create Custodial Wallet
        console.log('\n3. Creating Custodial Wallet...');
        const createRes = await axios.post(
            `${CUSTODY_URL}/wallets`,
            { projectId: null },
            { headers }
        );
        console.log('   ✓ Wallet created');
        console.log(`   ID: ${createRes.data.data.id}`);
        console.log(`   Address: ${createRes.data.data.address}`);
        console.log(`   Network: ${createRes.data.data.network}`);

        // 4. List Custodial Wallets
        console.log('\n4. Listing Custodial Wallets...');
        const listRes = await axios.get(`${CUSTODY_URL}/wallets`, { headers });
        console.log(`   ✓ Retrieved ${listRes.data.data.length} wallets`);
        console.log(`   First wallet address: ${listRes.data.data[0].address}`);

        console.log('\n=== All Tests Passed ===');

    } catch (error: any) {
        console.error('\n✗ Test failed:', error.message);
        if (error.response) {
            console.error('  Response:', error.response.data);
        }
        process.exit(1);
    }
}

// Check server health
axios.get(`${BASE_URL}/health`).then(runTests).catch(() => {
    console.error('Server not running on port 3003');
});
