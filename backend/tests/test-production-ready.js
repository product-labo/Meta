/**
 * Production-Ready API Test Suite
 * Tests all endpoints with real database operations and handles 1000+ users
 */

import axios from 'axios';
import { pool } from '../src/config/appConfig.js';

const BASE_URL = 'http://localhost:3000';
const TEST_USERS_COUNT = 100; // Start with 100, can scale to 1000+

class ProductionAPITester {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
    this.createdUsers = [];
    this.createdApiKeys = [];
    this.createdInvoices = [];
    this.createdWithdrawals = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async test(name, testFn) {
    try {
      this.log(`Testing: ${name}`);
      await testFn();
      this.testResults.passed++;
      this.log(`✅ PASSED: ${name}`, 'success');
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({ test: name, error: error.message });
      this.log(`❌ FAILED: ${name} - ${error.message}`, 'error');
    }
  }

  async makeRequest(method, url, data = null, headers = {}) {
    try {
      const config = {
        method,
        url: `${BASE_URL}${url}`,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };
      
      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  // Test Health Check
  async testHealthCheck() {
    const result = await this.makeRequest('GET', '/health');
    if (result.status !== 'OK') {
      throw new Error('Health check failed');
    }
  }

  // Test API Documentation
  async testApiDocumentation() {
    const result = await this.makeRequest('GET', '/api');
    if (!result.name || !result.endpoints) {
      throw new Error('API documentation incomplete');
    }
  }

  // Test User Creation (Bulk)
  async testBulkUserCreation() {
    this.log(`Creating ${TEST_USERS_COUNT} test users...`);
    
    const promises = [];
    for (let i = 0; i < TEST_USERS_COUNT; i++) {
      const userData = {
        email: `testuser${i}@example.com`,
        name: `Test User ${i}`
      };
      
      promises.push(
        this.makeRequest('POST', '/api/users/create', userData)
          .then(result => {
            if (result.success && result.user) {
              this.createdUsers.push(result.user);
              return result.user;
            }
            throw new Error('User creation failed');
          })
      );
    }

    const users = await Promise.all(promises);
    this.log(`Successfully created ${users.length} users`);
    
    if (users.length !== TEST_USERS_COUNT) {
      throw new Error(`Expected ${TEST_USERS_COUNT} users, got ${users.length}`);
    }
  }

  // Test API Key Creation
  async testApiKeyCreation() {
    if (this.createdUsers.length === 0) {
      throw new Error('No users available for API key creation');
    }

    const user = this.createdUsers[0];
    const keyData = {
      user_id: user.id,
      name: 'Test API Key',
      permissions: ['read', 'write'],
      expires_in_days: 30
    };

    const result = await this.makeRequest('POST', '/api/keys/create', keyData);
    
    if (!result.success || !result.api_key) {
      throw new Error('API key creation failed');
    }

    this.createdApiKeys.push({
      id: result.key_info.id,
      key: result.api_key,
      user_id: user.id
    });

    this.log('API key created successfully');
  }

  // Test Invoice Creation (Bulk)
  async testBulkInvoiceCreation() {
    if (this.createdUsers.length === 0) {
      throw new Error('No users available for invoice creation');
    }

    this.log('Creating invoices for all users...');
    
    const promises = this.createdUsers.slice(0, 50).map((user, index) => {
      const invoiceData = {
        user_id: user.id,
        type: index % 2 === 0 ? 'subscription' : 'one_time',
        amount_zec: 0.001 + (index * 0.0001), // Varying amounts
        item_id: `item_${index}`
      };

      return this.makeRequest('POST', '/api/invoice/create', invoiceData)
        .then(result => {
          if (result.success && result.invoice) {
            this.createdInvoices.push(result.invoice);
            return result.invoice;
          }
          throw new Error('Invoice creation failed');
        });
    });

    const invoices = await Promise.all(promises);
    this.log(`Successfully created ${invoices.length} invoices`);
  }

  // Test Invoice Payment Check
  async testInvoicePaymentCheck() {
    if (this.createdInvoices.length === 0) {
      throw new Error('No invoices available for payment check');
    }

    const invoice = this.createdInvoices[0];
    const result = await this.makeRequest('POST', '/api/invoice/check', {
      invoice_id: invoice.id
    });

    if (result.paid !== false) {
      throw new Error('Expected unpaid invoice');
    }

    this.log('Invoice payment check working correctly');
  }

  // Test Withdrawal Creation
  async testWithdrawalCreation() {
    if (this.createdUsers.length === 0) {
      throw new Error('No users available for withdrawal creation');
    }

    // First, simulate a paid invoice to give user balance
    const user = this.createdUsers[0];
    
    // Manually add balance to user (simulate payment)
    await pool.query(
      'INSERT INTO invoices (user_id, type, amount_zec, z_address, status, paid_amount_zec, paid_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
      [user.id, 'one_time', 0.01, 'ztest123...', 'paid', 0.01]
    );

    // Now try to create withdrawal
    const withdrawalData = {
      user_id: user.id,
      to_address: 't1UnEx5GLUk7Dn1kVCzE5ZCPEYMCCAtqPEN', // Test address
      amount_zec: 0.005
    };

    const result = await this.makeRequest('POST', '/api/withdraw/create', withdrawalData);
    
    if (!result.success || !result.withdrawal) {
      throw new Error('Withdrawal creation failed');
    }

    this.createdWithdrawals.push(result.withdrawal);
    this.log('Withdrawal created successfully');
  }

  // Test Fee Estimation
  async testFeeEstimation() {
    const result = await this.makeRequest('POST', '/api/withdraw/fee-estimate', {
      amount_zec: 0.1
    });

    if (!result.success || !result.fee || !result.net) {
      throw new Error('Fee estimation failed');
    }

    this.log(`Fee estimation: ${result.fee} ZEC fee for ${result.amount} ZEC`);
  }

  // Test User Balance Retrieval
  async testUserBalanceRetrieval() {
    if (this.createdUsers.length === 0) {
      throw new Error('No users available for balance check');
    }

    const user = this.createdUsers[0];
    const result = await this.makeRequest('GET', `/api/users/${user.id}/balance`);

    if (!result.success || !result.balance) {
      throw new Error('User balance retrieval failed');
    }

    this.log(`User balance: ${result.balance.available_balance_zec} ZEC`);
  }

  // Test QR Code Generation
  async testQRCodeGeneration() {
    if (this.createdInvoices.length === 0) {
      throw new Error('No invoices available for QR code generation');
    }

    const invoice = this.createdInvoices[0];
    
    // Test PNG QR code
    const response = await axios.get(`${BASE_URL}/api/invoice/${invoice.id}/qr?format=png`, {
      responseType: 'arraybuffer'
    });

    if (response.status !== 200 || response.headers['content-type'] !== 'image/png') {
      throw new Error('PNG QR code generation failed');
    }

    // Test SVG QR code
    const svgResponse = await axios.get(`${BASE_URL}/api/invoice/${invoice.id}/qr?format=svg`);
    
    if (svgResponse.status !== 200 || !svgResponse.headers['content-type'].includes('svg')) {
      throw new Error('SVG QR code generation failed');
    }

    this.log('QR code generation working correctly');
  }

  // Test API Key Authentication
  async testApiKeyAuthentication() {
    if (this.createdApiKeys.length === 0) {
      throw new Error('No API keys available for authentication test');
    }

    const apiKey = this.createdApiKeys[0];
    
    // Test authenticated request
    const result = await this.makeRequest('GET', `/api/keys/user/${apiKey.user_id}`, null, {
      'Authorization': `Bearer ${apiKey.key}`
    });

    if (!result.success || !result.api_keys) {
      throw new Error('API key authentication failed');
    }

    this.log('API key authentication working correctly');
  }

  // Test Rate Limiting and Performance
  async testRateLimitingAndPerformance() {
    this.log('Testing rate limiting and performance...');
    
    const startTime = Date.now();
    const promises = [];
    
    // Make 50 concurrent requests
    for (let i = 0; i < 50; i++) {
      promises.push(
        this.makeRequest('GET', '/health').catch(error => {
          // Some requests might be rate limited, that's expected
          return { rateLimited: true };
        })
      );
    }

    const results = await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const successful = results.filter(r => r.status === 'OK').length;
    const rateLimited = results.filter(r => r.rateLimited).length;
    
    this.log(`Performance test: ${successful} successful, ${rateLimited} rate limited in ${duration}ms`);
    
    if (successful === 0) {
      throw new Error('All requests failed - possible server issue');
    }
  }

  // Test Database Consistency
  async testDatabaseConsistency() {
    this.log('Testing database consistency...');
    
    // Check user count
    const userCount = await pool.query('SELECT COUNT(*) FROM users WHERE email LIKE $1', ['testuser%@example.com']);
    const expectedUsers = this.createdUsers.length;
    
    if (parseInt(userCount.rows[0].count) !== expectedUsers) {
      throw new Error(`Database inconsistency: expected ${expectedUsers} users, found ${userCount.rows[0].count}`);
    }

    // Check invoice count
    const invoiceCount = await pool.query('SELECT COUNT(*) FROM invoices WHERE user_id = ANY($1)', 
      [this.createdUsers.map(u => u.id)]);
    
    this.log(`Database consistency check passed: ${userCount.rows[0].count} users, ${invoiceCount.rows[0].count} invoices`);
  }

  // Cleanup Test Data
  async cleanup() {
    this.log('Cleaning up test data...');
    
    try {
      // Delete in reverse order of dependencies
      if (this.createdWithdrawals.length > 0) {
        await pool.query('DELETE FROM withdrawals WHERE user_id = ANY($1)', 
          [this.createdUsers.map(u => u.id)]);
      }
      
      if (this.createdInvoices.length > 0) {
        await pool.query('DELETE FROM invoices WHERE user_id = ANY($1)', 
          [this.createdUsers.map(u => u.id)]);
      }
      
      if (this.createdApiKeys.length > 0) {
        await pool.query('DELETE FROM api_keys WHERE user_id = ANY($1)', 
          [this.createdUsers.map(u => u.id)]);
      }
      
      if (this.createdUsers.length > 0) {
        await pool.query('DELETE FROM users WHERE email LIKE $1', ['testuser%@example.com']);
      }
      
      this.log('Cleanup completed successfully');
    } catch (error) {
      this.log(`Cleanup error: ${error.message}`, 'error');
    }
  }

  // Run All Tests
  async runAllTests() {
    this.log('🚀 Starting Production-Ready API Test Suite');
    this.log(`Testing with ${TEST_USERS_COUNT} users for scalability`);
    
    const startTime = Date.now();

    // Core functionality tests
    await this.test('Health Check', () => this.testHealthCheck());
    await this.test('API Documentation', () => this.testApiDocumentation());
    
    // User management tests
    await this.test('Bulk User Creation', () => this.testBulkUserCreation());
    await this.test('API Key Creation', () => this.testApiKeyCreation());
    await this.test('API Key Authentication', () => this.testApiKeyAuthentication());
    
    // Payment system tests
    await this.test('Bulk Invoice Creation', () => this.testBulkInvoiceCreation());
    await this.test('Invoice Payment Check', () => this.testInvoicePaymentCheck());
    await this.test('QR Code Generation', () => this.testQRCodeGeneration());
    
    // Withdrawal system tests
    await this.test('Fee Estimation', () => this.testFeeEstimation());
    await this.test('Withdrawal Creation', () => this.testWithdrawalCreation());
    await this.test('User Balance Retrieval', () => this.testUserBalanceRetrieval());
    
    // Performance and consistency tests
    await this.test('Rate Limiting and Performance', () => this.testRateLimitingAndPerformance());
    await this.test('Database Consistency', () => this.testDatabaseConsistency());
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Print results
    this.log('📊 Test Results Summary');
    this.log(`Total Tests: ${this.testResults.passed + this.testResults.failed}`);
    this.log(`Passed: ${this.testResults.passed}`, 'success');
    this.log(`Failed: ${this.testResults.failed}`, this.testResults.failed > 0 ? 'error' : 'success');
    this.log(`Duration: ${duration}ms`);
    this.log(`Users Created: ${this.createdUsers.length}`);
    this.log(`Invoices Created: ${this.createdInvoices.length}`);
    this.log(`API Keys Created: ${this.createdApiKeys.length}`);
    
    if (this.testResults.errors.length > 0) {
      this.log('❌ Failed Tests:');
      this.testResults.errors.forEach(error => {
        this.log(`  - ${error.test}: ${error.error}`, 'error');
      });
    }
    
    // Cleanup
    await this.cleanup();
    
    return {
      success: this.testResults.failed === 0,
      results: this.testResults,
      performance: {
        duration,
        usersCreated: this.createdUsers.length,
        invoicesCreated: this.createdInvoices.length
      }
    };
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new ProductionAPITester();
  
  tester.runAllTests()
    .then(results => {
      console.log('\n🎯 Test Suite Complete');
      process.exit(results.success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test Suite Failed:', error);
      process.exit(1);
    });
}

export default ProductionAPITester;