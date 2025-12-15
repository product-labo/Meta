#!/usr/bin/env node

/**
 * Test PostgreSQL Database Connection
 */

import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'boardling_user',
  password: process.env.DB_PASS || 'yourpassword',
  database: process.env.DB_NAME || 'boardling_lisk'
};

async function testConnection() {
  console.log(`${colors.cyan}Testing PostgreSQL connection...${colors.reset}`);
  console.log(`Host: ${DB_CONFIG.host}:${DB_CONFIG.port}`);
  console.log(`Database: ${DB_CONFIG.database}`);
  console.log(`User: ${DB_CONFIG.user}\n`);
  
  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    console.log(`${colors.green}✓ Connected successfully!${colors.reset}\n`);
    
    // Get PostgreSQL version
    const versionResult = await client.query('SELECT version()');
    console.log('PostgreSQL Version:');
    console.log(`  ${versionResult.rows[0].version}\n`);
    
    // Get database size
    const sizeResult = await client.query(`
      SELECT pg_size_pretty(pg_database_size($1)) as size
    `, [DB_CONFIG.database]);
    console.log(`Database Size: ${sizeResult.rows[0].size}\n`);
    
    // List tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`Tables (${tablesResult.rows.length}):`);
    if (tablesResult.rows.length > 0) {
      tablesResult.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
    } else {
      console.log('  (No tables found - run migrations)');
    }
    
    await client.end();
    console.log(`\n${colors.green}✓ Connection test passed!${colors.reset}`);
    process.exit(0);
  } catch (error) {
    console.log(`${colors.red}✗ Connection failed!${colors.reset}`);
    console.log(`Error: ${error.message}\n`);
    
    console.log('Troubleshooting:');
    console.log('1. Check if PostgreSQL is running');
    console.log('2. Verify credentials in .env file');
    console.log('3. Ensure database exists');
    console.log('4. Run: node setup-local-db.js\n');
    
    process.exit(1);
  }
}

testConnection();
