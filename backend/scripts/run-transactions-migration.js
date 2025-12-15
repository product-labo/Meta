import 'dotenv/config';
import pool from './src/db/db.js';
import fs from 'fs';

async function runTransactionsMigration() {
  try {
    console.log('🔄 Running transactions table migration...');
    
    // Read and execute the migration
    const migration = fs.readFileSync('./migrations/002_add_transactions_table.sql', 'utf8');
    await pool.query(migration);
    
    console.log('✅ Transactions migration completed successfully');
    console.log('\n📊 Transaction tables created:');
    console.log('   - transactions (main transaction data)');
    console.log('   - transaction_inputs (transaction inputs)');
    console.log('   - transaction_outputs (transaction outputs)');
    console.log('\n🔧 Functions created:');
    console.log('   - save_complete_transaction() (atomic transaction saving)');
    
  } catch (error) {
    console.error('❌ Transactions migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTransactionsMigration();