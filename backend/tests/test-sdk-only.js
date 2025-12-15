/**
 * SDK-Only Testing Script
 * Tests the SDK functionality without requiring a running server
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

class SDKTester {
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
    log('🚀 Starting SDK-Only Tests', 'bold');
    
    // Test SDK instantiation
    await this.test('SDK Instantiation', () => {
      const paywall = new ZcashPaywall({
        baseURL: 'http://localhost:3000'
      });
      
      if (!paywall.users || !paywall.invoices || !paywall.withdrawals || !paywall.admin || !paywall.apiKeys) {
        throw new Error('SDK modules not properly initialized');
      }
      
      return { modules: ['users', 'invoices', 'withdrawals', 'admin', 'apiKeys'] };
    });

    // Test API key management
    await this.test('API Key Management', () => {
      const paywall = new ZcashPaywall();
      
      // Initially no API key
      if (paywall.hasApiKey()) {
        throw new Error('Should not have API key initially');
      }
      
      // Set API key
      const testApiKey = 'zp_test_key_12345';
      paywall.setApiKey(testApiKey);
      
      if (!paywall.hasApiKey()) {
        throw new Error('Should have API key after setting');
      }
      
      if (paywall.apiKey !== testApiKey) {
        throw new Error('API key not set correctly');
      }
      
      // Remove API key
      paywall.removeApiKey();
      
      if (paywall.hasApiKey()) {
        throw new Error('Should not have API key after removal');
      }
      
      return { status: 'all_methods_working' };
    });

    // Test configuration resolution
    await this.test('Configuration Resolution', () => {
      const paywall1 = new ZcashPaywall({
        baseURL: 'https://api.example.com',
        apiKey: 'zp_test_key',
        timeout: 5000
      });
      
      if (paywall1.baseURL !== 'https://api.example.com') {
        throw new Error('Base URL not set correctly');
      }
      
      if (paywall1.apiKey !== 'zp_test_key') {
        throw new Error('API key not set correctly');
      }
      
      if (paywall1.timeout !== 5000) {
        throw new Error('Timeout not set correctly');
      }
      
      return { baseURL: paywall1.baseURL, hasApiKey: !!paywall1.apiKey };
    });

    // Test error mapping
    await this.test('Error Code Mapping', () => {
      const paywall = new ZcashPaywall();
      
      const tests = [
        { status: 404, data: { error: 'User not found' }, expected: 'NOT_FOUND' },
        { status: 400, data: { error: 'Invalid Zcash address' }, expected: 'INVALID_ADDRESS' },
        { status: 409, data: { error: 'User already exists' }, expected: 'ALREADY_EXISTS' },
        { status: 400, data: { error: 'Insufficient balance' }, expected: 'INSUFFICIENT_BALANCE' },
        { status: 500, data: {}, expected: 'INTERNAL_ERROR' },
        { status: 401, data: {}, expected: 'UNAUTHORIZED' },
        { status: 403, data: {}, expected: 'FORBIDDEN' }
      ];
      
      for (const test of tests) {
        const result = paywall.mapErrorCode(test.status, test.data);
        if (result !== test.expected) {
          throw new Error(`Expected ${test.expected}, got ${result} for status ${test.status}`);
        }
      }
      
      return { mappings_tested: tests.length };
    });

    // Test Mock SDK
    await this.test('Mock SDK Functionality', async () => {
      const mockPaywall = new MockZcashPaywall();
      
      // Test user creation
      const user = await mockPaywall.users.create({
        email: 'test@example.com',
        name: 'Test User'
      });
      
      if (!user.id || user.email !== 'test@example.com') {
        throw new Error('Mock user creation failed');
      }
      
      // Test invoice creation
      const invoice = await mockPaywall.invoices.create({
        user_id: user.id,
        type: 'one_time',
        amount_zec: 0.01
      });
      
      if (!invoice.id || !invoice.payment_address) {
        throw new Error('Mock invoice creation failed');
      }
      
      // Test withdrawal creation
      const withdrawal = await mockPaywall.withdrawals.create({
        user_id: user.id,
        amount_zec: 0.005,
        to_address: 'zs1test...'
      });
      
      if (!withdrawal.id) {
        throw new Error('Mock withdrawal creation failed');
      }
      
      return { 
        user_id: user.id, 
        invoice_id: invoice.id, 
        withdrawal_id: withdrawal.id 
      };
    });

    // Test API modules exist and have correct methods
    await this.test('API Module Methods', () => {
      const paywall = new ZcashPaywall();
      
      const expectedMethods = {
        users: ['create', 'getById', 'getByEmail', 'update', 'getBalance', 'list'],
        invoices: ['create', 'getById', 'listByUser', 'checkPayment', 'getQRCode', 'getPaymentURI'],
        withdrawals: ['create', 'getById', 'listByUser', 'getFeeEstimate', 'process'],
        admin: ['getStats', 'getPendingWithdrawals', 'getUserBalances', 'getRevenue', 'getActiveSubscriptions', 'getNodeStatus'],
        apiKeys: ['create', 'listByUser', 'getById', 'update', 'delete', 'regenerate']
      };
      
      for (const [module, methods] of Object.entries(expectedMethods)) {
        if (!paywall[module]) {
          throw new Error(`Module ${module} not found`);
        }
        
        for (const method of methods) {
          if (typeof paywall[module][method] !== 'function') {
            throw new Error(`Method ${module}.${method} not found or not a function`);
          }
        }
      }
      
      return { modules_checked: Object.keys(expectedMethods).length };
    });

    // Test static methods
    await this.test('Static Methods', () => {
      // Test preset creation
      const devPaywall = ZcashPaywall.withPreset('development');
      if (!devPaywall || typeof devPaywall.getHealth !== 'function') {
        throw new Error('Preset creation failed');
      }
      
      return { preset_created: true };
    });

    // Test axios client configuration
    await this.test('HTTP Client Configuration', () => {
      const paywall = new ZcashPaywall({
        baseURL: 'https://api.example.com',
        apiKey: 'zp_test_key',
        timeout: 10000
      });
      
      if (!paywall.client) {
        throw new Error('HTTP client not initialized');
      }
      
      if (paywall.client.defaults.baseURL !== 'https://api.example.com') {
        throw new Error('Base URL not configured correctly');
      }
      
      if (paywall.client.defaults.timeout !== 10000) {
        throw new Error('Timeout not configured correctly');
      }
      
      if (paywall.client.defaults.headers.Authorization !== 'Bearer zp_test_key') {
        throw new Error('Authorization header not set correctly');
      }
      
      return { 
        baseURL: paywall.client.defaults.baseURL,
        timeout: paywall.client.defaults.timeout,
        hasAuth: !!paywall.client.defaults.headers.Authorization
      };
    });

    this.printSummary();
  }

  printSummary() {
    log('\\n📊 SDK Test Results Summary', 'bold');
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
      log('\\n🎉 All SDK tests passed! The SDK is working correctly.', 'green');
    }
  }
}

// Run the tests
const tester = new SDKTester();
tester.runTests().catch(error => {
  console.error('💥 SDK test runner failed:', error);
  process.exit(1);
});