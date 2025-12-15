/**
 * Privacy Enforcement Service Tests
 * 
 * Tests for privacy mode checking, data anonymization,
 * monetizable access control, and immediate privacy updates.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import PrivacyEnforcementService from '../src/services/privacyEnforcementService.js';
import pool from '../src/db/db.js';

// Test data
let testUserId1, testUserId2, testProjectId1, testProjectId2;
let testWalletPrivate, testWalletPublic, testWalletMonetizable;
let privacyService;

async function setup() {
  console.log('Setting up test data...');
  
  privacyService = new PrivacyEnforcementService(pool);

  // Create test users
  const user1 = await pool.query(
    `INSERT INTO users (name, email, password_hash, subscription_status)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    ['Test User 1', 'privacy-test1@example.com', 'hash1', 'premium']
  );
  testUserId1 = user1.rows[0].id;

  const user2 = await pool.query(
    `INSERT INTO users (name, email, password_hash, subscription_status)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    ['Test User 2', 'privacy-test2@example.com', 'hash2', 'premium']
  );
  testUserId2 = user2.rows[0].id;

  // Create test projects
  const project1 = await pool.query(
    `INSERT INTO projects (user_id, name, category, status)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [testUserId1, 'Privacy Test Project 1', 'defi', 'active']
  );
  testProjectId1 = project1.rows[0].id;

  const project2 = await pool.query(
    `INSERT INTO projects (user_id, name, category, status)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [testUserId2, 'Privacy Test Project 2', 'defi', 'active']
  );
  testProjectId2 = project2.rows[0].id;

  // Create test wallets with different privacy modes
  const walletPrivate = await pool.query(
    `INSERT INTO wallets (project_id, address, type, privacy_mode, network)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [testProjectId1, 't1TestPrivateAddress123', 't', 'private', 'testnet']
  );
  testWalletPrivate = walletPrivate.rows[0];

  const walletPublic = await pool.query(
    `INSERT INTO wallets (project_id, address, type, privacy_mode, network)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [testProjectId1, 't1TestPublicAddress456', 't', 'public', 'testnet']
  );
  testWalletPublic = walletPublic.rows[0];

  const walletMonetizable = await pool.query(
    `INSERT INTO wallets (project_id, address, type, privacy_mode, network)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [testProjectId1, 't1TestMonetizableAddr789', 't', 'monetizable', 'testnet']
  );
  testWalletMonetizable = walletMonetizable.rows[0];

  console.log('Test data created successfully');
}

async function cleanup() {
  console.log('Cleaning up test data...');
  
  // Delete in reverse order of dependencies
  if (testWalletPrivate) {
    await pool.query('DELETE FROM wallets WHERE id = $1', [testWalletPrivate.id]);
  }
  if (testWalletPublic) {
    await pool.query('DELETE FROM wallets WHERE id = $1', [testWalletPublic.id]);
  }
  if (testWalletMonetizable) {
    await pool.query('DELETE FROM wallets WHERE id = $1', [testWalletMonetizable.id]);
  }
  
  if (testProjectId1) {
    await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId1]);
  }
  if (testProjectId2) {
    await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId2]);
  }
  
  if (testUserId1) {
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId1]);
  }
  if (testUserId2) {
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId2]);
  }

  // Clean up audit logs
  await pool.query('DELETE FROM wallet_privacy_audit_log WHERE wallet_id = ANY($1)', 
    [[testWalletPrivate?.id, testWalletPublic?.id, testWalletMonetizable?.id].filter(Boolean)]);

  console.log('Cleanup completed');
}

// Test 1: Check privacy mode
async function testCheckPrivacyMode() {
  console.log('\n--- Test 1: Check Privacy Mode ---');
  
  try {
    const privateMode = await privacyService.checkPrivacyMode(testWalletPrivate.id);
    console.log(`✓ Private wallet mode: ${privateMode}`);
    if (privateMode !== 'private') {
      throw new Error(`Expected 'private', got '${privateMode}'`);
    }

    const publicMode = await privacyService.checkPrivacyMode(testWalletPublic.id);
    console.log(`✓ Public wallet mode: ${publicMode}`);
    if (publicMode !== 'public') {
      throw new Error(`Expected 'public', got '${publicMode}'`);
    }

    const monetizableMode = await privacyService.checkPrivacyMode(testWalletMonetizable.id);
    console.log(`✓ Monetizable wallet mode: ${monetizableMode}`);
    if (monetizableMode !== 'monetizable') {
      throw new Error(`Expected 'monetizable', got '${monetizableMode}'`);
    }

    console.log('✓ Test 1 PASSED: Privacy mode checking works correctly');
    return true;
  } catch (error) {
    console.error('✗ Test 1 FAILED:', error.message);
    return false;
  }
}

// Test 2: Filter wallets by privacy
async function testFilterWalletsByPrivacy() {
  console.log('\n--- Test 2: Filter Wallets by Privacy ---');
  
  try {
    const allWalletIds = [
      testWalletPrivate.id,
      testWalletPublic.id,
      testWalletMonetizable.id
    ];

    // Filter for public and monetizable (should exclude private)
    const filtered = await privacyService.filterWalletsByPrivacy(
      allWalletIds,
      ['public', 'monetizable']
    );

    console.log(`✓ Filtered ${filtered.length} wallets from ${allWalletIds.length}`);
    
    if (filtered.length !== 2) {
      throw new Error(`Expected 2 wallets, got ${filtered.length}`);
    }

    if (filtered.includes(testWalletPrivate.id)) {
      throw new Error('Private wallet should be excluded');
    }

    if (!filtered.includes(testWalletPublic.id)) {
      throw new Error('Public wallet should be included');
    }

    if (!filtered.includes(testWalletMonetizable.id)) {
      throw new Error('Monetizable wallet should be included');
    }

    console.log('✓ Test 2 PASSED: Privacy filtering works correctly');
    return true;
  } catch (error) {
    console.error('✗ Test 2 FAILED:', error.message);
    return false;
  }
}

// Test 3: Anonymize wallet data
async function testAnonymizeWalletData() {
  console.log('\n--- Test 3: Anonymize Wallet Data ---');
  
  try {
    const rawData = {
      id: testWalletPublic.id,
      wallet_id: testWalletPublic.id,
      address: testWalletPublic.address,
      project_id: testProjectId1,
      user_id: testUserId1,
      type: 't',
      active_days: 10,
      transaction_count: 50,
      total_volume: 1000000,
      avg_productivity_score: 75.5
    };

    const anonymized = privacyService.anonymizeWalletData(rawData);

    console.log('Anonymized data:', JSON.stringify(anonymized, null, 2));

    // Check that identifying info is removed
    if (anonymized.id || anonymized.wallet_id || anonymized.address) {
      throw new Error('Identifying information not removed');
    }

    if (anonymized.project_id || anonymized.user_id) {
      throw new Error('Project/User IDs not removed');
    }

    // Check that metrics are preserved
    if (anonymized.metrics.active_days !== 10) {
      throw new Error('Active days not preserved');
    }

    if (anonymized.metrics.transaction_count !== 50) {
      throw new Error('Transaction count not preserved');
    }

    if (!anonymized.anonymized) {
      throw new Error('Anonymized flag not set');
    }

    console.log('✓ Test 3 PASSED: Data anonymization works correctly');
    return true;
  } catch (error) {
    console.error('✗ Test 3 FAILED:', error.message);
    return false;
  }
}

// Test 4: Check monetizable access
async function testCheckMonetizableAccess() {
  console.log('\n--- Test 4: Check Monetizable Access ---');
  
  try {
    // Owner should have full access
    const ownerAccess = await privacyService.checkMonetizableAccess(
      testWalletMonetizable.id,
      testUserId1
    );
    console.log('Owner access:', ownerAccess);
    
    if (!ownerAccess.allowed) {
      throw new Error('Owner should have access');
    }
    if (ownerAccess.dataLevel !== 'full') {
      throw new Error('Owner should have full data level');
    }

    // Non-owner without payment should be denied
    const nonOwnerAccess = await privacyService.checkMonetizableAccess(
      testWalletMonetizable.id,
      testUserId2
    );
    console.log('Non-owner access:', nonOwnerAccess);
    
    if (nonOwnerAccess.allowed) {
      throw new Error('Non-owner without payment should be denied');
    }
    if (!nonOwnerAccess.requiresPayment) {
      throw new Error('Should require payment');
    }

    // Test private wallet access
    const privateAccess = await privacyService.checkMonetizableAccess(
      testWalletPrivate.id,
      testUserId2
    );
    console.log('Private wallet access:', privateAccess);
    
    if (privateAccess.allowed) {
      throw new Error('Private wallet should deny access');
    }

    // Test public wallet access
    const publicAccess = await privacyService.checkMonetizableAccess(
      testWalletPublic.id,
      testUserId2
    );
    console.log('Public wallet access:', publicAccess);
    
    if (!publicAccess.allowed) {
      throw new Error('Public wallet should allow access');
    }
    if (publicAccess.dataLevel !== 'anonymized') {
      throw new Error('Public wallet should provide anonymized data');
    }

    console.log('✓ Test 4 PASSED: Monetizable access control works correctly');
    return true;
  } catch (error) {
    console.error('✗ Test 4 FAILED:', error.message);
    return false;
  }
}

// Test 5: Update privacy mode with immediate enforcement
async function testUpdatePrivacyMode() {
  console.log('\n--- Test 5: Update Privacy Mode (Immediate Enforcement) ---');
  
  try {
    // Update from private to public
    const updated = await privacyService.updatePrivacyMode(
      testWalletPrivate.id,
      'public',
      testUserId1
    );

    console.log('Updated wallet:', updated);

    if (updated.privacy_mode !== 'public') {
      throw new Error('Privacy mode not updated');
    }

    // Verify immediate enforcement by checking the mode
    const currentMode = await privacyService.checkPrivacyMode(testWalletPrivate.id);
    if (currentMode !== 'public') {
      throw new Error('Privacy mode not immediately enforced');
    }

    // Check audit log
    const auditLog = await privacyService.getPrivacyAuditLog(testWalletPrivate.id);
    console.log(`✓ Audit log has ${auditLog.length} entries`);
    
    if (auditLog.length === 0) {
      throw new Error('Audit log not created');
    }

    const latestEntry = auditLog[0];
    if (latestEntry.privacy_mode !== 'public') {
      throw new Error('Audit log has incorrect privacy mode');
    }

    // Test unauthorized update (should fail)
    try {
      await privacyService.updatePrivacyMode(
        testWalletPrivate.id,
        'private',
        testUserId2 // Wrong user
      );
      throw new Error('Unauthorized update should have failed');
    } catch (error) {
      if (error.message.includes('access denied')) {
        console.log('✓ Unauthorized update correctly rejected');
      } else {
        throw error;
      }
    }

    // Restore original state
    await privacyService.updatePrivacyMode(
      testWalletPrivate.id,
      'private',
      testUserId1
    );

    console.log('✓ Test 5 PASSED: Privacy mode updates work with immediate enforcement');
    return true;
  } catch (error) {
    console.error('✗ Test 5 FAILED:', error.message);
    return false;
  }
}

// Test 6: Get privacy statistics
async function testGetPrivacyStats() {
  console.log('\n--- Test 6: Get Privacy Statistics ---');
  
  try {
    const stats = await privacyService.getPrivacyStats(testProjectId1);
    console.log('Privacy stats:', stats);

    if (stats.private !== 1) {
      throw new Error(`Expected 1 private wallet, got ${stats.private}`);
    }

    if (stats.public !== 1) {
      throw new Error(`Expected 1 public wallet, got ${stats.public}`);
    }

    if (stats.monetizable !== 1) {
      throw new Error(`Expected 1 monetizable wallet, got ${stats.monetizable}`);
    }

    if (stats.total !== 3) {
      throw new Error(`Expected 3 total wallets, got ${stats.total}`);
    }

    console.log('✓ Test 6 PASSED: Privacy statistics work correctly');
    return true;
  } catch (error) {
    console.error('✗ Test 6 FAILED:', error.message);
    return false;
  }
}

// Test 7: Batch update privacy mode
async function testBatchUpdatePrivacyMode() {
  console.log('\n--- Test 7: Batch Update Privacy Mode ---');
  
  try {
    const walletIds = [testWalletPrivate.id, testWalletPublic.id];

    // Batch update to monetizable
    const updated = await privacyService.batchUpdatePrivacyMode(
      walletIds,
      'monetizable',
      testUserId1
    );

    console.log(`✓ Updated ${updated.length} wallets`);

    if (updated.length !== 2) {
      throw new Error(`Expected 2 updated wallets, got ${updated.length}`);
    }

    // Verify all are monetizable
    for (const wallet of updated) {
      if (wallet.privacy_mode !== 'monetizable') {
        throw new Error(`Wallet ${wallet.id} not updated to monetizable`);
      }
    }

    // Restore original states
    await privacyService.updatePrivacyMode(testWalletPrivate.id, 'private', testUserId1);
    await privacyService.updatePrivacyMode(testWalletPublic.id, 'public', testUserId1);

    console.log('✓ Test 7 PASSED: Batch privacy mode updates work correctly');
    return true;
  } catch (error) {
    console.error('✗ Test 7 FAILED:', error.message);
    return false;
  }
}

// Test 8: Validate privacy transition
async function testValidatePrivacyTransition() {
  console.log('\n--- Test 8: Validate Privacy Transition ---');
  
  try {
    // Valid transition
    const validTransition = privacyService.validatePrivacyTransition('private', 'public');
    console.log('Valid transition:', validTransition);
    
    if (!validTransition.valid) {
      throw new Error('Valid transition marked as invalid');
    }

    // Transition to monetizable (requires setup)
    const monetizableTransition = privacyService.validatePrivacyTransition('private', 'monetizable');
    console.log('Monetizable transition:', monetizableTransition);
    
    if (!monetizableTransition.valid) {
      throw new Error('Monetizable transition should be valid');
    }
    if (!monetizableTransition.requiresSetup) {
      throw new Error('Monetizable transition should require setup');
    }

    // Invalid mode
    const invalidTransition = privacyService.validatePrivacyTransition('private', 'invalid');
    console.log('Invalid transition:', invalidTransition);
    
    if (invalidTransition.valid) {
      throw new Error('Invalid mode should be rejected');
    }

    console.log('✓ Test 8 PASSED: Privacy transition validation works correctly');
    return true;
  } catch (error) {
    console.error('✗ Test 8 FAILED:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('='.repeat(60));
  console.log('Privacy Enforcement Service Tests');
  console.log('='.repeat(60));

  try {
    await setup();

    const results = [];
    results.push(await testCheckPrivacyMode());
    results.push(await testFilterWalletsByPrivacy());
    results.push(await testAnonymizeWalletData());
    results.push(await testCheckMonetizableAccess());
    results.push(await testUpdatePrivacyMode());
    results.push(await testGetPrivacyStats());
    results.push(await testBatchUpdatePrivacyMode());
    results.push(await testValidatePrivacyTransition());

    await cleanup();

    const passed = results.filter(r => r).length;
    const total = results.length;

    console.log('\n' + '='.repeat(60));
    console.log(`Test Results: ${passed}/${total} tests passed`);
    console.log('='.repeat(60));

    if (passed === total) {
      console.log('✓ All tests PASSED');
      process.exit(0);
    } else {
      console.log('✗ Some tests FAILED');
      process.exit(1);
    }
  } catch (error) {
    console.error('Test suite error:', error);
    await cleanup();
    process.exit(1);
  }
}

// Run tests
runTests();
