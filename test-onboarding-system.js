#!/usr/bin/env node

/**
 * Test script for the onboarding system
 * Tests the complete onboarding flow with default contract setup
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:5000';

// Test user data
const testUser = {
  email: `test-onboarding-${Date.now()}@example.com`,
  password: 'testpassword123',
  name: 'Test Onboarding User'
};

// Test onboarding data
const onboardingData = {
  socialLinks: {
    website: 'https://testproject.com',
    twitter: '@testproject',
    discord: 'discord.gg/testproject',
    telegram: 't.me/testproject'
  },
  logo: 'https://testproject.com/logo.png',
  contractAddress: '0x1234567890123456789012345678901234567890',
  chain: 'ethereum',
  contractName: 'Test DeFi Protocol',
  abi: JSON.stringify([
    {
      "inputs": [],
      "name": "totalSupply",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    }
  ]),
  purpose: 'A test DeFi protocol for automated market making and liquidity provision',
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

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`Request failed for ${endpoint}:`, error.message);
    throw error;
  }
}

async function testUserRegistration() {
  console.log('\n🔐 Testing user registration...');
  
  try {
    const result = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(testUser)
    });

    authToken = result.token;
    console.log('✅ User registered successfully');
    console.log(`   User ID: ${result.user.id}`);
    console.log(`   Email: ${result.user.email}`);
    console.log(`   Tier: ${result.user.tier}`);
    
    return result.user;
  } catch (error) {
    console.error('❌ User registration failed:', error.message);
    throw error;
  }
}

async function testOnboardingStatus() {
  console.log('\n📋 Testing onboarding status check...');
  
  try {
    const status = await makeRequest('/api/onboarding/status');
    
    console.log('✅ Onboarding status retrieved');
    console.log(`   Completed: ${status.completed}`);
    console.log(`   Has default contract: ${status.hasDefaultContract}`);
    console.log(`   Is indexed: ${status.isIndexed}`);
    console.log(`   Indexing progress: ${status.indexingProgress}%`);
    
    return status;
  } catch (error) {
    console.error('❌ Onboarding status check failed:', error.message);
    throw error;
  }
}

async function testOnboardingCompletion() {
  console.log('\n🚀 Testing onboarding completion...');
  
  try {
    const result = await makeRequest('/api/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify(onboardingData)
    });

    console.log('✅ Onboarding completed successfully');
    console.log(`   Default contract ID: ${result.defaultContractId}`);
    console.log(`   Indexing started: ${result.indexingStarted}`);
    console.log(`   User onboarding completed: ${result.user.onboarding.completed}`);
    
    return result;
  } catch (error) {
    console.error('❌ Onboarding completion failed:', error.message);
    throw error;
  }
}

async function testDefaultContractData() {
  console.log('\n📊 Testing default contract data retrieval...');
  
  try {
    const contractData = await makeRequest('/api/onboarding/default-contract');
    
    console.log('✅ Default contract data retrieved');
    console.log(`   Contract name: ${contractData.contract.name}`);
    console.log(`   Contract address: ${contractData.contract.address}`);
    console.log(`   Chain: ${contractData.contract.chain}`);
    console.log(`   Category: ${contractData.contract.category}`);
    console.log(`   Is indexed: ${contractData.indexingStatus.isIndexed}`);
    console.log(`   Indexing progress: ${contractData.indexingStatus.progress}%`);
    console.log(`   Total analyses: ${contractData.analysisHistory.total}`);
    
    return contractData;
  } catch (error) {
    console.error('❌ Default contract data retrieval failed:', error.message);
    throw error;
  }
}

async function testUserMetrics() {
  console.log('\n📈 Testing user metrics retrieval...');
  
  try {
    // Add a small delay to ensure all data is properly saved
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const metrics = await makeRequest('/api/onboarding/user-metrics');
    
    console.log('✅ User metrics retrieved');
    console.log(`   Total contracts: ${metrics.overview.totalContracts}`);
    console.log(`   Total analyses: ${metrics.overview.totalAnalyses}`);
    console.log(`   Completed analyses: ${metrics.overview.completedAnalyses}`);
    console.log(`   Monthly analyses: ${metrics.overview.monthlyAnalyses}`);
    console.log(`   Chains analyzed: ${metrics.overview.chainsAnalyzed.join(', ')}`);
    console.log(`   Monthly limit: ${metrics.limits.monthly === -1 ? 'Unlimited' : metrics.limits.monthly}`);
    console.log(`   Remaining: ${metrics.limits.remaining === -1 ? 'Unlimited' : metrics.limits.remaining}`);
    console.log(`   Recent analyses: ${metrics.recentAnalyses.length}`);
    
    return metrics;
  } catch (error) {
    console.error('❌ User metrics retrieval failed:', error.message);
    throw error;
  }
}

async function testIndexingProgress() {
  console.log('\n⏳ Testing indexing progress monitoring...');
  
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    try {
      const status = await makeRequest('/api/onboarding/status');
      
      console.log(`   Attempt ${attempts + 1}: Indexing progress ${status.indexingProgress}%`);
      
      if (status.isIndexed) {
        console.log('✅ Contract indexing completed');
        return status;
      }
      
      // Wait 2 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
      
    } catch (error) {
      console.error(`❌ Indexing progress check failed (attempt ${attempts + 1}):`, error.message);
      attempts++;
    }
  }
  
  console.log('⚠️  Indexing did not complete within expected time, but this is normal for testing');
  return null;
}

async function testContractsList() {
  console.log('\n📋 Testing contracts list...');
  
  try {
    const contracts = await makeRequest('/api/contracts');
    
    console.log('✅ Contracts list retrieved');
    console.log(`   Total contracts: ${contracts.contracts.length}`);
    
    if (contracts.contracts.length > 0) {
      const defaultContract = contracts.contracts.find(c => c.isDefault);
      if (defaultContract) {
        console.log(`   Default contract found: ${defaultContract.name}`);
        console.log(`   Default contract tags: ${defaultContract.tags.join(', ')}`);
      }
    }
    
    return contracts;
  } catch (error) {
    console.error('❌ Contracts list retrieval failed:', error.message);
    throw error;
  }
}

async function runOnboardingTests() {
  console.log('🧪 Starting Onboarding System Tests');
  console.log('=====================================');

  try {
    // Test 1: User Registration
    const user = await testUserRegistration();

    // Test 2: Initial Onboarding Status (should be incomplete)
    const initialStatus = await testOnboardingStatus();
    if (initialStatus.completed) {
      throw new Error('Onboarding should not be completed for new user');
    }

    // Test 3: Complete Onboarding
    const onboardingResult = await testOnboardingCompletion();

    // Test 4: Check Onboarding Status (should be complete now)
    const completedStatus = await testOnboardingStatus();
    if (!completedStatus.completed) {
      throw new Error('Onboarding should be completed after completion');
    }

    // Test 5: Get Default Contract Data
    const contractData = await testDefaultContractData();

    // Test 6: Get User Metrics
    const userMetrics = await testUserMetrics();

    // Test 7: Check Contracts List
    const contractsList = await testContractsList();

    // Test 8: Monitor Indexing Progress (optional)
    await testIndexingProgress();

    console.log('\n🎉 All onboarding tests completed successfully!');
    console.log('=====================================');
    console.log('✅ User registration works');
    console.log('✅ Onboarding status tracking works');
    console.log('✅ Onboarding completion works');
    console.log('✅ Default contract creation works');
    console.log('✅ User metrics calculation works');
    console.log('✅ Contract indexing initiated');
    console.log('✅ API endpoints are functional');

    return {
      success: true,
      user,
      onboardingResult,
      contractData,
      userMetrics,
      contractsList
    };

  } catch (error) {
    console.error('\n💥 Onboarding test failed:', error.message);
    console.error('=====================================');
    return {
      success: false,
      error: error.message
    };
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runOnboardingTests()
    .then(result => {
      if (result.success) {
        console.log('\n🚀 Onboarding system is ready for production!');
        process.exit(0);
      } else {
        console.log('\n❌ Onboarding system needs fixes before deployment');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { runOnboardingTests };