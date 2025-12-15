#!/usr/bin/env node

/**
 * Complete System Sync
 * 
 * Syncs the entire system:
 * 1. Runs default wallet address migration
 * 2. Syncs all project default wallets
 * 3. Indexes wallets from Zcash blockchain
 * 4. Verifies data integrity
 */

import { pool } from '../src/config/appConfig.js';
import { syncAllProjectDefaultWallets } from '../src/services/projectWalletService.js';
import { syncAllWallets } from '../src/services/walletTrackingService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runCompleteSync() {
  console.log('='.repeat(70));
  console.log('COMPLETE SYSTEM SYNC');
  console.log('='.repeat(70));
  console.log('');

  const client = await pool.connect();
  
  try {
    // Step 1: Check if default_wallet_address column exists
    console.log('Step 1: Checking database schema...');
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'projects' 
      AND column_name = 'default_wallet_address'
    `);

    if (columnCheck.rows.length === 0) {
      console.log('  ⚠ default_wallet_address column not found');
      console.log('  Running migration...');
      
      // Read and execute migration
      const migrationPath = path.join(__dirname, '../migrations/014_add_default_wallet_address.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      await client.query('BEGIN');
      await client.query(migrationSQL);
      await client.query('COMMIT');
      
      console.log('  ✓ Migration completed');
    } else {
      console.log('  ✓ Schema is up to date');
    }
    console.log('');

    // Step 2: Get statistics before sync
    console.log('Step 2: Gathering current statistics...');
    const beforeStats = await client.query(`
      SELECT 
        COUNT(*) as total_projects,
        COUNT(default_wallet_address) as projects_with_wallet,
        COUNT(*) - COUNT(default_wallet_address) as projects_without_wallet
      FROM projects
    `);
    
    const before = beforeStats.rows[0];
    console.log(`  Total projects: ${before.total_projects}`);
    console.log(`  With default wallet: ${before.projects_with_wallet}`);
    console.log(`  Without default wallet: ${before.projects_without_wallet}`);
    console.log('');

    // Step 3: Sync project default wallets
    console.log('Step 3: Syncing project default wallet addresses...');
    const syncResult = await syncAllProjectDefaultWallets();
    
    if (syncResult.success) {
      console.log(`  ✓ Synced ${syncResult.synced}/${syncResult.total} projects`);
      
      if (syncResult.results && syncResult.results.length > 0) {
        console.log('  Details:');
        syncResult.results.forEach(r => {
          const status = r.success ? '✓' : '✗';
          console.log(`    ${status} ${r.project_name || r.project_id}`);
          if (r.message) console.log(`      ${r.message}`);
          if (r.error) console.log(`      Error: ${r.error}`);
        });
      }
    } else {
      console.log('  ✗ Sync failed');
    }
    console.log('');

    // Step 4: Index wallets from blockchain
    console.log('Step 4: Indexing wallets from Zcash blockchain...');
    console.log('  This may take a while depending on transaction history...');
    
    try {
      const indexResult = await syncAllWallets();
      
      if (indexResult.success) {
        console.log(`  ✓ Indexed ${indexResult.total_transactions} transactions`);
        console.log(`  ✓ Processed ${indexResult.wallets_synced} wallets`);
      } else {
        console.log('  ⚠ Indexing completed with some errors');
      }
    } catch (indexError) {
      console.log('  ⚠ Indexing failed:', indexError.message);
      console.log('  This is OK if indexer is not running or wallets have no transactions');
    }
    console.log('');

    // Step 5: Get statistics after sync
    console.log('Step 5: Verifying sync results...');
    const afterStats = await client.query(`
      SELECT 
        COUNT(*) as total_projects,
        COUNT(default_wallet_address) as projects_with_wallet,
        COUNT(*) - COUNT(default_wallet_address) as projects_without_wallet
      FROM projects
    `);
    
    const after = afterStats.rows[0];
    console.log(`  Total projects: ${after.total_projects}`);
    console.log(`  With default wallet: ${after.projects_with_wallet}`);
    console.log(`  Without default wallet: ${after.projects_without_wallet}`);
    
    const improvement = parseInt(after.projects_with_wallet) - parseInt(before.projects_with_wallet);
    if (improvement > 0) {
      console.log(`  ✓ Improved: +${improvement} projects now have default wallet`);
    }
    console.log('');

    // Step 6: Check wallet-transaction relationships
    console.log('Step 6: Checking wallet-transaction relationships...');
    const txStats = await client.query(`
      SELECT 
        COUNT(DISTINCT w.id) as wallets_with_txs,
        COUNT(pt.id) as total_txs,
        COUNT(DISTINCT pt.wallet_id) as indexed_wallets
      FROM wallets w
      LEFT JOIN processed_transactions pt ON pt.wallet_id = w.id
      WHERE w.address IN (
        SELECT default_wallet_address 
        FROM projects 
        WHERE default_wallet_address IS NOT NULL
      )
    `);
    
    const txData = txStats.rows[0];
    console.log(`  Wallets with transactions: ${txData.wallets_with_txs}`);
    console.log(`  Total indexed transactions: ${txData.total_txs}`);
    console.log(`  Indexed wallets: ${txData.indexed_wallets}`);
    console.log('');

    // Step 7: Final verification
    console.log('Step 7: Final verification...');
    const verifyResult = await client.query(`
      SELECT 
        p.id,
        p.name,
        p.default_wallet_address,
        w.id as wallet_id,
        COUNT(pt.id) as tx_count
      FROM projects p
      LEFT JOIN wallets w ON w.address = p.default_wallet_address
      LEFT JOIN processed_transactions pt ON pt.wallet_id = w.id
      GROUP BY p.id, p.name, p.default_wallet_address, w.id
      ORDER BY p.created_at DESC
      LIMIT 10
    `);
    
    if (verifyResult.rows.length > 0) {
      console.log('  Recent projects:');
      verifyResult.rows.forEach(row => {
        const walletStatus = row.default_wallet_address ? '✓' : '✗';
        const txStatus = parseInt(row.tx_count) > 0 ? `${row.tx_count} txs` : 'no txs';
        console.log(`    ${walletStatus} ${row.name}: ${row.default_wallet_address || 'no wallet'} (${txStatus})`);
      });
    }
    console.log('');

    // Summary
    console.log('='.repeat(70));
    console.log('SYNC COMPLETE');
    console.log('='.repeat(70));
    console.log('');
    console.log('Summary:');
    console.log(`  ✓ Projects synced: ${syncResult.synced || 0}`);
    console.log(`  ✓ Projects with default wallet: ${after.projects_with_wallet}`);
    console.log(`  ✓ Total transactions indexed: ${txData.total_txs}`);
    console.log('');
    
    if (parseInt(after.projects_without_wallet) > 0) {
      console.log('⚠ Note:');
      console.log(`  ${after.projects_without_wallet} project(s) still without default wallet`);
      console.log('  This is normal for projects without any wallets yet');
      console.log('');
    }
    
    console.log('Next steps:');
    console.log('  1. Open the application');
    console.log('  2. Navigate to Projects page');
    console.log('  3. Verify projects have wallet addresses');
    console.log('  4. Check analytics dashboards for data');
    console.log('');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('✗ Sync failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the complete sync
runCompleteSync()
  .then(() => {
    console.log('✓ System sync completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('✗ System sync failed:', error);
    process.exit(1);
  });
