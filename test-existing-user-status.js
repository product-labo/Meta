#!/usr/bin/env node

/**
 * Test existing user indexing status
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:5000';

// Use an existing user from the fix
const existingUser = {
  email: 'test-simple-1769608008209@example.com',
  password: 'testpassword123'
};

async function makeRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || `HTTP ${response.status}`);
  }

  return data;
}

async function testExistingUserStatus() {
  console.log('🧪 Testing Existing User Indexing Status');
  console.log('========================================');

  try {
    // Login with existing user
    console.log('\n1️⃣ Logging in with existing user...');
    const loginResult = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(existingUser)
    });
    
    const authToken = loginResult.token;
    console.log('✅ Logged in successfully');

    // Check status
    console.log('\n2️⃣ Checking indexing status...');
    const status = await makeRequest('/api/onboarding/status', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log(`   Indexed: ${status.isIndexed}`);
    console.log(`   Progress: ${status.indexingProgress}%`);
    console.log(`   Has default contract: ${status.hasDefaultContract}`);

    // Get contract data
    console.log('\n3️⃣ Getting contract data...');
    const contract = await makeRequest('/api/onboarding/default-contract', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log(`   Contract name: ${contract.contract.name}`);
    console.log(`   Contract address: ${contract.contract.address}`);
    console.log(`   Has metrics: ${contract.metrics ? 'Yes' : 'No'}`);
    console.log(`   Has full results: ${contract.fullResults ? 'Yes' : 'No'}`);
    console.log(`   Analysis history: ${contract.analysisHistory.total}`);
    console.log(`   Latest analysis: ${contract.analysisHistory.latest?.status || 'None'}`);

    if (contract.metrics) {
      console.log('\n📊 Metrics:');
      console.log(`   Transactions: ${contract.metrics.transactions || 'N/A'}`);
      console.log(`   Users: ${contract.metrics.uniqueUsers || 'N/A'}`);
      console.log(`   TVL: ${contract.metrics.tvl || 'N/A'}`);
    }

    if (contract.fullResults) {
      console.log('\n🔍 Full Results:');
      console.log(`   Contract: ${contract.fullResults.contract || 'N/A'}`);
      console.log(`   Chain: ${contract.fullResults.chain || 'N/A'}`);
      console.log(`   Transactions: ${contract.fullResults.transactions || 'N/A'}`);
    }

    // Test refresh
    console.log('\n4️⃣ Testing refresh...');
    const refresh = await makeRequest('/api/onboarding/refresh-default-contract', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log(`   Refresh result: ${refresh.message}`);
    console.log(`   Analysis ID: ${refresh.analysisId || 'N/A'}`);

    const success = status.isIndexed && 
                   status.indexingProgress === 100 && 
                   (contract.metrics || contract.fullResults);

    if (success) {
      console.log('\n🎉 Existing user status test PASSED!');
      console.log('====================================');
      console.log('✅ Indexing status is correct');
      console.log('✅ Contract data is available');
      console.log('✅ Metrics are accessible');
      console.log('✅ Dashboard should display metrics correctly');
    } else {
      console.log('\n❌ Existing user status test FAILED!');
      console.log('===================================');
      console.log(`❌ Indexed: ${status.isIndexed} (should be true)`);
      console.log(`❌ Progress: ${status.indexingProgress}% (should be 100)`);
      console.log(`❌ Has data: ${!!(contract.metrics || contract.fullResults)} (should be true)`);
    }

    return { success, status, contract };

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

testExistingUserStatus()
  .then(result => {
    if (result.success) {
      console.log('\n🚀 Existing user indexing status is working correctly!');
      process.exit(0);
    } else {
      console.log('\n💥 Existing user indexing status has issues');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });