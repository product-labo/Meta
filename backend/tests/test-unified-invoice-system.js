/**
 * Unified Invoice System Tests
 * Tests the centralized payment system with all methods
 */

import { createZcashPaywall, PAYMENT_METHODS, NETWORKS } from '../src/UnifiedZcashPaywall.js';
import assert from 'assert';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

// Initialize SDK for testing
const paywall = createZcashPaywall({
  baseURL: API_BASE_URL,
  network: NETWORKS.TESTNET,
  timeout: 10000
});

let testUser = null;

/**
 * Test Suite: Unified Invoice System
 */
async function runUnifiedInvoiceTests() {
  console.log('🧪 Testing Unified Invoice System');
  console.log('=================================');

  try {
    // Setup: Create test user
    await setupTestUser();
    
    // Run tests
    await testHealthCheck();
    await testUserCreation();
    await testAutoPaymentMethod();
    await testSpecificPaymentMethods();
    await testWebZjsIntegration();
    await testDevtoolIntegration();
    await testUnifiedAddresses();
    await testInvoiceRetrieval();
    await testPaymentChecking();
    await testBalanceTracking();
    await testErrorHandling();
    await testConvenienceMethods();

    console.log('\n✅ All unified invoice tests passed!');
    return true;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

/**
 * Setup test user
 */
async function setupTestUser() {
  console.log('\n📋 Setting up test user...');
  
  const timestamp = Date.now();
  testUser = await paywall.createUser({
    email: `test-unified-${timestamp}@example.com`,
    name: 'Unified Test User'
  });

  assert(testUser.success, 'User creation should succeed');
  assert(testUser.user.id, 'User should have ID');
  console.log('✓ Test user created:', testUser.user.id);
}

/**
 * Test API health check
 */
async function testHealthCheck() {
  console.log('\n🏥 Testing health check...');
  
  const health = await paywall.healthCheck();
  assert(health.status, 'Health check should return status');
  console.log('✓ API health:', health.status);
}

/**
 * Test user creation and management
 */
async function testUserCreation() {
  console.log('\n👤 Testing user creation...');
  
  // Test email-only user creation
  const emailUser = await paywall.createUser({
    email: `email-only-${Date.now()}@example.com`
  });
  
  assert(emailUser.success, 'Email-only user creation should succeed');
  assert(emailUser.user.email, 'User should have email');
  
  // Test user balance
  const balance = await paywall.getUserBalance(emailUser.user.id);
  assert(balance.success, 'Balance retrieval should succeed');
  assert(typeof balance.balance.available_balance_zec === 'number', 'Balance should be numeric');
  
  console.log('✓ User creation and balance check passed');
}

/**
 * Test auto payment method selection
 */
async function testAutoPaymentMethod() {
  console.log('\n🤖 Testing auto payment method...');
  
  const invoice = await paywall.createInvoice({
    user_id: testUser.user.id,
    amount_zec: 0.01,
    payment_method: PAYMENT_METHODS.AUTO,
    description: 'Auto method test'
  });

  assert(invoice.success, 'Auto invoice creation should succeed');
  assert(invoice.invoice.payment_method === 'auto', 'Payment method should be auto');
  assert(invoice.invoice.payment_address, 'Should have payment address');
  assert(invoice.invoice.qr_code, 'Should have QR code');
  assert(invoice.payment_info.instructions, 'Should have payment instructions');
  
  console.log('✓ Auto method selected:', invoice.invoice.address_type);
}

/**
 * Test specific payment methods
 */
async function testSpecificPaymentMethods() {
  console.log('\n💳 Testing specific payment methods...');
  
  const methods = [
    PAYMENT_METHODS.TRANSPARENT,
    PAYMENT_METHODS.UNIFIED,
    PAYMENT_METHODS.SHIELDED
  ];

  for (const method of methods) {
    console.log(`  Testing ${method}...`);
    
    const invoice = await paywall.createInvoice({
      user_id: testUser.user.id,
      amount_zec: 0.005,
      payment_method: method,
      description: `${method} test payment`
    });

    assert(invoice.success, `${method} invoice creation should succeed`);
    assert(invoice.invoice.payment_method === method, `Payment method should be ${method}`);
    assert(invoice.invoice.payment_address, `${method} should have payment address`);
    
    console.log(`  ✓ ${method}: ${invoice.invoice.address_type}`);
  }
}

/**
 * Test WebZjs integration
 */
async function testWebZjsIntegration() {
  console.log('\n🌐 Testing WebZjs integration...');
  
  const invoice = await paywall.createWebZjsInvoice({
    user_id: testUser.user.id,
    amount_zec: 0.02,
    description: 'WebZjs browser payment'
  });

  assert(invoice.success, 'WebZjs invoice creation should succeed');
  assert(invoice.invoice.payment_method === PAYMENT_METHODS.WEBZJS, 'Should be WebZjs method');
  assert(invoice.invoice.address_type === 'webzjs_placeholder', 'Should be placeholder type');
  assert(invoice.payment_info.instructions.length > 0, 'Should have WebZjs instructions');
  
  console.log('✓ WebZjs integration working');
}

/**
 * Test zcash-devtool integration
 */
async function testDevtoolIntegration() {
  console.log('\n🔧 Testing zcash-devtool integration...');
  
  const invoice = await paywall.createDevtoolInvoice({
    user_id: testUser.user.id,
    amount_zec: 0.015,
    description: 'CLI devtool payment'
  });

  assert(invoice.success, 'Devtool invoice creation should succeed');
  assert(invoice.invoice.payment_method === PAYMENT_METHODS.DEVTOOL, 'Should be devtool method');
  assert(invoice.invoice.address_type === 'devtool_placeholder', 'Should be placeholder type');
  assert(invoice.payment_info.instructions.length > 0, 'Should have devtool instructions');
  
  console.log('✓ zcash-devtool integration working');
}

/**
 * Test unified addresses
 */
async function testUnifiedAddresses() {
  console.log('\n🔗 Testing unified addresses...');
  
  const invoice = await paywall.createUnifiedInvoice({
    user_id: testUser.user.id,
    amount_zec: 0.025,
    network: NETWORKS.TESTNET,
    description: 'Unified address payment'
  });

  assert(invoice.success, 'Unified invoice creation should succeed');
  assert(invoice.invoice.payment_method === PAYMENT_METHODS.UNIFIED, 'Should be unified method');
  assert(invoice.invoice.address_type === 'unified', 'Should be unified address type');
  assert(invoice.invoice.payment_address.startsWith('ut'), 'Testnet unified address should start with ut');
  
  console.log('✓ Unified address generated:', invoice.invoice.payment_address.substring(0, 20) + '...');
}

/**
 * Test invoice retrieval
 */
async function testInvoiceRetrieval() {
  console.log('\n📄 Testing invoice retrieval...');
  
  // Create invoice
  const invoice = await paywall.createInvoice({
    user_id: testUser.user.id,
    amount_zec: 0.01,
    description: 'Retrieval test'
  });

  // Retrieve invoice
  const retrieved = await paywall.getInvoice(invoice.invoice.id);
  
  assert(retrieved.success, 'Invoice retrieval should succeed');
  assert(retrieved.invoice.id === invoice.invoice.id, 'Retrieved invoice should match created invoice');
  assert(retrieved.invoice.amount_zec === invoice.invoice.amount_zec, 'Amount should match');
  assert(retrieved.invoice.description === invoice.invoice.description, 'Description should match');
  
  console.log('✓ Invoice retrieval working');
}

/**
 * Test payment checking
 */
async function testPaymentChecking() {
  console.log('\n💰 Testing payment checking...');
  
  const invoice = await paywall.createTransparentInvoice({
    user_id: testUser.user.id,
    amount_zec: 0.01,
    description: 'Payment check test'
  });

  // Check payment status (should be unpaid)
  const status = await paywall.checkPayment(invoice.invoice.id);
  
  assert(status.paid === false, 'New invoice should be unpaid');
  assert(status.invoice.status === 'pending', 'Status should be pending');
  assert(typeof status.invoice.received_amount === 'number', 'Should have received amount');
  
  console.log('✓ Payment checking working');
}

/**
 * Test balance tracking
 */
async function testBalanceTracking() {
  console.log('\n💳 Testing balance tracking...');
  
  const balance = await paywall.getUserBalance(testUser.user.id);
  
  assert(balance.success, 'Balance retrieval should succeed');
  assert(typeof balance.balance.available_balance_zec === 'number', 'Available balance should be numeric');
  assert(typeof balance.balance.total_received_zec === 'number', 'Total received should be numeric');
  assert(typeof balance.balance.total_withdrawn_zec === 'number', 'Total withdrawn should be numeric');
  assert(typeof balance.balance.total_invoices === 'number', 'Total invoices should be numeric');
  
  console.log('✓ Balance tracking working');
  console.log(`  Available: ${balance.balance.available_balance_zec} ZEC`);
  console.log(`  Total invoices: ${balance.balance.total_invoices}`);
}

/**
 * Test error handling
 */
async function testErrorHandling() {
  console.log('\n⚠️  Testing error handling...');
  
  // Test invalid amount
  try {
    await paywall.createInvoice({
      user_id: testUser.user.id,
      amount_zec: -1
    });
    assert(false, 'Should throw error for negative amount');
  } catch (error) {
    assert(error.message.includes('positive'), 'Should mention positive amount');
  }

  // Test missing user
  try {
    await paywall.createInvoice({
      amount_zec: 0.01
    });
    assert(false, 'Should throw error for missing user');
  } catch (error) {
    assert(error.message.includes('user_id') || error.message.includes('email'), 'Should mention user requirement');
  }

  // Test invalid invoice ID
  try {
    await paywall.getInvoice('invalid-id');
    assert(false, 'Should throw error for invalid invoice ID');
  } catch (error) {
    assert(error.status === 404 || error.message.includes('not found'), 'Should be 404 or not found error');
  }

  console.log('✓ Error handling working correctly');
}

/**
 * Test convenience methods
 */
async function testConvenienceMethods() {
  console.log('\n🎯 Testing convenience methods...');
  
  // Test fee estimate
  const feeEstimate = await paywall.getFeeEstimate(0.1);
  assert(feeEstimate.success, 'Fee estimate should succeed');
  assert(typeof feeEstimate.fee === 'number', 'Fee should be numeric');
  assert(typeof feeEstimate.net === 'number', 'Net amount should be numeric');
  
  // Test withdrawal creation (will fail due to insufficient balance, but should validate)
  try {
    await paywall.createWithdrawal({
      user_id: testUser.user.id,
      to_address: 't1TestAddress123456789012345678901234',
      amount_zec: 0.01
    });
    // If it doesn't throw, that's fine too (might have balance in test environment)
  } catch (error) {
    // Expected to fail due to insufficient balance
    assert(error.message.includes('balance') || error.message.includes('address'), 'Should be balance or address error');
  }

  console.log('✓ Convenience methods working');
}

/**
 * Performance test
 */
async function testPerformance() {
  console.log('\n⚡ Testing performance...');
  
  const startTime = Date.now();
  const promises = [];
  
  // Create multiple invoices concurrently
  for (let i = 0; i < 5; i++) {
    promises.push(
      paywall.createInvoice({
        user_id: testUser.user.id,
        amount_zec: 0.001,
        description: `Performance test ${i}`
      })
    );
  }
  
  const results = await Promise.all(promises);
  const endTime = Date.now();
  
  assert(results.length === 5, 'Should create 5 invoices');
  results.forEach((result, i) => {
    assert(result.success, `Invoice ${i} should succeed`);
  });
  
  console.log(`✓ Created 5 invoices in ${endTime - startTime}ms`);
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runUnifiedInvoiceTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner error:', error);
      process.exit(1);
    });
}

export { runUnifiedInvoiceTests };