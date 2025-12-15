#!/usr/bin/env node

/**
 * Migration Script: Add default_wallet_address to projects
 * 
 * This script runs the migration to add default_wallet_address column
 * to the projects table and populates it from existing wallets.
 */

import { pool } from '../src/config/appConfig.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting default_wallet_address migration...');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/014_add_default_wallet_address.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute migration
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    
    console.log('✓ Migration completed successfully');
    
    // Verify results
    const result = await client.query(`
      SELECT 
        COUNT(*) as total_projects,
        COUNT(default_wallet_address) as projects_with_address,
        COUNT(*) - COUNT(default_wallet_address) as projects_without_address
      FROM projects
    `);
    
    const stats = result.rows[0];
    console.log('\nMigration Statistics:');
    console.log(`  Total projects: ${stats.total_projects}`);
    console.log(`  Projects with default address: ${stats.projects_with_address}`);
    console.log(`  Projects without default address: ${stats.projects_without_address}`);
    
    if (parseInt(stats.projects_without_address) > 0) {
      console.log('\n⚠ Some projects do not have a default wallet address.');
      console.log('  This is normal for projects without any wallets yet.');
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('✗ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('\n✓ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Migration script failed:', error);
    process.exit(1);
  });
