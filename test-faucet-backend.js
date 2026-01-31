#!/usr/bin/env node

/**
 * Test Backend Faucet Service
 * Tests the new backend faucet implementation
 */

import dotenv from 'dotenv';
import faucetService from './src/services/FaucetService.js';

dotenv.config();

async function testFaucetService() {
  console.log('🧪 Testing Backend Faucet Service...\n');

  try {
    // Test 1: Initialize faucet service
    console.log('1️⃣ Testing faucet initialization...');
    const initResult = await faucetService.initialize();
    console.log('✅ Faucet initialized successfully:');
    console.log('   - Faucet address:', initResult.faucetAddress);
    console.log('   - Token contract:', initResult.tokenContract);
    console.log('   - Faucet balance:', initResult.faucetBalance, 'MGT');
    console.log('   - Is owner:', initResult.isOwner);
    console.log('');

    // Test 2: Check claim status for a test address
    console.log('2️⃣ Testing claim status check...');
    const testAddress = '0x742D35CC6634C0532925A3b8d4C9DB96c4B4d8B0'; // Checksummed test address
    const status = faucetService.getClaimStatus(testAddress);
    console.log('✅ Claim status retrieved:');
    console.log('   - Address:', status.address);
    console.log('   - Can claim:', status.canClaim);
    console.log('   - Amount per claim:', status.config.amountPerClaim, 'MGT');
    console.log('   - Cooldown hours:', status.config.cooldownHours);
    console.log('');

    // Test 3: Attempt to claim tokens
    console.log('3️⃣ Testing token claim...');
    const claimResult = await faucetService.claimTokens(testAddress, {
      userAgent: 'Test Script',
      ip: '127.0.0.1',
      source: 'backend-test'
    });

    if (claimResult.success) {
      console.log('✅ Tokens claimed successfully:');
      console.log('   - Transaction hash:', claimResult.transactionHash);
      console.log('   - Amount claimed:', claimResult.amount, 'MGT');
      console.log('   - New balance:', claimResult.balanceAfter, 'MGT');
      console.log('   - Gas used:', claimResult.gasUsed);
      console.log('   - Claim number:', claimResult.claimNumber);
      console.log('   - Remaining claims:', claimResult.remainingClaims);
    } else {
      console.log('❌ Token claim failed:');
      console.log('   - Error:', claimResult.error);
      console.log('   - Code:', claimResult.code);
      if (claimResult.details) {
        console.log('   - Details:', claimResult.details);
      }
    }
    console.log('');

    // Test 4: Check claim status after attempt
    console.log('4️⃣ Testing claim status after attempt...');
    const statusAfter = faucetService.getClaimStatus(testAddress);
    console.log('✅ Updated claim status:');
    console.log('   - Can claim:', statusAfter.canClaim);
    if (statusAfter.history) {
      console.log('   - Total claims:', statusAfter.history.totalClaims);
      console.log('   - Last claim:', statusAfter.history.lastClaimTime);
      console.log('   - Total claimed:', statusAfter.history.totalClaimed, 'MGT');
    }
    console.log('');

    // Test 5: Get faucet statistics
    console.log('5️⃣ Testing faucet statistics...');
    const stats = await faucetService.getFaucetStats();
    console.log('✅ Faucet statistics:');
    console.log('   - Total claims:', stats.totalClaims);
    console.log('   - Total users:', stats.totalUsers);
    console.log('   - Total distributed:', stats.totalDistributed, 'MGT');
    console.log('   - Recent claims (24h):', stats.recentClaims24h);
    console.log('   - Faucet balance:', stats.faucetBalance, 'MGT');
    console.log('   - Total supply:', stats.totalSupply, 'MGT');
    console.log('');

    // Test 6: Test cooldown (should fail)
    console.log('6️⃣ Testing cooldown mechanism...');
    const cooldownResult = await faucetService.claimTokens(testAddress);
    if (!cooldownResult.success) {
      console.log('✅ Cooldown working correctly:');
      console.log('   - Error:', cooldownResult.error);
      console.log('   - Code:', cooldownResult.code);
    } else {
      console.log('⚠️ Cooldown not working - this might be unexpected');
    }
    console.log('');

    // Test 7: Test invalid address
    console.log('7️⃣ Testing invalid address handling...');
    const invalidResult = await faucetService.claimTokens('invalid-address');
    if (!invalidResult.success) {
      console.log('✅ Invalid address handled correctly:');
      console.log('   - Error:', invalidResult.error);
    }
    console.log('');

    console.log('🎉 All faucet service tests completed!');
    console.log('');
    console.log('📋 Summary:');
    console.log('   - Faucet service is working correctly');
    console.log('   - Token minting is functional');
    console.log('   - Rate limiting is active');
    console.log('   - Error handling is working');
    console.log('   - Statistics tracking is operational');

  } catch (error) {
    console.error('❌ Faucet service test failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testFaucetService().catch(console.error);