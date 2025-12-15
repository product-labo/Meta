#!/usr/bin/env node

/**
 * Complete Flow Test: User Signup → Invoice → Payment → Withdrawal
 * 
 * This script tests the entire user journey:
 * 1. Create user
 * 2. Create invoice
 * 3. Show payment address (you send ZEC here)
 * 4. Check payment status
 * 5. Create withdrawal request
 * 6. Process withdrawal (admin)
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || 'test-api-key';

// Test configuration
const TEST_CONFIG = {
  user: {
    email: 'testuser@example.com',
    name: 'Test User'
  },
  invoice: {
    type: 'one_time',
    amount_zec: 0.001, // Small amount for testing
    item_id: 'test-item-001'
  },
  withdrawal: {
    // You'll need to provide a valid Zcash address for withdrawal testing
    to_address: 't1UnEx5GLUk7Dn1kVCzE5ZCPEYMCCAtqPEN', // Example address
    amount_zec: 0.0005 // Half of what we receive
  }
};

let testResults = {
  user: null,
  invoice: null,
  payment: null,
  withdrawal: null
};

async function apiCall(endpoint, method = 'GET', body = null) {
  const url = `${BASE_URL}/api${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  console.log(`\n🔗 ${method} ${endpoint}`);
  if (body) console.log('📤 Request:', JSON.stringify(body, null, 2));

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    console.log(`📥 Response (${response.status}):`, JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error || 'Unknown error'}`);
    }
    
    return data;
  } catch (error) {
    console.error(`❌ API call failed:`, error.message);
    throw error;
  }
}

async function step1_CreateUser() {
  console.log('\n' + '='.repeat(60));
  console.log('📝 STEP 1: Create User');
  console.log('='.repeat(60));

  try {
    const result = await apiCall('/users/create', 'POST', TEST_CONFIG.user);
    testResults.user = result.user;
    
    console.log(`✅ User created successfully!`);
    console.log(`   User ID: ${testResults.user.id}`);
    console.log(`   Email: ${testResults.user.email}`);
    
    return true;
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  User already exists, fetching existing user...');
      try {
        const result = await apiCall(`/users/email/${encodeURIComponent(TEST_CONFIG.user.email)}`);
        testResults.user = result.user;
        console.log(`✅ Found existing user: ${testResults.user.id}`);
        return true;
      } catch (fetchError) {
        console.error('❌ Failed to fetch existing user:', fetchError.message);
        return false;
      }
    }
    console.error('❌ Failed to create user:', error.message);
    return false;
  }
}

async function step2_CreateInvoice() {
  console.log('\n' + '='.repeat(60));
  console.log('🧾 STEP 2: Create Invoice');
  console.log('='.repeat(60));

  try {
    const invoiceData = {
      ...TEST_CONFIG.invoice,
      user_id: testResults.user.id
    };

    const result = await apiCall('/invoice/create', 'POST', invoiceData);
    testResults.invoice = result.invoice;
    
    console.log(`✅ Invoice created successfully!`);
    console.log(`   Invoice ID: ${testResults.invoice.id}`);
    console.log(`   Amount: ${testResults.invoice.amount_zec} ZEC`);
    console.log(`   Payment Address: ${testResults.invoice.z_address}`);
    console.log(`   Payment URI: ${testResults.invoice.payment_uri}`);
    
    console.log('\n' + '⚠️'.repeat(30));
    console.log('🎯 ACTION REQUIRED: Send ZEC to this address!');
    console.log('⚠️'.repeat(30));
    console.log(`💰 Send exactly ${testResults.invoice.amount_zec} ZEC to:`);
    console.log(`📍 ${testResults.invoice.z_address}`);
    console.log('⚠️'.repeat(30));
    
    return true;
  } catch (error) {
    console.error('❌ Failed to create invoice:', error.message);
    return false;
  }
}

async function step3_CheckPayment() {
  console.log('\n' + '='.repeat(60));
  console.log('💳 STEP 3: Check Payment Status');
  console.log('='.repeat(60));

  let attempts = 0;
  const maxAttempts = 10;
  const checkInterval = 10000; // 10 seconds

  while (attempts < maxAttempts) {
    attempts++;
    console.log(`\n🔍 Payment check attempt ${attempts}/${maxAttempts}...`);

    try {
      const result = await apiCall('/invoice/check', 'POST', {
        invoice_id: testResults.invoice.id
      });

      if (result.paid) {
        testResults.payment = result.invoice;
        console.log(`✅ Payment received!`);
        console.log(`   Paid Amount: ${testResults.payment.paid_amount_zec} ZEC`);
        console.log(`   Transaction ID: ${testResults.payment.paid_txid}`);
        console.log(`   Paid At: ${testResults.payment.paid_at}`);
        return true;
      } else {
        console.log(`⏳ Payment not yet received (${result.invoice.received_amount || 0} ZEC received)`);
        
        if (attempts < maxAttempts) {
          console.log(`   Waiting ${checkInterval/1000} seconds before next check...`);
          await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
      }
    } catch (error) {
      console.error('❌ Failed to check payment:', error.message);
      return false;
    }
  }

  console.log('❌ Payment not received within timeout period');
  console.log('💡 You can continue testing by manually sending ZEC to the address above');
  return false;
}

async function step4_CheckBalance() {
  console.log('\n' + '='.repeat(60));
  console.log('💰 STEP 4: Check User Balance');
  console.log('='.repeat(60));

  try {
    const result = await apiCall(`/users/${testResults.user.id}/balance`);
    
    console.log(`✅ User balance retrieved!`);
    console.log(`   Total Received: ${result.balance.total_received_zec} ZEC`);
    console.log(`   Available Balance: ${result.balance.available_balance_zec} ZEC`);
    console.log(`   Total Invoices: ${result.balance.total_invoices}`);
    
    return result.balance.available_balance_zec > 0;
  } catch (error) {
    console.error('❌ Failed to check balance:', error.message);
    return false;
  }
}

async function step5_CreateWithdrawal() {
  console.log('\n' + '='.repeat(60));
  console.log('💸 STEP 5: Create Withdrawal Request');
  console.log('='.repeat(60));

  try {
    const withdrawalData = {
      user_id: testResults.user.id,
      to_address: TEST_CONFIG.withdrawal.to_address,
      amount_zec: TEST_CONFIG.withdrawal.amount_zec
    };

    const result = await apiCall('/withdraw/create', 'POST', withdrawalData);
    testResults.withdrawal = result.withdrawal;
    
    console.log(`✅ Withdrawal request created!`);
    console.log(`   Withdrawal ID: ${testResults.withdrawal.id}`);
    console.log(`   Amount: ${testResults.withdrawal.amount_zec} ZEC`);
    console.log(`   Fee: ${testResults.withdrawal.fee_zec} ZEC`);
    console.log(`   Net Amount: ${testResults.withdrawal.net_zec} ZEC`);
    console.log(`   To Address: ${testResults.withdrawal.to_address}`);
    console.log(`   Status: ${testResults.withdrawal.status}`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to create withdrawal:', error.message);
    return false;
  }
}

async function step6_ProcessWithdrawal() {
  console.log('\n' + '='.repeat(60));
  console.log('⚙️  STEP 6: Process Withdrawal (Admin Action)');
  console.log('='.repeat(60));

  try {
    const result = await apiCall(`/withdraw/process/${testResults.withdrawal.id}`, 'POST');
    
    console.log(`✅ Withdrawal processed successfully!`);
    console.log(`   Transaction ID: ${result.txid}`);
    console.log(`   User Received: ${result.user_received} ZEC`);
    console.log(`   Platform Fee: ${result.platform_fee} ZEC`);
    if (result.treasury_address) {
      console.log(`   Treasury Address: ${result.treasury_address}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to process withdrawal:', error.message);
    console.log('💡 Note: This requires admin API key and sufficient wallet balance');
    return false;
  }
}

async function generateTestSummary() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));

  console.log('\n🔍 Test Results:');
  console.log(`   User Created: ${testResults.user ? '✅' : '❌'}`);
  console.log(`   Invoice Created: ${testResults.invoice ? '✅' : '❌'}`);
  console.log(`   Payment Received: ${testResults.payment ? '✅' : '❌'}`);
  console.log(`   Withdrawal Created: ${testResults.withdrawal ? '✅' : '❌'}`);

  if (testResults.invoice && !testResults.payment) {
    console.log('\n💰 PAYMENT REQUIRED:');
    console.log(`   Send ${testResults.invoice.amount_zec} ZEC to: ${testResults.invoice.z_address}`);
    console.log(`   Then run: curl -X POST ${BASE_URL}/api/invoice/check -H "Content-Type: application/json" -d '{"invoice_id": ${testResults.invoice.id}}'`);
  }

  console.log('\n🔗 Useful API Endpoints:');
  console.log(`   Check Payment: POST ${BASE_URL}/api/invoice/check`);
  console.log(`   User Balance: GET ${BASE_URL}/api/users/${testResults.user?.id}/balance`);
  console.log(`   Invoice Details: GET ${BASE_URL}/api/invoice/${testResults.invoice?.id}`);
  if (testResults.withdrawal) {
    console.log(`   Withdrawal Status: GET ${BASE_URL}/api/withdraw/${testResults.withdrawal.id}`);
  }

  console.log('\n📋 Test Data:');
  console.log(JSON.stringify(testResults, null, 2));
}

async function runCompleteTest() {
  console.log('🚀 Starting Complete Flow Test');
  console.log(`🔗 Base URL: ${BASE_URL}`);
  console.log(`🔑 API Key: ${API_KEY ? 'Configured' : 'Not configured'}`);

  try {
    // Step 1: Create User
    if (!await step1_CreateUser()) {
      throw new Error('Failed at user creation step');
    }

    // Step 2: Create Invoice
    if (!await step2_CreateInvoice()) {
      throw new Error('Failed at invoice creation step');
    }

    // Step 3: Check Payment (with timeout)
    const paymentReceived = await step3_CheckPayment();
    
    if (paymentReceived) {
      // Step 4: Check Balance
      if (!await step4_CheckBalance()) {
        console.log('⚠️  Balance check failed, but continuing...');
      }

      // Step 5: Create Withdrawal
      if (await step5_CreateWithdrawal()) {
        // Step 6: Process Withdrawal (optional - requires admin key)
        await step6_ProcessWithdrawal();
      }
    }

    await generateTestSummary();

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await generateTestSummary();
    process.exit(1);
  }
}

// Run the test
runCompleteTest().catch(console.error);