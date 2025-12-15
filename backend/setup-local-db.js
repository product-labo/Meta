#!/usr/bin/env node

/**
 * Automated Local PostgreSQL Database Setup
 * Creates database, user, and runs migrations
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

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'boardling_user',
  password: process.env.DB_PASS || 'yourpassword',
  database: process.env.DB_NAME || 'boardling_lisk'
};

/**
 * Test PostgreSQL connection
 */
async function testConnection() {
  console.log(`\n${colors.cyan}Testing PostgreSQL connection...${colors.reset}`);
  console.log(`Host: ${DB_CONFIG.host}:${DB_CONFIG.port}`);
  
  try {
    // Try connecting to postgres database first
    const client = new Client({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: 'postgres',
      password: process.env.POSTGRES_PASSWORD || DB_CONFIG.password,
      database: 'postgres'
    });
    
    await client.connect();
    console.log(`${colors.green}✓ PostgreSQL is running${colors.reset}`);
    await client.end();
    return true;
  } catch (error) {
    console.log(`${colors.red}✗ Cannot connect to PostgreSQL${colors.reset}`);
    console.log(`Error: ${error.message}`);
    console.log(`\n${colors.yellow}Please ensure PostgreSQL is installed and running.${colors.reset}`);
    console.log(`See setup-local-postgres.md for installation instructions.`);
    return false;
  }
}

/**
 * Create database and user
 */
async function createDatabaseAndUser() {
  console.log(`\n${colors.cyan}Creating database and user...${colors.reset}`);
  
  const client = new Client({
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    user: 'postgres',
    password: process.env.POSTGRES_PASSWORD || DB_CONFIG.password,
    database: 'postgres'
  });
  
  try {
    await client.connect();
    
    // Check if user exists
    const userCheck = await client.query(
      `SELECT 1 FROM pg_roles WHERE rolname = $1`,
      [DB_CONFIG.user]
    );
    
    if (userCheck.rows.length === 0) {
      await client.query(
        `CREATE USER ${DB_CONFIG.user} WITH PASSWORD '${DB_CONFIG.password}'`
      );
      console.log(`${colors.green}✓ User '${DB_CONFIG.user}' created${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠ User '${DB_CONFIG.user}' already exists${colors.reset}`);
    }
    
    // Check if database exists
    const dbCheck = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [DB_CONFIG.database]
    );
    
    if (dbCheck.rows.length === 0) {
      await client.query(
        `CREATE DATABASE ${DB_CONFIG.database} OWNER ${DB_CONFIG.user}`
      );
      console.log(`${colors.green}✓ Database '${DB_CONFIG.database}' created${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠ Database '${DB_CONFIG.database}' already exists${colors.reset}`);
    }
    
    // Grant privileges
    await client.query(
      `GRANT ALL PRIVILEGES ON DATABASE ${DB_CONFIG.database} TO ${DB_CONFIG.user}`
    );
    console.log(`${colors.green}✓ Privileges granted${colors.reset}`);
    
    await client.end();
    return true;
  } catch (error) {
    console.log(`${colors.red}✗ Failed to create database/user${colors.reset}`);
    console.log(`Error: ${error.message}`);
    await client.end();
    return false;
  }
}

/**
 * Grant schema permissions
 */
async function grantSchemaPermissions() {
  console.log(`\n${colors.cyan}Granting schema permissions...${colors.reset}`);
  
  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    
    await client.query(`GRANT ALL ON SCHEMA public TO ${DB_CONFIG.user}`);
    await client.query(`GRANT ALL ON ALL TABLES IN SCHEMA public TO ${DB_CONFIG.user}`);
    await client.query(`GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO ${DB_CONFIG.user}`);
    await client.query(`GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO ${DB_CONFIG.user}`);
    
    console.log(`${colors.green}✓ Schema permissions granted${colors.reset}`);
    
    await client.end();
    return true;
  } catch (error) {
    console.log(`${colors.yellow}⚠ Could not grant all permissions: ${error.message}${colors.reset}`);
    await client.end();
    return true; // Continue anyway
  }
}

/**
 * Run database migrations
 */
async function runMigrations() {
  console.log(`\n${colors.cyan}Running database migrations...${colors.reset}`);
  
  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    
    const migrationsDir = join(__dirname, 'migrations');
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    console.log(`Found ${files.length} migration files`);
    
    for (const file of files) {
      try {
        console.log(`  Running: ${file}...`);
        const sql = readFileSync(join(migrationsDir, file), 'utf8');
        await client.query(sql);
        console.log(`  ${colors.green}✓ ${file}${colors.reset}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`  ${colors.yellow}⚠ ${file} (already applied)${colors.reset}`);
        } else {
          console.log(`  ${colors.red}✗ ${file}: ${error.message}${colors.reset}`);
        }
      }
    }
    
    await client.end();
    return true;
  } catch (error) {
    console.log(`${colors.red}✗ Migration failed: ${error.message}${colors.reset}`);
    await client.end();
    return false;
  }
}

/**
 * Verify database setup
 */
async function verifySetup() {
  console.log(`\n${colors.cyan}Verifying database setup...${colors.reset}`);
  
  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    
    // Check tables
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`${colors.green}✓ Database connected successfully${colors.reset}`);
    console.log(`\nTables created (${result.rows.length}):`);
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    await client.end();
    return true;
  } catch (error) {
    console.log(`${colors.red}✗ Verification failed: ${error.message}${colors.reset}`);
    await client.end();
    return false;
  }
}

/**
 * Main setup function
 */
async function main() {
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}     LOCAL POSTGRESQL DATABASE SETUP${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  
  // Step 1: Test connection
  const connected = await testConnection();
  if (!connected) {
    console.log(`\n${colors.red}Setup failed. Please install PostgreSQL first.${colors.reset}`);
    process.exit(1);
  }
  
  // Step 2: Create database and user
  const created = await createDatabaseAndUser();
  if (!created) {
    console.log(`\n${colors.red}Setup failed. Could not create database/user.${colors.reset}`);
    process.exit(1);
  }
  
  // Step 3: Grant permissions
  await grantSchemaPermissions();
  
  // Step 4: Run migrations
  const migrated = await runMigrations();
  if (!migrated) {
    console.log(`\n${colors.yellow}⚠ Some migrations failed, but continuing...${colors.reset}`);
  }
  
  // Step 5: Verify setup
  const verified = await verifySetup();
  
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  if (verified) {
    console.log(`${colors.green}✓ Database setup completed successfully!${colors.reset}`);
    console.log(`\nConnection string:`);
    console.log(`  postgresql://${DB_CONFIG.user}:****@${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);
    console.log(`\nYou can now run the application:`);
    console.log(`  npm start`);
  } else {
    console.log(`${colors.red}✗ Database setup completed with errors${colors.reset}`);
    console.log(`\nPlease check the errors above and try again.`);
  }
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);
}

// Run setup
main().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
