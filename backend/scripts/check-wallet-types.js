import pool from './src/db/db.js';

async function checkWalletTypes() {
  try {
    // Check wallet_type enum values
    const enumResult = await pool.query(`
      SELECT unnest(enum_range(NULL::wallet_type)) as wallet_type
    `);
    
    console.log('Available wallet types:');
    enumResult.rows.forEach(row => {
      console.log(`  - ${row.wallet_type}`);
    });

    // Also check existing wallets
    const existingWallets = await pool.query('SELECT type FROM wallets');
    console.log('\nExisting wallet types in use:');
    existingWallets.rows.forEach(row => {
      console.log(`  - ${row.type}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkWalletTypes();