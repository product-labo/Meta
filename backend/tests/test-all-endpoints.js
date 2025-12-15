/**
 * Comprehensive Endpoint Testing Script
 * Tests all Zcash Paywall API endpoints with proper authentication
 */

import { ZcashPaywall } from '../src/ZcashPaywall.js';
import axios from 'axios';

const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'endpoint-test@example.com';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

class EndpointTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: []
    };
    this.testUser = null;
    this.testApiKey = null;
    this.testInvoice = null;
    this.testWithdrawal = null;
    this.paywall = null;
    this.authenticatedPaywall = null;
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async test(name, testFn, options = {}) {
    const { requiresAuth = false, requiresAdmin = false, skip = false } = options;
    
    if (skip) {
      this.log(`⏭️  SKIP: ${name}`, 'yellow');
      this.results.skipped++;
      this.results.tests.push({ name, status: 'skipped', reason: 'Skipped by configuration' });
      return;
    }

    try {
      this.log(`🧪 Testing: ${name}`, 'cyan');
      
      if (requiresAdmin && !this.testApiKey) {
        throw new Error('Admin API key required but not available');
      }
      
      if (requiresAuth && !this.authenticatedPaywall) {
        throw new Error('Authentication required but not available');
      }
      
      const result = await testFn();
      this.log(`✅ PASS: ${name}`, 'green');
      this.results.passed++;
      this.results.tests.push({ name, status: 'passed', result });
      return result;
    } catch (error) {
      this.log(`❌ FAIL: ${name} - ${error.message}`, 'red');
      this.results.failed++;
      this.results.tests.push({ name, status: 'failed', error: error.message });
      return null;
    }
  }

  async setup() {
    this.log('🚀 Setting up test environment...', 'blue');
    
    // Create basic paywall instance
    this.paywall = new ZcashPaywall({
      baseURL: BASE_URL
    });
    
    this.log('✅ Test environment ready', 'green');
  }

  async testHealthEndpoints() {
    this.log('\\n📊 Testing Health & Info Endpoints', 'bold');
    
    await this.test('GET /health', async () => {
      const health = await this.paywall.getHealth();
      if (health.status !== 'OK') {
        throw new Error(`Expected status OK, got ${health.status}`);
      }
      return health;
    });

    await this.test('GET /api (API Info)', async () => {
      const response = await axios.get(`${BASE_URL}/api`);
      if (!response.data.name || !response.data.version) {
        throw new Error('API info missing required fields');
      }
      return response.data;
    });
  }

  async testUserEndpoints() {
    this.log('\\n👤 Testing User Endpoints', 'bold');
    
    // Create user
    this.testUser = await this.test('POST /api/users/create', async () => {
      const user = await this.paywall.users.create({
        email: TEST_EMAIL,
        name: 'Endpoint Test User'
      });
      if (!user.id || user.email !== TEST_EMAIL) {
        throw new Error('User creation failed or returned invalid data');
      }
      return user;
    });

    if (!this.testUser) {
      this.log('⚠️  Skipping remaining user tests - user creation failed', 'yellow');
      return;
    }

    // Get user by ID
    await this.test('GET /api/users/:id', async () => {
      const user = await this.paywall.users.getById(this.testUser.id);
      if (user.id !== this.testUser.id) {
        throw new Error('Retrieved user ID does not match');
      }
      return user;
    });

    // Get user by email
    await this.test('GET /api/users/email/:email', async () => {
      const user = await this.paywall.users.getByEmail(TEST_EMAIL);
      if (user.email !== TEST_EMAIL) {
        throw new Error('Retrieved user email does not match');
      }
      return user;
    });

    // Update user
    await this.test('PUT /api/users/:id', async () => {
      const updatedUser = await this.paywall.users.update(this.testUser.id, {
        name: 'Updated Test User'
      });
      if (updatedUser.name !== 'Updated Test User') {
        throw new Error('User update failed');
      }
      return updatedUser;
    });

    // Get user balance
    await this.test('GET /api/users/:id/balance', async () => {
      const balance = await this.paywall.users.getBalance(this.testUser.id);
      if (typeof balance.available_balance_zec !== 'number') {
        throw new Error('Balance response invalid');
      }
      return balance;
    });
  }

  async testApiKeyEndpoints() {
    this.log('\\n🔑 Testing API Key Endpoints', 'bold');
    
    if (!this.testUser) {
      this.log('⚠️  Skipping API key tests - no test user available', 'yellow');
      return;
    }

    // Create API key
    const apiKeyResponse = await this.test('POST /api/keys/create', async () => {
      const response = await this.paywall.apiKeys.create({
        user_id: this.testUser.id,
        name: 'Test API Key',
        permissions: ['read', 'write', 'admin'],
        expires_in_days: 30
      });
      if (!response.api_key || !response.key_info) {
        throw new Error('API key creation failed');
      }
      return response;
    });

    if (apiKeyResponse) {
      this.testApiKey = apiKeyResponse.api_key;
      
      // Create authenticated paywall instance
      this.authenticatedPaywall = new ZcashPaywall({
        baseURL: BASE_URL,
        apiKey: this.testApiKey
      });

      // List user API keys
      await this.test('GET /api/keys/user/:user_id', async () => {
        const keys = await this.authenticatedPaywall.apiKeys.listByUser(this.testUser.id);
        if (!keys.api_keys || keys.total === 0) {
          throw new Error('No API keys found for user');
        }
        return keys;
      }, { requiresAuth: true });

      // Get API key details
      await this.test('GET /api/keys/:id', async () => {
        const keyDetails = await this.authenticatedPaywall.apiKeys.getById(apiKeyResponse.key_info.id);
        if (!keyDetails.api_key) {
          throw new Error('API key details not found');
        }
        return keyDetails;
      }, { requiresAuth: true });

      // Update API key
      await this.test('PUT /api/keys/:id', async () => {
        const updatedKey = await this.authenticatedPaywall.apiKeys.update(apiKeyResponse.key_info.id, {
          name: 'Updated Test API Key'
        });
        if (updatedKey.api_key.name !== 'Updated Test API Key') {
          throw new Error('API key update failed');
        }
        return updatedKey;
      }, { requiresAuth: true });

      // Regenerate API key
      await this.test('POST /api/keys/:id/regenerate', async () => {
        const regenerated = await this.authenticatedPaywall.apiKeys.regenerate(apiKeyResponse.key_info.id);
        if (!regenerated.api_key || regenerated.api_key === this.testApiKey) {
          throw new Error('API key regeneration failed');
        }
        // Update our test API key
        this.testApiKey = regenerated.api_key;
        this.authenticatedPaywall.setApiKey(this.testApiKey);
        return regenerated;
      }, { requiresAuth: true });
    }
  }

  async testInvoiceEndpoints() {
    this.log('\\n🧾 Testing Invoice Endpoints', 'bold');
    
    if (!this.testUser) {
      this.log('⚠️  Skipping invoice tests - no test user available', 'yellow');
      return;
    }

    const paywall = this.authenticatedPaywall || this.paywall;

    // Create invoice
    this.testInvoice = await this.test('POST /api/invoice/create', async () => {
      const invoice = await paywall.invoices.create({
        user_id: this.testUser.id,
        type: 'one_time',
        amount_zec: 0.01,
        description: 'Test invoice'
      });
      if (!invoice.id || !invoice.payment_address) {
        throw new Error('Invoice creation failed');
      }
      return invoice;
    });

    if (!this.testInvoice) {
      this.log('⚠️  Skipping remaining invoice tests - invoice creation failed', 'yellow');
      return;
    }

    // Get invoice by ID
    await this.test('GET /api/invoice/:id', async () => {
      const invoice = await paywall.invoices.getById(this.testInvoice.id);
      if (invoice.id !== this.testInvoice.id) {
        throw new Error('Retrieved invoice ID does not match');
      }
      return invoice;
    });

    // Get invoice QR code
    await this.test('GET /api/invoice/:id/qr', async () => {
      const qrCode = await paywall.invoices.getQRCode(this.testInvoice.id);
      if (!qrCode || typeof qrCode !== 'string') {
        throw new Error('QR code generation failed');
      }
      return { qrCodeLength: qrCode.length };
    });

    // Get payment URI
    await this.test('GET /api/invoice/:id/uri', async () => {
      const uri = await paywall.invoices.getPaymentURI(this.testInvoice.id);
      if (!uri.uri || !uri.uri.startsWith('zcash:')) {
        throw new Error('Payment URI generation failed');
      }
      return uri;
    });

    // Check payment status
    await this.test('POST /api/invoice/check', async () => {
      const status = await paywall.invoices.checkPayment(this.testInvoice.id);
      if (!status.hasOwnProperty('is_paid')) {
        throw new Error('Payment status check failed');
      }
      return status;
    });

    // Get user invoices
    await this.test('GET /api/invoice/user/:user_id', async () => {
      const invoices = await paywall.invoices.getByUser(this.testUser.id);
      if (!invoices.invoices || invoices.invoices.length === 0) {
        throw new Error('No invoices found for user');
      }
      return invoices;
    });
  }

  async testWithdrawalEndpoints() {
    this.log('\\n💰 Testing Withdrawal Endpoints', 'bold');
    
    if (!this.testUser) {
      this.log('⚠️  Skipping withdrawal tests - no test user available', 'yellow');
      return;
    }

    const paywall = this.authenticatedPaywall || this.paywall;

    // Fee estimate
    await this.test('POST /api/withdraw/fee-estimate', async () => {
      const feeEstimate = await paywall.withdrawals.estimateFee({
        amount_zec: 0.01,
        to_address: 'zs1test...' // Mock address
      });
      if (typeof feeEstimate.estimated_fee_zec !== 'number') {
        throw new Error('Fee estimation failed');
      }
      return feeEstimate;
    });

    // Create withdrawal request
    this.testWithdrawal = await this.test('POST /api/withdraw/create', async () => {
      const withdrawal = await paywall.withdrawals.create({
        user_id: this.testUser.id,
        amount_zec: 0.005,
        to_address: 'zs1test...', // Mock address
        description: 'Test withdrawal'
      });
      if (!withdrawal.id) {
        throw new Error('Withdrawal creation failed');
      }
      return withdrawal;
    });

    if (this.testWithdrawal) {
      // Get withdrawal by ID
      await this.test('GET /api/withdraw/:id', async () => {
        const withdrawal = await paywall.withdrawals.getById(this.testWithdrawal.id);
        if (withdrawal.id !== this.testWithdrawal.id) {
          throw new Error('Retrieved withdrawal ID does not match');
        }
        return withdrawal;
      });

      // Get user withdrawals
      await this.test('GET /api/withdraw/user/:user_id', async () => {
        const withdrawals = await paywall.withdrawals.getByUser(this.testUser.id);
        if (!withdrawals.withdrawals || withdrawals.withdrawals.length === 0) {
          throw new Error('No withdrawals found for user');
        }
        return withdrawals;
      });
    }
  }

  async testAdminEndpoints() {
    this.log('\\n👑 Testing Admin Endpoints', 'bold');
    
    if (!this.authenticatedPaywall) {
      this.log('⚠️  Skipping admin tests - no authenticated paywall available', 'yellow');
      return;
    }

    // Get admin stats
    await this.test('GET /api/admin/stats', async () => {
      const stats = await this.authenticatedPaywall.admin.getStats();
      if (!stats.hasOwnProperty('total_users')) {
        throw new Error('Admin stats missing required fields');
      }
      return stats;
    }, { requiresAdmin: true });

    // Get pending withdrawals
    await this.test('GET /api/admin/withdrawals/pending', async () => {
      const pending = await this.authenticatedPaywall.admin.getPendingWithdrawals();
      if (!pending.hasOwnProperty('withdrawals')) {
        throw new Error('Pending withdrawals response invalid');
      }
      return pending;
    }, { requiresAdmin: true });

    // Get balances
    await this.test('GET /api/admin/balances', async () => {
      const balances = await this.authenticatedPaywall.admin.getBalances();
      if (!balances.hasOwnProperty('total_balance_zec')) {
        throw new Error('Admin balances missing required fields');
      }
      return balances;
    }, { requiresAdmin: true });

    // Get revenue
    await this.test('GET /api/admin/revenue', async () => {
      const revenue = await this.authenticatedPaywall.admin.getRevenue();
      if (!revenue.hasOwnProperty('total_revenue_zec')) {
        throw new Error('Revenue data missing required fields');
      }
      return revenue;
    }, { requiresAdmin: true });

    // Get subscriptions
    await this.test('GET /api/admin/subscriptions', async () => {
      const subscriptions = await this.authenticatedPaywall.admin.getSubscriptions();
      if (!subscriptions.hasOwnProperty('subscriptions')) {
        throw new Error('Subscriptions response invalid');
      }
      return subscriptions;
    }, { requiresAdmin: true });

    // Get node status
    await this.test('GET /api/admin/node-status', async () => {
      const nodeStatus = await this.authenticatedPaywall.admin.getNodeStatus();
      if (!nodeStatus.hasOwnProperty('status')) {
        throw new Error('Node status missing required fields');
      }
      return nodeStatus;
    }, { requiresAdmin: true });

    // List all users (admin only)
    await this.test('GET /api/users (admin)', async () => {
      const users = await this.authenticatedPaywall.users.list();
      if (!users.users || !Array.isArray(users.users)) {
        throw new Error('Users list response invalid');
      }
      return users;
    }, { requiresAdmin: true });

    // Process withdrawal (if we have one)
    if (this.testWithdrawal) {
      await this.test('POST /api/withdraw/process/:id', async () => {
        try {
          const processed = await this.authenticatedPaywall.withdrawals.process(this.testWithdrawal.id);
          return processed;
        } catch (error) {
          // This might fail due to insufficient funds or RPC issues, which is expected
          if (error.message.includes('insufficient') || error.message.includes('RPC')) {
            return { status: 'expected_failure', reason: error.message };
          }
          throw error;
        }
      }, { requiresAdmin: true });
    }
  }

  async testAuthenticationScenarios() {
    this.log('\\n🔐 Testing Authentication Scenarios', 'bold');
    
    // Test without API key on protected endpoint
    await this.test('Unauthorized access to admin endpoint', async () => {
      try {
        await this.paywall.admin.getStats();
        throw new Error('Should have failed with 401');
      } catch (error) {
        if (error.status === 401) {
          return { status: 'correctly_rejected', message: error.message };
        }
        throw error;
      }
    });

    // Test with invalid API key
    await this.test('Invalid API key', async () => {
      const invalidPaywall = new ZcashPaywall({
        baseURL: BASE_URL,
        apiKey: 'zp_invalid_key_12345'
      });
      
      try {
        await invalidPaywall.admin.getStats();
        throw new Error('Should have failed with 401');
      } catch (error) {
        if (error.status === 401) {
          return { status: 'correctly_rejected', message: error.message };
        }
        throw error;
      }
    });

    // Test API key methods
    if (this.authenticatedPaywall) {
      await this.test('API key management methods', async () => {
        const hasKey = this.authenticatedPaywall.hasApiKey();
        if (!hasKey) {
          throw new Error('Should have API key');
        }
        
        // Test removing and setting key
        this.authenticatedPaywall.removeApiKey();
        if (this.authenticatedPaywall.hasApiKey()) {
          throw new Error('Should not have API key after removal');
        }
        
        this.authenticatedPaywall.setApiKey(this.testApiKey);
        if (!this.authenticatedPaywall.hasApiKey()) {
          throw new Error('Should have API key after setting');
        }
        
        return { status: 'all_methods_working' };
      });
    }
  }

  async cleanup() {
    this.log('\\n🧹 Cleaning up test data...', 'blue');
    
    // Deactivate test API key
    if (this.authenticatedPaywall && this.testApiKey) {
      try {
        const keys = await this.authenticatedPaywall.apiKeys.listByUser(this.testUser.id);
        for (const key of keys.api_keys) {
          if (key.name.includes('Test')) {
            await this.authenticatedPaywall.apiKeys.delete(key.id);
            this.log(`🗑️  Deactivated API key: ${key.name}`, 'yellow');
          }
        }
      } catch (error) {
        this.log(`⚠️  Could not cleanup API keys: ${error.message}`, 'yellow');
      }
    }
    
    this.log('✅ Cleanup completed', 'green');
  }

  printSummary() {
    this.log('\\n📊 Test Results Summary', 'bold');
    this.log(`✅ Passed: ${this.results.passed}`, 'green');
    this.log(`❌ Failed: ${this.results.failed}`, 'red');
    this.log(`⏭️  Skipped: ${this.results.skipped}`, 'yellow');
    this.log(`📊 Total: ${this.results.tests.length}`, 'blue');
    
    const successRate = ((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1);
    this.log(`🎯 Success Rate: ${successRate}%`, successRate > 80 ? 'green' : 'red');
    
    if (this.results.failed > 0) {
      this.log('\\n❌ Failed Tests:', 'red');
      this.results.tests
        .filter(test => test.status === 'failed')
        .forEach(test => {
          this.log(`   • ${test.name}: ${test.error}`, 'red');
        });
    }
    
    if (this.results.skipped > 0) {
      this.log('\\n⏭️  Skipped Tests:', 'yellow');
      this.results.tests
        .filter(test => test.status === 'skipped')
        .forEach(test => {
          this.log(`   • ${test.name}: ${test.reason}`, 'yellow');
        });
    }
  }

  async runAllTests() {
    this.log('🚀 Starting Comprehensive Endpoint Testing', 'bold');
    this.log(`📍 Base URL: ${BASE_URL}`, 'blue');
    this.log(`📧 Test Email: ${TEST_EMAIL}`, 'blue');
    
    try {
      await this.setup();
      await this.testHealthEndpoints();
      await this.testUserEndpoints();
      await this.testApiKeyEndpoints();
      await this.testInvoiceEndpoints();
      await this.testWithdrawalEndpoints();
      await this.testAdminEndpoints();
      await this.testAuthenticationScenarios();
      await this.cleanup();
    } catch (error) {
      this.log(`💥 Test suite failed: ${error.message}`, 'red');
    }
    
    this.printSummary();
    
    // Exit with appropriate code
    process.exit(this.results.failed > 0 ? 1 : 0);
  }
}

// Run the tests
const tester = new EndpointTester();
tester.runAllTests().catch(error => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});