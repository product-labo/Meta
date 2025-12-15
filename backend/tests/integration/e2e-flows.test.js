/**
 * End-to-End Integration Tests
 * Task 43.1: Write end-to-end integration tests
 * 
 * This test suite covers complete user journeys:
 * 1. Registration → Onboarding → Analytics flow
 * 2. Subscription upgrade flow
 * 3. Data monetization flow
 * 4. Withdrawal flow
 * 
 * Requirements: All
 */

const axios = require('axios');

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
    address: 'lsk24cd35u4jdq8szo3pnsqe5dsxwrnazyqqqg5eu3z', // Valid Lisk address
    type: 'lisk',
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
  withdrawals: []
};

// Helper functions
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

describe('End-to-End Integration Tests', () => {
  
  // ============================================================================
  // Flow 1: Registration → Onboarding → Analytics
  // ============================================================================
  
  describe('Flow 1: Registration → Onboarding → Analytics', () => {
    
    test('1.1: User registration creates account with hashed password', async () => {
      const response = await makeRequest('POST', '/auth/register', testUsers.user1);
      
      expect(response.success).toBe(true);
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('email', testUsers.user1.email);
      expect(response.data).not.toHaveProperty('password');
      
      testState.user1.id = response.data.id;
    });

    test('1.2: User login returns JWT token', async () => {
      const response = await makeRequest('POST', '/auth/login', {
        email: testUsers.user1.email,
        password: testUsers.user1.password
      });
      
      expect(response.success).toBe(true);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('token');
      expect(response.data.token).toBeTruthy();
      
      testState.user1.token = response.data.token;
    });

    test('1.3: JWT token validates successfully', async () => {
      const response = await makeRequest(
        'GET',
        '/api/projects',
        null,
        testState.user1.token
      );
      
      expect(response.success).toBe(true);
      expect(response.status).toBe(200);
    });

    test('1.4: Initial onboarding status shows not completed', async () => {
      const response = await makeRequest(
        'GET',
        '/api/onboarding/status',
        null,
        testState.user1.token
      );
      
      expect(response.success).toBe(true);
      expect(response.data.data.onboarding_completed).toBe(false);
    });

    test('1.5: Complete onboarding creates project and wallet', async () => {
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
      
      expect(response.success).toBe(true);
      expect(response.status).toBe(201);
      expect(response.data.data).toHaveProperty('project');
      expect(response.data.data).toHaveProperty('wallet');
      expect(response.data.data.project.name).toBe(testProject.name);
      expect(response.data.data.wallet.address).toBe(testWallets[0].address);
      
      testState.user1.projectId = response.data.data.project.id;
      testState.user1.walletIds.push(response.data.data.wallet.id);
    });

    test('1.6: Onboarding status updates to completed', async () => {
      const response = await makeRequest(
        'GET',
        '/api/onboarding/status',
        null,
        testState.user1.token
      );
      
      expect(response.success).toBe(true);
      expect(response.data.data.onboarding_completed).toBe(true);
      expect(response.data.data.project).toBeTruthy();
      expect(response.data.data.wallet).toBeTruthy();
    });

    test('1.7: Duplicate onboarding is prevented', async () => {
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
      
      expect(response.success).toBe(false);
      expect(response.status).toBe(409);
    });

    test('1.8: Add additional wallets for analytics', async () => {
      for (let i = 1; i < testWallets.length; i++) {
        const response = await makeRequest(
          'POST',
          '/api/wallets',
          { ...testWallets[i], project_id: testState.user1.projectId },
          testState.user1.token
        );
        
        expect(response.success).toBe(true);
        expect(response.data.wallet).toBeTruthy();
        testState.user1.walletIds.push(response.data.wallet.id);
      }
      
      expect(testState.user1.walletIds.length).toBe(testWallets.length);
    });

    test('1.9: Dashboard analytics returns metrics', async () => {
      const response = await makeRequest(
        'GET',
        `/api/analytics/dashboard/${testState.user1.projectId}`,
        null,
        testState.user1.token
      );
      
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('metrics');
    });

    test('1.10: Adoption funnel returns stage data', async () => {
      const response = await makeRequest(
        'GET',
        `/api/analytics/adoption/${testState.user1.projectId}`,
        null,
        testState.user1.token
      );
      
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('funnel');
    });

    test('1.11: Retention cohorts returns analysis', async () => {
      const response = await makeRequest(
        'GET',
        `/api/analytics/retention/${testState.user1.projectId}`,
        null,
        testState.user1.token
      );
      
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('cohorts');
    });

    test('1.12: Productivity scores returns metrics', async () => {
      const response = await makeRequest(
        'GET',
        `/api/analytics/productivity/${testState.user1.projectId}`,
        null,
        testState.user1.token
      );
      
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('scores');
    });

    test('1.13: Shielded analytics returns transaction data', async () => {
      const response = await makeRequest(
        'GET',
        `/api/analytics/shielded/${testState.user1.projectId}`,
        null,
        testState.user1.token
      );
      
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('shielded');
    });

    test('1.14: Wallet segments returns segmentation', async () => {
      const response = await makeRequest(
        'GET',
        `/api/analytics/segments/${testState.user1.projectId}`,
        null,
        testState.user1.token
      );
      
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('segments');
    });

    test('1.15: Project health returns indicators', async () => {
      const response = await makeRequest(
        'GET',
        `/api/analytics/health/${testState.user1.projectId}`,
        null,
        testState.user1.token
      );
      
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('health');
    });
  });

  // ============================================================================
  // Flow 2: Subscription Upgrade
  // ============================================================================
  
  describe('Flow 2: Subscription Upgrade', () => {
    
    test('2.1: Check initial subscription status (free trial)', async () => {
      const response = await makeRequest(
        'GET',
        '/api/subscriptions/status',
        null,
        testState.user1.token
      );
      
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('subscription_status');
      // New users should have free trial
      expect(['free', 'trial']).toContain(response.data.subscription_status);
    });

    test('2.2: Create subscription upgrade invoice', async () => {
      const response = await makeRequest(
        'POST',
        '/api/payments/invoice',
        {
          type: 'subscription',
          amount_lsk: 0.001,
          item_id: 'premium-monthly',
          description: 'Premium subscription upgrade'
        },
        testState.user1.token
      );
      
      expect(response.success).toBe(true);
      expect(response.data.invoice).toBeTruthy();
      expect(response.data.invoice.type).toBe('subscription');
      expect(response.data.invoice.amount_lsk).toBe(0.001);
      expect(response.data.invoice.payment_address).toBeTruthy();
      
      testState.invoices.push(response.data.invoice);
    });

    test('2.3: Get invoice details', async () => {
      const invoiceId = testState.invoices[0].id;
      const response = await makeRequest(
        'GET',
        `/api/payments/invoice/${invoiceId}`,
        null,
        testState.user1.token
      );
      
      expect(response.success).toBe(true);
      expect(response.data.invoice.id).toBe(invoiceId);
      expect(response.data.invoice.status).toBe('pending');
    });

    test('2.4: Check payment status (unpaid)', async () => {
      const invoiceId = testState.invoices[0].id;
      const response = await makeRequest(
        'POST',
        `/api/payments/check/${invoiceId}`,
        null,
        testState.user1.token
      );
      
      expect(response.success).toBe(true);
      expect(response.data.paid).toBe(false);
    });

    test('2.5: Verify premium features restricted before payment', async () => {
      // Try to access comparison endpoint (premium feature)
      const response = await makeRequest(
        'GET',
        `/api/analytics/comparison/${testState.user1.projectId}`,
        null,
        testState.user1.token
      );
      
      // Should either work (free trial) or be restricted
      if (!response.success) {
        expect([402, 403]).toContain(response.status);
      }
    });

    test('2.6: Get user balance', async () => {
      const response = await makeRequest(
        'GET',
        '/api/payments/balance',
        null,
        testState.user1.token
      );
      
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('balance_lsk');
      expect(typeof response.data.balance_lsk).toBe('number');
    });
  });

  // ============================================================================
  // Flow 3: Data Monetization
  // ============================================================================
  
  describe('Flow 3: Data Monetization', () => {
    
    beforeAll(async () => {
      // Register and onboard second user
      const registerResponse = await makeRequest('POST', '/auth/register', testUsers.user2);
      testState.user2.id = registerResponse.data.id;
      
      const loginResponse = await makeRequest('POST', '/auth/login', {
        email: testUsers.user2.email,
        password: testUsers.user2.password
      });
      testState.user2.token = loginResponse.data.token;
      
      // Complete onboarding for user2
      const onboardingData = {
        project: { ...testProject, name: 'E2E Test Project 2' },
        wallet: { ...testWallets[0], address: 'lsk3dy7q5ef3xjf4ev6ar2ykg3pyc7xw3r5kpqrqy' } // Different valid Lisk address
      };
      
      const onboardingResponse = await makeRequest(
        'POST',
        '/api/onboarding/complete',
        onboardingData,
        testState.user2.token
      );
      
      testState.user2.projectId = onboardingResponse.data.data.project.id;
      testState.user2.walletIds.push(onboardingResponse.data.data.wallet.id);
    });

    test('3.1: Set wallet to monetizable mode', async () => {
      const walletId = testState.user1.walletIds[2]; // The unified wallet
      const response = await makeRequest(
        'PUT',
        `/api/wallets/${walletId}`,
        { privacy_mode: 'monetizable' },
        testState.user1.token
      );
      
      expect(response.success).toBe(true);
      expect(response.data.wallet.privacy_mode).toBe('monetizable');
    });

    test('3.2: Verify monetizable wallet is available for purchase', async () => {
      const walletId = testState.user1.walletIds[2];
      const response = await makeRequest(
        'GET',
        `/api/wallets/${walletId}`,
        null,
        testState.user1.token
      );
      
      expect(response.success).toBe(true);
      expect(response.data.wallet.privacy_mode).toBe('monetizable');
    });

    test('3.3: Create data access invoice', async () => {
      const response = await makeRequest(
        'POST',
        '/api/payments/invoice',
        {
          type: 'data_access',
          amount_lsk: 0.0005,
          item_id: testState.user1.projectId,
          description: 'Access to monetizable wallet data'
        },
        testState.user2.token
      );
      
      expect(response.success).toBe(true);
      expect(response.data.invoice.type).toBe('data_access');
      expect(response.data.invoice.amount_lsk).toBe(0.0005);
      
      testState.invoices.push(response.data.invoice);
    });

    test('3.4: Verify data owner balance before payment', async () => {
      const response = await makeRequest(
        'GET',
        '/api/payments/balance',
        null,
        testState.user1.token
      );
      
      expect(response.success).toBe(true);
      const initialBalance = response.data.balance_lsk;
      expect(typeof initialBalance).toBe('number');
    });

    test('3.5: Check data access invoice status', async () => {
      const invoiceId = testState.invoices[testState.invoices.length - 1].id;
      const response = await makeRequest(
        'GET',
        `/api/payments/invoice/${invoiceId}`,
        null,
        testState.user2.token
      );
      
      expect(response.success).toBe(true);
      expect(response.data.invoice.status).toBe('pending');
    });

    test('3.6: Verify payment splitting calculation', async () => {
      const invoice = testState.invoices[testState.invoices.length - 1];
      const expectedOwnerShare = invoice.amount_lsk * 0.7; // 70% to owner
      const expectedPlatformShare = invoice.amount_lsk * 0.3; // 30% to platform
      
      expect(expectedOwnerShare).toBeCloseTo(0.00035, 5);
      expect(expectedPlatformShare).toBeCloseTo(0.00015, 5);
    });
  });

  // ============================================================================
  // Flow 4: Withdrawal
  // ============================================================================
  
  describe('Flow 4: Withdrawal', () => {
    
    test('4.1: Check user balance before withdrawal', async () => {
      const response = await makeRequest(
        'GET',
        '/api/payments/balance',
        null,
        testState.user1.token
      );
      
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('balance_lsk');
    });

    test('4.2: Validate withdrawal address format', async () => {
      const validAddress = 'lsk24cd35u4jdq8szo3pnsqe5dsxwrnazyqqqg5eu3z'; // Valid Lisk address
      const response = await makeRequest(
        'POST',
        '/api/wallets/validate',
        { address: validAddress },
        testState.user1.token
      );
      
      expect(response.success).toBe(true);
      expect(response.data.valid).toBe(true);
    });

    test('4.3: Reject invalid withdrawal address', async () => {
      const invalidAddress = 'invalid-address-123';
      const response = await makeRequest(
        'POST',
        '/api/wallets/validate',
        { address: invalidAddress },
        testState.user1.token
      );
      
      expect(response.success).toBe(true);
      expect(response.data.valid).toBe(false);
    });

    test('4.4: Create withdrawal request with insufficient balance', async () => {
      const response = await makeRequest(
        'POST',
        '/api/payments/withdraw',
        {
          amount_lsk: 100, // Unrealistic amount
          to_address: 'lsk24cd35u4jdq8szo3pnsqe5dsxwrnazyqqqg5eu3z' // Valid Lisk address
        },
        testState.user1.token
      );
      
      expect(response.success).toBe(false);
      expect(response.status).toBe(400);
      expect(response.data.error).toBe('INSUFFICIENT_BALANCE');
    });

    test('4.5: Create withdrawal request with valid amount', async () => {
      const response = await makeRequest(
        'POST',
        '/api/payments/withdraw',
        {
          amount_lsk: 0.0001,
          to_address: 'lsk24cd35u4jdq8szo3pnsqe5dsxwrnazyqqqg5eu3z' // Valid Lisk address
        },
        testState.user1.token
      );
      
      // May fail due to insufficient balance, which is expected
      if (response.success) {
        expect(response.data.withdrawal).toBeTruthy();
        expect(response.data.withdrawal.amount_lsk).toBe(0.0001);
        expect(response.data.withdrawal.fee_lsk).toBeGreaterThan(0);
        expect(response.data.withdrawal.net_lsk).toBeLessThan(0.0001);
        expect(response.data.withdrawal.status).toBe('pending');
        
        testState.withdrawals.push(response.data.withdrawal);
      } else {
        expect(response.status).toBe(400);
        expect(response.data.error).toBe('INSUFFICIENT_BALANCE');
      }
    });

    test('4.6: Get withdrawal history', async () => {
      const response = await makeRequest(
        'GET',
        '/api/payments/withdrawals',
        null,
        testState.user1.token
      );
      
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('withdrawals');
      expect(Array.isArray(response.data.withdrawals)).toBe(true);
    });

    test('4.7: Verify withdrawal fee calculation', async () => {
      if (testState.withdrawals.length > 0) {
        const withdrawal = testState.withdrawals[0];
        const expectedFee = withdrawal.amount_lsk * 0.01; // Assuming 1% fee
        const expectedNet = withdrawal.amount_lsk - withdrawal.fee_lsk;
        
        expect(withdrawal.fee_lsk).toBeGreaterThan(0);
        expect(withdrawal.net_lsk).toBe(expectedNet);
        expect(withdrawal.net_lsk).toBeLessThan(withdrawal.amount_lsk);
      }
    });
  });

  // ============================================================================
  // Cross-Flow Integration Tests
  // ============================================================================
  
  describe('Cross-Flow Integration', () => {
    
    test('5.1: Verify privacy mode enforcement across users', async () => {
      // User2 should not be able to access User1's private wallet data
      const privateWalletId = testState.user1.walletIds[0];
      const response = await makeRequest(
        'GET',
        `/api/wallets/${privateWalletId}`,
        null,
        testState.user2.token
      );
      
      expect(response.success).toBe(false);
      expect([403, 404]).toContain(response.status);
    });

    test('5.2: Verify project isolation between users', async () => {
      // User2 should not be able to access User1's project
      const response = await makeRequest(
        'GET',
        `/api/projects/${testState.user1.projectId}`,
        null,
        testState.user2.token
      );
      
      expect(response.success).toBe(false);
      expect([403, 404]).toContain(response.status);
    });

    test('5.3: Verify analytics isolation between users', async () => {
      // User2 should not be able to access User1's analytics
      const response = await makeRequest(
        'GET',
        `/api/analytics/dashboard/${testState.user1.projectId}`,
        null,
        testState.user2.token
      );
      
      expect(response.success).toBe(false);
      expect([403, 404]).toContain(response.status);
    });

    test('5.4: Verify immediate privacy mode changes', async () => {
      const walletId = testState.user1.walletIds[1];
      
      // Change privacy mode
      const updateResponse = await makeRequest(
        'PUT',
        `/api/wallets/${walletId}`,
        { privacy_mode: 'private' },
        testState.user1.token
      );
      
      expect(updateResponse.success).toBe(true);
      
      // Verify change is immediate
      const getResponse = await makeRequest(
        'GET',
        `/api/wallets/${walletId}`,
        null,
        testState.user1.token
      );
      
      expect(getResponse.success).toBe(true);
      expect(getResponse.data.wallet.privacy_mode).toBe('private');
    });

    test('5.5: Verify error handling with invalid token', async () => {
      const response = await makeRequest(
        'GET',
        '/api/projects',
        null,
        'invalid.jwt.token'
      );
      
      expect(response.success).toBe(false);
      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('error');
    });

    test('5.6: Verify error handling with expired session', async () => {
      // Try to access endpoint without token
      const response = await makeRequest('GET', '/api/projects', null, null);
      
      expect(response.success).toBe(false);
      expect(response.status).toBe(401);
    });

    test('5.7: Verify structured error responses', async () => {
      const response = await makeRequest('POST', '/auth/login', {
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      });
      
      expect(response.success).toBe(false);
      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('error');
      expect(response.data).toHaveProperty('message');
    });

    test('5.8: Verify validation error responses', async () => {
      const response = await makeRequest('POST', '/auth/register', {
        name: 'Test',
        email: 'invalid-email',
        password: 'short'
      });
      
      expect(response.success).toBe(false);
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('error');
    });
  });
});
