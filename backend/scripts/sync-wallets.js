#!/usr/bin/env node

/**
 * Manual wallet sync script
 * 
 * Usage:
 *   node scripts/sync-wallets.js              # Sync all wallets
 *   node scripts/sync-wallets.js <wallet-id>  # Sync specific wallet
 */

import 'dotenv/config';
import { 
  syncAllWallets, 
  processWalletTransactions,
  getWalletSyncStatus 
} from '../src/services/walletTrackingService.js';
import pool from '../src/db/db.js';

async function syncSpecificWallet(walletId) {
  console.log(`\nSyncing wallet: ${walletId}`);
  
  try {
    // Get wallet details
    const walletResult = await pool.query(
      'SELECT * FROM wallets WHERE id = $1',
      [walletId]
    );
    
    if (walletResult.rows.length === 0) {
      console.error(`Error: Wallet ${walletId} not found`);
      return false;
    }
    
    const wallet = walletResult.rows[0];
    console.log(`Wallet address: ${wallet.address}`);
    console.log(`Wallet type: ${wallet.type}`);
    console.log(`Active: ${wallet.is_active}`);
    
    if (!wallet.is_active) {
      console.warn('Warning: Wallet is not active');
    }
    
    // Process transactions
    console.log('\nProcessing transactions...');
    const result = await processWalletTransactions(wallet);
    
    console.log('\n✓ Sync completed:');
    console.log(`  - Transactions processed: ${result.processed}`);
    console.log(`  - Days updated: ${result.days_updated || 0}`);
    
    // Get updated status
    const status = await getWalletSyncStatus(walletId);
    console.log('\nWallet status:');
    console.log(`  - Total transactions: ${status.total_transactions}`);
    console.log(`  - Last synced block: ${status.last_synced_block || 'N/A'}`);
    console.log(`  - Active days: ${status.active_days}`);
    
    return true;
  } catch (error) {
    console.error('Error syncing wallet:', error.message);
    return false;
  }
}

async function syncAll() {
  console.log('\nSyncing all tracked wallets...\n');
  
  try {
    const result = await syncAllWallets();
    
    console.log('\n✓ Sync completed:');
    console.log(`  - Wallets synced: ${result.wallets_synced}`);
    console.log(`  - Total transactions: ${result.total_transactions}`);
    
    if (result.results.length > 0) {
      console.log('\nDetailed results:');
      result.results.forEach((r, i) => {
        console.log(`\n  ${i + 1}. Wallet ${r.wallet_id} (${r.address})`);
        console.log(`     - Processed: ${r.processed} transactions`);
        console.log(`     - Days updated: ${r.days_updated || 0}`);
        if (r.error) {
          console.log(`     - Error: ${r.error}`);
        }
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error syncing wallets:', error.message);
    return false;
  }
}

async function main() {
  console.log('========================================');
  console.log('WALLET SYNC SCRIPT');
  console.log('========================================');
  
  const walletId = process.argv[2];
  
  let success;
  
  if (walletId) {
    success = await syncSpecificWallet(walletId);
  } else {
    success = await syncAll();
  }
  
  // Close database connection
  await pool.end();
  
  console.log('\n========================================');
  console.log(success ? 'SYNC COMPLETED SUCCESSFULLY' : 'SYNC FAILED');
  console.log('========================================\n');
  
  process.exit(success ? 0 : 1);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
