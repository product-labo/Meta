import 'dotenv/config';
import pool from './src/db/db.js';
import fs from 'fs';

async function runProcessedTxMigration() {
  try {
    console.log('🔄 Running processed transactions migration...');
    
    const migration = fs.readFileSync('./migrations/003_add_processed_transactions.sql', 'utf8');
    await pool.query(migration);
    
    console.log('✅ Processed transactions migration completed');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await pool.end();
  }
}

runProcessedTxMigration();