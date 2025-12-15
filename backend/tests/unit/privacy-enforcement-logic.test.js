/**
 * Privacy Enforcement Service - Logic Unit Tests
 * 
 * Tests the business logic of privacy enforcement without database dependencies.
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import PrivacyEnforcementService from '../../src/services/privacyEnforcementService.js';

console.log('='.repeat(60));
console.log('Privacy Enforcement Service - Logic Unit Tests');
console.log('='.repeat(60));

const privacyService = new PrivacyEnforcementService();

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    testsPassed++;
  } else {
    console.error(`  ✗ ${message}`);
    testsFailed++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Test 1: Anonymize wallet data
console.log('\n--- Test 1: Data Anonymization (Requirement 8.2) ---');
try {
  const rawData = {
    id: 'wallet-uuid-123',
    wallet_id: 'wallet-uuid-123',
    address: 't1TestAddress123456789',
    project_id: 'project-uuid-456',
    user_id: 'user-uuid-789',
    type: 't',
    active_days: 15,
    transaction_count: 100,
    total_volume: 5000000,
    avg_productivity_score: 85.5,
    retention_score: 90,
    adoption_score: 80
  };

  const anonymized = privacyService.anonymizeWalletData(rawData);

  // Check identifying info is removed
  assert(!anonymized.id, 'Wallet ID should be removed');
  assert(!anonymized.wallet_id, 'Wallet ID field should be removed');
  assert(!anonymized.address, 'Address should be removed');
  assert(!anonymized.project_id, 'Project ID should be removed');
  assert(!anonymized.user_id, 'User ID should be removed');

  // Check metrics are preserved
  assert(anonymized.wallet_type === 't', 'Wallet type should be preserved');
  assert(anonymized.metrics.active_days === 15, 'Active days should be preserved');
  assert(anonymized.metrics.transaction_count === 100, 'Transaction count should be preserved');
  assert(anonymized.metrics.total_volume === 5000000, 'Total volume should be preserved');
  assert(anonymized.metrics.avg_productivity_score === 85.5, 'Productivity score should be preserved');

  // Check anonymization flag
  assert(anonymized.anonymized === true, 'Anonymized flag should be set');
  assert(anonymized.note, 'Privacy note should be included');

  console.log('✓ Test 1 PASSED: Data anonymization works correctly');
} catch (error) {
  console.error('✗ Test 1 FAILED:', error.message);
}

// Test 2: Anonymize batch of wallet data
console.log('\n--- Test 2: Batch Data Anonymization ---');
try {
  const walletArray = [
    {
      id: 'wallet-1',
      address: 't1Address1',
      type: 't',
      active_days: 10,
      transaction_count: 50
    },
    {
      id: 'wallet-2',
      address: 'zs1Address2',
      type: 'z',
      active_days: 20,
      transaction_count: 100
    },
    {
      id: 'wallet-3',
      address: 'u1Address3',
      type: 'u',
      active_days: 30,
      transaction_count: 150
    }
  ];

  const anonymizedBatch = privacyService.anonymizeWalletDataBatch(walletArray);

  assert(anonymizedBatch.length === 3, 'Should return same number of records');
  
  anonymizedBatch.forEach((item, index) => {
    assert(!item.id, `Record ${index + 1} should have ID removed`);
    assert(!item.address, `Record ${index + 1} should have address removed`);
    assert(item.anonymized === true, `Record ${index + 1} should be marked as anonymized`);
  });

  console.log('✓ Test 2 PASSED: Batch anonymization works correctly');
} catch (error) {
  console.error('✗ Test 2 FAILED:', error.message);
}

// Test 3: Validate privacy transition
console.log('\n--- Test 3: Privacy Transition Validation ---');
try {
  // Valid transitions
  const privateToPublic = privacyService.validatePrivacyTransition('private', 'public');
  assert(privateToPublic.valid === true, 'Private to public should be valid');
  assert(!privateToPublic.requiresSetup, 'Private to public should not require setup');

  const publicToPrivate = privacyService.validatePrivacyTransition('public', 'private');
  assert(publicToPrivate.valid === true, 'Public to private should be valid');

  // Transition to monetizable (requires setup)
  const toMonetizable = privacyService.validatePrivacyTransition('private', 'monetizable');
  assert(toMonetizable.valid === true, 'Transition to monetizable should be valid');
  assert(toMonetizable.requiresSetup === true, 'Monetizable should require setup');
  assert(toMonetizable.message, 'Should include setup message');

  // Invalid mode
  const invalidMode = privacyService.validatePrivacyTransition('private', 'invalid');
  assert(invalidMode.valid === false, 'Invalid mode should be rejected');
  assert(invalidMode.reason, 'Should include rejection reason');

  console.log('✓ Test 3 PASSED: Privacy transition validation works correctly');
} catch (error) {
  console.error('✗ Test 3 FAILED:', error.message);
}

// Test 4: Anonymize with missing fields
console.log('\n--- Test 4: Anonymization with Missing Fields ---');
try {
  const sparseData = {
    id: 'wallet-123',
    type: 'z',
    active_days: 5
  };

  const anonymized = privacyService.anonymizeWalletData(sparseData);

  assert(!anonymized.id, 'ID should be removed');
  assert(anonymized.wallet_type === 'z', 'Type should be preserved');
  assert(anonymized.metrics.active_days === 5, 'Active days should be preserved');
  assert(anonymized.metrics.transaction_count === 0, 'Missing fields should default to 0');
  assert(anonymized.anonymized === true, 'Should be marked as anonymized');

  console.log('✓ Test 4 PASSED: Handles missing fields correctly');
} catch (error) {
  console.error('✗ Test 4 FAILED:', error.message);
}

// Test 5: Anonymize with alternative field names
console.log('\n--- Test 5: Anonymization with Alternative Field Names ---');
try {
  const altData = {
    wallet_id: 'wallet-456',
    wallet_type: 'u',
    active_days: 25,
    transaction_count: 200,
    total_volume: 10000000
  };

  const anonymized = privacyService.anonymizeWalletData(altData);

  assert(!anonymized.wallet_id, 'Wallet ID should be removed');
  assert(anonymized.wallet_type === 'u', 'Wallet type should be preserved');
  assert(anonymized.metrics.active_days === 25, 'Metrics should be preserved');
  assert(anonymized.anonymized === true, 'Should be marked as anonymized');

  console.log('✓ Test 5 PASSED: Handles alternative field names correctly');
} catch (error) {
  console.error('✗ Test 5 FAILED:', error.message);
}

// Test 6: Privacy mode validation
console.log('\n--- Test 6: Privacy Mode Validation ---');
try {
  const validModes = ['private', 'public', 'monetizable'];
  
  validModes.forEach(mode => {
    const validation = privacyService.validatePrivacyTransition('private', mode);
    assert(validation.valid === true, `Mode '${mode}' should be valid`);
  });

  const invalidModes = ['invalid', 'secret', 'hidden', ''];
  
  invalidModes.forEach(mode => {
    const validation = privacyService.validatePrivacyTransition('private', mode);
    assert(validation.valid === false, `Mode '${mode}' should be invalid`);
  });

  console.log('✓ Test 6 PASSED: Privacy mode validation works correctly');
} catch (error) {
  console.error('✗ Test 6 FAILED:', error.message);
}

// Test 7: Anonymization preserves numeric types
console.log('\n--- Test 7: Numeric Type Preservation ---');
try {
  const numericData = {
    id: 'wallet-789',
    type: 't',
    active_days: 42,
    transaction_count: 1337,
    total_volume: 9999999,
    avg_productivity_score: 99.99,
    retention_score: 88.88,
    adoption_score: 77.77
  };

  const anonymized = privacyService.anonymizeWalletData(numericData);

  assert(typeof anonymized.metrics.active_days === 'number', 'Active days should be number');
  assert(typeof anonymized.metrics.transaction_count === 'number', 'Transaction count should be number');
  assert(typeof anonymized.metrics.total_volume === 'number', 'Total volume should be number');
  assert(typeof anonymized.metrics.avg_productivity_score === 'number', 'Productivity score should be number');

  assert(anonymized.metrics.active_days === 42, 'Active days value should be exact');
  assert(anonymized.metrics.avg_productivity_score === 99.99, 'Float values should be preserved');

  console.log('✓ Test 7 PASSED: Numeric types preserved correctly');
} catch (error) {
  console.error('✗ Test 7 FAILED:', error.message);
}

// Test 8: Empty data handling
console.log('\n--- Test 8: Empty Data Handling ---');
try {
  const emptyData = {};
  const anonymized = privacyService.anonymizeWalletData(emptyData);

  assert(anonymized.anonymized === true, 'Empty data should still be marked as anonymized');
  assert(anonymized.metrics, 'Should have metrics object');
  assert(anonymized.metrics.active_days === 0, 'Missing metrics should default to 0');

  console.log('✓ Test 8 PASSED: Empty data handled correctly');
} catch (error) {
  console.error('✗ Test 8 FAILED:', error.message);
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('Test Summary');
console.log('='.repeat(60));
console.log(`Total Tests: ${testsPassed + testsFailed}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log('='.repeat(60));

if (testsFailed === 0) {
  console.log('✓ All logic tests PASSED');
  process.exit(0);
} else {
  console.log('✗ Some tests FAILED');
  process.exit(1);
}
