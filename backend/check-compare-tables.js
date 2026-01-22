#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

async function checkTables() {
  try {
    console.log('🔍 Checking project_metrics_realtime table structure...');
    
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'project_metrics_realtime'
      ORDER BY ordinal_position
    `);
    
    console.log('Columns:');
    columns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
    console.log('\n🔍 Sample data from project_metrics_realtime...');
    const sample = await pool.query('SELECT * FROM project_metrics_realtime LIMIT 2');
    console.log('Sample rows:', sample.rows.length);
    if (sample.rows.length > 0) {
      console.log('First row:', sample.rows[0]);
    }
    
    console.log('\n🔍 Checking bi_contract_index table...');
    const contracts = await pool.query('SELECT contract_address, business_name FROM bi_contract_index LIMIT 3');
    console.log('Contract addresses:');
    contracts.rows.forEach(row => {
      console.log(`  - ${row.contract_address}: ${row.business_name}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();