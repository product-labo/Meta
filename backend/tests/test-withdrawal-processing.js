/**
 * Withdrawal Processing Tests
 * Tests withdrawal request validation, fee calculation, and processing
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */

import pool from '../src/db/db.js';
import {
  calculateWithdrawalFee,
  validateWithdrawalRequest,
  createWithdrawal,
  processWithdrawal,
  completeWithdrawal,
  failWithdrawal,
  getWithdrawal,
  getUserWithdrawals,
  getWithdrawalStats
} from '../src/services/withdrawalService.js';

// Test user ID (will be created in setup)
let testUserId;
let testWithdrawalId;

/**
 * Setup test data
 */
async function setup() {
  console.log('Setting up test data...');

  // Create test user with balance
  const userResult = await pool.query(
    `INSERT INTO users (name, email, password_hash, balance_zec, subscription_status)
     VALUES ('Test User', 'withdrawal-test@example.com', 'hashed_password', 1.5, 'premium')
     RETURNING id`
  );

  testUserId = userResult.rows[0].id;
  console.log(`Created test user: ${testUserId}`);
}

/**
 * Cleanup test data
 */
async function cleanup() {
  console.log('Cleaning up test data...');

  if (testUserId) {
    await pool.query('DELETE FROM withdrawals WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    console.log('Test data cleaned up');
  }
}

/**
 * Test 1: Fee Calculation
 * Requirement 12.3: Calculate platform fees and net withdrawal amount
 */
async function testFeeCalculation() {
  console.log('\n--- Test 1: Fee Calculation ---');

  const testCases = [
    { amount: 1.0, expectedFee: 0.02, expectedNet: 0.98 },
    { amount: 0.5, expectedFee: 0.01, expectedNet: 0.49 },
    { amount: 10.0, expectedFee: 0.2, expectedNet: 9.8 }
  ];

  for (const testCase of testCases) {
    const { fee_zec, net_zec } = calculateWithdrawalFee(testCase.amount);
    
    console.log(`Amount: ${testCase.amount} ZEC`);
    console.log(`  Fee: ${fee_zec} ZEC (expected: ${testCase.expectedFee})`);
    console.log(`  Net: ${net_zec} ZEC (expected: ${testCase.expectedNet})`);
    
    if (Math.abs(fee_zec - testCase.expectedFee) < 0.0001 && 
        Math.abs(net_zec - testCase.expectedNet) < 0.0001) {
      console.log('  ✓ Fee calculation correct');
    } else {
      console.log('  ✗ Fee calculation incorrect');
    }
  }
}

/**
 * Test 2: Balance Validation
 * Requirement 12.1: Validate user has sufficient balance
 */
async function testBalanceValidation() {
  console.log('\n--- Test 2: Balance Validation ---');

  // Test with sufficient balance
  const validResult = await validateWithdrawalRequest(
    testUserId,
    1.0,
    't1abc123def456ghi789jkl012mno345pqr',
    'testnet'
  );

  console.log('Test with sufficient balance (1.0 ZEC, balance: 1.5 ZEC):');
  console.log(`  Valid: ${validResult.valid}`);
  console.log(`  Balance: ${validResult.balance} ZEC`);
  if (validResult.valid) {
    console.log('  ✓ Validation passed');
  } else {
    console.log(`  ✗ Validation failed: ${validResult.errors.join(', ')}`);
  }

  // Test with insufficient balance
  const invalidResult = await validateWithdrawalRequest(
    testUserId,
    2.0,
    't1abc123def456ghi789jkl012mno345pqr',
    'testnet'
  );

  console.log('\nTest with insufficient balance (2.0 ZEC, balance: 1.5 ZEC):');
  console.log(`  Valid: ${invalidResult.valid}`);
  if (!invalidResult.valid && invalidResult.errors.some(e => e.includes('Insufficient balance'))) {
    console.log('  ✓ Correctly rejected insufficient balance');
  } else {
    console.log('  ✗ Should have rejected insufficient balance');
  }
}

/**
 * Test 3: Address Validation
 * Requirement 12.2: Validate Zcash address format
 */
async function testAddressValidation() {
  console.log('\n--- Test 3: Address Validation ---');

  const testCases = [
    { address: 't1abc123def456ghi789jkl012mno345pqr', network: 'testnet', shouldPass: true, type: 'transparent' },
    { address: 'ztestsapling1abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567abc890def123ghi456jkl789mno012pqr345stu678vwx901yz234', network: 'testnet', shouldPass: true, type: 'shielded' },
    { address: 'invalid_address', network: 'testnet', shouldPass: false, type: 'invalid' },
    { address: '', network: 'testnet', shouldPass: false, type: 'empty' }
  ];

  for (const testCase of testCases) {
    const result = await validateWithdrawalRequest(
      testUserId,
      0.5,
      testCase.address,
      testCase.network
    );

    console.log(`\nTest ${testCase.type} address:`);
    console.log(`  Address: ${testCase.address.substring(0, 30)}...`);
    console.log(`  Valid: ${result.valid}`);
    
    if (result.valid === testCase.shouldPass) {
      console.log('  ✓ Validation result correct');
    } else {
      console.log(`  ✗ Expected ${testCase.shouldPass ? 'valid' : 'invalid'}, got ${result.valid ? 'valid' : 'invalid'}`);
      if (!result.valid) {
        console.log(`  Errors: ${result.errors.join(', ')}`);
      }
    }
  }
}

/**
 * Test 4: Create Withdrawal
 * Requirement 12.1, 12.2, 12.3: Create withdrawal with validation
 */
async function testCreateWithdrawal() {
  console.log('\n--- Test 4: Create Withdrawal ---');

  try {
    const withdrawal = await createWithdrawal(
      testUserId,
      0.5,
      't1abc123def456ghi789jkl012mno345pqr',
      'testnet'
    );

    testWithdrawalId = withdrawal.withdrawal_id;

    console.log('Withdrawal created successfully:');
    console.log(`  ID: ${withdrawal.withdrawal_id}`);
    console.log(`  Amount: ${withdrawal.amount_zec} ZEC`);
    console.log(`  Fee: ${withdrawal.fee_zec} ZEC`);
    console.log(`  Net: ${withdrawal.net_zec} ZEC`);
    console.log(`  Status: ${withdrawal.status}`);
    console.log(`  Previous Balance: ${withdrawal.previous_balance} ZEC`);
    console.log(`  New Balance: ${withdrawal.new_balance} ZEC`);

    // Verify balance was deducted
    const userResult = await pool.query(
      'SELECT balance_zec FROM users WHERE id = $1',
      [testUserId]
    );
    const currentBalance = parseFloat(userResult.rows[0].balance_zec);

    console.log(`\nVerifying balance deduction:`);
    console.log(`  Expected: ${withdrawal.new_balance} ZEC`);
    console.log(`  Actual: ${currentBalance} ZEC`);

    if (Math.abs(currentBalance - withdrawal.new_balance) < 0.0001) {
      console.log('  ✓ Balance correctly deducted');
    } else {
      console.log('  ✗ Balance deduction incorrect');
    }
  } catch (error) {
    console.log(`✗ Failed to create withdrawal: ${error.message}`);
  }
}

/**
 * Test 5: Get Withdrawal Details
 * Requirement 12.4: Record withdrawal transaction
 */
async function testGetWithdrawal() {
  console.log('\n--- Test 5: Get Withdrawal Details ---');

  if (!testWithdrawalId) {
    console.log('✗ No withdrawal ID available (previous test may have failed)');
    return;
  }

  try {
    const withdrawal = await getWithdrawal(testWithdrawalId);

    console.log('Withdrawal details retrieved:');
    console.log(`  ID: ${withdrawal.withdrawal_id}`);
    console.log(`  User ID: ${withdrawal.user_id}`);
    console.log(`  Amount: ${withdrawal.amount_zec} ZEC`);
    console.log(`  Fee: ${withdrawal.fee_zec} ZEC`);
    console.log(`  Net: ${withdrawal.net_zec} ZEC`);
    console.log(`  To Address: ${withdrawal.to_address}`);
    console.log(`  Status: ${withdrawal.status}`);
    console.log(`  Requested At: ${withdrawal.requested_at}`);

    if (withdrawal.user_id === testUserId && withdrawal.status === 'pending') {
      console.log('  ✓ Withdrawal details correct');
    } else {
      console.log('  ✗ Withdrawal details incorrect');
    }
  } catch (error) {
    console.log(`✗ Failed to get withdrawal: ${error.message}`);
  }
}

/**
 * Test 6: Process Withdrawal
 * Requirement 12.4: Process withdrawal and send ZEC
 */
async function testProcessWithdrawal() {
  console.log('\n--- Test 6: Process Withdrawal ---');

  if (!testWithdrawalId) {
    console.log('✗ No withdrawal ID available (previous test may have failed)');
    return;
  }

  try {
    const result = await processWithdrawal(testWithdrawalId);

    console.log('Withdrawal processing initiated:');
    console.log(`  ID: ${result.withdrawal_id}`);
    console.log(`  Status: ${result.status}`);
    console.log(`  Message: ${result.message}`);

    if (result.status === 'processing') {
      console.log('  ✓ Withdrawal status updated to processing');
    } else {
      console.log(`  ✗ Expected status 'processing', got '${result.status}'`);
    }
  } catch (error) {
    console.log(`✗ Failed to process withdrawal: ${error.message}`);
  }
}

/**
 * Test 7: Complete Withdrawal
 * Requirement 12.5: Update balance and withdrawal status on completion
 */
async function testCompleteWithdrawal() {
  console.log('\n--- Test 7: Complete Withdrawal ---');

  if (!testWithdrawalId) {
    console.log('✗ No withdrawal ID available (previous test may have failed)');
    return;
  }

  try {
    const mockTxid = 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567';
    const result = await completeWithdrawal(testWithdrawalId, mockTxid);

    console.log('Withdrawal completed:');
    console.log(`  ID: ${result.withdrawal_id}`);
    console.log(`  Status: ${result.status}`);
    console.log(`  TXID: ${result.txid}`);
    console.log(`  Processed At: ${result.processed_at}`);
    console.log(`  Message: ${result.message}`);

    // Verify withdrawal record
    const withdrawal = await getWithdrawal(testWithdrawalId);

    if (withdrawal.status === 'sent' && withdrawal.txid === mockTxid) {
      console.log('  ✓ Withdrawal completed successfully');
    } else {
      console.log('  ✗ Withdrawal completion failed');
    }
  } catch (error) {
    console.log(`✗ Failed to complete withdrawal: ${error.message}`);
  }
}

/**
 * Test 8: Get User Withdrawals
 * Requirement 12.4: List withdrawal history
 */
async function testGetUserWithdrawals() {
  console.log('\n--- Test 8: Get User Withdrawals ---');

  try {
    const withdrawals = await getUserWithdrawals(testUserId);

    console.log(`Found ${withdrawals.length} withdrawal(s) for user`);

    if (withdrawals.length > 0) {
      const withdrawal = withdrawals[0];
      console.log('\nMost recent withdrawal:');
      console.log(`  ID: ${withdrawal.withdrawal_id}`);
      console.log(`  Amount: ${withdrawal.amount_zec} ZEC`);
      console.log(`  Status: ${withdrawal.status}`);
      console.log(`  Requested At: ${withdrawal.requested_at}`);

      console.log('  ✓ Withdrawal history retrieved');
    } else {
      console.log('  ✗ No withdrawals found');
    }
  } catch (error) {
    console.log(`✗ Failed to get user withdrawals: ${error.message}`);
  }
}

/**
 * Test 9: Get Withdrawal Statistics
 * Requirement 12.4: Track withdrawal statistics
 */
async function testGetWithdrawalStats() {
  console.log('\n--- Test 9: Get Withdrawal Statistics ---');

  try {
    const stats = await getWithdrawalStats(testUserId);

    console.log('Withdrawal statistics:');
    console.log(`  Total Withdrawals: ${stats.total_withdrawals}`);
    console.log(`  Pending: ${stats.pending_count}`);
    console.log(`  Processing: ${stats.processing_count}`);
    console.log(`  Completed: ${stats.completed_count}`);
    console.log(`  Failed: ${stats.failed_count}`);
    console.log(`  Total Withdrawn: ${stats.total_withdrawn_zec} ZEC`);
    console.log(`  Total Fees: ${stats.total_fees_zec} ZEC`);
    console.log(`  Total Net: ${stats.total_net_zec} ZEC`);

    if (stats.total_withdrawals > 0) {
      console.log('  ✓ Statistics retrieved successfully');
    } else {
      console.log('  ✗ No statistics found');
    }
  } catch (error) {
    console.log(`✗ Failed to get withdrawal stats: ${error.message}`);
  }
}

/**
 * Test 10: Fail Withdrawal and Refund
 * Requirement 12.5: Handle failed withdrawals and refund balance
 */
async function testFailWithdrawal() {
  console.log('\n--- Test 10: Fail Withdrawal and Refund ---');

  try {
    // Create a new withdrawal to fail
    const withdrawal = await createWithdrawal(
      testUserId,
      0.2,
      't1xyz789abc012def345ghi678jkl901mno',
      'testnet'
    );

    console.log(`Created withdrawal to fail: ${withdrawal.withdrawal_id}`);

    // Get balance before failure
    const balanceBefore = await pool.query(
      'SELECT balance_zec FROM users WHERE id = $1',
      [testUserId]
    );
    const beforeBalance = parseFloat(balanceBefore.rows[0].balance_zec);

    // Fail the withdrawal
    const result = await failWithdrawal(withdrawal.withdrawal_id, 'Test failure');

    console.log('\nWithdrawal failed:');
    console.log(`  ID: ${result.withdrawal_id}`);
    console.log(`  Status: ${result.status}`);
    console.log(`  Reason: ${result.reason}`);
    console.log(`  Refunded: ${result.refunded}`);

    // Get balance after failure
    const balanceAfter = await pool.query(
      'SELECT balance_zec FROM users WHERE id = $1',
      [testUserId]
    );
    const afterBalance = parseFloat(balanceAfter.rows[0].balance_zec);

    console.log(`\nBalance verification:`);
    console.log(`  Before: ${beforeBalance} ZEC`);
    console.log(`  After: ${afterBalance} ZEC`);
    console.log(`  Refunded Amount: ${withdrawal.amount_zec} ZEC`);

    if (Math.abs(afterBalance - (beforeBalance + withdrawal.amount_zec)) < 0.0001) {
      console.log('  ✓ Balance correctly refunded');
    } else {
      console.log('  ✗ Balance refund incorrect');
    }
  } catch (error) {
    console.log(`✗ Failed to test withdrawal failure: ${error.message}`);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('='.repeat(60));
  console.log('WITHDRAWAL PROCESSING TESTS');
  console.log('='.repeat(60));

  try {
    await setup();

    await testFeeCalculation();
    await testBalanceValidation();
    await testAddressValidation();
    await testCreateWithdrawal();
    await testGetWithdrawal();
    await testProcessWithdrawal();
    await testCompleteWithdrawal();
    await testGetUserWithdrawals();
    await testGetWithdrawalStats();
    await testFailWithdrawal();

    console.log('\n' + '='.repeat(60));
    console.log('ALL TESTS COMPLETED');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n✗ Test suite failed:', error);
  } finally {
    await cleanup();
    await pool.end();
  }
}

// Run tests
runTests();
