#!/usr/bin/env node

/**
 * Test Subscription Contract Fix
 * Tests the corrected subscription contract interaction
 */

import dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

// Contract configuration
const LISK_SEPOLIA_RPC = process.env.LISK_SEPOLIA_RPC || 'https://rpc.sepolia-api.lisk.com';
const MGT_TOKEN_ADDRESS = process.env.MGT_TOKEN_ADDRESS || '0xB51623F59fF9f2AA7d3bC1Afa99AE0fA8049ed3D';
const SUBSCRIPTION_ADDRESS = process.env.SUBSCRIPTION_ADDRESS || '0x577d9A43D0fa564886379bdD9A56285769683C38';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Corrected enums to match contract interface
const UserRole = {
  Startup: 0,
  Researcher: 1,
  Admin: 2
};

const SubscriptionTier = {
  Free: 0,
  Starter: 1,
  Pro: 2,
  Enterprise: 3
};

const BillingCycle = {
  Monthly: 0,
  Yearly: 1
};

const PaymentCurrency = {
  ETH: 0,
  USDC: 1,
  LSK: 2,
  NATIVE: 3,
  Token: 4
};

// Contract ABIs
const TOKEN_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

const SUBSCRIPTION_ABI = [
  'function subscribe(uint8 tier, uint8 role, uint8 billingCycle, string userUUID, uint8 currency) payable',
  'function isSubscriberActive(address user) view returns (bool)',
  'function getSubscriptionInfo(address user) view returns (tuple(address userAddress, uint8 tier, uint8 role, uint8 billingCycle, uint256 startTime, uint256 endTime, uint256 periodStart, uint256 periodEnd, bool isActive, bool cancelAtPeriodEnd, uint256 gracePeriodEnd, uint256 amountPaid, uint8 currency))',
  'function plans(uint8 tier) view returns (string name, uint256 monthlyPrice, uint256 yearlyPrice, tuple(uint256 apiCallsPerMonth, uint256 maxProjects, uint256 maxAlerts, bool exportAccess, bool comparisonTool, bool walletIntelligence, bool apiAccess, bool prioritySupport, bool customInsights) features, tuple(uint256 historicalData, uint256 teamMembers, uint256 dataRefreshRate) limits, bool active)'
];

async function testSubscriptionContractFix() {
  console.log('🧪 Testing Subscription Contract Fix...\n');

  try {
    // Setup blockchain connection
    const provider = new ethers.JsonRpcProvider(LISK_SEPOLIA_RPC);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const tokenContract = new ethers.Contract(MGT_TOKEN_ADDRESS, TOKEN_ABI, wallet);
    const subscriptionContract = new ethers.Contract(SUBSCRIPTION_ADDRESS, SUBSCRIPTION_ABI, wallet);

    console.log('📋 Test Configuration:');
    console.log('   - Wallet address:', wallet.address);
    console.log('   - Token contract:', MGT_TOKEN_ADDRESS);
    console.log('   - Subscription contract:', SUBSCRIPTION_ADDRESS);
    console.log('');

    // Test 1: Check token balance
    console.log('1️⃣ Checking token balance...');
    const balance = await tokenContract.balanceOf(wallet.address);
    console.log('✅ Token balance:', ethers.formatEther(balance), 'MGT');
    
    if (balance < ethers.parseEther('12')) {
      console.log('❌ Insufficient balance for Starter plan (12 MGT required)');
      return;
    }
    console.log('');

    // Test 2: Check subscription plan details
    console.log('2️⃣ Checking subscription plan details...');
    const starterPlan = await subscriptionContract.plans(SubscriptionTier.Starter);
    console.log('✅ Starter plan details:');
    console.log('   - Name:', starterPlan.name);
    console.log('   - Monthly price:', ethers.formatEther(starterPlan.monthlyPrice), 'MGT');
    console.log('   - Yearly price:', ethers.formatEther(starterPlan.yearlyPrice), 'MGT');
    console.log('   - Active:', starterPlan.active);
    console.log('');

    // Test 3: Check current subscription status
    console.log('3️⃣ Checking current subscription status...');
    const isActive = await subscriptionContract.isSubscriberActive(wallet.address);
    console.log('✅ Current subscription status:', isActive ? 'Active' : 'Inactive');
    
    if (isActive) {
      const subInfo = await subscriptionContract.getSubscriptionInfo(wallet.address);
      console.log('   - Current tier:', Object.keys(SubscriptionTier)[subInfo.tier]);
      console.log('   - End time:', new Date(Number(subInfo.endTime) * 1000));
    }
    console.log('');

    // Test 4: Check token allowance
    console.log('4️⃣ Checking token allowance...');
    const allowance = await tokenContract.allowance(wallet.address, SUBSCRIPTION_ADDRESS);
    console.log('✅ Current allowance:', ethers.formatEther(allowance), 'MGT');
    
    const requiredAmount = starterPlan.monthlyPrice;
    const needsApproval = allowance < requiredAmount;
    
    if (needsApproval) {
      console.log('⚠️ Approval needed for subscription');
      console.log('   - Required:', ethers.formatEther(requiredAmount), 'MGT');
      console.log('   - Current allowance:', ethers.formatEther(allowance), 'MGT');
      
      // Test 5: Approve tokens
      console.log('5️⃣ Approving tokens...');
      const approveTx = await tokenContract.approve(SUBSCRIPTION_ADDRESS, requiredAmount);
      console.log('📝 Approval transaction sent:', approveTx.hash);
      
      const approveReceipt = await approveTx.wait();
      console.log('✅ Approval confirmed in block:', approveReceipt.blockNumber);
      console.log('');
    } else {
      console.log('✅ Sufficient allowance already exists');
      console.log('');
    }

    // Test 6: Test subscription with corrected parameters
    if (!isActive) {
      console.log('6️⃣ Testing subscription with corrected parameters...');
      console.log('📋 Subscription parameters:');
      console.log('   - Tier:', Object.keys(SubscriptionTier)[SubscriptionTier.Starter], '(', SubscriptionTier.Starter, ')');
      console.log('   - Role:', Object.keys(UserRole)[UserRole.Startup], '(', UserRole.Startup, ')');
      console.log('   - Billing:', Object.keys(BillingCycle)[BillingCycle.Monthly], '(', BillingCycle.Monthly, ')');
      console.log('   - Currency:', Object.keys(PaymentCurrency)[PaymentCurrency.Token], '(', PaymentCurrency.Token, ')');
      console.log('   - User UUID: test-user-123');
      console.log('');

      try {
        const subscribeTx = await subscriptionContract.subscribe(
          SubscriptionTier.Starter,
          UserRole.Startup,
          BillingCycle.Monthly,
          'test-user-123',
          PaymentCurrency.Token
        );
        
        console.log('📝 Subscription transaction sent:', subscribeTx.hash);
        console.log('⏳ Waiting for confirmation...');
        
        const subscribeReceipt = await subscribeTx.wait();
        console.log('✅ Subscription confirmed in block:', subscribeReceipt.blockNumber);
        console.log('   - Gas used:', subscribeReceipt.gasUsed.toString());
        console.log('   - Transaction hash:', subscribeTx.hash);
        console.log('');

        // Test 7: Verify subscription was created
        console.log('7️⃣ Verifying subscription creation...');
        const newStatus = await subscriptionContract.isSubscriberActive(wallet.address);
        console.log('✅ New subscription status:', newStatus ? 'Active' : 'Inactive');
        
        if (newStatus) {
          const newSubInfo = await subscriptionContract.getSubscriptionInfo(wallet.address);
          console.log('   - Tier:', Object.keys(SubscriptionTier)[newSubInfo.tier]);
          console.log('   - Role:', Object.keys(UserRole)[newSubInfo.role]);
          console.log('   - Billing cycle:', Object.keys(BillingCycle)[newSubInfo.billingCycle]);
          console.log('   - Start time:', new Date(Number(newSubInfo.startTime) * 1000));
          console.log('   - End time:', new Date(Number(newSubInfo.endTime) * 1000));
          console.log('   - Amount paid:', ethers.formatEther(newSubInfo.amountPaid), 'MGT');
          console.log('   - Currency:', Object.keys(PaymentCurrency)[newSubInfo.currency]);
        }
        console.log('');

        console.log('🎉 Subscription contract fix test completed successfully!');
        console.log('');
        console.log('📋 Summary:');
        console.log('   - ✅ Enum values corrected');
        console.log('   - ✅ PaymentCurrency.Token (4) working');
        console.log('   - ✅ UserRole.Startup (0) working');
        console.log('   - ✅ Subscription creation successful');
        console.log('   - ✅ Transaction hash available for frontend display');
        console.log('');
        console.log('🔗 Transaction Details:');
        console.log('   - Hash:', subscribeTx.hash);
        console.log('   - Explorer:', `https://sepolia-blockscout.lisk.com/tx/${subscribeTx.hash}`);

      } catch (subscribeError) {
        console.error('❌ Subscription failed:', subscribeError);
        
        if (subscribeError.message.includes('Invalid currency for token mode')) {
          console.log('💡 This confirms the currency validation is working');
          console.log('   - Contract expects PaymentCurrency.Token (4) for token mode');
          console.log('   - Frontend was using wrong enum value');
        }
        
        console.log('');
        console.log('🔧 Error Analysis:');
        console.log('   - Error message:', subscribeError.message);
        console.log('   - Error code:', subscribeError.code);
        
        if (subscribeError.data) {
          console.log('   - Error data:', subscribeError.data);
        }
      }
    } else {
      console.log('6️⃣ Skipping subscription test (already subscribed)');
      console.log('✅ Contract interaction test completed');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testSubscriptionContractFix().catch(console.error);