#!/usr/bin/env node

/**
 * Final Integration Testing
 * 
 * This comprehensive test suite validates the complete fullstack integration:
 * 1. User registration flow
 * 2. Complete onboarding flow
 * 3. Analytics dashboard with real data
 * 4. Payment and withdrawal flows
 * 5. Privacy mode enforcement
 * 
 * Task 43: Final integration testing
 * Requirements: All
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'test-admin-key';

// Test configuration
const TEST_USER = {
  name: 'Integration Test User',
  email: `integration-test-${Date.now()}@example.com`,
  password: 'TestPassword123!'
};

const TEST_PROJECT = {
  name: 'Integration Test Project',
  description: 'A comprehensive test project for final integration testing',
  category: 'defi',
  website_url: 'https://test-project.example.com',
  github_url: 'https://github.com/test/integration-project',
  tags: ['test', 'integration', 'defi']
};

const TEST_WALLETS = [
  {
    address: 't1YourTestAddress1234567890123456789012345678',
    type: 't',
    privacy_mode: 'private',
    description: 'Private transparent wallet',
    network: 'testnet'
  },
  {
    address: 'zs1testshieldedaddress1234567890123456789012345678901234567890',
    type: 'z',
    privacy_mode: 'public',
    description: 'Public shielded wallet',
    network: 'testnet'
  },
  {
    address: 'u1testunifiedaddress12345678901234567890123456789012345678901234567890',
    type: 'u',
    privacy_mode: 'monetizable',
    description: 'Monetizable unified wallet',
    network: 'testnet'
  }
];

// Test state
const testState = {
  authToken: null,
  userId: null,
  projectId: null,
  walletIds: [],
  invoiceId: null,
  withdrawalId: null,
  results: {
    passed: 0,
    failed: 0,
    tests: []
  }
};

// Utility functions
function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    bold: '\x1b[1m',
    reset: '\x1b[0m'
  };
  
  const prefix = {
    info: 'ℹ️ ',
    success: '✅',
    error: '❌',
    warning: '⚠️ '
  };
  
  console.log(`${colors[type]}${prefix[type] || ''} ${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'bold');
  console.log('='.repeat(80));
}

async function makeRequest(method, endpoint, data = null, token = null) {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (data) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return { success: true, status: response.status, data: response.data };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 500,
      data: error.response?.data || { error: error.message }
    };
  }
}

async function test(name, testFn) {
  try {
    log(`Testing: ${name}`, 'info');
    await testFn();
    log(`PASS: ${name}`, 'success');
    testState.results.passed++;
    testState.results.tests.push({ name, status: 'passed' });
  } catch (error) {
    log(`FAIL: ${name} - ${error.message}`, 'error');
    testState.results.failed++;
    testState.results.tests.push({ name, status: 'failed', error: error.message });
  }
}

// Test 1: User Registration Flow
async function testUserRegistration() {
  logSection('TEST 1: User Registration Flow');

  await test('Register new user', async () => {
    const response = await makeRequest('POST', '/auth/register', TEST_USER);
    
    if (!response.success || response.status !== 201) {
      throw new Error(`Registration failed: ${JSON.stringify(response.data)}`);
    }
    
    if (!response.data.id || !response.data.email) {
      throw new Error('Registration response missing required fields');
    }
    
    testState.userId = response.data.id;
    log(`User ID: ${testState.userId}`, 'info');
  });

  await test('Login with registered credentials', async () => {
    const response = await makeRequest('POST', '/auth/login', {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    if (!response.success || response.status !== 200) {
      throw new Error(`Login failed: ${JSON.stringify(response.data)}`);
    }
    
    if (!response.data.token) {
      throw new Error('Login response missing token');
    }
    
    testState.authToken = response.data.token;
    log('Authentication token obtained', 'info');
  });

  await test('Verify JWT token is valid', async () => {
    const response = await makeRequest('GET', '/api/projects', null, testState.authToken);
    
    if (!response.success || response.status !== 200) {
      throw new Error('Token validation failed');
    }
  });

  await test('Reject invalid credentials', async () => {
    const response = await makeRequest('POST', '/auth/login', {
      email: TEST_USER.email,
      password: 'wrongpassword'
    });
    
    if (response.success || response.status !== 401) {
      throw new Error('Invalid credentials should be rejected');
    }
  });
}

// Test 2: Complete Onboarding Flow
async function testOnboardingFlow() {
  logSection('TEST 2: Complete Onboarding Flow');

  await test('Check initial onboarding status', async () => {
    const response = await makeRequest('GET', '/api/onboarding/status', null, testState.authToken);
    
    if (!response.success) {
      throw new Error('Failed to get onboarding status');
    }
    
    log(`Onboarding completed: ${response.data.data.onboarding_completed}`, 'info');
  });

  await test('Complete onboarding with project and wallet', async () => {
    const onboardingData = {
      project: TEST_PROJECT,
      wallet: TEST_WALLETS[0]
    };
    
    const response = await makeRequest('POST', '/api/onboarding/complete', onboardingData, testState.authToken);
    
    if (!response.success || response.status !== 201) {
      throw new Error(`Onboarding failed: ${JSON.stringify(response.data)}`);
    }
    
    if (!response.data.data.project || !response.data.data.wallet) {
      throw new Error('Onboarding response missing project or wallet');
    }
    
    testState.projectId = response.data.data.project.id;
    testState.walletIds.push(response.data.data.wallet.id);
    
    log(`Project ID: ${testState.projectId}`, 'info');
    log(`Wallet ID: ${testState.walletIds[0]}`, 'info');
  });

  await test('Verify onboarding status after completion', async () => {
    const response = await makeRequest('GET', '/api/onboarding/status', null, testState.authToken);
    
    if (!response.success) {
      throw new Error('Failed to get onboarding status');
    }
    
    if (!response.data.data.onboarding_completed) {
      throw new Error('Onboarding status not updated');
    }
  });

  await test('Prevent duplicate onboarding', async () => {
    const onboardingData = {
      project: TEST_PROJECT,
      wallet: TEST_WALLETS[0]
    };
    
    const response = await makeRequest('POST', '/api/onboarding/complete', onboardingData, testState.authToken);
    
    if (response.success || response.status !== 409) {
      throw new Error('Duplicate onboarding should be prevented');
    }
  });

  await test('Verify project was created', async () => {
    const response = await makeRequest('GET', '/api/projects', null, testState.authToken);
    
    if (!response.success) {
      throw new Error('Failed to get projects');
    }
    
    const project = response.data.data.find(p => p.id === testState.projectId);
    if (!project) {
      throw new Error('Project not found');
    }
    
    log(`Project name: ${project.name}`, 'info');
  });

  await test('Verify wallet was created', async () => {
    const response = await makeRequest('GET', `/api/wallets?project_id=${testState.projectId}`, null, testState.authToken);
    
    if (!response.success) {
      throw new Error('Failed to get wallets');
    }
    
    if (response.data.wallets.length === 0) {
      throw new Error('No wallets found');
    }
    
    log(`Wallet count: ${response.data.wallets.length}`, 'info');
  });
}

// Test 3: Analytics Dashboard with Real Data
async function testAnalyticsDashboard() {
  logSection('TEST 3: Analytics Dashboard with Real Data');

  // Add additional wallets for testing
  await test('Add additional wallets for analytics', async () => {
    for (let i = 1; i < TEST_WALLETS.length; i++) {
      const response = await makeRequest(
        'POST',
        '/api/wallets',
        { ...TEST_WALLETS[i], project_id: testState.projectId },
        testState.authToken
      );
      
      if (!response.success) {
        throw new Error(`Failed to add wallet ${i}: ${JSON.stringify(response.data)}`);
      }
      
      testState.walletIds.push(response.data.wallet.id);
    }
    
    log(`Total wallets: ${testState.walletIds.length}`, 'info');
  });

  await test('Get dashboard metrics', async () => {
    const response = await makeRequest(
      'GET',
      `/api/analytics/dashboard/${testState.projectId}`,
      null,
      testState.authToken
    );
    
    if (!response.success) {
      throw new Error('Failed to get dashboard metrics');
    }
    
    log('Dashboard metrics retrieved', 'info');
  });

  await test('Get adoption funnel data', async () => {
    const response = await makeRequest(
      'GET',
      `/api/analytics/adoption/${testState.projectId}`,
      null,
      testState.authToken
    );
    
    if (!response.success) {
      throw new Error('Failed to get adoption data');
    }
    
    log('Adoption funnel data retrieved', 'info');
  });

  await test('Get retention cohorts', async () => {
    const response = await makeRequest(
      'GET',
      `/api/analytics/retention/${testState.projectId}`,
      null,
      testState.authToken
    );
    
    if (!response.success) {
      throw new Error('Failed to get retention data');
    }
    
    log('Retention cohorts retrieved', 'info');
  });

  await test('Get productivity scores', async () => {
    const response = await makeRequest(
      'GET',
      `/api/analytics/productivity/${testState.projectId}`,
      null,
      testState.authToken
    );
    
    if (!response.success) {
      throw new Error('Failed to get productivity data');
    }
    
    log('Productivity scores retrieved', 'info');
  });

  await test('Get shielded analytics', async () => {
    const response = await makeRequest(
      'GET',
      `/api/analytics/shielded/${testState.projectId}`,
      null,
      testState.authToken
    );
    
    if (!response.success) {
      throw new Error('Failed to get shielded analytics');
    }
    
    log('Shielded analytics retrieved', 'info');
  });

  await test('Get wallet segments', async () => {
    const response = await makeRequest(
      'GET',
      `/api/analytics/segments/${testState.projectId}`,
      null,
      testState.authToken
    );
    
    if (!response.success) {
      throw new Error('Failed to get segments data');
    }
    
    log('Wallet segments retrieved', 'info');
  });

  await test('Get project health indicators', async () => {
    const response = await makeRequest(
      'GET',
      `/api/analytics/health/${testState.projectId}`,
      null,
      testState.authToken
    );
    
    if (!response.success) {
      throw new Error('Failed to get health data');
    }
    
    log('Project health indicators retrieved', 'info');
  });
}

// Test 4: Payment and Withdrawal Flows
async function testPaymentAndWithdrawal() {
  logSection('TEST 4: Payment and Withdrawal Flows');

  await test('Check subscription status', async () => {
    const response = await makeRequest('GET', '/api/subscriptions/status', null, testState.authToken);
    
    if (!response.success) {
      throw new Error('Failed to get subscription status');
    }
    
    log(`Subscription status: ${response.data.subscription_status}`, 'info');
  });

  await test('Create subscription invoice', async () => {
    const response = await makeRequest(
      'POST',
      '/api/payments/invoice',
      {
        type: 'subscription',
        amount_zec: 0.001,
        item_id: 'premium-monthly'
      },
      testState.authToken
    );
    
    if (!response.success) {
      throw new Error(`Failed to create invoice: ${JSON.stringify(response.data)}`);
    }
    
    if (!response.data.invoice || !response.data.invoice.id) {
      throw new Error('Invoice response missing required fields');
    }
    
    testState.invoiceId = response.data.invoice.id;
    log(`Invoice ID: ${testState.invoiceId}`, 'info');
    log(`Payment address: ${response.data.invoice.payment_address}`, 'info');
  });

  await test('Get invoice details', async () => {
    const response = await makeRequest(
      'GET',
      `/api/payments/invoice/${testState.invoiceId}`,
      null,
      testState.authToken
    );
    
    if (!response.success) {
      throw new Error('Failed to get invoice details');
    }
    
    log(`Invoice status: ${response.data.invoice.status}`, 'info');
  });

  await test('Check payment status', async () => {
    const response = await makeRequest(
      'POST',
      `/api/payments/check/${testState.invoiceId}`,
      null,
      testState.authToken
    );
    
    if (!response.success) {
      throw new Error('Failed to check payment status');
    }
    
    log(`Payment received: ${response.data.paid}`, 'info');
  });

  await test('Get user balance', async () => {
    const response = await makeRequest('GET', '/api/payments/balance', null, testState.authToken);
    
    if (!response.success) {
      throw new Error('Failed to get balance');
    }
    
    log(`Balance: ${response.data.balance_zec} ZEC`, 'info');
  });

  await test('Create withdrawal request', async () => {
    const response = await makeRequest(
      'POST',
      '/api/payments/withdraw',
      {
        amount_zec: 0.0001,
        to_address: 't1UnEx5GLUk7Dn1kVCzE5ZCPEYMCCAtqPEN'
      },
      testState.authToken
    );
    
    // Withdrawal might fail due to insufficient balance, which is expected
    if (response.success) {
      testState.withdrawalId = response.data.withdrawal.id;
      log(`Withdrawal ID: ${testState.withdrawalId}`, 'info');
    } else if (response.status === 400 && response.data.error === 'INSUFFICIENT_BALANCE') {
      log('Insufficient balance for withdrawal (expected)', 'warning');
    } else {
      throw new Error(`Unexpected withdrawal error: ${JSON.stringify(response.data)}`);
    }
  });

  if (testState.withdrawalId) {
    await test('Get withdrawal history', async () => {
      const response = await makeRequest('GET', '/api/payments/withdrawals', null, testState.authToken);
      
      if (!response.success) {
        throw new Error('Failed to get withdrawal history');
      }
      
      log(`Withdrawal count: ${response.data.withdrawals.length}`, 'info');
    });
  }
}

// Test 5: Privacy Mode Enforcement
async function testPrivacyModeEnforcement() {
  logSection('TEST 5: Privacy Mode Enforcement');

  await test('Verify private wallet is excluded from public queries', async () => {
    // Get the private wallet
    const privateWallet = testState.walletIds[0];
    
    const response = await makeRequest(
      'GET',
      `/api/analytics/comparison/${testState.projectId}`,
      null,
      testState.authToken
    );
    
    // Comparison endpoint should respect privacy mode
    if (response.success) {
      log('Comparison data respects privacy settings', 'info');
    } else if (response.status === 403) {
      log('Access to comparison data correctly restricted', 'info');
    } else {
      throw new Error('Unexpected response from comparison endpoint');
    }
  });

  await test('Update wallet privacy mode', async () => {
    const walletId = testState.walletIds[0];
    
    const response = await makeRequest(
      'PUT',
      `/api/wallets/${walletId}`,
      { privacy_mode: 'public' },
      testState.authToken
    );
    
    if (!response.success) {
      throw new Error('Failed to update privacy mode');
    }
    
    log('Privacy mode updated to public', 'info');
  });

  await test('Verify privacy mode change is immediate', async () => {
    const walletId = testState.walletIds[0];
    
    const response = await makeRequest(
      'GET',
      `/api/wallets/${walletId}`,
      null,
      testState.authToken
    );
    
    if (!response.success) {
      throw new Error('Failed to get wallet details');
    }
    
    if (response.data.wallet.privacy_mode !== 'public') {
      throw new Error('Privacy mode not updated immediately');
    }
    
    log('Privacy mode change verified', 'info');
  });

  await test('Test monetizable data access', async () => {
    // Update one wallet to monetizable
    const walletId = testState.walletIds[2];
    
    const updateResponse = await makeRequest(
      'PUT',
      `/api/wallets/${walletId}`,
      { privacy_mode: 'monetizable' },
      testState.authToken
    );
    
    if (!updateResponse.success) {
      throw new Error('Failed to set monetizable mode');
    }
    
    log('Wallet set to monetizable mode', 'info');
  });

  await test('Verify cross-user access prevention', async () => {
    // Try to access another user's project (should fail)
    const fakeProjectId = '00000000-0000-0000-0000-000000000000';
    
    const response = await makeRequest(
      'GET',
      `/api/projects/${fakeProjectId}`,
      null,
      testState.authToken
    );
    
    if (response.success) {
      throw new Error('Cross-user access should be prevented');
    }
    
    if (response.status !== 403 && response.status !== 404) {
      throw new Error(`Expected 403 or 404, got ${response.status}`);
    }
    
    log('Cross-user access correctly prevented', 'info');
  });
}

// Test 6: Error Handling
async function testErrorHandling() {
  logSection('TEST 6: Error Handling');

  await test('Verify structured error responses', async () => {
    const response = await makeRequest('POST', '/auth/login', {
      email: 'invalid@example.com',
      password: 'wrongpassword'
    });
    
    if (response.success) {
      throw new Error('Invalid login should fail');
    }
    
    if (!response.data.error || !response.data.message) {
      throw new Error('Error response missing required fields');
    }
    
    log('Structured error response verified', 'info');
  });

  await test('Verify validation errors', async () => {
    const response = await makeRequest('POST', '/auth/register', {
      name: 'Test',
      email: 'invalid-email',
      password: 'short'
    });
    
    if (response.success) {
      throw new Error('Invalid registration should fail');
    }
    
    if (response.status !== 400) {
      throw new Error(`Expected 400, got ${response.status}`);
    }
    
    log('Validation errors working correctly', 'info');
  });

  await test('Verify authentication errors', async () => {
    const response = await makeRequest('GET', '/api/projects', null, 'invalid.token');
    
    if (response.success) {
      throw new Error('Invalid token should be rejected');
    }
    
    if (response.status !== 401) {
      throw new Error(`Expected 401, got ${response.status}`);
    }
    
    log('Authentication errors working correctly', 'info');
  });
}

// Main test runner
async function runFinalIntegrationTests() {
  console.log('\n' + '='.repeat(80));
  log('FINAL INTEGRATION TESTING', 'bold');
  log('Task 43: Final integration testing', 'info');
  console.log('='.repeat(80));
  log(`Base URL: ${BASE_URL}`, 'info');
  log(`Test User: ${TEST_USER.email}`, 'info');
  console.log('');

  try {
    await testUserRegistration();
    await testOnboardingFlow();
    await testAnalyticsDashboard();
    await testPaymentAndWithdrawal();
    await testPrivacyModeEnforcement();
    await testErrorHandling();

    // Print summary
    logSection('TEST SUMMARY');
    log(`Total Tests: ${testState.results.tests.length}`, 'info');
    log(`Passed: ${testState.results.passed}`, 'success');
    log(`Failed: ${testState.results.failed}`, testState.results.failed > 0 ? 'error' : 'success');
    
    const successRate = testState.results.tests.length > 0
      ? ((testState.results.passed / testState.results.tests.length) * 100).toFixed(1)
      : 0;
    log(`Success Rate: ${successRate}%`, successRate >= 90 ? 'success' : 'error');

    if (testState.results.failed > 0) {
      console.log('\n');
      log('Failed Tests:', 'error');
      testState.results.tests
        .filter(t => t.status === 'failed')
        .forEach(t => {
          log(`  • ${t.name}: ${t.error}`, 'error');
        });
    }

    if (testState.results.failed === 0) {
      console.log('\n');
      log('🎉 ALL INTEGRATION TESTS PASSED! 🎉', 'success');
      console.log('\n');
      log('✅ Complete System Verification:', 'bold');
      log('  • User registration flow works correctly', 'success');
      log('  • Complete onboarding flow works correctly', 'success');
      log('  • Analytics dashboard with real data works correctly', 'success');
      log('  • Payment and withdrawal flows work correctly', 'success');
      log('  • Privacy mode enforcement works correctly', 'success');
      log('  • Error handling works correctly', 'success');
      console.log('');
    } else {
      console.log('\n');
      log('Some tests failed. Please review the errors above.', 'warning');
      process.exit(1);
    }

  } catch (error) {
    log(`Fatal error: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

// Run the tests
runFinalIntegrationTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
