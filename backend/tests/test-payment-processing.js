/**
 * Payment Processing Tests
 * Tests subscription invoice creation, payment detection, and subscription activation
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3001';

// Test user credentials
const testUser = {
  email: `test_payment_${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: 'Payment Test User'
};

let authToken = null;
let userId = null;

/**
 * Helper function to make authenticated requests
 */
async function authenticatedRequest(method, url, data = null) {
  const config = {
    method,
    url: `${BASE_URL}${url}`,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  };

  if (data) {
    config.data = data;
  }

  return axios(config);
}

/**
 * Test 1: User Registration and Login
 */
async function testUserSetup() {
  console.log('\n=== Test 1: User Registration and Login ===');

  try {
    // Register user
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, testUser);
    console.log('✓ User registered successfully');
    console.log('  User ID:', registerResponse.data.user.id);

    // Login
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });

    authToken = loginResponse.data.token;
    userId = loginResponse.data.user.id;

    console.log('✓ User logged in successfully');
    console.log('  Token received:', authToken ? 'Yes' : 'No');

    return true;
  } catch (error) {
    console.error('✗ User setup failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test 2: Create Subscription Invoice
 */
async function testCreateSubscriptionInvoice() {
  console.log('\n=== Test 2: Create Subscription Invoice ===');

  try {
    const response = await authenticatedRequest('POST', '/api/payments/invoice', {
      plan_type: 'premium',
      duration_months: 1,
      payment_method: 'auto',
      network: 'testnet',
      description: 'Test premium subscription'
    });

    console.log('✓ Subscription invoice created successfully');
    console.log('  Invoice ID:', response.data.invoice.invoice_id);
    console.log('  Plan Type:', response.data.invoice.plan_type);
    console.log('  Duration:', response.data.invoice.duration_months, 'months');
    console.log('  Amount:', response.data.invoice.amount_zec, 'ZEC');
    console.log('  Payment Address:', response.data.invoice.payment_address);
    console.log('  Payment Method:', response.data.invoice.payment_method);
    console.log('  Status:', response.data.invoice.status);

    return response.data.invoice.invoice_id;
  } catch (error) {
    console.error('✗ Create subscription invoice failed:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Test 3: Check Invoice Payment Status
 */
async function testCheckInvoicePayment(invoiceId) {
  console.log('\n=== Test 3: Check Invoice Payment Status ===');

  try {
    const response = await authenticatedRequest('GET', `/api/payments/invoice/${invoiceId}`);

    console.log('✓ Invoice status retrieved successfully');
    console.log('  Invoice ID:', response.data.invoice.invoice_id);
    console.log('  Status:', response.data.invoice.status);
    console.log('  Paid:', response.data.invoice.paid);
    console.log('  Amount:', response.data.invoice.amount_zec, 'ZEC');

    return true;
  } catch (error) {
    console.error('✗ Check invoice payment failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test 4: Simulate Payment Detection and Processing
 */
async function testProcessPayment(invoiceId) {
  console.log('\n=== Test 4: Simulate Payment Detection and Processing ===');

  try {
    // Simulate payment detection
    const response = await authenticatedRequest('POST', `/api/payments/check/${invoiceId}`, {
      payment_detected: true,
      amount_zec: 0.01,
      txid: `test_txid_${Date.now()}`
    });

    console.log('✓ Payment processed successfully');
    console.log('  Paid:', response.data.paid);
    console.log('  Message:', response.data.message);
    
    if (response.data.result) {
      console.log('  Subscription Status:', response.data.result.subscription.status);
      console.log('  Expires At:', response.data.result.subscription.expires_at);
      console.log('  Payment Amount:', response.data.result.payment.amount_zec, 'ZEC');
      console.log('  Transaction ID:', response.data.result.payment.txid);
    }

    return true;
  } catch (error) {
    console.error('✗ Process payment failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test 5: Verify Subscription Activation
 */
async function testVerifySubscriptionActivation() {
  console.log('\n=== Test 5: Verify Subscription Activation ===');

  try {
    const response = await authenticatedRequest('GET', '/api/subscriptions/status');

    console.log('✓ Subscription status retrieved successfully');
    console.log('  Status:', response.data.subscription.status);
    console.log('  Is Active:', response.data.subscription.isActive);
    console.log('  Is Premium:', response.data.subscription.isPremium);
    console.log('  Expires At:', response.data.subscription.expiresAt);
    console.log('  Days Remaining:', response.data.subscription.daysRemaining);

    return response.data.subscription.isPremium;
  } catch (error) {
    console.error('✗ Verify subscription activation failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test 6: Get User Balance
 */
async function testGetUserBalance() {
  console.log('\n=== Test 6: Get User Balance ===');

  try {
    const response = await authenticatedRequest('GET', '/api/payments/balance');

    console.log('✓ User balance retrieved successfully');
    console.log('  User ID:', response.data.balance.user_id);
    console.log('  Balance:', response.data.balance.balance_zec, 'ZEC');

    return true;
  } catch (error) {
    console.error('✗ Get user balance failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test 7: Get Payment History
 */
async function testGetPaymentHistory() {
  console.log('\n=== Test 7: Get Payment History ===');

  try {
    const response = await authenticatedRequest('GET', '/api/payments/history?limit=10');

    console.log('✓ Payment history retrieved successfully');
    console.log('  Total Payments:', response.data.history.length);
    
    if (response.data.history.length > 0) {
      const payment = response.data.history[0];
      console.log('  Latest Payment:');
      console.log('    Invoice ID:', payment.invoice_id);
      console.log('    Type:', payment.type);
      console.log('    Amount:', payment.amount_zec, 'ZEC');
      console.log('    Status:', payment.status);
      console.log('    Created At:', payment.created_at);
    }

    return true;
  } catch (error) {
    console.error('✗ Get payment history failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test 8: Create Data Access Invoice
 */
async function testCreateDataAccessInvoice() {
  console.log('\n=== Test 8: Create Data Access Invoice ===');

  try {
    // Create a mock data owner user ID (in real scenario, this would be another user)
    const dataOwnerId = userId;

    const response = await authenticatedRequest('POST', '/api/payments/data-access', {
      data_owner_id: dataOwnerId,
      data_package_id: 'test_data_package_123',
      amount_zec: 0.005,
      payment_method: 'auto',
      network: 'testnet',
      description: 'Test data access purchase'
    });

    console.log('✓ Data access invoice created successfully');
    console.log('  Invoice ID:', response.data.invoice.invoice_id);
    console.log('  Buyer User ID:', response.data.invoice.buyer_user_id);
    console.log('  Data Owner ID:', response.data.invoice.data_owner_id);
    console.log('  Data Package ID:', response.data.invoice.data_package_id);
    console.log('  Amount:', response.data.invoice.amount_zec, 'ZEC');
    console.log('  Payment Address:', response.data.invoice.payment_address);

    return response.data.invoice.invoice_id;
  } catch (error) {
    console.error('✗ Create data access invoice failed:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Test 9: Invalid Plan Type
 */
async function testInvalidPlanType() {
  console.log('\n=== Test 9: Invalid Plan Type ===');

  try {
    await authenticatedRequest('POST', '/api/payments/invoice', {
      plan_type: 'invalid_plan',
      duration_months: 1
    });

    console.error('✗ Should have failed with invalid plan type');
    return false;
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✓ Correctly rejected invalid plan type');
      console.log('  Error:', error.response.data.message);
      return true;
    }
    console.error('✗ Unexpected error:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test 10: Invalid Duration
 */
async function testInvalidDuration() {
  console.log('\n=== Test 10: Invalid Duration ===');

  try {
    await authenticatedRequest('POST', '/api/payments/invoice', {
      plan_type: 'premium',
      duration_months: 15 // Invalid: > 12
    });

    console.error('✗ Should have failed with invalid duration');
    return false;
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✓ Correctly rejected invalid duration');
      console.log('  Error:', error.response.data.message);
      return true;
    }
    console.error('✗ Unexpected error:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         Payment Processing Integration Tests              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  // Test 1: User Setup
  results.total++;
  if (await testUserSetup()) {
    results.passed++;
  } else {
    results.failed++;
    console.log('\n⚠️  Cannot continue without user setup');
    return results;
  }

  // Test 2: Create Subscription Invoice
  results.total++;
  const invoiceId = await testCreateSubscriptionInvoice();
  if (invoiceId) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 3: Check Invoice Payment Status
  if (invoiceId) {
    results.total++;
    if (await testCheckInvoicePayment(invoiceId)) {
      results.passed++;
    } else {
      results.failed++;
    }

    // Test 4: Process Payment
    results.total++;
    if (await testProcessPayment(invoiceId)) {
      results.passed++;
    } else {
      results.failed++;
    }

    // Test 5: Verify Subscription Activation
    results.total++;
    if (await testVerifySubscriptionActivation()) {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  // Test 6: Get User Balance
  results.total++;
  if (await testGetUserBalance()) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 7: Get Payment History
  results.total++;
  if (await testGetPaymentHistory()) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 8: Create Data Access Invoice
  results.total++;
  const dataInvoiceId = await testCreateDataAccessInvoice();
  if (dataInvoiceId) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 9: Invalid Plan Type
  results.total++;
  if (await testInvalidPlanType()) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 10: Invalid Duration
  results.total++;
  if (await testInvalidDuration()) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Print summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                      Test Summary                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ${results.passed} ✓`);
  console.log(`Failed: ${results.failed} ✗`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);

  if (results.failed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
  }

  return results;
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export default runAllTests;
