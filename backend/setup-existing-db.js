#!/usr/bin/env node

/**
 * Setup script for existing PostgreSQL database
 * Creates new database using existing credentials
 */

import { Client } from 'pg';
import dotenv from 'dotenv';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Use existing database to create new one
const EXISTING_DB = 'zcash_indexer';
const NEW_DB = 'boardling_lisk';
const DB_USER = 'postgres'; // Default superuser
const DB_PASS = 'yourpassword';

async function main() {
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}     BOARDLING LISK DATABASE SETUP${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  
  console.log(`\n${colors.cyan}Connecting to existing database...${colors.reset}`);
  console.log(`Database: ${EXISTING_DB}`);
  
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: DB_USER,
    password: DB_PASS,
    database: EXISTING_DB
  });
  
  try {
    await client.connect();
    console.log(`${colors.green}✓ Connected to PostgreSQL${colors.reset}`);
    
    // Check if new database exists
    const dbCheck = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [NEW_DB]
    );
    
    if (dbCheck.rows.length === 0) {
      console.log(`\n${colors.cyan}Creating database '${NEW_DB}'...${colors.reset}`);
      await client.query(`CREATE DATABASE ${NEW_DB}`);
      console.log(`${colors.green}✓ Database created${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠ Database '${NEW_DB}' already exists${colors.reset}`);
    }
    
    await client.end();
    
    // Now connect to new database and run migrations
    console.log(`\n${colors.cyan}Running migrations...${colors.reset}`);
    
    const newClient = new Client({
      host: 'localhost',
      port: 5432,
      user: DB_USER,
      password: DB_PASS,
      database: NEW_DB
    });
    
    await newClient.connect();
    
    const migrationsDir = join(__dirname, 'migrations');
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    console.log(`Found ${files.length} migration files\n`);
    
    for (const file of files) {
      try {
        console.log(`  Running: ${file}...`);
        const sql = readFileSync(join(migrationsDir, file), 'utf8');
        await newClient.query(sql);
        console.log(`  ${colors.green}✓ ${file}${colors.reset}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`  ${colors.yellow}⚠ ${file} (already applied)${colors.reset}`);
        } else {
          console.log(`  ${colors.red}✗ ${file}: ${error.message}${colors.reset}`);
        }
      }
    }
    
    // Verify setup
    console.log(`\n${colors.cyan}Verifying setup...${colors.reset}`);
    const result = await newClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`${colors.green}✓ Database setup complete!${colors.reset}`);
    console.log(`\nTables created (${result.rows.length}):`);
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    await newClient.end();
    
    console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}✓ Setup completed successfully!${colors.reset}`);
    console.log(`\nDatabase: ${NEW_DB}`);
    console.log(`Connection string: postgresql://${DB_USER}:****@localhost:5432/${NEW_DB}`);
    console.log(`\nYou can now run: npm start`);
    console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);
    
  } catch (error) {
    console.log(`${colors.red}✗ Setup failed: ${error.message}${colors.reset}`);
    console.log(`\nPlease check:`);
    console.log(`1. PostgreSQL is running`);
    console.log(`2. Database '${EXISTING_DB}' exists`);
    console.log(`3. Password is correct: '${DB_PASS}'`);
    console.log(`4. User '${DB_USER}' has permissions\n`);
    process.exit(1);
  }
}

main();
