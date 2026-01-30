/**
 * Debug Marathon Sync Issues
 * Test the current marathon sync behavior and identify problems
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzYzA3ZTY2NC03ZTg2LTQ3YzUtOGE4Ni0zM2RlYTA1M2NmOWQiLCJlbWFpbCI6ImVsZ3Jhdmljb2Rlc2hAZ21haWwuY29tIiwidGllciI6ImZyZWUiLCJpYXQiOjE3Njk2MTI5OTMsImV4cCI6MTc3MDIxNzc5M30.5xL7kjCZKES7G9D4PX5oq_tNtY5eWuAemvdunpXLiiI';

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_TOKEN}`,
      ...options.headers
    },
    ...options
  });
  
  const data = await response.json();
  return { status: response.status, data };
}

console.log('🔍 Debugging Marathon Sync Issues...\n');

// Test 1: Check onboarding status
console.log('1. Testing onboarding status endpoint...');
try {
  const { status, data } = await apiRequest('/api/onboarding/status');
  console.log(`   Status: ${status}`);
  console.log(`   Response:`, JSON.stringify(data, null, 2));
} catch (error) {
  console.log(`   ❌ Error:`, error.message);
}

// Test 2: Check default contract data
console.log('\n2. Testing default contract endpoint...');
try {
  const { status, data } = await apiRequest('/api/onboarding/default-contract');
  console.log(`   Status: ${status}`);
  console.log(`   Contract:`, data.contract?.address);
  console.log(`   Continuous Sync:`, data.contract?.continuousSync);
  console.log(`   Analysis History:`, data.analysisHistory?.total);
  console.log(`   Latest Analysis:`, data.analysisHistory?.latest?.status);
} catch (error) {
  console.log(`   ❌ Error:`, error.message);
}

// Test 3: Check debug analysis endpoint
console.log('\n3. Testing debug analysis endpoint...');
try {
  const { status, data } = await apiRequest('/api/onboarding/debug-analysis');
  console.log(`   Status: ${status}`);
  console.log(`   Running Analyses:`, data.analyses?.running);
  console.log(`   Continuous Analyses:`, data.analyses?.continuous);
  console.log(`   Running Details:`, JSON.stringify(data.runningAnalyses, null, 2));
} catch (error) {
  console.log(`   ❌ Error:`, error.message);
}

// Test 4: Test stop endpoint directly
console.log('\n4. Testing stop continuous sync endpoint...');
try {
  const { status, data } = await apiRequest('/api/onboarding/stop-continuous-sync', {
    method: 'POST'
  });
  console.log(`   Status: ${status}`);
  console.log(`   Response:`, JSON.stringify(data, null, 2));
} catch (error) {
  console.log(`   ❌ Error:`, error.message);
}

// Test 5: Start a new marathon sync
console.log('\n5. Testing start marathon sync...');
try {
  const { status, data } = await apiRequest('/api/onboarding/refresh-default-contract', {
    method: 'POST',
    body: JSON.stringify({ continuous: true })
  });
  console.log(`   Status: ${status}`);
  console.log(`   Response:`, JSON.stringify(data, null, 2));
  
  if (status === 200) {
    console.log('\n   Waiting 5 seconds to check progress...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check status after starting
    const { status: statusCheck, data: statusData } = await apiRequest('/api/onboarding/status');
    console.log(`   Status Check: ${statusCheck}`);
    console.log(`   Continuous Sync Active:`, statusData.continuousSyncActive);
    console.log(`   Indexing Progress:`, statusData.indexingProgress);
    
    // Check debug info
    const { status: debugStatus, data: debugData } = await apiRequest('/api/onboarding/debug-analysis');
    console.log(`   Debug Status: ${debugStatus}`);
    console.log(`   Running Analyses:`, debugData.analyses?.running);
    console.log(`   Continuous Analyses:`, debugData.analyses?.continuous);
  }
} catch (error) {
  console.log(`   ❌ Error:`, error.message);
}

console.log('\n🎯 Debug Complete!');