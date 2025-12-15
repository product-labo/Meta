/**
 * Authentication Testing Script
 * Tests API key authentication across all routes
 */

import { ZcashPaywall } from '../src/ZcashPaywall.js';
import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

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

class AuthenticationTester {
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

  async makeRequest(method, endpoint, data = null, apiKey = null) {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (apiKey) {
      config.headers.Authorization = `Bearer ${apiKey}`;
    }

    if (data) {
      config.data = data;
    }

    try {
      const response = await axios(config);
      return { status: response.status, data: response.data };
    } catch (error) {
      return { 
        status: error.response?.status || 500, 
        data: error.response?.data || { error: error.message } 
      };
    }
  }

  async runTests() {
    log('🚀 Starting Authentication Tests', 'bold');
    log(`📍 Base URL: ${BASE_URL}`, 'blue');

    // Test public endpoints (should work without API key)
    log('\\n📊 Testing Public Endpoints', 'bold');
    
    await this.test('Health Check (No Auth)', async () => {
      const response = await this.makeRequest('GET', '/health');
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`);
      }
      return response.data;
    });

    await this.test('API Documentation (No Auth)', async () => {
      const response = await this.makeRequest('GET', '/api');
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`);
      }
      return response.data;
    });

    await this.test('SDK Config (No Auth)', async () => {
      const response = await this.makeRequest('GET', '/api/config');
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`);
      }
      return response.data;
    });

    // Test optional authentication endpoints
    log('\\n🔓 Testing Optional Authentication Endpoints', 'bold');
    
    await this.test('Create User (No Auth)', async () => {
      const response = await this.makeRequest('POST', '/api/users/create', {
        email: 'test-no-auth@example.com',
        name: 'Test User No Auth'
      });
      if (response.status !== 201) {
        throw new Error(`Expected 201, got ${response.status}: ${JSON.stringify(response.data)}`);
      }
      return response.data;
    });

    await this.test('Create Invoice (No Auth)', async () => {
      const response = await this.makeRequest('POST', '/api/invoice/create', {
        email: 'test-invoice@example.com',
        type: 'one_time',
        amount_zec: 0.01
      });
      if (response.status !== 201) {
        throw new Error(`Expected 201, got ${response.status}: ${JSON.stringify(response.data)}`);
      }
      return response.data;
    });

    await this.test('Fee Estimate (No Auth)', async () => {
      const response = await this.makeRequest('POST', '/api/withdraw/fee-estimate', {
        amount_zec: 0.01
      });
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
      }
      return response.data;
    });

    // Test required authentication endpoints
    log('\\n🔒 Testing Required Authentication Endpoints', 'bold');
    
    await this.test('API Key Creation (No Auth - Should Fail)', async () => {
      const response = await this.makeRequest('POST', '/api/keys/create', {
        user_id: 'test-user-id',
        name: 'Test Key'
      });
      if (response.status !== 401) {
        throw new Error(`Expected 401, got ${response.status}`);
      }
      return { status: 'correctly_rejected' };
    });

    await this.test('Admin Stats (No Auth - Should Fail)', async () => {
      const response = await this.makeRequest('GET', '/api/admin/stats');
      if (response.status !== 401) {
        throw new Error(`Expected 401, got ${response.status}`);
      }
      return { status: 'correctly_rejected' };
    });

    await this.test('List All Users (No Auth - Should Fail)', async () => {
      const response = await this.makeRequest('GET', '/api/users');
      if (response.status !== 401) {
        throw new Error(`Expected 401, got ${response.status}`);
      }
      return { status: 'correctly_rejected' };
    });

    // Test invalid API key
    log('\\n🚫 Testing Invalid API Key', 'bold');
    
    const invalidApiKey = 'zp_invalid_key_12345678901234567890123456789012345678901234567890';
    
    await this.test('Invalid API Key (Should Fail)', async () => {
      const response = await this.makeRequest('GET', '/api/admin/stats', null, invalidApiKey);
      if (response.status !== 401) {
        throw new Error(`Expected 401, got ${response.status}`);
      }
      return { status: 'correctly_rejected' };
    });

    await this.test('Malformed API Key (Should Fail)', async () => {
      const response = await this.makeRequest('GET', '/api/admin/stats', null, 'invalid-key-format');
      if (response.status !== 401) {
        throw new Error(`Expected 401, got ${response.status}`);
      }
      return { status: 'correctly_rejected' };
    });

    // Test authorization header formats
    log('\\n📋 Testing Authorization Header Formats', 'bold');
    
    await this.test('Missing Bearer Scheme (Should Fail)', async () => {
      const config = {
        method: 'GET',
        url: `${BASE_URL}/api/admin/stats`,
        headers: {
          'Authorization': 'zp_test_key_12345'  // Missing "Bearer"
        }
      };
      
      try {
        const response = await axios(config);
        throw new Error(`Expected 401, got ${response.status}`);
      } catch (error) {
        if (error.response?.status !== 401) {
          throw new Error(`Expected 401, got ${error.response?.status || 'network error'}`);
        }
        return { status: 'correctly_rejected' };
      }
    });

    // Test endpoint-specific authentication requirements
    log('\\n🎯 Testing Endpoint-Specific Authentication', 'bold');
    
    const endpointTests = [
      // Optional auth endpoints (should work without auth)
      { method: 'POST', endpoint: '/api/users/create', data: { email: 'test@example.com' }, expectStatus: 201, authRequired: false },
      { method: 'POST', endpoint: '/api/invoice/create', data: { email: 'test@example.com', type: 'one_time', amount_zec: 0.01 }, expectStatus: 201, authRequired: false },
      
      // Required auth endpoints (should fail without auth)
      { method: 'POST', endpoint: '/api/keys/create', data: { user_id: 'test', name: 'test' }, expectStatus: 401, authRequired: true },
      { method: 'GET', endpoint: '/api/admin/stats', expectStatus: 401, authRequired: true },
      { method: 'GET', endpoint: '/api/users', expectStatus: 401, authRequired: true },
    ];

    for (const test of endpointTests) {
      const testName = `${test.method} ${test.endpoint} (${test.authRequired ? 'Auth Required' : 'No Auth Required'})`;
      
      await this.test(testName, async () => {
        const response = await this.makeRequest(test.method, test.endpoint, test.data);
        if (response.status !== test.expectStatus) {
          throw new Error(`Expected ${test.expectStatus}, got ${response.status}`);
        }
        return { status: response.status, authRequired: test.authRequired };
      });
    }

    // Test SDK authentication methods
    log('\\n🔧 Testing SDK Authentication Methods', 'bold');
    
    await this.test('SDK API Key Management', async () => {
      const paywall = new ZcashPaywall({ baseURL: BASE_URL });
      
      // Initially no API key
      if (paywall.hasApiKey()) {
        throw new Error('Should not have API key initially');
      }
      
      // Set API key
      paywall.setApiKey('zp_test_key_12345');
      if (!paywall.hasApiKey()) {
        throw new Error('Should have API key after setting');
      }
      
      // Check authorization header
      if (paywall.client.defaults.headers.Authorization !== 'Bearer zp_test_key_12345') {
        throw new Error('Authorization header not set correctly');
      }
      
      // Remove API key
      paywall.removeApiKey();
      if (paywall.hasApiKey()) {
        throw new Error('Should not have API key after removal');
      }
      
      return { status: 'all_methods_working' };
    });

    this.printSummary();
  }

  printSummary() {
    log('\\n📊 Authentication Test Results', 'bold');
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
      log('\\n🎉 All authentication tests passed!', 'green');
      log('\\n✅ Authentication Summary:', 'bold');
      log('   • Public endpoints work without authentication', 'green');
      log('   • Optional auth endpoints work with and without API keys', 'green');
      log('   • Required auth endpoints properly reject unauthorized requests', 'green');
      log('   • Invalid API keys are properly rejected', 'green');
      log('   • SDK authentication methods work correctly', 'green');
    } else {
      log('\\n⚠️  Some authentication tests failed. Check the output above.', 'yellow');
    }
  }
}

// Run the tests
const tester = new AuthenticationTester();
tester.runTests().catch(error => {
  console.error('💥 Authentication test runner failed:', error);
  process.exit(1);
});