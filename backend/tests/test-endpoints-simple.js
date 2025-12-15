/**
 * Simple Endpoint Testing Script
 * Tests endpoints using the SDK with mock responses
 */

import { ZcashPaywall } from '../src/ZcashPaywall.js';
import { MockZcashPaywall } from '../src/sdk/testing/index.js';

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

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

class SimpleEndpointTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async test(name, testFn) {
    try {
      log(`🧪 Testing: ${name}`, 'cyan');
      const result = await testFn();
      log(`✅ PASS: ${name}`, 'green');
      this.results.passed++;
      this.results.tests.push({ name, status: 'passed', result });
      return result;
    } catch (error) {
      log(`❌ FAIL: ${name} - ${error.message}`, 'red');
      this.results.failed++;
      this.results.tests.push({ name, status: 'failed', error: error.message });
      return null;
    }
  }

  async runTests() {
    log('🚀 Starting Simple Endpoint Tests (Mock Mode)', 'bold');
    
    // Use mock paywall for testing
    const paywall = new MockZcashPaywall();
    let testUser = null;
    let testInvoice = null;
    let testWithdrawal = null;

    // Test Health Endpoint
    await this.test('Health Check', async () => {
      const health = await paywall.getHealth();
      if (health.status !== 'OK') {
        throw new Error(`Expected status OK, got ${health.status}`);
      }
      return health;
    });

    // Test User Endpoints
    log('\\n👤 Testing User Endpoints', 'bold');
    
    testUser = await this.test('Create User', async () => {
      const user = await paywall.users.create({
        email: 'test@example.com',
        name: 'Test User'
      });
      if (!user.id || user.email !== 'test@example.com') {
        throw new Error('User creation failed or returned invalid data');
      }
      return user;
    });

    if (testUser) {
      await this.test('Get User by ID', async () => {
        const user = await paywall.users.getById(testUser.id);
        if (user.id !== testUser.id) {
          throw new Error('Retrieved user ID does not match');
        }
        return user;
      });

      await this.test('Get User by Email', async () => {
        const user = await paywall.users.getByEmail('test@example.com');
        if (user.email !== 'test@example.com') {
          throw new Error('Retrieved user email does not match');
        }
        return user;
      });

      await this.test('Get User Balance', async () => {
        const balance = await paywall.users.getBalance(testUser.id);
        if (typeof balance.available_balance_zec !== 'number') {
          throw new Error('Balance response invalid');
        }
        return balance;
      });
    }

    // Test Invoice Endpoints
    log('\\n🧾 Testing Invoice Endpoints', 'bold');
    
    if (testUser) {
      testInvoice = await this.test('Create Invoice', async () => {
        const invoice = await paywall.invoices.create({
          user_id: testUser.id,
          type: 'one_time',
          amount_zec: 0.01,
          description: 'Test invoice'
        });
        if (!invoice.id || !invoice.payment_address) {
          throw new Error('Invoice creation failed');
        }
        return invoice;
      });

      if (testInvoice) {
        await this.test('Check Payment Status', async () => {
          const status = await paywall.invoices.checkPayment(testInvoice.id);
          if (!status.hasOwnProperty('paid')) {
            throw new Error('Payment status check failed');
          }
          return status;
        });

        await this.test('Get Invoice QR Code', async () => {
          const qrCode = await paywall.invoices.getQRCode(testInvoice.id);
          if (!qrCode || typeof qrCode !== 'string') {
            throw new Error('QR code generation failed');
          }
          return { qrCodeLength: qrCode.length };
        });
      }
    }

    // Test Withdrawal Endpoints
    log('\\n💰 Testing Withdrawal Endpoints', 'bold');
    
    if (testUser) {
      await this.test('Get Fee Estimate', async () => {
        const feeEstimate = await paywall.withdrawals.getFeeEstimate(0.01);
        if (typeof feeEstimate.fee !== 'number') {
          throw new Error('Fee estimation failed');
        }
        return feeEstimate;
      });

      testWithdrawal = await this.test('Create Withdrawal', async () => {
        const withdrawal = await paywall.withdrawals.create({
          user_id: testUser.id,
          amount_zec: 0.005,
          to_address: 'zs1test...'
        });
        if (!withdrawal.id) {
          throw new Error('Withdrawal creation failed');
        }
        return withdrawal;
      });
    }

    // Test Admin Endpoints
    log('\\n👑 Testing Admin Endpoints', 'bold');
    
    await this.test('Get Admin Stats', async () => {
      const stats = await paywall.admin.getStats();
      if (!stats.hasOwnProperty('users')) {
        throw new Error('Admin stats missing required fields');
      }
      return stats;
    });

    await this.test('Get Node Status', async () => {
      const nodeStatus = await paywall.admin.getNodeStatus();
      if (!nodeStatus.hasOwnProperty('blocks')) {
        throw new Error('Node status missing required fields');
      }
      return nodeStatus;
    });

    // Test API Key Functionality (SDK level)
    log('\\n🔑 Testing API Key Functionality', 'bold');
    
    await this.test('API Key Management', async () => {
      const realPaywall = new ZcashPaywall();
      
      // Test setting API key
      realPaywall.setApiKey('zp_test_key_12345');
      if (!realPaywall.hasApiKey()) {
        throw new Error('API key not set correctly');
      }
      
      // Test removing API key
      realPaywall.removeApiKey();
      if (realPaywall.hasApiKey()) {
        throw new Error('API key not removed correctly');
      }
      
      return { status: 'api_key_methods_working' };
    });

    // Test Error Handling
    log('\\n🚨 Testing Error Handling', 'bold');
    
    await this.test('Error Code Mapping', async () => {
      const realPaywall = new ZcashPaywall();
      
      const errorTests = [
        { status: 404, data: { error: 'Not found' }, expected: 'NOT_FOUND' },
        { status: 401, data: {}, expected: 'UNAUTHORIZED' },
        { status: 500, data: {}, expected: 'INTERNAL_ERROR' }
      ];
      
      for (const test of errorTests) {
        const result = realPaywall.mapErrorCode(test.status, test.data);
        if (result !== test.expected) {
          throw new Error(`Expected ${test.expected}, got ${result}`);
        }
      }
      
      return { error_mappings_tested: errorTests.length };
    });

    // Test Configuration
    log('\\n⚙️  Testing Configuration', 'bold');
    
    await this.test('SDK Configuration', async () => {
      const paywall1 = new ZcashPaywall({
        baseURL: 'https://api.example.com',
        apiKey: 'zp_test_key',
        timeout: 5000
      });
      
      if (paywall1.baseURL !== 'https://api.example.com') {
        throw new Error('Base URL not configured correctly');
      }
      
      if (paywall1.apiKey !== 'zp_test_key') {
        throw new Error('API key not configured correctly');
      }
      
      return { 
        baseURL: paywall1.baseURL,
        hasApiKey: !!paywall1.apiKey,
        timeout: paywall1.timeout
      };
    });

    await this.test('Preset Configuration', async () => {
      const devPaywall = ZcashPaywall.withPreset('development');
      if (!devPaywall) {
        throw new Error('Preset creation failed');
      }
      return { preset: 'development', created: true };
    });

    this.printSummary();
  }

  printSummary() {
    log('\\n📊 Simple Endpoint Test Results', 'bold');
    log(`✅ Passed: ${this.results.passed}`, 'green');
    log(`❌ Failed: ${this.results.failed}`, 'red');
    log(`📊 Total: ${this.results.tests.length}`, 'blue');
    
    const successRate = this.results.tests.length > 0 
      ? ((this.results.passed / this.results.tests.length) * 100).toFixed(1)
      : 0;
    log(`🎯 Success Rate: ${successRate}%`, successRate > 90 ? 'green' : 'red');
    
    if (this.results.failed > 0) {
      log('\\n❌ Failed Tests:', 'red');
      this.results.tests
        .filter(test => test.status === 'failed')
        .forEach(test => {
          log(`   • ${test.name}: ${test.error}`, 'red');
        });
    }
    
    if (this.results.failed === 0) {
      log('\\n🎉 All endpoint tests passed! The API structure is working correctly.', 'green');
      log('\\n💡 Note: These tests used mock responses. To test with a real server:', 'yellow');
      log('   1. Set up your database and Zcash node', 'yellow');
      log('   2. Start the server: npm start', 'yellow');
      log('   3. Run: node test-all-endpoints.js', 'yellow');
    }
  }
}

// Run the tests
const tester = new SimpleEndpointTester();
tester.runTests().catch(error => {
  console.error('💥 Simple endpoint test runner failed:', error);
  process.exit(1);
});