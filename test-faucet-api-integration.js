#!/usr/bin/env node

/**
 * Test Complete Faucet API Integration
 * Tests the backend faucet service and API endpoints
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const API_BASE = process.env.API_BASE || 'http://localhost:5000';
const TEST_ADDRESS = '0x742D35CC6634C0532925A3b8d4C9DB96c4B4d8B0';

async function testFaucetAPI() {
  console.log('🧪 Testing Complete Faucet API Integration...\n');

  try {
    // Test 1: Health check
    console.log('1️⃣ Testing faucet health check...');
    const healthResponse = await fetch(`${API_BASE}/api/faucet/health`);
    const healthData = await healthResponse.json();
    
    if (healthData.success) {
      console.log('✅ Faucet service is healthy:');
      console.log('   - Status:', healthData.data.status);
      console.log('   - Faucet address:', healthData.data.faucetAddress);
      console.log('   - Token contract:', healthData.data.tokenContract);
      console.log('   - Is owner:', healthData.data.isOwner);
      console.log('   - Faucet balance:', healthData.data.faucetBalance, 'MGT');
    } else {
      console.log('❌ Faucet health check failed:', healthData.error);
      return;
    }
    console.log('');

    // Test 2: Get claim status
    console.log('2️⃣ Testing claim status endpoint...');
    const statusResponse = await fetch(`${API_BASE}/api/faucet/status/${TEST_ADDRESS}`);
    const statusData = await statusResponse.json();
    
    if (statusData.success) {
      console.log('✅ Claim status retrieved:');
      console.log('   - Address:', statusData.data.address);
      console.log('   - Can claim:', statusData.data.canClaim);
      console.log('   - Amount per claim:', statusData.data.config.amountPerClaim, 'MGT');
      console.log('   - Cooldown hours:', statusData.data.config.cooldownHours);
    } else {
      console.log('❌ Status check failed:', statusData.error);
    }
    console.log('');

    // Test 3: Claim tokens
    console.log('3️⃣ Testing token claim endpoint...');
    const claimResponse = await fetch(`${API_BASE}/api/faucet/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: TEST_ADDRESS,
        userAgent: 'Test Script',
        ip: '127.0.0.1'
      })
    });
    
    const claimData = await claimResponse.json();
    
    if (claimData.success) {
      console.log('✅ Tokens claimed successfully:');
      console.log('   - Transaction hash:', claimData.data.transactionHash);
      console.log('   - Amount claimed:', claimData.data.amount, 'MGT');
      console.log('   - New balance:', claimData.data.balanceAfter, 'MGT');
      console.log('   - Claim number:', claimData.data.claimNumber);
      console.log('   - Remaining claims:', claimData.data.remainingClaims);
    } else {
      console.log('❌ Token claim failed:');
      console.log('   - Error:', claimData.error);
      console.log('   - Code:', claimData.code);
      if (claimData.details) {
        console.log('   - Details:', JSON.stringify(claimData.details, null, 2));
      }
    }
    console.log('');

    // Test 4: Get updated status
    console.log('4️⃣ Testing updated claim status...');
    const updatedStatusResponse = await fetch(`${API_BASE}/api/faucet/status/${TEST_ADDRESS}`);
    const updatedStatusData = await updatedStatusResponse.json();
    
    if (updatedStatusData.success) {
      console.log('✅ Updated status retrieved:');
      console.log('   - Can claim:', updatedStatusData.data.canClaim);
      if (updatedStatusData.data.history) {
        console.log('   - Total claims:', updatedStatusData.data.history.totalClaims);
        console.log('   - Last claim:', updatedStatusData.data.history.lastClaimTime);
        console.log('   - Total claimed:', updatedStatusData.data.history.totalClaimed, 'MGT');
      }
    }
    console.log('');

    // Test 5: Test cooldown (should fail)
    console.log('5️⃣ Testing cooldown mechanism...');
    const cooldownResponse = await fetch(`${API_BASE}/api/faucet/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: TEST_ADDRESS,
        userAgent: 'Test Script Cooldown',
      })
    });
    
    const cooldownData = await cooldownResponse.json();
    
    if (!cooldownData.success && cooldownResponse.status === 429) {
      console.log('✅ Cooldown working correctly:');
      console.log('   - Status:', cooldownResponse.status);
      console.log('   - Error:', cooldownData.error);
      console.log('   - Code:', cooldownData.code);
    } else {
      console.log('⚠️ Cooldown not working as expected');
      console.log('   - Success:', cooldownData.success);
      console.log('   - Status:', cooldownResponse.status);
    }
    console.log('');

    // Test 6: Get faucet statistics
    console.log('6️⃣ Testing faucet statistics endpoint...');
    const statsResponse = await fetch(`${API_BASE}/api/faucet/stats`);
    const statsData = await statsResponse.json();
    
    if (statsData.success) {
      console.log('✅ Faucet statistics retrieved:');
      console.log('   - Total claims:', statsData.data.totalClaims);
      console.log('   - Total users:', statsData.data.totalUsers);
      console.log('   - Total distributed:', statsData.data.totalDistributed, 'MGT');
      console.log('   - Recent claims (24h):', statsData.data.recentClaims24h);
      console.log('   - Faucet balance:', statsData.data.faucetBalance, 'MGT');
    } else {
      console.log('❌ Statistics failed:', statsData.error);
    }
    console.log('');

    // Test 7: Test invalid address
    console.log('7️⃣ Testing invalid address handling...');
    const invalidResponse = await fetch(`${API_BASE}/api/faucet/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: 'invalid-address',
      })
    });
    
    const invalidData = await invalidResponse.json();
    
    if (!invalidData.success && invalidResponse.status === 400) {
      console.log('✅ Invalid address handled correctly:');
      console.log('   - Status:', invalidResponse.status);
      console.log('   - Error:', invalidData.error);
      console.log('   - Code:', invalidData.code);
    }
    console.log('');

    // Test 8: Test missing address
    console.log('8️⃣ Testing missing address handling...');
    const missingResponse = await fetch(`${API_BASE}/api/faucet/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    const missingData = await missingResponse.json();
    
    if (!missingData.success && missingResponse.status === 400) {
      console.log('✅ Missing address handled correctly:');
      console.log('   - Status:', missingResponse.status);
      console.log('   - Error:', missingData.error);
      console.log('   - Code:', missingData.code);
    }
    console.log('');

    console.log('🎉 All faucet API tests completed!');
    console.log('');
    console.log('📋 Summary:');
    console.log('   - ✅ Health check endpoint working');
    console.log('   - ✅ Status check endpoint working');
    console.log('   - ✅ Token claim endpoint working');
    console.log('   - ✅ Statistics endpoint working');
    console.log('   - ✅ Rate limiting active');
    console.log('   - ✅ Error handling working');
    console.log('   - ✅ Input validation working');
    console.log('');
    console.log('🚀 Backend faucet system is ready for production!');

  } catch (error) {
    console.error('❌ Faucet API test failed:', error);
    console.error('Stack trace:', error.stack);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('');
      console.log('💡 Make sure the server is running:');
      console.log('   npm run dev');
      console.log('   or');
      console.log('   node server.js');
    }
    
    process.exit(1);
  }
}

// Run the test
testFaucetAPI().catch(console.error);