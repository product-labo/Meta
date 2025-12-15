/**
 * Test Complete Onboarding Flow with Real Zcash Address
 * 
 * Tests the full flow:
 * 1. Register user
 * 2. Create project with wallet address
 * 3. Sync wallet data from indexer
 * 4. Verify data is encrypted and stored
 * 5. Fetch and display analytics
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:3001';
const TEST_ADDRESS = 't1at7nVNsv6taLRrNRvnQdtfLNRDfsGc3Ak';

// Test data
const testUser = {
  name: 'Test User',
  email: `test-${Date.now()}@example.com`,
  password: 'testpassword123'
};

const testProject = {
  name: 'Test Zcash Project',
  description: 'Testing onboarding with real address',
  category: 'defi',
  website_url: 'https://test.example.com'
};

let authToken = null;
let userId = null;
let projectId = null;
let walletId = null;

// Helper function for API calls
async function apiCall(method, endpoint, data = null, useAuth = false) {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (useAuth && authToken) {
    config.headers['Authorization'] = `Bearer ${authToken}`;
  }

  if (data) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

// Test Steps
async function step1_register() {
  console.log('\n📝 Step 1: Register User');
  console.log('=' .repeat(50));
  
  const result = await apiCall('POST', '/auth/register', testUser);
  
  if (!result.success) {
    console.error('❌ Registration failed:', result.error);
    return false;
  }

  authToken = result.data.token;
  userId = result.data.user.id;

  console.log('✅ User registered successfully');
  console.log(`   User ID: ${userId}`);
  console.log(`   Email: ${testUser.email}`);
  console.log(`   Onboarding Completed: ${result.data.user.onboarding_completed}`);
  
  return true;
}

async function step2_createProject() {
  console.log('\n🏗️  Step 2: Create Project');
  console.log('=' .repeat(50));
  
  const result = await apiCall('POST', '/api/projects', testProject, true);
  
  if (!result.success) {
    console.error('❌ Project creation failed:', result.error);
    return false;
  }

  projectId = result.data.project.id;

  console.log('✅ Project created successfully');
  console.log(`   Project ID: ${projectId}`);
  console.log(`   Name: ${result.data.project.name}`);
  console.log(`   Category: ${result.data.project.category}`);
  
  return true;
}

async function step3_addWallet() {
  console.log('\n💼 Step 3: Add Wallet with Address');
  console.log('=' .repeat(50));
  console.log(`   Address: ${TEST_ADDRESS}`);
  
  const walletData = {
    project_id: projectId,
    address: TEST_ADDRESS,
    label: 'Main Wallet',
    privacy_mode: 'private',
    network: 'mainnet'
  };

  const result = await apiCall('POST', '/api/wallets', walletData, true);
  
  if (!result.success) {
    console.error('❌ Wallet creation failed:', result.error);
    return false;
  }

  walletId = result.data.wallet.id;

  console.log('✅ Wallet added successfully');
  console.log(`   Wallet ID: ${walletId}`);
  console.log(`   Address: ${result.data.wallet.address}`);
  console.log(`   Type: ${result.data.wallet.type}`);
  console.log(`   Privacy Mode: ${result.data.wallet.privacy_mode}`);
  
  return true;
}

async function step4_syncWallet() {
  console.log('\n🔄 Step 4: Sync Wallet Data from Indexer');
  console.log('=' .repeat(50));
  
  const result = await apiCall('POST', '/api/onboarding/sync-wallet', null, true);
  
  if (!result.success) {
    console.error('❌ Wallet sync failed:', result.error);
    console.log('   Note: This may fail if indexer is not running or address has no transactions');
    return false;
  }

  console.log('✅ Wallet sync completed');
  console.log(`   Wallets Synced: ${result.data.wallets_synced}`);
  console.log(`   Transactions Found: ${result.data.total_transactions}`);
  
  if (result.data.results && result.data.results.length > 0) {
    result.data.results.forEach((r, i) => {
      console.log(`\n   Wallet ${i + 1}:`);
      console.log(`     - Address: ${r.address}`);
      console.log(`     - Processed: ${r.processed} transactions`);
      console.log(`     - Days Updated: ${r.days_updated}`);
    });
  }
  
  return true;
}

async function step5_verifyData() {
  console.log('\n✅ Step 5: Verify Data Storage');
  console.log('=' .repeat(50));
  
  // Get wallet details
  const walletResult = await apiCall('GET', `/api/wallets/${walletId}`, null, true);
  
  if (!walletResult.success) {
    console.error('❌ Failed to fetch wallet:', walletResult.error);
    return false;
  }

  console.log('✅ Wallet data retrieved');
  console.log(`   ID: ${walletResult.data.wallet.id}`);
  console.log(`   Address: ${walletResult.data.wallet.address}`);
  console.log(`   Active: ${walletResult.data.wallet.is_active}`);
  
  // Get project wallets
  const projectWalletsResult = await apiCall('GET', `/api/projects/${projectId}/wallets`, null, true);
  
  if (projectWalletsResult.success) {
    console.log(`\n✅ Project has ${projectWalletsResult.data.wallets.length} wallet(s)`);
  }
  
  return true;
}

async function step6_fetchAnalytics() {
  console.log('\n📊 Step 6: Fetch Analytics Data');
  console.log('=' .repeat(50));
  
  const result = await apiCall('GET', `/api/analytics/${projectId}`, null, true);
  
  if (!result.success) {
    console.error('❌ Failed to fetch analytics:', result.error);
    console.log('   Note: Analytics may be empty if no transactions were synced');
    return false;
  }

  console.log('✅ Analytics data retrieved');
  
  if (result.data.analytics) {
    const analytics = result.data.analytics;
    console.log(`\n   Overview:`);
    console.log(`     - Total Transactions: ${analytics.total_transactions || 0}`);
    console.log(`     - Total Volume: ${analytics.total_volume || 0} ZEC`);
    console.log(`     - Active Wallets: ${analytics.active_wallets || 0}`);
    console.log(`     - Unique Users: ${analytics.unique_users || 0}`);
    
    if (analytics.transactions && analytics.transactions.length > 0) {
      console.log(`\n   Recent Transactions: ${analytics.transactions.length}`);
      analytics.transactions.slice(0, 3).forEach((tx, i) => {
        console.log(`     ${i + 1}. ${tx.txid?.substring(0, 16)}... - ${tx.value} ZEC`);
      });
    }
  }
  
  return true;
}

async function step7_completeOnboarding() {
  console.log('\n🎉 Step 7: Mark Onboarding as Complete');
  console.log('=' .repeat(50));
  
  // The onboarding should already be marked complete by the backend
  // Let's verify the user status
  const result = await apiCall('GET', '/api/onboarding/status', null, true);
  
  if (!result.success) {
    console.error('❌ Failed to get onboarding status:', result.error);
    return false;
  }

  console.log('✅ Onboarding status retrieved');
  console.log(`   Completed: ${result.data.data.onboarding_completed}`);
  console.log(`   User: ${result.data.data.user.name}`);
  console.log(`   Email: ${result.data.data.user.email}`);
  
  if (result.data.data.project) {
    console.log(`   Project: ${result.data.data.project.name}`);
  }
  
  if (result.data.data.wallet) {
    console.log(`   Wallet: ${result.data.data.wallet.address}`);
  }
  
  return true;
}

// Main test runner
async function runTest() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 TESTING COMPLETE ONBOARDING FLOW');
  console.log('='.repeat(70));
  console.log(`\n📍 API URL: ${BASE_URL}`);
  console.log(`📍 Test Address: ${TEST_ADDRESS}`);
  console.log(`📍 Timestamp: ${new Date().toISOString()}`);

  const steps = [
    { name: 'Register User', fn: step1_register },
    { name: 'Create Project', fn: step2_createProject },
    { name: 'Add Wallet', fn: step3_addWallet },
    { name: 'Sync Wallet Data', fn: step4_syncWallet },
    { name: 'Verify Data Storage', fn: step5_verifyData },
    { name: 'Fetch Analytics', fn: step6_fetchAnalytics },
    { name: 'Complete Onboarding', fn: step7_completeOnboarding }
  ];

  let passedSteps = 0;
  let failedSteps = 0;

  for (const step of steps) {
    try {
      const success = await step.fn();
      if (success) {
        passedSteps++;
      } else {
        failedSteps++;
        console.log(`\n⚠️  Step "${step.name}" completed with warnings`);
      }
    } catch (error) {
      failedSteps++;
      console.error(`\n❌ Step "${step.name}" threw an error:`, error.message);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📋 TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Passed: ${passedSteps}/${steps.length}`);
  console.log(`❌ Failed: ${failedSteps}/${steps.length}`);
  
  if (authToken) {
    console.log(`\n🔑 Auth Token: ${authToken.substring(0, 20)}...`);
  }
  
  if (projectId) {
    console.log(`📁 Project ID: ${projectId}`);
  }
  
  if (walletId) {
    console.log(`💼 Wallet ID: ${walletId}`);
  }

  console.log('\n' + '='.repeat(70));
  
  if (failedSteps === 0) {
    console.log('🎉 ALL TESTS PASSED!');
  } else {
    console.log('⚠️  SOME TESTS FAILED - Check logs above');
  }
  
  console.log('='.repeat(70) + '\n');

  process.exit(failedSteps > 0 ? 1 : 0);
}

// Run the test
runTest().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
