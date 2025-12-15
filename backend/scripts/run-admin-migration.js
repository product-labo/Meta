import { pool } from '../src/config/appConfig.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, '../migrations/012_add_admin_role.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration: 012_add_admin_role.sql');
    await pool.query(sql);
    console.log('✓ Migration completed successfully');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
