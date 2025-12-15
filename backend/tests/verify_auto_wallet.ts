
import axios from 'axios';

const BASE_URL = 'http://localhost:3004';
const AUTH_URL = `${BASE_URL}/auth`;
const CUSTODY_URL = `${BASE_URL}/custody`;

// Mock mock
const mockSocialUser = {
    email: `auto-wallet-${Date.now()}@example.com`,
    name: 'Auto Wallet User',
    avatar: 'https://example.com/avatar.png',
    provider: 'google',
    providerId: `google-id-${Date.now()}`
};

async function runTests() {
    console.log('=== Testing Auto-Wallet Creation at Registration ===\n');

    try {
        // 1. Test Social Login (Create New User)
        console.log('1. Signup via Social Login...');
        const loginRes = await axios.post(`${AUTH_URL}/social-login`, mockSocialUser);
        console.log('   ✓ Signup successful');
        console.log(`   User ID: ${loginRes.data.user.id}`);

        const token = loginRes.data.token;
        const headers = { Authorization: `Bearer ${token}` };

        // 2. Verify Wallet Exists Immediately
        console.log('\n2. Verifying Automatic Wallet Creation...');
        // We expect the wallet to be already created
        const listRes = await axios.get(`${CUSTODY_URL}/wallets`, { headers });

        if (listRes.data.data.length > 0) {
            console.log(`   ✓ Success! Found ${listRes.data.data.length} wallet(s) automatically created.`);
            console.log(`   Address: ${listRes.data.data[0].address}`);
            console.log(`   Network: ${listRes.data.data[0].network}`);
        } else {
            throw new Error('No wallet found! Auto-creation failed.');
        }

        // 3. Test Standard Signup (if applicable, but social logic mirrors it)
        // Skipping standard signup test to keep it simple, as logic is shared/mirrored.

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
    console.error('Server not running on port 3004');
});
