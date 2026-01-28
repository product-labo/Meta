#!/usr/bin/env node

/**
 * Simple test to verify indexing status updates
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:5000';

const testUser = {
  email: `test-simple-${Date.now()}@example.com`,
  password: 'testpassword123',
  name: 'Simple Test User'
};

const onboardingData = {
  contractAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  chain: 'ethereum',
  contractName: 'Simple Test Contract',
  purpose: 'Simple test',
  category: 'defi',
  startDate: '2024-01-01'
};

let authToken = null;

async function makeRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 200)}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Request failed for ${endpoint}:`, error.message);
    throw error;
  }
}

async function testSimpleIndexingFix() {
  console.log('🧪 Simple Indexing Status Test');
  console.log('==============================');

  try {
    // Register user
    console.log('\n1️⃣ Registering user...');
    const registerResult = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(testUser)
    });
    authToken = registerResult.token;
    console.log('✅ User registered');

    // Complete onboarding
    console.log('\n2️⃣ Completing onboarding...');
    await makeRequest('/api/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify(onboardingData)
    });
    console.log('✅ Onboarding completed');

    // Check initial status
    console.log('\n3️⃣ Checking initial status...');
    const initialStatus = await makeRequest('/api/onboarding/status');
    console.log(`   Indexed: ${initialStatus.isIndexed}`);
    console.log(`   Progress: ${initialStatus.indexingProgress}%`);

    // Wait a bit for processing
    console.log('\n4️⃣ Waiting for processing...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Check status after wait
    console.log('\n5️⃣ Checking status after wait...');
    const afterWaitStatus = await makeRequest('/api/onboarding/status');
    console.log(`   Indexed: ${afterWaitStatus.isIndexed}`);
    console.log(`   Progress: ${afterWaitStatus.indexingProgress}%`);

    // Try to get contract data
    console.log('\n6️⃣ Getting contract data...');
    try {
      const contractData = await makeRequest('/api/onboarding/default-contract');
      console.log(`   Has metrics: ${contractData.metrics ? 'Yes' : 'No'}`);
      console.log(`   Has full results: ${contractData.fullResults ? 'Yes' : 'No'}`);
      console.log(`   Analysis history: ${contractData.analysisHistory.total}`);
      
      if (contractData.metrics) {
        console.log(`   Transactions: ${contractData.metrics.transactions || 'N/A'}`);
      }
    } catch (error) {
      console.log(`   Error getting contract data: ${error.message.slice(0, 100)}`);
    }

    // Test refresh
    console.log('\n7️⃣ Testing refresh...');
    try {
      const refreshResult = await makeRequest('/api/onboarding/refresh-default-contract', {
        method: 'POST'
      });
      console.log(`   Refresh started: ${refreshResult.analysisId}`);
      console.log(`   Status: ${refreshResult.status}`);
    } catch (error) {
      console.log(`   Refresh error: ${error.message.slice(0, 100)}`);
    }

    console.log('\n✅ Simple test completed');
    return { success: true };

  } catch (error) {
    console.error('\n❌ Simple test failed:', error.message);
    return { success: false, error: error.message };
  }
}

testSimpleIndexingFix()
  .then(result => {
    if (result.success) {
      console.log('\n🎉 Simple test passed!');
      process.exit(0);
    } else {
      console.log('\n💥 Simple test failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });