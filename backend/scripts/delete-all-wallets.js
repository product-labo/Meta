/**
 * Delete all wallets from database
 * Use with caution - this will remove all wallet records
 */

import pool from '../src/db/db.js';

async function deleteAllWallets() {
  try {
    console.log('Deleting all wallets from database...');
    
    const result = await pool.query('DELETE FROM wallets');
    
    console.log(`✅ Successfully deleted ${result.rowCount} wallets`);
    
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error deleting wallets:', err.message);
    process.exit(1);
  }
}

deleteAllWallets();
