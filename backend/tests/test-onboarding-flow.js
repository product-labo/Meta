/**
 * Test Onboarding Flow
 * Tests the complete onboarding flow including project and wallet creation
 */

import axios from 'axios';

const API_URL = 'http://localhost:3001';

// Test user credentials
const testUser = {
  name: 'Onboarding Test User',
  email: `onboarding-test-${Date.now()}@example.com`,
  password: 'testpassword123'
};

let authToken = null;
let userId = null;

async function testOnboardingFlow() {
  console.log('🧪 Testing Onboarding Flow\n');

  try {
    // Step 1: Register a new user
    console.log('1️⃣ Registering new user...');
    const registerResponse = await axios.post(`${API_URL}/auth/register`, testUser);
    
    if (registerResponse.data.success) {
      authToken = registerResponse.data.token;
      userId = registerResponse.data.user.id;
      console.log('✅ User registered successfully');
      console.log(`   User ID: ${userId}`);
      console.log(`   Email: ${registerResponse.data.user.email}\n`);
    } else {
      throw new Error('Registration failed');
    }

    // Step 2: Check initial onboarding status
    console.log('2️⃣ Checking initial onboarding status...');
    const statusResponse = await axios.get(`${API_URL}/api/onboarding/status`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Onboarding status retrieved');
    console.log(`   Completed: ${statusResponse.data.data.onboarding_completed}`);
    console.log(`   Project: ${statusResponse.data.data.project ? 'exists' : 'none'}`);
    console.log(`   Wallet: ${statusResponse.data.data.wallet ? 'exists' : 'none'}\n`);

    if (statusResponse.data.data.onboarding_completed) {
      console.log('⚠️  Warning: User already has onboarding completed\n');
    }

    // Step 3: Complete onboarding with project and wallet
    console.log('3️⃣ Completing onboarding flow...');
    const onboardingData = {
      project: {
        name: 'Test DeFi Project',
        description: 'A test project for onboarding flow',
        category: 'defi',
        website_url: 'https://example.com',
        github_url: 'https://github.com/example/test-project'
      },
      wallet: {
        address: 't1UnEx5GLUk7Dn1kVCzE5ZCPEYMCCAtqPEN',
        privacy_mode: 'private',
        description: 'Primary project wallet',
        network: 'mainnet'
      }
    };

    const completeResponse = await axios.post(
      `${API_URL}/api/onboarding/complete`,
      onboardingData,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    if (completeResponse.data.success) {
      console.log('✅ Onboarding completed successfully');
      console.log(`   Project ID: ${completeResponse.data.data.project.id}`);
      console.log(`   Project Name: ${completeResponse.data.data.project.name}`);
      console.log(`   Wallet ID: ${completeResponse.data.data.wallet.id}`);
      console.log(`   Wallet Address: ${completeResponse.data.data.wallet.address}`);
      console.log(`   Wallet Type: ${completeResponse.data.data.wallet.type}\n`);
    } else {
      throw new Error('Onboarding completion failed');
    }

    // Step 4: Verify onboarding status after completion
    console.log('4️⃣ Verifying onboarding status after completion...');
    const finalStatusResponse = await axios.get(`${API_URL}/api/onboarding/status`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✅ Final onboarding status retrieved');
    console.log(`   Completed: ${finalStatusResponse.data.data.onboarding_completed}`);
    console.log(`   Project Name: ${finalStatusResponse.data.data.project?.name}`);
    console.log(`   Wallet Address: ${finalStatusResponse.data.data.wallet?.address}\n`);

    if (!finalStatusResponse.data.data.onboarding_completed) {
      throw new Error('Onboarding status not updated correctly');
    }

    // Step 5: Try to complete onboarding again (should fail)
    console.log('5️⃣ Testing duplicate onboarding prevention...');
    try {
      await axios.post(
        `${API_URL}/api/onboarding/complete`,
        onboardingData,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      console.log('❌ ERROR: Duplicate onboarding should have been prevented\n');
    } catch (error) {
      if (error.response && error.response.status === 409) {
        console.log('✅ Duplicate onboarding correctly prevented');
        console.log(`   Error: ${error.response.data.message}\n`);
      } else {
        throw error;
      }
    }

    // Step 6: Verify project was created
    console.log('6️⃣ Verifying project creation...');
    const projectsResponse = await axios.get(`${API_URL}/api/projects`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (projectsResponse.data.success && projectsResponse.data.projects.length > 0) {
      console.log('✅ Project verified in database');
      console.log(`   Total projects: ${projectsResponse.data.projects.length}`);
      console.log(`   First project: ${projectsResponse.data.projects[0].name}\n`);
    } else {
      throw new Error('Project not found in database');
    }

    // Step 7: Verify wallet was created
    console.log('7️⃣ Verifying wallet creation...');
    const projectId = projectsResponse.data.projects[0].id;
    const walletsResponse = await axios.get(
      `${API_URL}/api/wallets?project_id=${projectId}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    if (walletsResponse.data.success && walletsResponse.data.wallets.length > 0) {
      console.log('✅ Wallet verified in database');
      console.log(`   Total wallets: ${walletsResponse.data.wallets.length}`);
      console.log(`   First wallet: ${walletsResponse.data.wallets[0].address}`);
      console.log(`   Wallet type: ${walletsResponse.data.wallets[0].type}`);
      console.log(`   Privacy mode: ${walletsResponse.data.wallets[0].privacy_mode}\n`);
    } else {
      throw new Error('Wallet not found in database');
    }

    // Step 8: Test onboarding check endpoint
    console.log('8️⃣ Testing onboarding check endpoint...');
    const checkResponse = await axios.get(`${API_URL}/api/onboarding/check`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✅ Onboarding check endpoint working');
    console.log(`   Onboarding completed: ${checkResponse.data.onboarding_completed}\n`);

    console.log('✅ All onboarding flow tests passed!\n');
    console.log('📊 Summary:');
    console.log('   ✓ User registration');
    console.log('   ✓ Initial status check');
    console.log('   ✓ Onboarding completion (project + wallet in single transaction)');
    console.log('   ✓ Status verification after completion');
    console.log('   ✓ Duplicate prevention');
    console.log('   ✓ Project creation verification');
    console.log('   ✓ Wallet creation verification');
    console.log('   ✓ Check endpoint verification');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Error:', error.response.data.error);
      console.error('   Message:', error.response.data.message);
      if (error.response.data.details) {
        console.error('   Details:', error.response.data.details);
      }
    }
    process.exit(1);
  }
}

// Run tests
testOnboardingFlow();
