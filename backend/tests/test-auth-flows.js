/**
 * Authentication Flow Testing Script
 * Tests registration, login, and password change flows
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3001';

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

class AuthFlowTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
    this.testUser = {
      name: 'Test User',
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!'
    };
    this.authToken = null;
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

  async makeRequest(method, endpoint, data = null, token = null) {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
    log('🚀 Starting Authentication Flow Tests', 'bold');
    log(`📍 Base URL: ${BASE_URL}`, 'blue');
    log(`👤 Test User: ${this.testUser.email}`, 'blue');

    // Test 1: User Registration
    log('\n📝 Testing User Registration', 'bold');
    
    await this.test('Valid Registration', async () => {
      const response = await this.makeRequest('POST', '/auth/register', {
        name: this.testUser.name,
        email: this.testUser.email,
        password: this.testUser.password
      });
      
      if (response.status !== 201) {
        throw new Error(`Expected 201, got ${response.status}: ${JSON.stringify(response.data)}`);
      }
      
      if (!response.data.id || !response.data.name || !response.data.email) {
        throw new Error('Registration response missing required fields');
      }
      
      return response.data;
    });

    await this.test('Duplicate Email Registration (Should Fail)', async () => {
      const response = await this.makeRequest('POST', '/auth/register', {
        name: this.testUser.name,
        email: this.testUser.email,
        password: this.testUser.password
      });
      
      if (response.status !== 400) {
        throw new Error(`Expected 400, got ${response.status}`);
      }
      
      if (!response.data.error || !response.data.error.includes('already registered')) {
        throw new Error('Expected "already registered" error message');
      }
      
      return { status: 'correctly_rejected' };
    });

    await this.test('Registration Missing Fields (Should Fail)', async () => {
      const response = await this.makeRequest('POST', '/auth/register', {
        name: this.testUser.name,
        email: this.testUser.email
        // Missing password
      });
      
      if (response.status !== 400) {
        throw new Error(`Expected 400, got ${response.status}`);
      }
      
      return { status: 'correctly_rejected' };
    });

    await this.test('Registration Invalid Email (Should Fail)', async () => {
      const response = await this.makeRequest('POST', '/auth/register', {
        name: 'Test User',
        email: 'invalid-email',
        password: 'password123'
      });
      
      if (response.status !== 400) {
        throw new Error(`Expected 400, got ${response.status}`);
      }
      
      return { status: 'correctly_rejected' };
    });

    // Test 2: User Login
    log('\n🔐 Testing User Login', 'bold');
    
    await this.test('Valid Login', async () => {
      const response = await this.makeRequest('POST', '/auth/login', {
        email: this.testUser.email,
        password: this.testUser.password
      });
      
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
      }
      
      if (!response.data.token) {
        throw new Error('Login response missing token');
      }
      
      // Store token for later tests
      this.authToken = response.data.token;
      
      return response.data;
    });

    await this.test('Login Wrong Password (Should Fail)', async () => {
      const response = await this.makeRequest('POST', '/auth/login', {
        email: this.testUser.email,
        password: 'wrongpassword'
      });
      
      if (response.status !== 401) {
        throw new Error(`Expected 401, got ${response.status}`);
      }
      
      return { status: 'correctly_rejected' };
    });

    await this.test('Login Non-existent User (Should Fail)', async () => {
      const response = await this.makeRequest('POST', '/auth/login', {
        email: 'nonexistent@example.com',
        password: 'password123'
      });
      
      if (response.status !== 401) {
        throw new Error(`Expected 401, got ${response.status}`);
      }
      
      return { status: 'correctly_rejected' };
    });

    await this.test('Login Missing Fields (Should Fail)', async () => {
      const response = await this.makeRequest('POST', '/auth/login', {
        email: this.testUser.email
        // Missing password
      });
      
      if (response.status !== 400) {
        throw new Error(`Expected 400, got ${response.status}`);
      }
      
      return { status: 'correctly_rejected' };
    });

    // Test 3: Protected Route Access
    log('\n🛡️ Testing Protected Route Access', 'bold');
    
    await this.test('Access Protected Route with Valid Token', async () => {
      const response = await this.makeRequest('POST', '/auth/change-password', {
        currentPassword: this.testUser.password,
        newPassword: 'NewPassword123!'
      }, this.authToken);
      
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
      }
      
      // Update password for future tests
      this.testUser.password = 'NewPassword123!';
      
      return response.data;
    });

    await this.test('Access Protected Route without Token (Should Fail)', async () => {
      const response = await this.makeRequest('POST', '/auth/change-password', {
        currentPassword: 'somepassword',
        newPassword: 'newpassword'
      });
      
      if (response.status !== 401) {
        throw new Error(`Expected 401, got ${response.status}`);
      }
      
      return { status: 'correctly_rejected' };
    });

    await this.test('Access Protected Route with Invalid Token (Should Fail)', async () => {
      const response = await this.makeRequest('POST', '/auth/change-password', {
        currentPassword: 'somepassword',
        newPassword: 'newpassword'
      }, 'invalid.jwt.token');
      
      if (response.status !== 401) {
        throw new Error(`Expected 401, got ${response.status}`);
      }
      
      return { status: 'correctly_rejected' };
    });

    // Test 4: Password Change Flow
    log('\n🔑 Testing Password Change Flow', 'bold');
    
    await this.test('Change Password with Wrong Current Password (Should Fail)', async () => {
      const response = await this.makeRequest('POST', '/auth/change-password', {
        currentPassword: 'wrongcurrentpassword',
        newPassword: 'AnotherNewPassword123!'
      }, this.authToken);
      
      if (response.status !== 400) {
        throw new Error(`Expected 400, got ${response.status}`);
      }
      
      return { status: 'correctly_rejected' };
    });

    await this.test('Change Password Missing Fields (Should Fail)', async () => {
      const response = await this.makeRequest('POST', '/auth/change-password', {
        currentPassword: this.testUser.password
        // Missing newPassword
      }, this.authToken);
      
      if (response.status !== 400) {
        throw new Error(`Expected 400, got ${response.status}`);
      }
      
      return { status: 'correctly_rejected' };
    });

    // Test 5: Login with New Password
    log('\n🔄 Testing Login with New Password', 'bold');
    
    await this.test('Login with New Password', async () => {
      const response = await this.makeRequest('POST', '/auth/login', {
        email: this.testUser.email,
        password: this.testUser.password
      });
      
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
      }
      
      if (!response.data.token) {
        throw new Error('Login response missing token');
      }
      
      return response.data;
    });

    await this.test('Login with Old Password (Should Fail)', async () => {
      const response = await this.makeRequest('POST', '/auth/login', {
        email: this.testUser.email,
        password: 'TestPassword123!' // Original password
      });
      
      if (response.status !== 401) {
        throw new Error(`Expected 401, got ${response.status}`);
      }
      
      return { status: 'correctly_rejected' };
    });

    // Test 6: Forgot Password Flow
    log('\n🔄 Testing Forgot Password Flow', 'bold');
    
    await this.test('Forgot Password Request', async () => {
      const response = await this.makeRequest('POST', '/auth/forgot-password', {
        email: this.testUser.email
      });
      
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
      }
      
      if (!response.data.resetToken) {
        throw new Error('Reset token not provided in response');
      }
      
      // Store reset token for next test
      this.resetToken = response.data.resetToken;
      
      return response.data;
    });

    await this.test('Reset Password with Valid Token', async () => {
      const newPassword = 'ResetPassword123!';
      const response = await this.makeRequest('POST', '/auth/reset-password', {
        resetToken: this.resetToken,
        newPassword: newPassword
      });
      
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
      }
      
      // Update password for future tests
      this.testUser.password = newPassword;
      
      return response.data;
    });

    await this.test('Login with Reset Password', async () => {
      const response = await this.makeRequest('POST', '/auth/login', {
        email: this.testUser.email,
        password: this.testUser.password
      });
      
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
      }
      
      // Update auth token
      this.authToken = response.data.token;
      
      return response.data;
    });

    await this.test('Reset Password with Invalid Token (Should Fail)', async () => {
      const response = await this.makeRequest('POST', '/auth/reset-password', {
        resetToken: 'invalid.token.here',
        newPassword: 'SomePassword123!'
      });
      
      if (response.status !== 400) {
        throw new Error(`Expected 400, got ${response.status}`);
      }
      
      return { status: 'correctly_rejected' };
    });

    // Test 7: Project Management Flow
    log('\n📁 Testing Project Management Flow', 'bold');
    
    await this.test('Create Project', async () => {
      const response = await this.makeRequest('POST', '/api/projects', {
        name: 'Test Project',
        description: 'A test project for authentication flow testing',
        category: 'defi',
        website_url: 'https://example.com',
        tags: ['test', 'demo']
      }, this.authToken);
      
      if (response.status !== 201) {
        throw new Error(`Expected 201, got ${response.status}: ${JSON.stringify(response.data)}`);
      }
      
      if (!response.data.data.id) {
        throw new Error('Project ID not returned');
      }
      
      // Store project ID for future tests
      this.projectId = response.data.data.id;
      
      return response.data;
    });

    await this.test('Get All Projects', async () => {
      const response = await this.makeRequest('GET', '/api/projects', null, this.authToken);
      
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
      }
      
      if (!Array.isArray(response.data.data)) {
        throw new Error('Projects data should be an array');
      }
      
      return response.data;
    });

    await this.test('Get Single Project', async () => {
      const response = await this.makeRequest('GET', `/api/projects/${this.projectId}`, null, this.authToken);
      
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
      }
      
      if (response.data.data.id !== this.projectId) {
        throw new Error('Returned project ID does not match requested ID');
      }
      
      return response.data;
    });

    await this.test('Update Project', async () => {
      const response = await this.makeRequest('PUT', `/api/projects/${this.projectId}`, {
        name: 'Updated Test Project',
        status: 'active'
      }, this.authToken);
      
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
      }
      
      if (response.data.data.name !== 'Updated Test Project') {
        throw new Error('Project name was not updated');
      }
      
      return response.data;
    });

    await this.test('Access Project without Authentication (Should Fail)', async () => {
      const response = await this.makeRequest('GET', `/api/projects/${this.projectId}`);
      
      if (response.status !== 401) {
        throw new Error(`Expected 401, got ${response.status}`);
      }
      
      return { status: 'correctly_rejected' };
    });

    // Test 8: Wallet Management Flow
    log('\n💰 Testing Wallet Management Flow', 'bold');
    
    await this.test('Create Wallet for Project', async () => {
      const response = await this.makeRequest('POST', `/api/projects/${this.projectId}/wallets`, {
        address: 't1YourTestAddress1234567890123456789012345678',
        type: 't',
        privacy_mode: 'public',
        description: 'Test transparent wallet',
        network: 'testnet'
      }, this.authToken);
      
      if (response.status !== 201) {
        throw new Error(`Expected 201, got ${response.status}: ${JSON.stringify(response.data)}`);
      }
      
      if (!response.data.data.id) {
        throw new Error('Wallet ID not returned');
      }
      
      // Store wallet ID for future tests
      this.walletId = response.data.data.id;
      
      return response.data;
    });

    await this.test('Get All Project Wallets', async () => {
      const response = await this.makeRequest('GET', `/api/projects/${this.projectId}/wallets`, null, this.authToken);
      
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
      }
      
      if (!Array.isArray(response.data.data)) {
        throw new Error('Wallets data should be an array');
      }
      
      return response.data;
    });

    await this.test('Get Single Wallet', async () => {
      const response = await this.makeRequest('GET', `/api/projects/${this.projectId}/wallets/${this.walletId}`, null, this.authToken);
      
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
      }
      
      if (response.data.data.id !== this.walletId) {
        throw new Error('Returned wallet ID does not match requested ID');
      }
      
      return response.data;
    });

    await this.test('Update Wallet', async () => {
      const response = await this.makeRequest('PUT', `/api/projects/${this.projectId}/wallets/${this.walletId}`, {
        description: 'Updated test wallet description',
        privacy_mode: 'private'
      }, this.authToken);
      
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
      }
      
      if (response.data.data.description !== 'Updated test wallet description') {
        throw new Error('Wallet description was not updated');
      }
      
      return response.data;
    });

    await this.test('Create Shielded Wallet', async () => {
      const response = await this.makeRequest('POST', `/api/projects/${this.projectId}/wallets`, {
        address: 'zs1testshieldedaddress1234567890123456789012345678901234567890',
        type: 'z',
        privacy_mode: 'private',
        description: 'Test shielded wallet',
        network: 'testnet'
      }, this.authToken);
      
      if (response.status !== 201) {
        throw new Error(`Expected 201, got ${response.status}: ${JSON.stringify(response.data)}`);
      }
      
      this.shieldedWalletId = response.data.data.id;
      
      return response.data;
    });

    await this.test('Get Wallets by Type', async () => {
      const response = await this.makeRequest('GET', `/api/projects/${this.projectId}/wallets/type?type=z`, null, this.authToken);
      
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
      }
      
      if (!Array.isArray(response.data.data)) {
        throw new Error('Wallets data should be an array');
      }
      
      return response.data;
    });

    await this.test('Get Active Wallets', async () => {
      const response = await this.makeRequest('GET', `/api/projects/${this.projectId}/wallets/active`, null, this.authToken);
      
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
      }
      
      if (!Array.isArray(response.data.data)) {
        throw new Error('Wallets data should be an array');
      }
      
      return response.data;
    });

    await this.test('Get All User Wallets', async () => {
      const response = await this.makeRequest('GET', '/api/user/wallets', null, this.authToken);
      
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
      }
      
      if (!Array.isArray(response.data.data)) {
        throw new Error('Wallets data should be an array');
      }
      
      return response.data;
    });

    await this.test('Create Wallet with Invalid Type (Should Fail)', async () => {
      const response = await this.makeRequest('POST', `/api/projects/${this.projectId}/wallets`, {
        address: 'invalidaddress123',
        type: 'invalid',
        privacy_mode: 'public'
      }, this.authToken);
      
      if (response.status !== 400) {
        throw new Error(`Expected 400, got ${response.status}`);
      }
      
      return { status: 'correctly_rejected' };
    });

    await this.test('Access Wallet without Authentication (Should Fail)', async () => {
      const response = await this.makeRequest('GET', `/api/projects/${this.projectId}/wallets`);
      
      if (response.status !== 401) {
        throw new Error(`Expected 401, got ${response.status}`);
      }
      
      return { status: 'correctly_rejected' };
    });

    await this.test('Delete Wallet', async () => {
      const response = await this.makeRequest('DELETE', `/api/projects/${this.projectId}/wallets/${this.walletId}`, null, this.authToken);
      
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
      }
      
      return response.data;
    });

    await this.test('Delete Project', async () => {
      const response = await this.makeRequest('DELETE', `/api/projects/${this.projectId}`, null, this.authToken);
      
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
      }
      
      return response.data;
    });

    // Test 8: Rate Limiting
    log('\n⏱️ Testing Rate Limiting', 'bold');
    
    await this.test('Rate Limiting on Login Attempts', async () => {
      const promises = [];
      
      // Make 12 rapid login attempts (limit is 10 per 15 minutes)
      for (let i = 0; i < 12; i++) {
        promises.push(
          this.makeRequest('POST', '/auth/login', {
            email: 'rate-limit-test@example.com',
            password: 'wrongpassword'
          })
        );
      }
      
      const responses = await Promise.all(promises);
      
      // Check that some requests were rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      if (rateLimitedResponses.length === 0) {
        throw new Error('Expected some requests to be rate limited');
      }
      
      return { 
        totalRequests: responses.length, 
        rateLimited: rateLimitedResponses.length 
      };
    });

    this.printSummary();
  }

  printSummary() {
    log('\n📊 Authentication Flow Test Results', 'bold');
    log(`✅ Passed: ${this.results.passed}`, 'green');
    log(`❌ Failed: ${this.results.failed}`, 'red');
    log(`📊 Total: ${this.results.tests.length}`, 'blue');
    
    const successRate = this.results.tests.length > 0 
      ? ((this.results.passed / this.results.tests.length) * 100).toFixed(1)
      : 0;
    log(`🎯 Success Rate: ${successRate}%`, successRate > 90 ? 'green' : 'red');
    
    if (this.results.failed > 0) {
      log('\n❌ Failed Tests:', 'red');
      this.results.tests
        .filter(test => test.status === 'failed')
        .forEach(test => {
          log(`   • ${test.name}: ${test.error}`, 'red');
        });
    }
    
    if (this.results.failed === 0) {
      log('\n🎉 All authentication and wallet flow tests passed!', 'green');
      log('\n✅ Complete System Summary:', 'bold');
      log('   • User registration works correctly', 'green');
      log('   • User login works correctly', 'green');
      log('   • Password change works correctly', 'green');
      log('   • Forgot password flow works correctly', 'green');
      log('   • Project management works correctly', 'green');
      log('   • Wallet management works correctly', 'green');
      log('   • Protected routes are properly secured', 'green');
      log('   • Rate limiting is working', 'green');
      log('   • Input validation is working', 'green');
    } else {
      log('\n⚠️  Some tests failed. Check the output above.', 'yellow');
    }
  }
}

// Run the tests
const tester = new AuthFlowTester();
tester.runTests().catch(error => {
  console.error('💥 Authentication flow test runner failed:', error);
  process.exit(1);
});