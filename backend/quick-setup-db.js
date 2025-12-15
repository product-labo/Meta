#!/usr/bin/env node

/**
 * Quick database setup for Lisk migration
 * Uses existing zcash_indexer database to create boardling_lisk
 */

import pg from 'pg';
const { Client } = pg;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

async function createDatabase() {
  console.log(`${colors.cyan}Creating boardling_lisk database...${colors.reset}\n`);
  
  // Connect to existing database
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'yourpassword',
    database: 'zcash_indexer'
  });
  
  try {
    await client.connect();
    console.log(`${colors.green}✓ Connected to PostgreSQL${colors.reset}`);
    
    // Check if database exists
    const result = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = 'boardling_lisk'`
    );
    
    if (result.rows.length === 0) {
      console.log(`${colors.cyan}Creating database...${colors.reset}`);
      await client.query('CREATE DATABASE boardling_lisk');
      console.log(`${colors.green}✓ Database 'boardling_lisk' created${colors.reset}\n`);
    } else {
      console.log(`${colors.yellow}⚠ Database 'boardling_lisk' already exists${colors.reset}\n`);
    }
    
    await client.end();
    
    console.log(`${colors.green}✓ Setup complete!${colors.reset}`);
    console.log(`\nNext steps:`);
    console.log(`1. Run migrations: node run-migrations-simple.js`);
    console.log(`2. Test connection: node test-db-connection.js`);
    console.log(`3. Run tests: npm test\n`);
    
  } catch (error) {
    console.error(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
    console.log(`\nTroubleshooting:`);
    console.log(`1. Ensure PostgreSQL is running`);
    console.log(`2. Verify database 'zcash_indexer' exists`);
    console.log(`3. Check password is 'yourpassword'`);
    console.log(`4. Ensure user 'postgres' has permissions\n`);
    process.exit(1);
  }
}

createDatabase();
