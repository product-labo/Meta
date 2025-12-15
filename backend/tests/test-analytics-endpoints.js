/**
 * Test Analytics API Endpoints (Task 19)
 * Tests the new analytics endpoints created for fullstack integration
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Test configuration
const testConfig = {
  // These would be set from actual test data
  testUserId: null,
  testProjectId: null,
  authToken: null
};

/**
 * Helper function to make authenticated requests
 */
async function makeAuthenticatedRequest(method, endpoint, data = null) {
  const config = {
    method,
    url: `${API_BASE_URL}${endpoint}`,
    headers: {
      'Authorization': `Bearer ${testConfig.authToken}`,
      'Content-Type': 'application/json'
    }
  };

  if (data) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

/**
 * Test 1: Dashboard Analytics Endpoint
 */
async function testDashboardEndpoint() {
  console.log('\n📊 Testing Dashboard Analytics Endpoint...');
  
  const result = await makeAuthenticatedRequest(
    'GET',
    `/api/analytics/dashboard/${testConfig.testProjectId}`
  );

  if (result.success) {
    console.log('✅ Dashboard endpoint working');
    console.log('   - Project ID:', result.data.data?.project_id);
    console.log('   - Has overview data:', !!result.data.data?.overview);
  } else {
    console.log('❌ Dashboard endpoint failed:', result.error);
  }

  return result.success;
}

/**
 * Test 2: Adoption Analytics Endpoint
 */
async function testAdoptionEndpoint() {
  console.log('\n📈 Testing Adoption Analytics Endpoint...');
  
  const result = await makeAuthenticatedRequest(
    'GET',
    `/api/analytics/adoption/${testConfig.testProjectId}`
  );

  if (result.success) {
    console.log('✅ Adoption endpoint working');
    console.log('   - Project ID:', result.data.data?.project_id);
    console.log('   - Has funnel data:', !!result.data.data?.adoption_funnel);
  } else {
    console.log('❌ Adoption endpoint failed:', result.error);
  }

  return result.success;
}

/**
 * Test 3: Retention Analytics Endpoint
 */
async function testRetentionEndpoint() {
  console.log('\n📉 Testing Retention Analytics Endpoint...');
  
  const result = await makeAuthenticatedRequest(
    'GET',
    `/api/analytics/retention/${testConfig.testProjectId}?cohortType=weekly&limit=10`
  );

  if (result.success) {
    console.log('✅ Retention endpoint working');
    console.log('   - Project ID:', result.data.data?.project_id);
    console.log('   - Cohort type:', result.data.data?.cohort_type);
    console.log('   - Has heatmap data:', !!result.data.data?.heatmap_data);
  } else {
    console.log('❌ Retention endpoint failed:', result.error);
  }

  return result.success;
}

/**
 * Test 4: Productivity Analytics Endpoint
 */
async function testProductivityEndpoint() {
  console.log('\n⚡ Testing Productivity Analytics Endpoint...');
  
  const result = await makeAuthenticatedRequest(
    'GET',
    `/api/analytics/productivity/${testConfig.testProjectId}`
  );

  if (result.success) {
    console.log('✅ Productivity endpoint working');
    console.log('   - Project ID:', result.data.data?.project_id);
    console.log('   - Has productivity data:', !!result.data.data?.productivity);
  } else {
    console.log('❌ Productivity endpoint failed:', result.error);
  }

  return result.success;
}

/**
 * Test 5: Shielded Analytics Endpoint
 */
async function testShieldedEndpoint() {
  console.log('\n🔒 Testing Shielded Analytics Endpoint...');
  
  const result = await makeAuthenticatedRequest(
    'GET',
    `/api/analytics/shielded/${testConfig.testProjectId}?days=30`
  );

  if (result.success) {
    console.log('✅ Shielded endpoint working');
    console.log('   - Project ID:', result.data.data?.project_id);
    console.log('   - Time period:', result.data.data?.time_period_days, 'days');
    console.log('   - Has shielded metrics:', !!result.data.data?.shielded_metrics);
  } else {
    console.log('❌ Shielded endpoint failed:', result.error);
  }

  return result.success;
}

/**
 * Test 6: Segments Analytics Endpoint
 */
async function testSegmentsEndpoint() {
  console.log('\n🎯 Testing Segments Analytics Endpoint...');
  
  const result = await makeAuthenticatedRequest(
    'GET',
    `/api/analytics/segments/${testConfig.testProjectId}`
  );

  if (result.success) {
    console.log('✅ Segments endpoint working');
    console.log('   - Project ID:', result.data.data?.project_id);
    console.log('   - Number of segments:', result.data.data?.segments?.length || 0);
  } else {
    console.log('❌ Segments endpoint failed:', result.error);
  }

  return result.success;
}

/**
 * Test 7: Health Analytics Endpoint
 */
async function testHealthEndpoint() {
  console.log('\n💚 Testing Health Analytics Endpoint...');
  
  const result = await makeAuthenticatedRequest(
    'GET',
    `/api/analytics/health/${testConfig.testProjectId}`
  );

  if (result.success) {
    console.log('✅ Health endpoint working');
    console.log('   - Project ID:', result.data.data?.project_id);
    console.log('   - Health score:', result.data.data?.health_score);
    console.log('   - Health status:', result.data.data?.health_status);
  } else {
    console.log('❌ Health endpoint failed:', result.error);
  }

  return result.success;
}

/**
 * Test 8: Comparison Analytics Endpoint (Privacy-Gated)
 */
async function testComparisonEndpoint() {
  console.log('\n🏆 Testing Comparison Analytics Endpoint...');
  
  const result = await makeAuthenticatedRequest(
    'GET',
    `/api/analytics/comparison/${testConfig.testProjectId}?targetPercentile=p50`
  );

  if (result.success) {
    console.log('✅ Comparison endpoint working');
    console.log('   - Project ID:', result.data.data?.project_id);
    console.log('   - Has comparison data:', !!result.data.data?.comparison);
  } else if (result.status === 403) {
    console.log('⚠️  Comparison endpoint correctly gated by privacy settings');
    console.log('   - Error:', result.error.error);
    return true; // This is expected behavior
  } else {
    console.log('❌ Comparison endpoint failed:', result.error);
  }

  return result.success;
}

/**
 * Setup test environment
 */
async function setupTestEnvironment() {
  console.log('🔧 Setting up test environment...');
  
  // In a real test, we would:
  // 1. Create a test user
  // 2. Login to get auth token
  // 3. Create a test project
  // 4. Add test wallets
  
  // For now, we'll check if environment variables are set
  if (process.env.TEST_USER_ID && process.env.TEST_PROJECT_ID && process.env.TEST_AUTH_TOKEN) {
    testConfig.testUserId = process.env.TEST_USER_ID;
    testConfig.testProjectId = process.env.TEST_PROJECT_ID;
    testConfig.authToken = process.env.TEST_AUTH_TOKEN;
    console.log('✅ Test environment configured from environment variables');
    return true;
  }
  
  console.log('⚠️  Test environment not configured');
  console.log('   Set TEST_USER_ID, TEST_PROJECT_ID, and TEST_AUTH_TOKEN environment variables');
  return false;
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('='.repeat(60));
  console.log('🧪 Analytics API Endpoints Test Suite (Task 19)');
  console.log('='.repeat(60));

  const isConfigured = await setupTestEnvironment();
  
  if (!isConfigured) {
    console.log('\n❌ Cannot run tests without proper configuration');
    console.log('\nTo run tests, set the following environment variables:');
    console.log('  - TEST_USER_ID: UUID of test user');
    console.log('  - TEST_PROJECT_ID: UUID of test project');
    console.log('  - TEST_AUTH_TOKEN: JWT authentication token');
    process.exit(1);
  }

  const results = {
    passed: 0,
    failed: 0,
    total: 8
  };

  // Run all endpoint tests
  const tests = [
    testDashboardEndpoint,
    testAdoptionEndpoint,
    testRetentionEndpoint,
    testProductivityEndpoint,
    testShieldedEndpoint,
    testSegmentsEndpoint,
    testHealthEndpoint,
    testComparisonEndpoint
  ];

  for (const test of tests) {
    const passed = await test();
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${Math.round((results.passed / results.total) * 100)}%`);
  console.log('='.repeat(60));

  if (results.failed === 0) {
    console.log('\n🎉 All analytics endpoints are working correctly!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(error => {
    console.error('❌ Test suite failed with error:', error);
    process.exit(1);
  });
}

export {
  runAllTests,
  testDashboardEndpoint,
  testAdoptionEndpoint,
  testRetentionEndpoint,
  testProductivityEndpoint,
  testShieldedEndpoint,
  testSegmentsEndpoint,
  testHealthEndpoint,
  testComparisonEndpoint
};
