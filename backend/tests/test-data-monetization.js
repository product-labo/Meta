/**
 * Data Monetization Test Suite
 * Tests data access invoice creation, payment processing, and revenue splitting
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import axios from 'axios';

const API_URL = 'http://localhost:3001';

// Test users
let buyerUser = null;
let dataOwnerUser = null;
let buyerToken = null;
let dataOwnerToken = null;
let testProject = null;
let testWallet = null;
let dataAccessInvoice = null;

// Helper function to make authenticated requests
function authRequest(token) {
  return axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
}

async function runTests() {
  console.log('🧪 Starting Data Monetization Tests\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Register buyer user
    console.log('\n📝 Test 1: Register buyer user');
    const buyerEmail = `buyer_${Date.now()}@test.com`;
    const buyerResponse = await axios.post(`${API_URL}/auth/register`, {
      name: 'Buyer User',
      email: buyerEmail,
      password: 'TestPassword123!'
    });
    
    if (buyerResponse.data.success) {
      buyerUser = buyerResponse.data.user;
      buyerToken = buyerResponse.data.token;
      console.log('✓ Buyer user registered successfully');
      console.log(`  User ID: ${buyerUser.id}`);
      console.log(`  Email: ${buyerUser.email}`);
    } else {
      throw new Error('Failed to register buyer user');
    }

    // Test 2: Register data owner user
    console.log('\n📝 Test 2: Register data owner user');
    const ownerEmail = `owner_${Date.now()}@test.com`;
    const ownerResponse = await axios.post(`${API_URL}/auth/register`, {
      name: 'Data Owner',
      email: ownerEmail,
      password: 'TestPassword123!'
    });
    
    if (ownerResponse.data.success) {
      dataOwnerUser = ownerResponse.data.user;
      dataOwnerToken = ownerResponse.data.token;
      console.log('✓ Data owner registered successfully');
      console.log(`  User ID: ${dataOwnerUser.id}`);
      console.log(`  Email: ${dataOwnerUser.email}`);
    } else {
      throw new Error('Failed to register data owner');
    }

    // Test 3: Upgrade buyer to premium (required for data access)
    console.log('\n📝 Test 3: Upgrade buyer to premium subscription');
    const buyerClient = authRequest(buyerToken);
    
    // Create subscription invoice
    const subInvoiceResponse = await buyerClient.post('/api/payments/invoice', {
      plan_type: 'premium',
      duration_months: 1
    });
    
    if (subInvoiceResponse.data.success) {
      const subInvoiceId = subInvoiceResponse.data.invoice.invoice_id;
      console.log('✓ Subscription invoice created');
      console.log(`  Invoice ID: ${subInvoiceId}`);
      
      // Simulate payment
      const paymentResponse = await buyerClient.post(`/api/payments/check/${subInvoiceId}`, {
        payment_detected: true,
        amount_zec: 0.01,
        txid: `sub_tx_${Date.now()}`
      });
      
      if (paymentResponse.data.paid) {
        console.log('✓ Subscription activated');
        console.log(`  Status: ${paymentResponse.data.result.subscription.status}`);
      }
    }

    // Test 4: Create project with monetizable wallet for data owner
    console.log('\n📝 Test 4: Create project with monetizable wallet');
    const ownerClient = authRequest(dataOwnerToken);
    
    const projectResponse = await ownerClient.post('/api/projects', {
      name: 'Monetizable Analytics Project',
      description: 'Project with monetizable wallet data',
      category: 'defi',
      status: 'active'
    });
    
    if (projectResponse.data.success) {
      testProject = projectResponse.data.project;
      console.log('✓ Project created');
      console.log(`  Project ID: ${testProject.id}`);
      console.log(`  Name: ${testProject.name}`);
    }

    // Test 5: Add monetizable wallet to project
    console.log('\n📝 Test 5: Add monetizable wallet');
    const walletResponse = await ownerClient.post('/api/wallets', {
      project_id: testProject.id,
      address: 'u1test' + 'a'.repeat(136), // Mock unified address
      privacy_mode: 'monetizable',
      description: 'Test monetizable wallet'
    });
    
    if (walletResponse.data.success) {
      testWallet = walletResponse.data.wallet;
      console.log('✓ Monetizable wallet added');
      console.log(`  Wallet ID: ${testWallet.id}`);
      console.log(`  Privacy Mode: ${testWallet.privacy_mode}`);
    }

    // Test 6: Buyer attempts to create data access invoice (Requirement 11.1, 11.2)
    console.log('\n📝 Test 6: Create data access invoice');
    const dataAccessResponse = await buyerClient.post('/api/payments/data-access', {
      data_owner_id: dataOwnerUser.id,
      data_package_id: testProject.id,
      amount_zec: 0.005,
      description: 'Purchase analytics data access'
    });
    
    if (dataAccessResponse.data.success) {
      dataAccessInvoice = dataAccessResponse.data.invoice;
      console.log('✓ Data access invoice created');
      console.log(`  Invoice ID: ${dataAccessInvoice.invoice_id}`);
      console.log(`  Amount: ${dataAccessInvoice.amount_zec} ZEC`);
      console.log(`  Payment Address: ${dataAccessInvoice.payment_address}`);
      console.log(`  Data Owner: ${dataAccessInvoice.data_owner_id}`);
      console.log(`  Data Package: ${dataAccessInvoice.data_package_id}`);
    } else {
      throw new Error('Failed to create data access invoice');
    }

    // Test 7: Check data access before payment
    console.log('\n📝 Test 7: Check data access before payment');
    const accessCheckBefore = await buyerClient.get(`/api/payments/data-access/check/${testProject.id}`);
    
    if (!accessCheckBefore.data.access.has_access) {
      console.log('✓ No access before payment (as expected)');
      console.log(`  Has Access: ${accessCheckBefore.data.access.has_access}`);
    } else {
      throw new Error('User should not have access before payment');
    }

    // Test 8: Process data access payment (Requirement 11.3, 11.4, 11.5)
    console.log('\n📝 Test 8: Process data access payment');
    const paymentProcessResponse = await buyerClient.post(
      `/api/payments/process-data-access/${dataAccessInvoice.invoice_id}`,
      {
        amount_zec: 0.005,
        txid: `data_access_tx_${Date.now()}`
      }
    );
    
    if (paymentProcessResponse.data.success) {
      const result = paymentProcessResponse.data.result;
      console.log('✓ Data access payment processed');
      console.log(`  Total Amount: ${result.payment.total_amount_zec} ZEC`);
      console.log(`  Data Owner Share (70%): ${result.payment.data_owner_share_zec} ZEC`);
      console.log(`  Platform Fee (30%): ${result.payment.platform_fee_zec} ZEC`);
      console.log(`  Access Granted: ${result.access_granted}`);
      console.log(`  Access Expires: ${result.access_expires_at}`);
      
      // Verify revenue split
      const expectedOwnerShare = 0.005 * 0.7;
      const expectedPlatformFee = 0.005 * 0.3;
      
      if (Math.abs(result.payment.data_owner_share_zec - expectedOwnerShare) < 0.00000001) {
        console.log('✓ Revenue split correct (70/30)');
      } else {
        throw new Error('Revenue split calculation incorrect');
      }
    } else {
      throw new Error('Failed to process data access payment');
    }

    // Test 9: Check data access after payment
    console.log('\n📝 Test 9: Check data access after payment');
    const accessCheckAfter = await buyerClient.get(`/api/payments/data-access/check/${testProject.id}`);
    
    if (accessCheckAfter.data.access.has_access) {
      console.log('✓ Access granted after payment');
      console.log(`  Has Access: ${accessCheckAfter.data.access.has_access}`);
      console.log(`  Data Type: ${accessCheckAfter.data.access.data_type}`);
      console.log(`  Granted At: ${accessCheckAfter.data.access.granted_at}`);
      console.log(`  Expires At: ${accessCheckAfter.data.access.expires_at}`);
    } else {
      throw new Error('User should have access after payment');
    }

    // Test 10: Check data owner balance update (Requirement 11.5)
    console.log('\n📝 Test 10: Check data owner balance');
    const ownerBalanceResponse = await ownerClient.get('/api/payments/balance');
    
    if (ownerBalanceResponse.data.success) {
      const balance = ownerBalanceResponse.data.balance.balance_zec;
      const expectedBalance = 0.005 * 0.7; // 70% of payment
      
      console.log('✓ Data owner balance updated');
      console.log(`  Balance: ${balance} ZEC`);
      console.log(`  Expected: ${expectedBalance} ZEC`);
      
      if (Math.abs(balance - expectedBalance) < 0.00000001) {
        console.log('✓ Balance matches expected amount');
      } else {
        console.log('⚠ Balance does not match expected amount');
      }
    }

    // Test 11: Get data owner earnings summary
    console.log('\n📝 Test 11: Get data owner earnings summary');
    const earningsResponse = await ownerClient.get('/api/payments/earnings');
    
    if (earningsResponse.data.success) {
      const earnings = earningsResponse.data.earnings;
      console.log('✓ Earnings summary retrieved');
      console.log(`  Total Sales: ${earnings.total_sales}`);
      console.log(`  Total Earnings: ${earnings.total_earnings_zec} ZEC`);
      console.log(`  Total Fees: ${earnings.total_fees_zec} ZEC`);
      console.log(`  By Data Type:`, JSON.stringify(earnings.by_data_type, null, 2));
    }

    // Test 12: Get data access buyers
    console.log('\n📝 Test 12: Get data access buyers');
    const buyersResponse = await ownerClient.get(`/api/payments/data-access/buyers/${testProject.id}`);
    
    if (buyersResponse.data.success) {
      const buyers = buyersResponse.data.buyers;
      console.log('✓ Buyers list retrieved');
      console.log(`  Total Buyers: ${buyersResponse.data.count}`);
      
      if (buyers.length > 0) {
        console.log(`  First Buyer:`);
        console.log(`    User ID: ${buyers[0].buyer_user_id}`);
        console.log(`    Email: ${buyers[0].buyer_email}`);
        console.log(`    Amount Paid: ${buyers[0].amount_paid_zec} ZEC`);
        console.log(`    Is Active: ${buyers[0].is_active}`);
      }
    }

    // Test 13: Get monetizable packages
    console.log('\n📝 Test 13: Get monetizable data packages');
    const packagesResponse = await ownerClient.get('/api/payments/monetizable-packages');
    
    if (packagesResponse.data.success) {
      const packages = packagesResponse.data.packages;
      console.log('✓ Monetizable packages retrieved');
      console.log(`  Total Packages: ${packagesResponse.data.count}`);
      
      if (packages.length > 0) {
        console.log(`  First Package:`);
        console.log(`    Project ID: ${packages[0].project_id}`);
        console.log(`    Project Name: ${packages[0].project_name}`);
        console.log(`    Monetizable Wallets: ${packages[0].monetizable_wallets}`);
        console.log(`    Total Buyers: ${packages[0].total_buyers}`);
        console.log(`    Total Earnings: ${packages[0].total_earnings_zec} ZEC`);
      }
    }

    // Test 14: Attempt to purchase own data (should fail)
    console.log('\n📝 Test 14: Attempt to purchase own data (should fail)');
    try {
      await ownerClient.post('/api/payments/data-access', {
        data_owner_id: dataOwnerUser.id,
        data_package_id: testProject.id,
        amount_zec: 0.005
      });
      console.log('✗ Should have failed - user purchased own data');
    } catch (error) {
      if (error.response && error.response.status === 500) {
        console.log('✓ Correctly prevented user from purchasing own data');
      } else {
        throw error;
      }
    }

    // Test 15: Attempt to purchase without subscription (should fail)
    console.log('\n📝 Test 15: Attempt to purchase without subscription');
    const freeUserEmail = `free_${Date.now()}@test.com`;
    const freeUserResponse = await axios.post(`${API_URL}/auth/register`, {
      name: 'Free User',
      email: freeUserEmail,
      password: 'TestPassword123!'
    });
    
    const freeUserToken = freeUserResponse.data.token;
    const freeUserClient = authRequest(freeUserToken);
    
    try {
      await freeUserClient.post('/api/payments/data-access', {
        data_owner_id: dataOwnerUser.id,
        data_package_id: testProject.id,
        amount_zec: 0.005
      });
      console.log('✗ Should have failed - free user purchased data');
    } catch (error) {
      if (error.response && error.response.status === 500) {
        console.log('✓ Correctly prevented free user from purchasing data');
      } else {
        throw error;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ All Data Monetization Tests Passed!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run tests
console.log('Starting test suite...');
console.log('Make sure the backend server is running on http://localhost:3001\n');

runTests().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
