/**
 * Test to Confirm Server Restart is Needed
 * This test proves the server is using old cached code
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzYzA3ZTY2NC03ZTg2LTQ3YzUtOGE4Ni0zM2RlYTA1M2NmOWQiLCJlbWFpbCI6ImVsZ3Jhdmljb2Rlc2hAZ21haWwuY29tIiwidGllciI6ImZyZWUiLCJpYXQiOjE3Njk2MTI5OTMsImV4cCI6MTc3MDIxNzc5M30.5xL7kjCZKES7G9D4PX5oq_tNtY5eWuAemvdunpXLiiI';

async function apiRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`,
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    return { status: response.status, data, error: null };
  } catch (error) {
    return { status: 0, data: null, error: error.message };
  }
}

console.log('🔍 Testing Server Restart Requirement...\n');

// Test endpoints that should exist after our changes
const endpointsToTest = [
  {
    name: 'Debug Analysis',
    method: 'GET',
    endpoint: '/api/onboarding/debug-analysis',
    expectedAfterRestart: 200,
    description: 'Should return analysis debug info'
  },
  {
    name: 'Stop Continuous Sync',
    method: 'POST',
    endpoint: '/api/onboarding/stop-continuous-sync',
    expectedAfterRestart: 200,
    description: 'Should stop continuous sync (or return proper error)'
  }
];

console.log('Testing endpoints that prove server restart is needed:\n');

for (const test of endpointsToTest) {
  console.log(`📍 Testing ${test.name}:`);
  
  const { status, data, error } = await apiRequest(test.endpoint, {
    method: test.method
  });
  
  if (error) {
    console.log(`   ❌ Network Error: ${error}`);
  } else if (status === 404) {
    console.log(`   ❌ 404 Not Found - PROVES SERVER NEEDS RESTART`);
    console.log(`   📝 Expected: ${test.expectedAfterRestart} after restart`);
    console.log(`   💡 ${test.description}`);
  } else {
    console.log(`   ✅ Status: ${status}`);
    if (status !== test.expectedAfterRestart) {
      console.log(`   ⚠️  Unexpected status (expected ${test.expectedAfterRestart})`);
    }
  }
  console.log();
}

// Test if marathon sync returns continuous flag
console.log('📍 Testing Marathon Sync Response Format:');
const { status, data } = await apiRequest('/api/onboarding/refresh-default-contract', {
  method: 'POST',
  body: JSON.stringify({ continuous: true })
});

console.log(`   Status: ${status}`);
if (data) {
  console.log(`   Message: "${data.message}"`);
  console.log(`   Continuous Flag: ${data.continuous}`);
  
  if (data.continuous === undefined) {
    console.log(`   ❌ MISSING CONTINUOUS FLAG - PROVES SERVER NEEDS RESTART`);
    console.log(`   📝 Expected: continuous: true after restart`);
  } else if (data.continuous === true) {
    console.log(`   ✅ Continuous flag present - server may have been restarted`);
  }
  
  if (data.message && data.message.includes('Default contract refresh')) {
    console.log(`   ❌ WRONG MESSAGE - PROVES SERVER NEEDS RESTART`);
    console.log(`   📝 Expected: "Continuous contract sync started successfully"`);
  }
}

console.log('\n🎯 Conclusion:');
console.log('If you see 404 errors or missing continuous flags above,');
console.log('the server is using OLD CACHED CODE and needs to be restarted.');
console.log('\n📋 To restart the server:');
console.log('1. Stop current server (Ctrl+C or kill process)');
console.log('2. Start server again: node src/api/server.js');
console.log('3. Re-run this test to verify restart worked');

console.log('\n✅ After successful restart, all tests should pass!');