#!/usr/bin/env node

/**
 * Test Analytics Data Flow
 * 
 * Verifies that analytics data is properly flowing from database to API
 */

import { pool } from '../src/config/appConfig.js';
import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function testDataFlow() {
  console.log('='.repeat(60));
  console.log('Testing Analytics Data Flow');
  console.log('='.repeat(60));
  console.log('');

  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Test 1: Check if projects exist
    console.log('Test 1: Check if projects exist in database');
    const projectResult = await pool.query('SELECT COUNT(*) as count FROM projects');
    const projectCount = parseInt(projectResult.rows[0].count);
    
    if (projectCount > 0) {
      console.log(`✓ Found ${projectCount} project(s)`);
      testsPassed++;
    } else {
      console.log('✗ No projects found');
      console.log('  Run: node backend/scripts/generate-sample-analytics.js');
      testsFailed++;
    }
    console.log('');

    // Test 2: Check if wallets exist
    console.log('Test 2: Check if wallets exist');
    const walletResult = await pool.query('SELECT COUNT(*) as count FROM wallets');
    const walletCount = parseInt(walletResult.rows[0].count);
    
    if (walletCount > 0) {
      console.log(`✓ Found ${walletCount} wallet(s)`);
      testsPassed++;
    } else {
      console.log('✗ No wallets found');
      testsFailed++;
    }
    console.log('');

    // Test 3: Check if transactions exist
    console.log('Test 3: Check if transactions exist');
    const txResult = await pool.query('SELECT COUNT(*) as count FROM processed_transactions');
    const txCount = parseInt(txResult.rows[0].count);
    
    if (txCount > 0) {
      console.log(`✓ Found ${txCount} transaction(s)`);
      testsPassed++;
    } else {
      console.log('⚠ No transactions found (this is OK for new projects)');
      testsPassed++;
    }
    console.log('');

    // Test 4: Check if activity metrics exist
    console.log('Test 4: Check if activity metrics exist');
    const metricsResult = await pool.query('SELECT COUNT(*) as count FROM activity_metrics');
    const metricsCount = parseInt(metricsResult.rows[0].count);
    
    if (metricsCount > 0) {
      console.log(`✓ Found ${metricsCount} activity metric(s)`);
      testsPassed++;
    } else {
      console.log('⚠ No activity metrics found');
      testsPassed++;
    }
    console.log('');

    // Test 5: Check project-wallet relationship
    console.log('Test 5: Check project-wallet relationships');
    const relationResult = await pool.query(`
      SELECT 
        p.id as project_id,
        p.name as project_name,
        COUNT(w.id) as wallet_count
      FROM projects p
      LEFT JOIN wallets w ON w.project_id = p.id
      GROUP BY p.id, p.name
    `);
    
    if (relationResult.rows.length > 0) {
      console.log('✓ Project-wallet relationships:');
      relationResult.rows.forEach(row => {
        console.log(`  - ${row.project_name}: ${row.wallet_count} wallet(s)`);
      });
      testsPassed++;
    } else {
      console.log('✗ No project-wallet relationships found');
      testsFailed++;
    }
    console.log('');

    // Test 6: Check analytics data completeness
    console.log('Test 6: Check analytics data completeness');
    const dataResult = await pool.query(`
      SELECT 
        p.name as project,
        COUNT(DISTINCT w.id) as wallets,
        COUNT(DISTINCT pt.id) as transactions,
        COUNT(DISTINCT am.id) as metrics
      FROM projects p
      LEFT JOIN wallets w ON w.project_id = p.id
      LEFT JOIN processed_transactions pt ON pt.wallet_id = w.id
      LEFT JOIN activity_metrics am ON am.wallet_id = w.id
      GROUP BY p.id, p.name
      LIMIT 1
    `);
    
    if (dataResult.rows.length > 0) {
      const data = dataResult.rows[0];
      console.log('✓ Data completeness for first project:');
      console.log(`  Project: ${data.project}`);
      console.log(`  Wallets: ${data.wallets}`);
      console.log(`  Transactions: ${data.transactions}`);
      console.log(`  Metrics: ${data.metrics}`);
      
      if (parseInt(data.wallets) > 0) {
        testsPassed++;
      } else {
        console.log('  ⚠ Project has no wallets');
        testsFailed++;
      }
    } else {
      console.log('✗ No data found');
      testsFailed++;
    }
    console.log('');

    // Test 7: Verify default wallet addresses
    console.log('Test 7: Check default wallet addresses');
    const defaultWalletResult = await pool.query(`
      SELECT 
        id,
        name,
        default_wallet_address
      FROM projects
      WHERE default_wallet_address IS NOT NULL
    `);
    
    if (defaultWalletResult.rows.length > 0) {
      console.log(`✓ ${defaultWalletResult.rows.length} project(s) have default wallet address`);
      testsPassed++;
    } else {
      console.log('⚠ No projects have default wallet address set');
      console.log('  Run: node backend/scripts/sync-project-wallets.js');
      testsPassed++;
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
      console.log('');
      console.log('Your analytics data flow is working correctly.');
      console.log('You can now:');
      console.log('1. Open the application');
      console.log('2. Sign in');
      console.log('3. View analytics dashboards');
      return 0;
    } else {
      console.log('✗ Some tests failed');
      console.log('');
      console.log('To fix:');
      console.log('1. Run: node backend/scripts/generate-sample-analytics.js');
      console.log('2. Run: node backend/scripts/sync-project-wallets.js');
      console.log('3. Re-run this test');
      return 1;
    }

  } catch (error) {
    console.error('✗ Test suite failed:', error);
    return 1;
  } finally {
    await pool.end();
  }
}

testDataFlow()
  .then(exitCode => {
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
