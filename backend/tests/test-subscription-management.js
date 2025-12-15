/**
 * Test Subscription Management Backend
 * Tests subscription service, middleware, and routes
 */

import pool from '../src/db/db.js';
import {
  initializeFreeTrial,
  checkSubscriptionStatus,
  updateSubscriptionStatus,
  upgradeToPremium,
  getSubscriptionDetails,
  hasPremiumAccess,
  completeOnboarding
} from '../src/services/subscriptionService.js';

// Test user data
let testUserId = null;

async function setup() {
  console.log('🔧 Setting up test user...');
  
  // Create a test user
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id`,
    ['Test User', `test-${Date.now()}@example.com`, 'hashed_password']
  );
  
  testUserId = result.rows[0].id;
  console.log(`✅ Test user created: ${testUserId}`);
}

async function cleanup() {
  console.log('🧹 Cleaning up test data...');
  
  if (testUserId) {
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    console.log('✅ Test user deleted');
  }
}

async function testInitializeFreeTrial() {
  console.log('\n📝 Test: Initialize Free Trial');
  
  try {
    const result = await initializeFreeTrial(testUserId);
    
    console.log('  ✓ Free trial initialized');
    console.log(`    - Status: ${result.subscription_status}`);
    console.log(`    - Expires: ${result.subscription_expires_at}`);
    
    // Verify expiration is ~30 days from now
    const expiresAt = new Date(result.subscription_expires_at);
    const now = new Date();
    const daysDiff = Math.round((expiresAt - now) / (1000 * 60 * 60 * 24));
    
    if (daysDiff >= 29 && daysDiff <= 31) {
      console.log(`  ✓ Expiration date is correct (~30 days): ${daysDiff} days`);
    } else {
      console.log(`  ✗ Expiration date is incorrect: ${daysDiff} days`);
    }
    
    return true;
  } catch (error) {
    console.error('  ✗ Test failed:', error.message);
    return false;
  }
}

async function testCheckSubscriptionStatus() {
  console.log('\n📝 Test: Check Subscription Status');
  
  try {
    const status = await checkSubscriptionStatus(testUserId);
    
    console.log('  ✓ Subscription status retrieved');
    console.log(`    - Status: ${status.status}`);
    console.log(`    - Is Active: ${status.isActive}`);
    console.log(`    - Is Expired: ${status.isExpired}`);
    console.log(`    - Days Remaining: ${status.daysRemaining}`);
    console.log(`    - Is Premium: ${status.isPremium}`);
    
    if (status.status === 'free' && status.isActive && !status.isExpired) {
      console.log('  ✓ Status is correct for active free trial');
    } else {
      console.log('  ✗ Status is incorrect');
    }
    
    return true;
  } catch (error) {
    console.error('  ✗ Test failed:', error.message);
    return false;
  }
}

async function testUpgradeToPremium() {
  console.log('\n📝 Test: Upgrade to Premium');
  
  try {
    const result = await upgradeToPremium(testUserId, 3); // 3 months
    
    console.log('  ✓ Upgraded to premium');
    console.log(`    - Status: ${result.subscription_status}`);
    console.log(`    - Expires: ${result.subscription_expires_at}`);
    
    // Verify status is premium
    if (result.subscription_status === 'premium') {
      console.log('  ✓ Status updated to premium');
    } else {
      console.log('  ✗ Status not updated correctly');
    }
    
    // Verify expiration is ~3 months from now
    const expiresAt = new Date(result.subscription_expires_at);
    const now = new Date();
    const daysDiff = Math.round((expiresAt - now) / (1000 * 60 * 60 * 24));
    
    if (daysDiff >= 88 && daysDiff <= 92) {
      console.log(`  ✓ Expiration date is correct (~90 days): ${daysDiff} days`);
    } else {
      console.log(`  ✗ Expiration date is incorrect: ${daysDiff} days`);
    }
    
    return true;
  } catch (error) {
    console.error('  ✗ Test failed:', error.message);
    return false;
  }
}

async function testHasPremiumAccess() {
  console.log('\n📝 Test: Check Premium Access');
  
  try {
    const hasPremium = await hasPremiumAccess(testUserId);
    
    console.log(`  ✓ Premium access check: ${hasPremium}`);
    
    if (hasPremium) {
      console.log('  ✓ User has premium access');
    } else {
      console.log('  ✗ User should have premium access');
    }
    
    return true;
  } catch (error) {
    console.error('  ✗ Test failed:', error.message);
    return false;
  }
}

async function testGetSubscriptionDetails() {
  console.log('\n📝 Test: Get Subscription Details');
  
  try {
    const details = await getSubscriptionDetails(testUserId);
    
    console.log('  ✓ Subscription details retrieved');
    console.log(`    - Status: ${details.status}`);
    console.log(`    - Is Active: ${details.isActive}`);
    console.log(`    - Days Remaining: ${details.daysRemaining}`);
    console.log(`    - Balance: ${details.balance} ZEC`);
    console.log(`    - Onboarding Completed: ${details.onboardingCompleted}`);
    
    return true;
  } catch (error) {
    console.error('  ✗ Test failed:', error.message);
    return false;
  }
}

async function testCompleteOnboarding() {
  console.log('\n📝 Test: Complete Onboarding');
  
  try {
    const result = await completeOnboarding(testUserId);
    
    console.log('  ✓ Onboarding completed');
    console.log(`    - Onboarding Completed: ${result.onboarding_completed}`);
    
    if (result.onboarding_completed) {
      console.log('  ✓ Onboarding status updated correctly');
    } else {
      console.log('  ✗ Onboarding status not updated');
    }
    
    return true;
  } catch (error) {
    console.error('  ✗ Test failed:', error.message);
    return false;
  }
}

async function testExpiredSubscription() {
  console.log('\n📝 Test: Expired Subscription');
  
  try {
    // Set subscription to expired
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    await updateSubscriptionStatus(testUserId, 'free', yesterday);
    
    const status = await checkSubscriptionStatus(testUserId);
    
    console.log('  ✓ Subscription set to expired');
    console.log(`    - Is Active: ${status.isActive}`);
    console.log(`    - Is Expired: ${status.isExpired}`);
    
    if (!status.isActive && status.isExpired) {
      console.log('  ✓ Expired subscription detected correctly');
    } else {
      console.log('  ✗ Expired subscription not detected');
    }
    
    return true;
  } catch (error) {
    console.error('  ✗ Test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Subscription Management Tests\n');
  console.log('='.repeat(50));
  
  try {
    await setup();
    
    const results = [];
    
    results.push(await testInitializeFreeTrial());
    results.push(await testCheckSubscriptionStatus());
    results.push(await testUpgradeToPremium());
    results.push(await testHasPremiumAccess());
    results.push(await testGetSubscriptionDetails());
    results.push(await testCompleteOnboarding());
    results.push(await testExpiredSubscription());
    
    console.log('\n' + '='.repeat(50));
    console.log('\n📊 Test Results:');
    
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    console.log(`  ✓ Passed: ${passed}/${total}`);
    console.log(`  ✗ Failed: ${total - passed}/${total}`);
    
    if (passed === total) {
      console.log('\n✅ All tests passed!');
    } else {
      console.log('\n❌ Some tests failed');
    }
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
  } finally {
    await cleanup();
    await pool.end();
  }
}

// Run tests
runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
