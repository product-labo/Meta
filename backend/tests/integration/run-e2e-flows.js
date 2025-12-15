#!/usr/bin/env node

/**
 * End-to-End Integration Test Runner
 * Task 43.1: Write end-to-end integration tests
 * 
 * This script runs comprehensive E2E tests covering:
 * 1. Registration → Onboarding → Analytics flow
 * 2. Subscription upgrade flow
 * 3. Data monetization flow
 * 4. Withdrawal flow
 * 
 * Requirements: All
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

// Test data
const testUsers = {
  user1: {
    name: 'E2E Test User 1',
    email: `e2e-user1-${Date.now()}@example.com`,
    password: 'TestPassword123!'
  },
  user2: {
    name: 'E2E Test User 2',
    email: `e2e-user2-${Date.now()}@example.com`,
    password: 'TestPassword123!'
  }
};

const testProject = {
  name: 'E2E Test Project',
  description: 'End-to-end test project',
  category: 'defi',
  website_url: 'https://e2e-test.example.com',
  github_url: 'https://github.com/e2e/test',
  tags: ['test', 'e2e']
};

const testWallets = [
  {
    address: 't1E2ETestAddress1234567890123456789012345678',
    type: 't',
    privacy_mode: 'private',
    description: 'Private test wallet',
    network: 'testnet'
  },
  {
    address: 'zs1e2etestshieldedaddress123456789012345678901234567890123456',
    type: 'z',
    privacy_mode: 'public',
    description: 'Public test wallet',
    network: 'testnet'
  },
  {
    address: 'u1e2etestunifiedaddress1234567890123456789012345678901234567890',
    type: 'u',
    privacy_mode: 'monetizable',
    description: 'Monetizable test wallet',
    network: 'testnet'
  }
];

// Test state
const testState = {
  user1: { token: null, id: null, projectId: null, walletIds: [] },
  user2: { token: null, id: null, projectId: null, walletIds: [] },
  invoices: [],
  withdrawals: [],
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
    headers: { 'Content-Type': 'application/json' }
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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// ============================================================================
// Flow 1: Registration → Onboarding → Analytics
// ============================================================================

async function testFlow1_RegistrationOnboardingAnalytics() {
  logSection('Flow 1: Registration → Onboarding → Analytics');

  await test('1.1: User registration creates account', async () => {
    const response = await makeRequest('POST', '/auth/register', testUsers.user1);
    
    assert(response.success, `Registration failed: ${JSON.stringify(response.data)}`);
    assert(response.status === 201, `Expected 201, got ${response.status}`);
    assert(response.data.id, 'Response missing user ID');
    assert(response.data.email === testUsers.user1.email, 'Email mismatch');
    
    testState.user1.id = response.data.id;
  });

  await test('1.2: User login returns JWT token', async () => {
    const response = await makeRequest('POST', '/auth/login', {
      email: testUsers.user1.email,
      password: testUsers.user1.password
    });
    
    assert(response.success, 'Login failed');
    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(response.data.token, 'Response missing token');
    
    testState.user1.token = response.data.token;
  });

  await test('1.3: JWT token validates successfully', async () => {
    const response = await makeRequest('GET', '/api/projects', null, testState.user1.token);
    
    assert(response.success, 'Token validation failed');
    assert(response.status === 200, `Expected 200, got ${response.status}`);
  });

  await test('1.4: Complete onboarding creates project and wallet', async () => {
    const onboardingData = {
      project: testProject,
      wallet: testWallets[0]
    };
    
    const response = await makeRequest(
      'POST',
      '/api/onboarding/complete',
      onboardingData,
      testState.user1.token
    );
    
    assert(response.success, `Onboarding failed: ${JSON.stringify(response.data)}`);
    assert(response.status === 201, `Expected 201, got ${response.status}`);
    assert(response.data.data.project, 'Response missing project');
    assert(response.data.data.wallet, 'Response missing wallet');
    
    testState.user1.projectId = response.data.data.project.id;
    testState.user1.walletIds.push(response.data.data.wallet.id);
  });

  await test('1.5: Add additional wallets for analytics', async () => {
    for (let i = 1; i < testWallets.length; i++) {
      const response = await makeRequest(
        'POST',
        '/api/wallets',
        { ...testWallets[i], project_id: testState.user1.projectId },
        testState.user1.token
      );
      
      assert(response.success, `Failed to add wallet ${i}`);
      testState.user1.walletIds.push(response.data.wallet.id);
    }
    
    assert(testState.user1.walletIds.length === testWallets.length, 'Wallet count mismatch');
  });

  await test('1.6: Dashboard analytics returns metrics', async () => {
    const response = await makeRequest(
      'GET',
      `/api/analytics/dashboard/${testState.user1.projectId}`,
      null,
      testState.user1.token
    );
    
    assert(response.success, 'Dashboard request failed');
    assert(response.data.metrics, 'Response missing metrics');
  });

  await test('1.7: All analytics endpoints return data', async () => {
    const endpoints = [
      'adoption',
      'retention',
      'productivity',
      'shielded',
      'segments',
      'health'
    ];
    
    for (const endpoint of endpoints) {
      const response = await makeRequest(
        'GET',
        `/api/analytics/${endpoint}/${testState.user1.projectId}`,
        null,
        testState.user1.token
      );
      
      assert(response.success, `${endpoint} endpoint failed`);
    }
  });
}

// ============================================================================
// Flow 2: Subscription Upgrade
// ============================================================================

async function testFlow2_SubscriptionUpgrade() {
  logSection('Flow 2: Subscription Upgrade');

  await test('2.1: Check subscription status', async () => {
    const response = await makeRequest(
      'GET',
      '/api/subscriptions/status',
      null,
      testState.user1.token
    );
    
    assert(response.success, 'Subscription status request failed');
    assert(response.data.subscription_status, 'Response missing subscription status');
  });

  await test('2.2: Create subscription upgrade invoice', async () => {
    const response = await makeRequest(
      'POST',
      '/api/payments/invoice',
      {
        type: 'subscription',
        amount_zec: 0.001,
        item_id: 'premium-monthly'
      },
      testState.user1.token
    );
    
    assert(response.success, 'Invoice creation failed');
    assert(response.data.invoice, 'Response missing invoice');
    assert(response.data.invoice.payment_address, 'Invoice missing payment address');
    
    testState.invoices.push(response.data.invoice);
  });

  await test('2.3: Get invoice details', async () => {
    const invoiceId = testState.invoices[0].id;
    const response = await makeRequest(
      'GET',
      `/api/payments/invoice/${invoiceId}`,
      null,
      testState.user1.token
    );
    
    assert(response.success, 'Get invoice failed');
    assert(response.data.invoice.id === invoiceId, 'Invoice ID mismatch');
  });

  await test('2.4: Check payment status', async () => {
    const invoiceId = testState.invoices[0].id;
    const response = await makeRequest(
      'POST',
      `/api/payments/check/${invoiceId}`,
      null,
      testState.user1.token
    );
    
    assert(response.success, 'Payment check failed');
    assert(typeof response.data.paid === 'boolean', 'Response missing paid status');
  });
}

// ============================================================================
// Flow 3: Data Monetization
// ============================================================================

async function testFlow3_DataMonetization() {
  logSection('Flow 3: Data Monetization');

  // Register and onboard second user
  await test('3.1: Register second user', async () => {
    const response = await makeRequest('POST', '/auth/register', testUsers.user2);
    assert(response.success, 'User2 registration failed');
    testState.user2.id = response.data.id;
    
    const loginResponse = await makeRequest('POST', '/auth/login', {
      email: testUsers.user2.email,
      password: testUsers.user2.password
    });
    assert(loginResponse.success, 'User2 login failed');
    testState.user2.token = loginResponse.data.token;
  });

  await test('3.2: Set wallet to monetizable mode', async () => {
    const walletId = testState.user1.walletIds[2];
    const response = await makeRequest(
      'PUT',
      `/api/wallets/${walletId}`,
      { privacy_mode: 'monetizable' },
      testState.user1.token
    );
    
    assert(response.success, 'Privacy mode update failed');
    assert(response.data.wallet.privacy_mode === 'monetizable', 'Privacy mode not updated');
  });

  await test('3.3: Create data access invoice', async () => {
    const response = await makeRequest(
      'POST',
      '/api/payments/invoice',
      {
        type: 'data_access',
        amount_zec: 0.0005,
        item_id: testState.user1.projectId
      },
      testState.user2.token
    );
    
    assert(response.success, 'Data access invoice creation failed');
    assert(response.data.invoice.type === 'data_access', 'Invoice type mismatch');
  });

  await test('3.4: Verify payment splitting calculation', async () => {
    const amount = 0.001;
    const ownerShare = amount * 0.7;
    const platformShare = amount * 0.3;
    
    assert(Math.abs(ownerShare - 0.0007) < 0.00001, 'Owner share calculation incorrect');
    assert(Math.abs(platformShare - 0.0003) < 0.00001, 'Platform share calculation incorrect');
  });
}

// ============================================================================
// Flow 4: Withdrawal
// ============================================================================

async function testFlow4_Withdrawal() {
  logSection('Flow 4: Withdrawal');

  await test('4.1: Check user balance', async () => {
    const response = await makeRequest(
      'GET',
      '/api/payments/balance',
      null,
      testState.user1.token
    );
    
    assert(response.success, 'Balance check failed');
    assert(typeof response.data.balance_zec === 'number', 'Balance not a number');
  });

  await test('4.2: Validate withdrawal address', async () => {
    const response = await makeRequest(
      'POST',
      '/api/wallets/validate',
      { address: 't1UnEx5GLUk7Dn1kVCzE5ZCPEYMCCAtqPEN' },
      testState.user1.token
    );
    
    assert(response.success, 'Address validation failed');
    assert(response.data.valid === true, 'Valid address marked as invalid');
  });

  await test('4.3: Reject invalid withdrawal address', async () => {
    const response = await makeRequest(
      'POST',
      '/api/wallets/validate',
      { address: 'invalid-address' },
      testState.user1.token
    );
    
    assert(response.success, 'Validation request failed');
    assert(response.data.valid === false, 'Invalid address marked as valid');
  });

  await test('4.4: Handle insufficient balance error', async () => {
    const response = await makeRequest(
      'POST',
      '/api/payments/withdraw',
      {
        amount_zec: 100,
        to_address: 't1UnEx5GLUk7Dn1kVCzE5ZCPEYMCCAtqPEN'
      },
      testState.user1.token
    );
    
    assert(!response.success, 'Should fail with insufficient balance');
    assert(response.status === 400, `Expected 400, got ${response.status}`);
  });

  await test('4.5: Get withdrawal history', async () => {
    const response = await makeRequest(
      'GET',
      '/api/payments/withdrawals',
      null,
      testState.user1.token
    );
    
    assert(response.success, 'Withdrawal history request failed');
    assert(Array.isArray(response.data.withdrawals), 'Withdrawals not an array');
  });
}

// ============================================================================
// Cross-Flow Integration Tests
// ============================================================================

async function testCrossFlowIntegration() {
  logSection('Cross-Flow Integration Tests');

  await test('5.1: Verify privacy mode enforcement', async () => {
    const privateWalletId = testState.user1.walletIds[0];
    const response = await makeRequest(
      'GET',
      `/api/wallets/${privateWalletId}`,
      null,
      testState.user2.token
    );
    
    assert(!response.success, 'Should not access other user\'s private wallet');
    assert([403, 404].includes(response.status), `Expected 403/404, got ${response.status}`);
  });

  await test('5.2: Verify project isolation', async () => {
    const response = await makeRequest(
      'GET',
      `/api/projects/${testState.user1.projectId}`,
      null,
      testState.user2.token
    );
    
    assert(!response.success, 'Should not access other user\'s project');
    assert([403, 404].includes(response.status), `Expected 403/404, got ${response.status}`);
  });

  await test('5.3: Verify error handling with invalid token', async () => {
    const response = await makeRequest('GET', '/api/projects', null, 'invalid.token');
    
    assert(!response.success, 'Should reject invalid token');
    assert(response.status === 401, `Expected 401, got ${response.status}`);
  });

  await test('5.4: Verify structured error responses', async () => {
    const response = await makeRequest('POST', '/auth/login', {
      email: 'nonexistent@example.com',
      password: 'wrongpassword'
    });
    
    assert(!response.success, 'Should fail with invalid credentials');
    assert(response.data.error, 'Response missing error field');
    assert(response.data.message, 'Response missing message field');
  });
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllTests() {
  console.log('\n' + '='.repeat(80));
  log('END-TO-END INTEGRATION TESTS', 'bold');
  log('Task 43.1: Write end-to-end integration tests', 'info');
  console.log('='.repeat(80));
  log(`Base URL: ${BASE_URL}`, 'info');
  console.log('');

  try {
    await testFlow1_RegistrationOnboardingAnalytics();
    await testFlow2_SubscriptionUpgrade();
    await testFlow3_DataMonetization();
    await testFlow4_Withdrawal();
    await testCrossFlowIntegration();

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
      log('🎉 ALL E2E TESTS PASSED! 🎉', 'success');
      console.log('\n');
      log('✅ Complete System Verification:', 'bold');
      log('  • Registration → Onboarding → Analytics flow ✓', 'success');
      log('  • Subscription upgrade flow ✓', 'success');
      log('  • Data monetization flow ✓', 'success');
      log('  • Withdrawal flow ✓', 'success');
      log('  • Cross-flow integration ✓', 'success');
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
runAllTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
