#!/usr/bin/env node

/**
 * Test to verify analysis actually completes and updates indexing status
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:5000';

const testUser = {
  email: `test-completion-${Date.now()}@example.com`,
  password: 'testpassword123',
  name: 'Analysis Completion Test User'
};

const onboardingData = {
  contractAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  chain: 'ethereum',
  contractName: 'Analysis Completion Test Contract',
  purpose: 'Test analysis completion',
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

async function testAnalysisCompletion() {
  console.log('🧪 Testing Analysis Completion');
  console.log('==============================');

  try {
    // Register and onboard
    console.log('\n1️⃣ Setting up user...');
    const registerResult = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(testUser)
    });
    authToken = registerResult.token;

    await makeRequest('/api/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify(onboardingData)
    });
    console.log('✅ User setup complete');

    // Monitor for 2 minutes to see if analysis completes
    console.log('\n2️⃣ Monitoring analysis completion for 2 minutes...');
    const startTime = Date.now();
    const maxWaitTime = 2 * 60 * 1000; // 2 minutes
    let lastStatus = null;

    while (Date.now() - startTime < maxWaitTime) {
      const status = await makeRequest('/api/onboarding/status');
      const contract = await makeRequest('/api/onboarding/default-contract');
      
      const currentTime = new Date().toLocaleTimeString();
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      
      if (!lastStatus || 
          status.isIndexed !== lastStatus.isIndexed || 
          status.indexingProgress !== lastStatus.indexingProgress) {
        
        console.log(`   [${currentTime}] ${elapsed}s - Indexed: ${status.isIndexed}, Progress: ${status.indexingProgress}%, Analyses: ${contract.analysisHistory.total}`);
        
        if (contract.analysisHistory.latest) {
          console.log(`     Latest analysis: ${contract.analysisHistory.latest.status} (ID: ${contract.analysisHistory.latest.id})`);
        }
        
        lastStatus = status;
      }
      
      if (status.isIndexed && status.indexingProgress === 100) {
        console.log('✅ Analysis completed successfully!');
        
        console.log('\n📊 Final Results:');
        console.log(`   Indexed: ${status.isIndexed}`);
        console.log(`   Progress: ${status.indexingProgress}%`);
        console.log(`   Has metrics: ${contract.metrics ? 'Yes' : 'No'}`);
        console.log(`   Has full results: ${contract.fullResults ? 'Yes' : 'No'}`);
        console.log(`   Analysis history: ${contract.analysisHistory.total}`);
        
        if (contract.metrics) {
          console.log(`   Transactions: ${contract.metrics.transactions || 'N/A'}`);
          console.log(`   Users: ${contract.metrics.uniqueUsers || 'N/A'}`);
          console.log(`   TVL: ${contract.metrics.tvl || 'N/A'}`);
        }
        
        return { success: true, completed: true };
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5 seconds
    }

    console.log('\n⚠️  Analysis did not complete within 2 minutes');
    
    // Get final status
    const finalStatus = await makeRequest('/api/onboarding/status');
    const finalContract = await makeRequest('/api/onboarding/default-contract');
    
    console.log('\n📊 Final Status:');
    console.log(`   Indexed: ${finalStatus.isIndexed}`);
    console.log(`   Progress: ${finalStatus.indexingProgress}%`);
    console.log(`   Analysis history: ${finalContract.analysisHistory.total}`);
    
    if (finalContract.analysisHistory.latest) {
      console.log(`   Latest analysis status: ${finalContract.analysisHistory.latest.status}`);
    }

    return { 
      success: false, 
      completed: false, 
      finalStatus, 
      finalContract 
    };

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

testAnalysisCompletion()
  .then(result => {
    if (result.success && result.completed) {
      console.log('\n🎉 Analysis completion test PASSED!');
      process.exit(0);
    } else {
      console.log('\n💥 Analysis completion test FAILED!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });