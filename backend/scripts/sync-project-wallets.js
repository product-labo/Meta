#!/usr/bin/env node

/**
 * Sync Project Default Wallet Addresses
 * 
 * This script ensures all projects have their default wallet address set
 * and indexed from the Zcash blockchain.
 */

import { syncAllProjectDefaultWallets } from '../src/services/projectWalletService.js';
import { pool } from '../src/config/appConfig.js';

async function main() {
  try {
    console.log('='.repeat(60));
    console.log('Project Default Wallet Address Sync');
    console.log('='.repeat(60));
    console.log('');

    const result = await syncAllProjectDefaultWallets();

    console.log('');
    console.log('='.repeat(60));
    console.log('Sync Complete');
    console.log('='.repeat(60));
    console.log(`Total projects: ${result.total}`);
    console.log(`Successfully synced: ${result.synced}`);
    console.log(`Failed: ${result.total - result.synced}`);
    console.log('');

    if (result.results.length > 0) {
      console.log('Details:');
      result.results.forEach(r => {
        const status = r.success ? '✓' : '✗';
        console.log(`  ${status} ${r.project_name} (${r.project_id})`);
        if (r.message) console.log(`    ${r.message}`);
        if (r.error) console.log(`    Error: ${r.error}`);
      });
    }

  } catch (error) {
    console.error('✗ Sync failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main()
  .then(() => {
    console.log('\n✓ Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n✗ Script failed:', error);
    process.exit(1);
  });
