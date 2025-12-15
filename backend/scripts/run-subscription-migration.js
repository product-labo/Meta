#!/usr/bin/env node

/**
 * Run subscription fields migration
 * Adds subscription management fields to users table
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/db/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting subscription fields migration...');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/010_add_subscription_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Run migration
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    
    console.log('✅ Subscription fields migration completed successfully!');
    
    // Verify the changes
    const result = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('subscription_status', 'subscription_expires_at', 'onboarding_completed', 'balance_zec')
      ORDER BY column_name;
    `);
    
    console.log('\n📋 Added columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
