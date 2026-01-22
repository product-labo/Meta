#!/usr/bin/env node

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

async function checkMultichainTables() {
  try {
    console.log('🔍 Checking for multichain-related tables...\n');
    
    // Get all tables
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('📊 All existing tables:');
    tablesResult.rows.forEach(table => {
      console.log(`  • ${table.table_name}`);
    });
    
    // Check for any chain-related columns
    console.log('\n🔍 Checking for chain-related columns...');
    const chainColumns = await pool.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND (column_name ILIKE '%chain%' OR column_name ILIKE '%multichain%')
      ORDER BY table_name, column_name;
    `);
    
    if (chainColumns.rows.length > 0) {
      console.log('Found chain-related columns:');
      chainColumns.rows.forEach(col => {
        console.log(`  • ${col.table_name}.${col.column_name} (${col.data_type})`);
      });
    } else {
      console.log('❌ No chain-related columns found');
    }
    
    // Check for any blockchain-related tables
    console.log('\n🔍 Checking for blockchain-related tables...');
    const blockchainTables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND (table_name ILIKE '%chain%' 
             OR table_name ILIKE '%block%' 
             OR table_name ILIKE '%transaction%'
             OR table_name ILIKE '%wallet%'
             OR table_name ILIKE '%contract%')
      ORDER BY table_name;
    `);
    
    if (blockchainTables.rows.length > 0) {
      console.log('Found blockchain-related tables:');
      blockchainTables.rows.forEach(table => {
        console.log(`  • ${table.table_name}`);
      });
    } else {
      console.log('❌ No blockchain-related tables found');
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await pool.end();
  }
}

checkMultichainTables();
