import 'dotenv/config';
import pool from './src/db/db.js';
import fs from 'fs';

async function runCohortMigration() {
  try {
    console.log('🔄 Running cohort tables migration...');
    
    const migration = fs.readFileSync('./migrations/004_add_cohort_tables.sql', 'utf8');
    await pool.query(migration);
    
    console.log('✅ Cohort tables migration completed');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await pool.end();
  }
}

runCohortMigration();