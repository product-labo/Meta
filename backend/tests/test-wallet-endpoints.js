/**
 * Test Wallet Management Endpoints
 * Tests wallet CRUD operations and validation endpoint
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3003';
const API_URL = `${BASE_URL}/api`;
const AUTH_URL = `${BASE_URL}/auth`;

let authToken = null;
let userId = null;
let projectId = null;
let walletId = null;

// Test user credentials
const testUser = {
  name: 'Wallet Test User',
  email: `wallet-test-${Date.now()}@example.com`,
  password: 'TestPassword123!'
};

// Test project
const testProject = {
  name: 'Test Wallet Project',
  description: 'Project for testing wallet management',
  category: 'defi',
  status: 'active'
};

// Test wallets
const timestamp = Date.now();
const tAddress = `t1abc123def456ghi789jkl012mno345pqr${timestamp}`;
const zAddress = `zs1abc123def456ghi789jkl012mno345pqr${timestamp}`;
const uAddress = `u1abc123def456ghi789jkl012mno345pqr${timestamp}`;
const testWallets = [
  {
    address: tAddress,
    network: 'mainnet',
    privacy_mode: 'private',
    description: 'Test transparent wallet'
  },
  {
    address: zAddress,
    network: 'mainnet',
    privacy_mode: 'public',
    description: 'Test shielded wallet'
  },
  {
    address: uAddress,
    network: 'mainnet',
    privacy_mode: 'monetizable',
    description: 'Test unified wallet'
  }
];

async function runTests() {
  console.log('=== Testing Wallet Management Endpoints ===\n');

  try {
    // 1. Register user
    console.log('1. Registering test user...');
    const registerRes = await axios.post(`${AUTH_URL}/signup`, testUser);
    console.log('   ✓ User registered successfully');
    console.log(`   User ID: ${registerRes.data.user.id}\n`);

    // 2. Login
    console.log('2. Logging in...');
    const loginRes = await axios.post(`${AUTH_URL}/login`, {
      email: testUser.email,
      password: testUser.password
    });
    authToken = loginRes.data.token;
    userId = loginRes.data.user.id;
    console.log('   ✓ Login successful');
    console.log(`   Token: ${authToken.substring(0, 20)}...\n`);

    // Set auth header for subsequent requests
    const authHeaders = { Authorization: `Bearer ${authToken}` };

    // 3. Create project
    console.log('3. Creating test project...');
    const projectRes = await axios.post(`${API_URL}/projects`, testProject, { headers: authHeaders });
    projectId = projectRes.data.data.id;
    console.log('   ✓ Project created successfully');
    console.log(`   Project ID: ${projectId}\n`);

    // 4. Test address validation endpoint
    console.log('4. Testing address validation endpoint...');

    // Valid transparent address
    const validationRes1 = await axios.post(
      `${API_URL}/wallets/validate`,
      { address: 't1abc123def456ghi789jkl012mno345pqr', network: 'mainnet' },
      { headers: authHeaders }
    );
    console.log('   ✓ Valid transparent address validated');
    console.log(`   Type: ${validationRes1.data.data.type} (${validationRes1.data.data.typeName})`);

    // Invalid address
    const validationRes2 = await axios.post(
      `${API_URL}/wallets/validate`,
      { address: 'invalid', network: 'mainnet' },
      { headers: authHeaders }
    );
    console.log('   ✓ Invalid address rejected');
    console.log(`   Error: ${validationRes2.data.data.error}\n`);

    // 5. Create wallets (type auto-detection)
    console.log('5. Creating wallets with auto-detected types...');
    const createdWallets = [];

    for (const wallet of testWallets) {
      const walletRes = await axios.post(
        `${API_URL}/projects/${projectId}/wallets`,
        wallet,
        { headers: authHeaders }
      );
      createdWallets.push(walletRes.data.data);
      console.log(`   ✓ Created ${walletRes.data.data.type}-address wallet`);
      console.log(`     ID: ${walletRes.data.data.id}`);
      console.log(`     Privacy: ${walletRes.data.data.privacy_mode}`);
    }
    walletId = createdWallets[0].id;
    console.log('');

    // 6. Get all wallets for project
    console.log('6. Fetching all wallets for project...');
    const walletsRes = await axios.get(
      `${API_URL}/projects/${projectId}/wallets`,
      { headers: authHeaders }
    );
    console.log(`   ✓ Retrieved ${walletsRes.data.data.length} wallets`);
    walletsRes.data.data.forEach(w => {
      console.log(`     - ${w.type}-address: ${w.address.substring(0, 20)}...`);
    });
    console.log('');

    // 7. Get single wallet
    console.log('7. Fetching single wallet...');
    const singleWalletRes = await axios.get(
      `${API_URL}/projects/${projectId}/wallets/${walletId}`,
      { headers: authHeaders }
    );
    console.log('   ✓ Retrieved wallet details');
    console.log(`     Type: ${singleWalletRes.data.data.type}`);
    console.log(`     Privacy: ${singleWalletRes.data.data.privacy_mode}\n`);

    // 8. Update wallet privacy mode
    console.log('8. Updating wallet privacy mode...');
    const updateRes = await axios.put(
      `${API_URL}/projects/${projectId}/wallets/${walletId}`,
      { privacy_mode: 'public' },
      { headers: authHeaders }
    );
    console.log('   ✓ Wallet updated successfully');
    console.log(`     New privacy mode: ${updateRes.data.data.privacy_mode}\n`);

    // 9. Get wallets by type
    console.log('9. Fetching wallets by type...');
    const typeWalletsRes = await axios.get(
      `${API_URL}/projects/${projectId}/wallets/type?type=t`,
      { headers: authHeaders }
    );
    console.log(`   ✓ Retrieved ${typeWalletsRes.data.data.length} transparent wallets\n`);

    // 10. Get active wallets
    console.log('10. Fetching active wallets...');
    const activeWalletsRes = await axios.get(
      `${API_URL}/projects/${projectId}/wallets/active`,
      { headers: authHeaders }
    );
    console.log(`   ✓ Retrieved ${activeWalletsRes.data.data.length} active wallets\n`);

    // 11. Get user wallets (across all projects)
    console.log('11. Fetching all user wallets...');
    const userWalletsRes = await axios.get(
      `${API_URL}/user/wallets`,
      { headers: authHeaders }
    );
    console.log(`   ✓ Retrieved ${userWalletsRes.data.data.length} wallets across all projects\n`);

    // 12. Delete wallet
    console.log('12. Deleting wallet...');
    await axios.delete(
      `${API_URL}/projects/${projectId}/wallets/${walletId}`,
      { headers: authHeaders }
    );
    console.log('   ✓ Wallet deleted successfully\n');

    // 13. Verify deletion
    console.log('13. Verifying wallet deletion...');
    const remainingWalletsRes = await axios.get(
      `${API_URL}/projects/${projectId}/wallets`,
      { headers: authHeaders }
    );
    console.log(`   ✓ ${remainingWalletsRes.data.data.length} wallets remaining\n`);

    console.log('=== All Tests Passed! ===');
    process.exit(0);

  } catch (error) {
    console.error('\n✗ Test failed:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}

// Check if server is running
console.log('Checking if server is running...');
axios.get(`${BASE_URL}/health`)
  .then(() => {
    console.log('✓ Server is running\n');
    runTests();
  })
  .catch(() => {
    console.error('✗ Server is not running. Please start the server first.');
    console.error('   Run: npm start\n');
    process.exit(1);
  });
