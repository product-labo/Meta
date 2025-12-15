#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT || 5432,
});

async function fixTable() {
  try {
    // Check existing table structure
    console.log('🔍 Checking existing mc_chains table...');
    
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'mc_chains'
      );
    `);
    
    if (tableExists.rows[0].exists) {
      console.log('✅ Table exists, checking columns...');
      
      const columns = await pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'mc_chains'
      `);
      
      console.log('Current columns:', columns.rows.map(r => r.column_name));
      
      // Add missing columns
      const requiredColumns = [
        { name: 'rpc_url', type: 'TEXT' },
        { name: 'chain_id', type: 'VARCHAR(50)' }
      ];
      
      for (const col of requiredColumns) {
        const hasColumn = columns.rows.some(r => r.column_name === col.name);
        if (!hasColumn) {
          console.log(`➕ Adding column: ${col.name}`);
          await pool.query(`ALTER TABLE mc_chains ADD COLUMN ${col.name} ${col.type}`);
        }
      }
    } else {
      console.log('📋 Creating new mc_chains table...');
      await pool.query(`
        CREATE TABLE mc_chains (
          id INTEGER PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          rpc_url TEXT,
          chain_id VARCHAR(50),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
    }
    
    console.log('✅ Table structure fixed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixTable();
