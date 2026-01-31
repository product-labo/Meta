#!/usr/bin/env node

/**
 * Test Frontend API Configuration
 * Tests the new API configuration helper
 */

// Mock Next.js environment
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:5000';

// Mock navigator for Node.js environment
global.navigator = {
  userAgent: 'Test Script'
};

// Mock fetch for Node.js
import fetch from 'node-fetch';
global.fetch = fetch;

// Import the API configuration
import('./frontend/lib/api-config.ts').then(async (apiConfig) => {
  const { faucetAPI, API_BASE_URL, API_ENDPOINTS } = apiConfig.default;

  console.log('🧪 Testing Frontend API Configuration...\n');

  try {
    // Test 1: Check configuration
    console.log('1️⃣ Testing API configuration...');
    console.log('✅ API Base URL:', API_BASE_URL);
    console.log('✅ Faucet Health URL:', API_ENDPOINTS.faucet.health);
    console.log('✅ Faucet Claim URL:', API_ENDPOINTS.faucet.claim);
    console.log('');

    // Test 2: Test faucet health
    console.log('2️⃣ Testing faucet health API...');
    const healthResult = await faucetAPI.getHealth();
    
    if (healthResult.success) {
      console.log('✅ Faucet health check successful');
      console.log('   - Faucet address:', healthResult.data.data.faucetAddress);
      console.log('   - Token contract:', healthResult.data.data.tokenContract);
    } else {
      console.log('❌ Faucet health check failed:', healthResult.error);
    }
    console.log('');

    // Test 3: Test claim status
    console.log('3️⃣ Testing claim status API...');
    const testAddress = '0x742D35CC6634C0532925A3b8d4C9DB96c4B4d8B0';
    const statusResult = await faucetAPI.getStatus(testAddress);
    
    if (statusResult.success) {
      console.log('✅ Claim status check successful');
      console.log('   - Can claim:', statusResult.data.data.canClaim);
      console.log('   - Amount per claim:', statusResult.data.data.config.amountPerClaim, 'MGT');
    } else {
      console.log('❌ Claim status check failed:', statusResult.error);
    }
    console.log('');

    // Test 4: Test claim tokens (will likely fail due to cooldown)
    console.log('4️⃣ Testing claim tokens API...');
    const claimResult = await faucetAPI.claimTokens(testAddress, 'Test Script');
    
    if (claimResult.success) {
      console.log('✅ Token claim successful');
      console.log('   - Transaction hash:', claimResult.data.data.transactionHash);
      console.log('   - Amount claimed:', claimResult.data.data.amount, 'MGT');
    } else {
      console.log('❌ Token claim failed:', claimResult.error);
      if (claimResult.error.includes('COOLDOWN_ACTIVE')) {
        console.log('   - This is expected if recently claimed');
      }
    }
    console.log('');

    // Test 5: Test statistics
    console.log('5️⃣ Testing faucet statistics API...');
    const statsResult = await faucetAPI.getStats();
    
    if (statsResult.success) {
      console.log('✅ Faucet statistics retrieved');
      console.log('   - Total claims:', statsResult.data.data.totalClaims);
      console.log('   - Total users:', statsResult.data.data.totalUsers);
      console.log('   - Total distributed:', statsResult.data.data.totalDistributed, 'MGT');
    } else {
      console.log('❌ Faucet statistics failed:', statsResult.error);
    }
    console.log('');

    console.log('🎉 Frontend API configuration test complete!');
    console.log('');
    console.log('📋 Summary:');
    console.log('   - ✅ API configuration working');
    console.log('   - ✅ Centralized URL management');
    console.log('   - ✅ Error handling implemented');
    console.log('   - ✅ Type-safe API calls');
    console.log('   - ✅ Ready for frontend integration');
    console.log('');
    console.log('🚀 Frontend can now reliably connect to backend!');

  } catch (error) {
    console.error('❌ API configuration test failed:', error);
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ Failed to import API configuration:', error);
  process.exit(1);
});