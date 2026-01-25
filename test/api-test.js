#!/usr/bin/env node

/**
 * API Test Suite
 * Tests all major API endpoints
 */

import fetch from 'node-fetch';
import assert from 'assert';

const API_BASE = 'http://localhost:5000';
let authToken = null;
let userId = null;
let configId = null;
let analysisId = null;

// Test data
const testUser = {
  email: `test${Date.now()}@example.com`,
  password: 'testpassword123',
  name: 'Test User'
};

const testConfig = {
  name: 'Test USDT Config',
  description: 'Test configuration for USDT analysis',
  targetContract: {
    address: '0x05D032ac25d322df992303dCa074EE7392C117b9',
    chain: 'lisk',
    name: 'USDT'
  },
  competitors: [
    {
      address: '0xfc102D4807A92B08080D4d969Dfda59C3C01B02F',
      chain: 'lisk',
      name: 'USDC'
    }
  ],
  rpcConfig: {
    lisk: [
      'https://lisk.drpc.org',
      'https://lisk.gateway.tenderly.co/2o3VKjmisQNOJIPlLrt6Ye'
    ]
  },
  analysisParams: {
    blockRange: 500,
    whaleThreshold: 5,
    maxConcurrentRequests: 3
  },
  tags: ['test', 'defi']
};

/**
 * Make HTTP request
 */
async function makeRequest(method, endpoint, data = null, useAuth = false) {
  const url = `${API_BASE}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (useAuth && authToken) {
    options.headers.Authorization = `Bearer ${authToken}`;
  }

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  const result = await response.json();

  return { status: response.status, data: result };
}

/**
 * Test health endpoint
 */
async function testHealth() {
  console.log('🔍 Testing health endpoint...');
  
  const { status, data } = await makeRequest('GET', '/health');
  
  assert.strictEqual(status, 200, 'Health check should return 200');
  assert.strictEqual(data.status, 'healthy', 'Status should be healthy');
  
  console.log('✅ Health check passed');
}

/**
 * Test user registration
 */
async function testRegistration() {
  console.log('🔍 Testing user registration...');
  
  const { status, data } = await makeRequest('POST', '/api/auth/register', testUser);
  
  assert.strictEqual(status, 201, 'Registration should return 201');
  assert(data.token, 'Should return JWT token');
  assert(data.user, 'Should return user data');
  assert.strictEqual(data.user.email, testUser.email, 'Email should match');
  
  authToken = data.token;
  userId = data.user.id;
  
  console.log('✅ Registration passed');
}

/**
 * Test user login
 */
async function testLogin() {
  console.log('🔍 Testing user login...');
  
  const { status, data } = await makeRequest('POST', '/api/auth/login', {
    email: testUser.email,
    password: testUser.password
  });
  
  assert.strictEqual(status, 200, 'Login should return 200');
  assert(data.token, 'Should return JWT token');
  assert(data.user, 'Should return user data');
  
  authToken = data.token;
  
  console.log('✅ Login passed');
}

/**
 * Test get user profile
 */
async function testGetProfile() {
  console.log('🔍 Testing get user profile...');
  
  const { status, data } = await makeRequest('GET', '/api/auth/me', null, true);
  
  assert.strictEqual(status, 200, 'Get profile should return 200');
  assert(data.user, 'Should return user data');
  assert.strictEqual(data.user.email, testUser.email, 'Email should match');
  
  console.log('✅ Get profile passed');
}

/**
 * Test create contract configuration
 */
async function testCreateConfig() {
  console.log('🔍 Testing create contract configuration...');
  
  const { status, data } = await makeRequest('POST', '/api/contracts', testConfig, true);
  
  assert.strictEqual(status, 201, 'Create config should return 201');
  assert(data.config, 'Should return config data');
  assert.strictEqual(data.config.name, testConfig.name, 'Name should match');
  
  configId = data.config.id;
  
  console.log('✅ Create config passed');
}

/**
 * Test get contract configurations
 */
async function testGetConfigs() {
  console.log('🔍 Testing get contract configurations...');
  
  const { status, data } = await makeRequest('GET', '/api/contracts', null, true);
  
  assert.strictEqual(status, 200, 'Get configs should return 200');
  assert(Array.isArray(data.contracts), 'Should return array of contracts');
  assert(data.contracts.length > 0, 'Should have at least one contract');
  
  console.log('✅ Get configs passed');
}

/**
 * Test get specific contract configuration
 */
async function testGetConfig() {
  console.log('🔍 Testing get specific contract configuration...');
  
  const { status, data } = await makeRequest('GET', `/api/contracts/${configId}`, null, true);
  
  assert.strictEqual(status, 200, 'Get config should return 200');
  assert(data.config, 'Should return config data');
  assert.strictEqual(data.config.id, configId, 'ID should match');
  
  console.log('✅ Get specific config passed');
}

/**
 * Test start analysis
 */
async function testStartAnalysis() {
  console.log('🔍 Testing start analysis...');
  
  const { status, data } = await makeRequest('POST', '/api/analysis/start', {
    configId: configId,
    analysisType: 'single'
  }, true);
  
  assert.strictEqual(status, 202, 'Start analysis should return 202');
  assert(data.analysisId, 'Should return analysis ID');
  assert.strictEqual(data.status, 'pending', 'Status should be pending');
  
  analysisId = data.analysisId;
  
  console.log('✅ Start analysis passed');
}

/**
 * Test get analysis status
 */
async function testGetAnalysisStatus() {
  console.log('🔍 Testing get analysis status...');
  
  const { status, data } = await makeRequest('GET', `/api/analysis/${analysisId}/status`, null, true);
  
  assert.strictEqual(status, 200, 'Get analysis status should return 200');
  assert(data.id, 'Should return analysis data');
  assert(['pending', 'running', 'completed', 'failed'].includes(data.status), 'Status should be valid');
  
  console.log('✅ Get analysis status passed');
}

/**
 * Test get analysis history
 */
async function testGetAnalysisHistory() {
  console.log('🔍 Testing get analysis history...');
  
  const { status, data } = await makeRequest('GET', '/api/analysis/history', null, true);
  
  assert.strictEqual(status, 200, 'Get analysis history should return 200');
  assert(Array.isArray(data.analyses), 'Should return array of analyses');
  assert(data.pagination, 'Should return pagination data');
  
  console.log('✅ Get analysis history passed');
}

/**
 * Test get user dashboard
 */
async function testGetDashboard() {
  console.log('🔍 Testing get user dashboard...');
  
  const { status, data } = await makeRequest('GET', '/api/users/dashboard', null, true);
  
  assert.strictEqual(status, 200, 'Get dashboard should return 200');
  assert(data.user, 'Should return user data');
  assert(data.stats, 'Should return stats data');
  assert(typeof data.stats.contractConfigs === 'number', 'Should return contract count');
  
  console.log('✅ Get dashboard passed');
}

/**
 * Test invalid authentication
 */
async function testInvalidAuth() {
  console.log('🔍 Testing invalid authentication...');
  
  const { status, data } = await makeRequest('GET', '/api/auth/me');
  
  assert.strictEqual(status, 401, 'Should return 401 for missing token');
  assert(data.error, 'Should return error message');
  
  console.log('✅ Invalid auth test passed');
}

/**
 * Test rate limiting (if enabled)
 */
async function testRateLimit() {
  console.log('🔍 Testing rate limiting...');
  
  // Make multiple rapid requests
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(makeRequest('GET', '/health'));
  }
  
  const results = await Promise.all(promises);
  const allSuccessful = results.every(r => r.status === 200);
  
  assert(allSuccessful, 'All health checks should succeed (rate limit not hit)');
  
  console.log('✅ Rate limit test passed');
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🚀 Starting API Test Suite\n');
  
  try {
    // Wait for server to be ready
    console.log('⏳ Waiting for server to be ready...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Run tests in sequence
    await testHealth();
    await testInvalidAuth();
    await testRegistration();
    await testLogin();
    await testGetProfile();
    await testCreateConfig();
    await testGetConfigs();
    await testGetConfig();
    await testStartAnalysis();
    await testGetAnalysisStatus();
    await testGetAnalysisHistory();
    await testGetDashboard();
    await testRateLimit();
    
    console.log('\n🎉 All tests passed!');
    console.log('\n📊 Test Summary:');
    console.log(`   User ID: ${userId}`);
    console.log(`   Config ID: ${configId}`);
    console.log(`   Analysis ID: ${analysisId}`);
    console.log(`   Auth Token: ${authToken.substring(0, 20)}...`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    if (response.ok) {
      console.log('✅ Server is running');
      return true;
    }
  } catch (error) {
    console.log('❌ Server is not running. Please start the server first:');
    console.log('   npm run dev');
    return false;
  }
}

// Main execution
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await runTests();
  } else {
    process.exit(1);
  }
}

export {
  makeRequest,
  testHealth,
  testRegistration,
  testLogin,
  testCreateConfig,
  testStartAnalysis
};