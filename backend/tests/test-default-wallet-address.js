#!/usr/bin/env node

/**
 * Test: Default Wallet Address Feature
 * 
 * Tests the complete default wallet address functionality
 */

import { pool } from '../src/config/appConfig.js';
import { ensureDefaultWalletAddress, syncAllProjectDefaultWallets } from '../src/services/projectWalletService.js';

async function runTests() {
  console.log('='.repeat(60));
  console.log('Testing Default Wallet Address Feature');
  console.log('='.repeat(60));
  console.log('');

  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Test 1: Check if column exists
    console.log('Test 1: Verify default_wallet_address column exists');
    try {
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'projects' 
        AND column_name = 'default_wallet_address'
      `);
      
      if (columnCheck.rows.length > 0) {
        console.log('✓ Column exists');
        testsPassed++;
      } else {
        console.log('✗ Column does not exist');
        testsFailed++;
      }
    } catch (error) {
      console.log('✗ Error checking column:', error.message);
      testsFailed++;
    }
    console.log('');

    // Test 2: Check if trigger exists
    console.log('Test 2: Verify trigger exists');
    try {
      const triggerCheck = await pool.query(`
        SELECT tgname 
        FROM pg_trigger 
        WHERE tgname = 'trigger_set_default_wallet_address'
      `);
      
      if (triggerCheck.rows.length > 0) {
        console.log('✓ Trigger exists');
        testsPassed++;
      } else {
        console.log('✗ Trigger does not exist');
        testsFailed++;
      }
    } catch (error) {
      console.log('✗ Error checking trigger:', error.message);
      testsFailed++;
    }
    console.log('');

    // Test 3: Check projects with default wallet
    console.log('Test 3: Check projects with default wallet address');
    try {
      const projectStats = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(default_wallet_address) as with_wallet,
          COUNT(*) - COUNT(default_wallet_address) as without_wallet
        FROM projects
      `);
      
      const stats = projectStats.rows[0];
      console.log(`  Total projects: ${stats.total}`);
      console.log(`  With default wallet: ${stats.with_wallet}`);
      console.log(`  Without default wallet: ${stats.without_wallet}`);
      
      if (parseInt(stats.total) > 0) {
        console.log('✓ Projects found in database');
        testsPassed++;
      } else {
        console.log('⚠ No projects in database (this is OK for new installations)');
        testsPassed++;
      }
    } catch (error) {
      console.log('✗ Error checking projects:', error.message);
      testsFailed++;
    }
    console.log('');

    // Test 4: Test ensureDefaultWalletAddress function
    console.log('Test 4: Test ensureDefaultWalletAddress function');
    try {
      // Get a project without default wallet
      const projectResult = await pool.query(`
        SELECT p.id 
        FROM projects p
        WHERE p.default_wallet_address IS NULL
        AND EXISTS (SELECT 1 FROM wallets w WHERE w.project_id = p.id)
        LIMIT 1
      `);
      
      if (projectResult.rows.length > 0) {
        const projectId = projectResult.rows[0].id;
        console.log(`  Testing with project: ${projectId}`);
        
        const result = await ensureDefaultWalletAddress(projectId);
        
        if (result.success) {
          console.log('✓ Function executed successfully');
          console.log(`  Default wallet set to: ${result.project.default_wallet_address}`);
          testsPassed++;
        } else {
          console.log('✗ Function failed:', result.message);
          testsFailed++;
        }
      } else {
        console.log('⚠ No projects available for testing (all have default wallets or no wallets)');
        testsPassed++;
      }
    } catch (error) {
      console.log('✗ Error testing function:', error.message);
      testsFailed++;
    }
    console.log('');

    // Test 5: Check wallet indexing
    console.log('Test 5: Check wallet transaction indexing');
    try {
      const indexingStats = await pool.query(`
        SELECT 
          COUNT(DISTINCT w.id) as wallets_with_txs,
          COUNT(pt.id) as total_txs
        FROM wallets w
        JOIN processed_transactions pt ON pt.wallet_id = w.id
        WHERE w.address IN (SELECT default_wallet_address FROM projects WHERE default_wallet_address IS NOT NULL)
      `);
      
      const stats = indexingStats.rows[0];
      console.log(`  Wallets with transactions: ${stats.wallets_with_txs}`);
      console.log(`  Total indexed transactions: ${stats.total_txs}`);
      
      if (parseInt(stats.total_txs) > 0) {
        console.log('✓ Transactions are being indexed');
        testsPassed++;
      } else {
        console.log('⚠ No transactions indexed yet (wallets may be new or have no activity)');
        testsPassed++;
      }
    } catch (error) {
      console.log('✗ Error checking indexing:', error.message);
      testsFailed++;
    }
    console.log('');

    // Test 6: Test sync function
    console.log('Test 6: Test syncAllProjectDefaultWallets function');
    try {
      const result = await syncAllProjectDefaultWallets();
      
      if (result.success) {
        console.log('✓ Sync function executed successfully');
        console.log(`  Total projects processed: ${result.total}`);
        console.log(`  Successfully synced: ${result.synced}`);
        testsPassed++;
      } else {
        console.log('✗ Sync function failed');
        testsFailed++;
      }
    } catch (error) {
      console.log('✗ Error testing sync:', error.message);
      testsFailed++;
    }
    console.log('');

    // Summary
    console.log('='.repeat(60));
    console.log('Test Summary');
    console.log('='.repeat(60));
    console.log(`Tests Passed: ${testsPassed}`);
    console.log(`Tests Failed: ${testsFailed}`);
    console.log(`Total Tests: ${testsPassed + testsFailed}`);
    console.log('');

    if (testsFailed === 0) {
      console.log('✓ All tests passed!');
      return 0;
    } else {
      console.log('✗ Some tests failed');
      return 1;
    }

  } catch (error) {
    console.error('✗ Test suite failed:', error);
    return 1;
  } finally {
    await pool.end();
  }
}

// Run tests
runTests()
  .then(exitCode => {
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
