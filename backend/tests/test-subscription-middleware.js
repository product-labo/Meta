/**
 * Test Subscription Middleware
 * Tests subscription checking and access control middleware
 */

import pool from '../src/db/db.js';
import { initializeFreeTrial, updateSubscriptionStatus } from '../src/services/subscriptionService.js';
import {
  checkSubscription,
  requireActiveSubscription,
  requirePremiumSubscription,
  checkTrialExpiration,
  attachSubscriptionStatus
} from '../src/middleware/subscription.js';

// Test user data
let testUserId = null;

// Mock request and response objects
function createMockReq(userId) {
  return {
    user: { id: userId },
    subscription: null
  };
}

function createMockRes() {
  const res = {
    statusCode: null,
    jsonData: null,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    },
    setHeader(key, value) {
      this.headers[key] = value;
      return this;
    }
  };
  return res;
}

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
  await initializeFreeTrial(testUserId);
  
  console.log(`✅ Test user created: ${testUserId}`);
}

async function cleanup() {
  console.log('🧹 Cleaning up test data...');
  
  if (testUserId) {
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    console.log('✅ Test user deleted');
  }
}

async function testCheckSubscriptionMiddleware() {
  console.log('\n📝 Test: Check Subscription Middleware');
  
  try {
    const req = createMockReq(testUserId);
    const res = createMockRes();
    let nextCalled = false;
    
    const next = () => {
      nextCalled = true;
    };
    
    await checkSubscription(req, res, next);
    
    if (nextCalled && req.subscription) {
      console.log('  ✓ Middleware executed successfully');
      console.log(`    - Subscription attached: ${req.subscription.status}`);
      console.log(`    - Is Active: ${req.subscription.isActive}`);
      return true;
    } else {
      console.log('  ✗ Middleware did not execute correctly');
      return false;
    }
  } catch (error) {
    console.error('  ✗ Test failed:', error.message);
    return false;
  }
}

async function testRequireActiveSubscription() {
  console.log('\n📝 Test: Require Active Subscription Middleware');
  
  try {
    // Test with active subscription
    const req = createMockReq(testUserId);
    req.subscription = {
      status: 'free',
      isActive: true,
      isExpired: false
    };
    
    const res = createMockRes();
    let nextCalled = false;
    
    const next = () => {
      nextCalled = true;
    };
    
    requireActiveSubscription(req, res, next);
    
    if (nextCalled) {
      console.log('  ✓ Active subscription allowed through');
    } else {
      console.log('  ✗ Active subscription was blocked');
      return false;
    }
    
    // Test with expired subscription
    const req2 = createMockReq(testUserId);
    req2.subscription = {
      status: 'free',
      isActive: false,
      isExpired: true
    };
    
    const res2 = createMockRes();
    let next2Called = false;
    
    const next2 = () => {
      next2Called = true;
    };
    
    requireActiveSubscription(req2, res2, next2);
    
    if (!next2Called && res2.statusCode === 403) {
      console.log('  ✓ Expired subscription blocked correctly');
      console.log(`    - Error: ${res2.jsonData.error}`);
      return true;
    } else {
      console.log('  ✗ Expired subscription was not blocked');
      return false;
    }
  } catch (error) {
    console.error('  ✗ Test failed:', error.message);
    return false;
  }
}

async function testRequirePremiumSubscription() {
  console.log('\n📝 Test: Require Premium Subscription Middleware');
  
  try {
    // Test with free subscription
    const req = createMockReq(testUserId);
    req.subscription = {
      status: 'free',
      isPremium: false
    };
    
    const res = createMockRes();
    let nextCalled = false;
    
    const next = () => {
      nextCalled = true;
    };
    
    requirePremiumSubscription(req, res, next);
    
    if (!nextCalled && res.statusCode === 403) {
      console.log('  ✓ Free subscription blocked from premium feature');
      console.log(`    - Error: ${res.jsonData.error}`);
    } else {
      console.log('  ✗ Free subscription was not blocked');
      return false;
    }
    
    // Test with premium subscription
    const req2 = createMockReq(testUserId);
    req2.subscription = {
      status: 'premium',
      isPremium: true
    };
    
    const res2 = createMockRes();
    let next2Called = false;
    
    const next2 = () => {
      next2Called = true;
    };
    
    requirePremiumSubscription(req2, res2, next2);
    
    if (next2Called) {
      console.log('  ✓ Premium subscription allowed through');
      return true;
    } else {
      console.log('  ✗ Premium subscription was blocked');
      return false;
    }
  } catch (error) {
    console.error('  ✗ Test failed:', error.message);
    return false;
  }
}

async function testCheckTrialExpiration() {
  console.log('\n📝 Test: Check Trial Expiration Middleware');
  
  try {
    // Test with trial expiring soon (5 days)
    const req = createMockReq(testUserId);
    req.subscription = {
      status: 'free',
      daysRemaining: 5
    };
    
    const res = createMockRes();
    let nextCalled = false;
    
    const next = () => {
      nextCalled = true;
    };
    
    checkTrialExpiration(req, res, next);
    
    if (nextCalled && res.headers['X-Trial-Expiring'] === 'true') {
      console.log('  ✓ Trial expiration warning added');
      console.log(`    - Days Remaining: ${res.headers['X-Trial-Days-Remaining']}`);
    } else {
      console.log('  ✗ Trial expiration warning not added');
      return false;
    }
    
    // Test with trial not expiring soon (15 days)
    const req2 = createMockReq(testUserId);
    req2.subscription = {
      status: 'free',
      daysRemaining: 15
    };
    
    const res2 = createMockRes();
    let next2Called = false;
    
    const next2 = () => {
      next2Called = true;
    };
    
    checkTrialExpiration(req2, res2, next2);
    
    if (next2Called && !res2.headers['X-Trial-Expiring']) {
      console.log('  ✓ No warning for trial with 15+ days remaining');
      return true;
    } else {
      console.log('  ✗ Unexpected warning added');
      return false;
    }
  } catch (error) {
    console.error('  ✗ Test failed:', error.message);
    return false;
  }
}

async function testAttachSubscriptionStatus() {
  console.log('\n📝 Test: Attach Subscription Status Middleware');
  
  try {
    const req = createMockReq(testUserId);
    const res = createMockRes();
    let nextCalled = false;
    
    const next = () => {
      nextCalled = true;
    };
    
    await attachSubscriptionStatus(req, res, next);
    
    if (nextCalled && req.subscription && res.headers['X-Subscription-Status']) {
      console.log('  ✓ Subscription status attached');
      console.log(`    - Status Header: ${res.headers['X-Subscription-Status']}`);
      console.log(`    - Active Header: ${res.headers['X-Subscription-Active']}`);
      return true;
    } else {
      console.log('  ✗ Subscription status not attached');
      return false;
    }
  } catch (error) {
    console.error('  ✗ Test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Subscription Middleware Tests\n');
  console.log('='.repeat(50));
  
  try {
    await setup();
    
    const results = [];
    
    results.push(await testCheckSubscriptionMiddleware());
    results.push(await testRequireActiveSubscription());
    results.push(await testRequirePremiumSubscription());
    results.push(await testCheckTrialExpiration());
    results.push(await testAttachSubscriptionStatus());
    
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
