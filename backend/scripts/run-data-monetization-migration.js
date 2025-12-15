#!/usr/bin/env node

/**
 * Run Data Monetization Migration
 * Creates tables for data access grants and earnings tracking
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
    console.log('Starting data monetization migration...');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/011_add_data_monetization.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute migration
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    
    console.log('✓ Data monetization tables created successfully');
    
    // Verify tables were created
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('data_access_grants', 'data_owner_earnings')
      ORDER BY table_name
    `);
    
    console.log('\nCreated tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Verify indexes were created
    const indexesResult = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename IN ('data_access_grants', 'data_owner_earnings')
      ORDER BY indexname
    `);
    
    console.log('\nCreated indexes:');
    indexesResult.rows.forEach(row => {
      console.log(`  - ${row.indexname}`);
    });
    
    console.log('\n✓ Migration completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('✗ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
