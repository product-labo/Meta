import 'dotenv/config';
import pool from './src/db/db.js';
import fs from 'fs';

async function runSimpleMigration() {
  try {
    console.log('🔄 Running simple transactions migration...');
    
    const migration = fs.readFileSync('./migrations/002_simple_transactions.sql', 'utf8');
    await pool.query(migration);
    
    console.log('✅ Simple transactions migration completed');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await pool.end();
  }
}

runSimpleMigration();