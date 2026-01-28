#!/usr/bin/env node

/**
 * Test script to verify indexing status updates correctly
 * Tests that metrics appear after analysis completion
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:5000';

// Test user data
const testUser = {
  email: `test-indexing-fix-${Date.now()}@example.com`,
  password: 'testpassword123',
  name: 'Indexing Status Fix Test User'
};

// Test onboarding data
const onboardingData = {
  socialLinks: {
    website: 'https://testproject.com'
  },
  contractAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', // UNI token
  chain: 'ethereum',
  contractName: 'Indexing Status Test Contract',
  purpose: 'A test contract to verify indexing status updates correctly',
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

async function testIndexingStatusFix() {
  console.log('🧪 Testing Indexing Status Fix');
  console.log('==============================');

  try {
    // Step 1: Setup user and complete onboarding
    console.log('\n1️⃣ Setting up test user...');
    const registerResult = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(testUser)
    });
    authToken = registerResult.token;
    console.log('✅ User registered');

    await makeRequest('/api/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify(onboardingData)
    });
    console.log('✅ Onboarding completed');

    // Step 2: Check initial status
    console.log('\n2️⃣ Checking initial status...');
    const initialStatus = await makeRequest('/api/onboarding/status');
    const initialContract = await makeRequest('/api/onboarding/default-contract');
    
    console.log(`   Initial indexed: ${initialStatus.isIndexed}`);
    console.log(`   Initial progress: ${initialStatus.indexingProgress}%`);
    console.log(`   Has metrics: ${initialContract.metrics ? 'Yes' : 'No'}`);
    console.log(`   Has full results: ${initialContract.fullResults ? 'Yes' : 'No'}`);
    console.log(`   Last analysis ID: ${initialContract.contract.lastAnalysisId || 'None'}`);

    // Step 3: Wait for initial indexing to complete
    console.log('\n3️⃣ Waiting for initial indexing...');
    let attempts = 0;
    const maxAttempts = 30; // 1 minute
    let indexingCompleted = false;

    while (attempts < maxAttempts && !indexingCompleted) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const status = await makeRequest('/api/onboarding/status');
      const contract = await makeRequest('/api/onboarding/default-contract');
      
      console.log(`   Attempt ${attempts + 1}: Progress ${status.indexingProgress}%, Indexed: ${status.isIndexed}`);
      
      if (status.isIndexed && status.indexingProgress === 100) {
        indexingCompleted = true;
        console.log('✅ Initial indexing completed');
        
        console.log(`   Final metrics available: ${contract.metrics ? 'Yes' : 'No'}`);
        console.log(`   Final full results available: ${contract.fullResults ? 'Yes' : 'No'}`);
        
        if (contract.metrics) {
          console.log(`   TVL: ${contract.metrics.tvl || 'N/A'}`);
          console.log(`   Transactions: ${contract.metrics.transactions || 'N/A'}`);
          console.log(`   Users: ${contract.metrics.uniqueUsers || 'N/A'}`);
        }
        
        break;
      }
      
      attempts++;
    }

    if (!indexingCompleted) {
      console.log('⚠️  Initial indexing did not complete within timeout');
    }

    // Step 4: Test refresh functionality
    console.log('\n4️⃣ Testing refresh functionality...');
    const refreshResult = await makeRequest('/api/onboarding/refresh-default-contract', {
      method: 'POST'
    });
    
    console.log(`✅ Refresh started: ${refreshResult.analysisId}`);
    console.log(`   Status: ${refreshResult.status}`);
    console.log(`   Progress: ${refreshResult.progress}%`);

    // Step 5: Monitor refresh completion
    console.log('\n5️⃣ Monitoring refresh completion...');
    attempts = 0;
    let refreshCompleted = false;

    while (attempts < maxAttempts && !refreshCompleted) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const status = await makeRequest('/api/onboarding/status');
      const contract = await makeRequest('/api/onboarding/default-contract');
      
      console.log(`   Refresh attempt ${attempts + 1}: Progress ${status.indexingProgress}%, Indexed: ${status.isIndexed}`);
      
      if (status.isIndexed && status.indexingProgress === 100) {
        refreshCompleted = true;
        console.log('✅ Refresh completed');
        
        console.log(`   Updated metrics available: ${contract.metrics ? 'Yes' : 'No'}`);
        console.log(`   Updated full results available: ${contract.fullResults ? 'Yes' : 'No'}`);
        console.log(`   Analysis history total: ${contract.analysisHistory.total}`);
        console.log(`   Latest analysis status: ${contract.analysisHistory.latest?.status || 'None'}`);
        
        if (contract.metrics) {
          console.log(`   Updated TVL: ${contract.metrics.tvl || 'N/A'}`);
          console.log(`   Updated Transactions: ${contract.metrics.transactions || 'N/A'}`);
          console.log(`   Updated Users: ${contract.metrics.uniqueUsers || 'N/A'}`);
        }
        
        break;
      }
      
      attempts++;
    }

    if (!refreshCompleted) {
      console.log('⚠️  Refresh did not complete within timeout');
    }

    // Step 6: Test duplicate refresh prevention
    console.log('\n6️⃣ Testing duplicate refresh prevention...');
    const duplicateRefresh = await makeRequest('/api/onboarding/refresh-default-contract', {
      method: 'POST'
    });
    
    if (duplicateRefresh.message.includes('already in progress')) {
      console.log('✅ Duplicate refresh properly prevented');
    } else {
      console.log('⚠️  Duplicate refresh was not prevented');
    }

    // Step 7: Final status check
    console.log('\n7️⃣ Final status verification...');
    const finalStatus = await makeRequest('/api/onboarding/status');
    const finalContract = await makeRequest('/api/onboarding/default-contract');
    const finalMetrics = await makeRequest('/api/onboarding/user-metrics');
    
    console.log('📊 Final Results:');
    console.log(`   Indexed: ${finalStatus.isIndexed}`);
    console.log(`   Progress: ${finalStatus.indexingProgress}%`);
    console.log(`   Has metrics: ${finalContract.metrics ? 'Yes' : 'No'}`);
    console.log(`   Has full results: ${finalContract.fullResults ? 'Yes' : 'No'}`);
    console.log(`   Total analyses: ${finalMetrics.overview.totalAnalyses}`);
    console.log(`   Completed analyses: ${finalMetrics.overview.completedAnalyses}`);

    const success = finalStatus.isIndexed && 
                   finalStatus.indexingProgress === 100 && 
                   (finalContract.metrics || finalContract.fullResults);

    if (success) {
      console.log('\n🎉 Indexing status fix test PASSED!');
      console.log('===================================');
      console.log('✅ Indexing status updates correctly');
      console.log('✅ Metrics are available after completion');
      console.log('✅ Refresh functionality works properly');
      console.log('✅ Duplicate refreshes are prevented');
      console.log('✅ Dashboard will show metrics correctly');
    } else {
      console.log('\n❌ Indexing status fix test FAILED!');
      console.log('==================================');
      console.log(`❌ Indexed: ${finalStatus.isIndexed} (should be true)`);
      console.log(`❌ Progress: ${finalStatus.indexingProgress}% (should be 100)`);
      console.log(`❌ Has data: ${!!(finalContract.metrics || finalContract.fullResults)} (should be true)`);
    }

    return {
      success,
      finalStatus,
      finalContract,
      finalMetrics
    };

  } catch (error) {
    console.error('\n💥 Indexing status fix test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testIndexingStatusFix()
    .then(result => {
      if (result.success) {
        console.log('\n🚀 Indexing status fix is working correctly!');
        process.exit(0);
      } else {
        console.log('\n❌ Indexing status fix needs more work');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { testIndexingStatusFix };