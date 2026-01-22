#!/usr/bin/env node

/**
 * Migration Script: Multi-Chain Wallet Indexing
 * Applies migration 024_multi_chain_wallet_indexing.sql
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'broadlypaywall',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'admin',
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting multi-chain wallet indexing migration...\n');
    
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '024_multi_chain_wallet_indexing.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Begin transaction
    await client.query('BEGIN');
    
    console.log('📝 Executing migration SQL...');
    await client.query(migrationSQL);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\nCreated/Modified tables:');
    console.log('  - wallets (extended with indexing columns)');
    console.log('  - indexing_jobs');
    console.log('  - contract_abi_features');
    console.log('  - wallet_transactions');
    console.log('  - wallet_events');
    
    // Verify tables exist
    console.log('\n🔍 Verifying tables...');
    const tables = ['indexing_jobs', 'contract_abi_features', 'wallet_transactions', 'wallet_events'];
    
    for (const table of tables) {
      const result = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [table]
      );
      
      if (result.rows[0].exists) {
        console.log(`  ✓ ${table} exists`);
      } else {
        console.log(`  ✗ ${table} NOT FOUND`);
      }
    }
    
    // Check wallets table columns
    console.log('\n🔍 Verifying wallets table columns...');
    const walletColumns = await client.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'wallets' 
       AND column_name IN ('chain_type', 'last_indexed_block', 'last_synced_at', 'total_transactions', 'total_events')
       ORDER BY column_name`
    );
    
    if (walletColumns.rows.length > 0) {
      walletColumns.rows.forEach(col => {
        console.log(`  ✓ ${col.column_name} (${col.data_type})`);
      });
    } else {
      console.log('  ⚠️  No new columns found in wallets table');
    }
    
    console.log('\n✨ Migration verification complete!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
