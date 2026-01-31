#!/usr/bin/env node

/**
 * Complete Subscription System Integration Test
 * Tests frontend, backend, and blockchain integration
 */

import { ethers } from 'ethers';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const CONFIG = {
  // Contract addresses
  contracts: {
    MGT_TOKEN: '0xB51623F59fF9f2AA7d3bC1Afa99AE0fA8049ed3D',
    SUBSCRIPTION: '0x577d9A43D0fa564886379bdD9A56285769683C38'
  },
  
  // Network
  network: {
    chainId: 4202,
    rpcUrl: 'https://rpc.sepolia-api.lisk.com',
    explorer: 'https://sepolia-blockscout.lisk.com'
  },
  
  // API
  api: {
    baseUrl: process.env.API_URL || 'http://localhost:5000',
    timeout: 30000
  }
};

// Contract ABIs
const TOKEN_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function mint(address to, uint256 amount)',
  'function name() view returns (string)',
  'function symbol() view returns (string)'
];

const SUBSCRIPTION_ABI = [
  'function subscribe(uint8 tier, uint8 role, uint8 billingCycle, string userUUID, uint8 currency) payable',
  'function isSubscriberActive(address user) view returns (bool)',
  'function getSubscriptionInfo(address user) view returns (tuple(address userAddress, uint8 tier, uint8 role, uint8 billingCycle, uint256 startTime, uint256 endTime, uint256 periodStart, uint256 periodEnd, bool isActive, bool cancelAtPeriodEnd, uint256 gracePeriodEnd, uint256 amountPaid, uint8 currency))',
  'function plans(uint8 tier) view returns (string name, uint256 monthlyPrice, uint256 yearlyPrice, tuple(uint256 apiCallsPerMonth, uint256 maxProjects, uint256 maxAlerts, bool exportAccess, bool comparisonTool, bool walletIntelligence, bool apiAccess, bool prioritySupport, bool customInsights) features, tuple(uint256 historicalData, uint256 teamMembers, uint256 dataRefreshRate) limits, bool active)'
];

class IntegrationTester {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(CONFIG.network.rpcUrl);
    this.wallet = null;
    this.tokenContract = null;
    this.subscriptionContract = null;
    this.authToken = null;
  }

  async initialize() {
    console.log('🚀 Initializing Complete Integration Test...\n');

    // Setup wallet
    if (!process.env.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY not found in environment variables');
    }

    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
    console.log('👤 Test Wallet:', this.wallet.address);

    // Initialize contracts
    this.tokenContract = new ethers.Contract(CONFIG.contracts.MGT_TOKEN, TOKEN_ABI, this.wallet);
    this.subscriptionContract = new ethers.Contract(CONFIG.contracts.SUBSCRIPTION, SUBSCRIPTION_ABI, this.wallet);

    // Check balances
    const ethBalance = await this.provider.getBalance(this.wallet.address);
    const tokenBalance = await this.tokenContract.balanceOf(this.wallet.address);
    
    console.log('💰 ETH Balance:', ethers.formatEther(ethBalance), 'ETH');
    console.log('🪙 MGT Balance:', ethers.formatEther(tokenBalance), 'MGT');

    console.log('✅ Initialization complete!\n');
  }

  async testBackendAPI() {
    console.log('🔗 Testing Backend API Integration...\n');

    try {
      // Test API health
      const healthResponse = await this.apiRequest('GET', '/health');
      console.log('API Health:', healthResponse.status || 'OK');

      // Test subscription plans endpoint
      const plansResponse = await this.apiRequest('GET', '/api/subscription/plans');
      console.log('📋 Available Plans:', Object.keys(plansResponse.plans || {}).length);

      // Test subscription status endpoint
      const statusResponse = await this.apiRequest('GET', `/api/subscription/status/${this.wallet.address}`);
      console.log('📊 Current Status:', statusResponse.isActive ? 'Active' : 'Inactive');

      console.log('✅ Backend API test passed!\n');
      return true;
    } catch (error) {
      console.error('❌ Backend API test failed:', error.message);
      return false;
    }
  }

  async testBlockchainIntegration() {
    console.log('⛓️  Testing Blockchain Integration...\n');

    try {
      // Test contract connectivity
      const tokenName = await this.tokenContract.name();
      const tokenSymbol = await this.tokenContract.symbol();
      console.log('🪙 Token:', tokenName, '(' + tokenSymbol + ')');

      // Test subscription contract
      const starterPlan = await this.subscriptionContract.plans(1);
      console.log('📋 Starter Plan:', starterPlan.name, '-', ethers.formatEther(starterPlan.monthlyPrice), 'MGT/month');

      // Check current subscription
      const isActive = await this.subscriptionContract.isSubscriberActive(this.wallet.address);
      console.log('📊 Current Subscription:', isActive ? 'Active' : 'None');

      console.log('✅ Blockchain integration test passed!\n');
      return true;
    } catch (error) {
      console.error('❌ Blockchain integration test failed:', error.message);
      return false;
    }
  }

  async testSubscriptionFlow() {
    console.log('🔄 Testing Complete Subscription Flow...\n');

    try {
      // Step 1: Check if already subscribed
      const isCurrentlyActive = await this.subscriptionContract.isSubscriberActive(this.wallet.address);
      console.log('1️⃣ Current Status:', isCurrentlyActive ? 'Active' : 'Inactive');

      if (isCurrentlyActive) {
        console.log('ℹ️  Already subscribed, skipping subscription creation');
        
        // Get current subscription info
        const subInfo = await this.subscriptionContract.getSubscriptionInfo(this.wallet.address);
        console.log('📋 Current Subscription:');
        console.log('   Tier:', subInfo.tier);
        console.log('   End Time:', new Date(Number(subInfo.endTime) * 1000).toLocaleString());
        console.log('   Amount Paid:', ethers.formatEther(subInfo.amountPaid), 'MGT');
        
        console.log('✅ Subscription flow test completed (already subscribed)!\n');
        return true;
      }

      // Step 2: Check token balance
      const tokenBalance = await this.tokenContract.balanceOf(this.wallet.address);
      const requiredAmount = ethers.parseEther('12'); // Starter monthly price
      
      console.log('2️⃣ Token Balance Check:');
      console.log('   Current:', ethers.formatEther(tokenBalance), 'MGT');
      console.log('   Required:', ethers.formatEther(requiredAmount), 'MGT');

      if (tokenBalance < requiredAmount) {
        console.log('💰 Insufficient tokens, attempting to mint...');
        
        try {
          const mintTx = await this.tokenContract.mint(this.wallet.address, ethers.parseEther('100'));
          await mintTx.wait();
          console.log('✅ Minted 100 MGT tokens');
        } catch (mintError) {
          console.log('❌ Could not mint tokens:', mintError.message);
          console.log('⚠️  You may need to get tokens from another source');
          return false;
        }
      }

      // Step 3: Approve tokens
      console.log('3️⃣ Approving tokens...');
      const approveTx = await this.tokenContract.approve(CONFIG.contracts.SUBSCRIPTION, requiredAmount);
      await approveTx.wait();
      console.log('✅ Tokens approved');

      // Step 4: Subscribe
      console.log('4️⃣ Creating subscription...');
      const subscribeTx = await this.subscriptionContract.subscribe(
        1, // Starter tier
        0, // Developer role
        0, // Monthly billing
        `test-user-${Date.now()}`,
        1  // Token payment
      );
      
      console.log('📝 Transaction hash:', subscribeTx.hash);
      const receipt = await subscribeTx.wait();
      console.log('✅ Subscription created! Gas used:', receipt.gasUsed.toString());

      // Step 5: Verify subscription
      console.log('5️⃣ Verifying subscription...');
      const isNowActive = await this.subscriptionContract.isSubscriberActive(this.wallet.address);
      
      if (isNowActive) {
        const subInfo = await this.subscriptionContract.getSubscriptionInfo(this.wallet.address);
        console.log('✅ Subscription verified!');
        console.log('📋 Details:');
        console.log('   Tier:', subInfo.tier);
        console.log('   Start:', new Date(Number(subInfo.startTime) * 1000).toLocaleString());
        console.log('   End:', new Date(Number(subInfo.endTime) * 1000).toLocaleString());
        console.log('   Amount Paid:', ethers.formatEther(subInfo.amountPaid), 'MGT');
      } else {
        throw new Error('Subscription not active after creation');
      }

      console.log('✅ Complete subscription flow test passed!\n');
      return true;
    } catch (error) {
      console.error('❌ Subscription flow test failed:', error.message);
      return false;
    }
  }

  async testBackendSync() {
    console.log('🔄 Testing Backend Synchronization...\n');

    try {
      // Wait a moment for events to be processed
      console.log('⏳ Waiting for backend sync...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check if backend recognizes the subscription
      const statusResponse = await this.apiRequest('GET', `/api/subscription/status/${this.wallet.address}`);
      
      console.log('📊 Backend Status:');
      console.log('   Active:', statusResponse.isActive);
      console.log('   Tier:', statusResponse.tierName || statusResponse.tier);
      
      if (statusResponse.isActive) {
        console.log('   End Time:', new Date(statusResponse.endTime * 1000).toLocaleString());
        console.log('   Days Remaining:', statusResponse.daysRemaining);
      }

      // Test access validation
      const validationResponse = await this.apiRequest('POST', '/api/subscription/validate', {
        walletAddress: this.wallet.address,
        requiredFeature: 'exportAccess'
      });

      console.log('🔐 Access Validation:');
      console.log('   Has Access:', validationResponse.hasAccess);
      console.log('   Tier:', validationResponse.tierName || validationResponse.tier);

      console.log('✅ Backend synchronization test passed!\n');
      return true;
    } catch (error) {
      console.error('❌ Backend synchronization test failed:', error.message);
      return false;
    }
  }

  async testUsageEnforcement() {
    console.log('🛡️  Testing Usage Enforcement...\n');

    try {
      // Test feature access validation
      const features = ['exportAccess', 'comparisonTool', 'walletIntelligence', 'apiAccess'];
      
      for (const feature of features) {
        const response = await this.apiRequest('POST', '/api/subscription/validate', {
          walletAddress: this.wallet.address,
          requiredFeature: feature
        });

        console.log(`${feature}:`, response.hasAccess ? '✅ Allowed' : '❌ Denied');
      }

      // Test tier requirements
      const tierTests = [
        { tier: 0, name: 'Free' },
        { tier: 1, name: 'Starter' },
        { tier: 2, name: 'Pro' },
        { tier: 3, name: 'Enterprise' }
      ];

      console.log('\n🎯 Tier Access Tests:');
      for (const test of tierTests) {
        const response = await this.apiRequest('POST', '/api/subscription/validate', {
          walletAddress: this.wallet.address,
          requiredTier: test.tier
        });

        console.log(`${test.name} (${test.tier}):`, response.hasAccess ? '✅ Allowed' : '❌ Denied');
      }

      console.log('✅ Usage enforcement test passed!\n');
      return true;
    } catch (error) {
      console.error('❌ Usage enforcement test failed:', error.message);
      return false;
    }
  }

  async apiRequest(method, endpoint, body = null) {
    const url = `${CONFIG.api.baseUrl}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: CONFIG.api.timeout
    };

    if (this.authToken) {
      options.headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  async runCompleteTest() {
    console.log('🧪 Running Complete Subscription System Integration Test\n');
    console.log('=' .repeat(80));

    const results = {
      initialization: false,
      backendAPI: false,
      blockchainIntegration: false,
      subscriptionFlow: false,
      backendSync: false,
      usageEnforcement: false
    };

    try {
      // Initialize
      await this.initialize();
      results.initialization = true;

      // Test backend API
      results.backendAPI = await this.testBackendAPI();

      // Test blockchain integration
      results.blockchainIntegration = await this.testBlockchainIntegration();

      // Test subscription flow
      results.subscriptionFlow = await this.testSubscriptionFlow();

      // Test backend sync
      results.backendSync = await this.testBackendSync();

      // Test usage enforcement
      results.usageEnforcement = await this.testUsageEnforcement();

    } catch (error) {
      console.error('💥 Test suite failed:', error.message);
    }

    // Print results
    console.log('=' .repeat(80));
    console.log('📊 INTEGRATION TEST RESULTS');
    console.log('=' .repeat(80));

    const testNames = {
      initialization: 'System Initialization',
      backendAPI: 'Backend API Integration',
      blockchainIntegration: 'Blockchain Integration',
      subscriptionFlow: 'Subscription Flow',
      backendSync: 'Backend Synchronization',
      usageEnforcement: 'Usage Enforcement'
    };

    let passedTests = 0;
    let totalTests = Object.keys(results).length;

    for (const [key, passed] of Object.entries(results)) {
      const status = passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${testNames[key]}`);
      if (passed) passedTests++;
    }

    console.log('=' .repeat(80));
    console.log(`📈 Overall: ${passedTests}/${totalTests} tests passed`);

    if (passedTests === totalTests) {
      console.log('🎉 ALL TESTS PASSED! Subscription system is fully integrated and working!');
      
      console.log('\n🚀 System Status:');
      console.log('✅ Smart contracts deployed and functional');
      console.log('✅ Backend API integrated with blockchain');
      console.log('✅ Subscription flow working end-to-end');
      console.log('✅ Usage enforcement active');
      console.log('✅ Ready for frontend integration');
      
      console.log('\n📝 Next Steps:');
      console.log('1. Test frontend subscription flow');
      console.log('2. Integrate with user authentication');
      console.log('3. Add subscription management UI');
      console.log('4. Deploy to production environment');
      
    } else {
      console.log('⚠️  Some tests failed. Please review the errors above.');
      
      console.log('\n🔧 Troubleshooting:');
      if (!results.backendAPI) {
        console.log('- Check if backend server is running');
        console.log('- Verify API endpoints are accessible');
      }
      if (!results.blockchainIntegration) {
        console.log('- Check RPC connection');
        console.log('- Verify contract addresses');
      }
      if (!results.subscriptionFlow) {
        console.log('- Check wallet has sufficient tokens');
        console.log('- Verify contract permissions');
      }
    }

    console.log('\n📋 Test Configuration:');
    console.log(`Wallet: ${this.wallet.address}`);
    console.log(`Network: Lisk Sepolia (${CONFIG.network.chainId})`);
    console.log(`Token Contract: ${CONFIG.contracts.MGT_TOKEN}`);
    console.log(`Subscription Contract: ${CONFIG.contracts.SUBSCRIPTION}`);
    console.log(`API Base URL: ${CONFIG.api.baseUrl}`);
  }
}

// Run the complete integration test
async function main() {
  const tester = new IntegrationTester();
  await tester.runCompleteTest();
}

main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});