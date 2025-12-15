/**
 * Run projects table migration
 */

import { pool } from '../src/config/appConfig.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('🚀 Running projects table migration...');
    
    const migrationPath = path.join(__dirname, '../migrations/009_add_projects_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Migration 009_add_projects_table.sql completed successfully');
    
    // Verify table was created
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'projects'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Projects table verified in database');
    } else {
      console.log('⚠️  Warning: Projects table not found after migration');
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
