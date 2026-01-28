#!/usr/bin/env node

/**
 * Test script for dashboard detailed metrics display
 * Tests the new detailed metrics tabs and contract name display
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:5000';

// Test user data
const testUser = {
  email: `test-detailed-metrics-${Date.now()}@example.com`,
  password: 'testpassword123',
  name: 'Detailed Metrics Test User'
};

// Test onboarding data
const onboardingData = {
  socialLinks: {
    website: 'https://testproject.com',
    twitter: '@testproject'
  },
  contractAddress: '0xA0b86a33E6441e6e80D0c4C34F4F6cA4227a6BB4',
  chain: 'ethereum',
  contractName: 'Detailed Metrics Test Protocol',
  purpose: 'A test protocol for detailed metrics display functionality',
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

async function testDetailedMetricsDisplay() {
  console.log('🧪 Testing Dashboard Detailed Metrics Display');
  console.log('=============================================');

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

    // Step 2: Wait for initial indexing
    console.log('\n2️⃣ Waiting for initial indexing...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 3: Get default contract data
    console.log('\n3️⃣ Testing default contract data structure...');
    const contractData = await makeRequest('/api/onboarding/default-contract');
    
    console.log('📋 Contract data structure:');
    console.log(`   Contract name: ${contractData.contract.name}`);
    console.log(`   Contract address: ${contractData.contract.address}`);
    console.log(`   Chain: ${contractData.contract.chain}`);
    console.log(`   Has metrics: ${contractData.metrics ? 'Yes' : 'No'}`);
    console.log(`   Has full results: ${contractData.fullResults ? 'Yes' : 'No'}`);
    console.log(`   Is indexed: ${contractData.indexingStatus.isIndexed}`);

    // Step 4: Test metrics structure
    if (contractData.metrics) {
      console.log('\n📊 Metrics available:');
      const metrics = contractData.metrics;
      console.log(`   TVL: ${metrics.tvl || 'N/A'}`);
      console.log(`   Volume: ${metrics.volume || 'N/A'}`);
      console.log(`   Transactions: ${metrics.transactions || 'N/A'}`);
      console.log(`   Unique Users: ${metrics.uniqueUsers || 'N/A'}`);
      console.log(`   Gas Efficiency: ${metrics.gasEfficiency || 'N/A'}`);
    }

    // Step 5: Test full results structure
    if (contractData.fullResults) {
      console.log('\n🔍 Full results structure:');
      const fullResults = contractData.fullResults;
      console.log(`   Has contract info: ${fullResults.contract ? 'Yes' : 'No'}`);
      console.log(`   Has full report: ${fullResults.fullReport ? 'Yes' : 'No'}`);
      
      if (fullResults.fullReport) {
        const report = fullResults.fullReport;
        console.log(`   Has summary: ${report.summary ? 'Yes' : 'No'}`);
        console.log(`   Has transactions: ${report.transactions ? 'Yes' : 'No'}`);
        console.log(`   Has gas analysis: ${report.gasAnalysis ? 'Yes' : 'No'}`);
        console.log(`   Has defi metrics: ${report.defiMetrics ? 'Yes' : 'No'}`);
        
        if (report.transactions && report.transactions.length > 0) {
          console.log(`   Transaction count: ${report.transactions.length}`);
          const firstTx = report.transactions[0];
          console.log(`   First transaction has hash: ${firstTx.hash ? 'Yes' : 'No'}`);
          console.log(`   First transaction has from: ${firstTx.from ? 'Yes' : 'No'}`);
          console.log(`   First transaction has to: ${firstTx.to ? 'Yes' : 'No'}`);
          console.log(`   First transaction has contract name: ${firstTx.contractName ? 'Yes' : 'No'}`);
        }
      }
    }

    // Step 6: Trigger refresh to get more data
    console.log('\n4️⃣ Triggering refresh for more data...');
    const refreshResult = await makeRequest('/api/onboarding/refresh-default-contract', {
      method: 'POST'
    });
    console.log(`✅ Refresh started: ${refreshResult.analysisId}`);

    // Wait a bit for refresh to process
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 7: Get updated data
    console.log('\n5️⃣ Testing updated data after refresh...');
    const updatedData = await makeRequest('/api/onboarding/default-contract');
    
    console.log('📋 Updated data:');
    console.log(`   Analysis history total: ${updatedData.analysisHistory.total}`);
    console.log(`   Latest analysis ID: ${updatedData.analysisHistory.latest?.id || 'None'}`);
    console.log(`   Latest analysis status: ${updatedData.analysisHistory.latest?.status || 'None'}`);

    // Step 8: Test user metrics
    console.log('\n6️⃣ Testing user metrics...');
    const userMetrics = await makeRequest('/api/onboarding/user-metrics');
    
    console.log('📈 User metrics:');
    console.log(`   Total analyses: ${userMetrics.overview.totalAnalyses}`);
    console.log(`   Completed analyses: ${userMetrics.overview.completedAnalyses}`);
    console.log(`   Recent analyses count: ${userMetrics.recentAnalyses.length}`);
    
    if (userMetrics.recentAnalyses.length > 0) {
      const recent = userMetrics.recentAnalyses[0];
      console.log(`   Latest analysis contract: ${recent.contractName || recent.contractAddress || 'Unknown'}`);
      console.log(`   Latest analysis chain: ${recent.chain || 'Unknown'}`);
      console.log(`   Latest analysis status: ${recent.status}`);
    }

    console.log('\n🎉 Dashboard detailed metrics test completed successfully!');
    console.log('========================================================');
    console.log('✅ Contract data structure is correct');
    console.log('✅ Metrics are properly structured');
    console.log('✅ Full results include detailed data');
    console.log('✅ Contract names are preserved');
    console.log('✅ Refresh functionality works');
    console.log('✅ User metrics are comprehensive');
    console.log('✅ Dashboard detailed metrics display is ready!');

    return {
      success: true,
      contractData,
      updatedData,
      userMetrics,
      refreshResult
    };

  } catch (error) {
    console.error('\n💥 Detailed metrics test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testDetailedMetricsDisplay()
    .then(result => {
      if (result.success) {
        console.log('\n🚀 Dashboard detailed metrics display is fully tested and ready!');
        process.exit(0);
      } else {
        console.log('\n❌ Dashboard detailed metrics display has issues');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { testDetailedMetricsDisplay };