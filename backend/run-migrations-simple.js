#!/usr/bin/env node

/**
 * Simple migration runner
 * Runs all SQL migrations in the migrations folder
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
  cyan: '\x1b[36m'
};

// Try to use the database specified in .env, or fall back to zcash_indexer
const DB_NAME = process.env.DB_NAME || 'zcash_indexer';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASS = process.env.DB_PASS || 'yourpassword';

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432');

async function runMigrations() {
  console.log(`${colors.cyan}Running Lisk Migrations...${colors.reset}`);
  console.log(`Database: ${DB_NAME}`);
  console.log(`User: ${DB_USER}`);
  console.log(`Host: ${DB_HOST}:${DB_PORT}\n`);

  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME
  });

  try {
    await client.connect();
    console.log(`${colors.green}✓ Connected to database${colors.reset}\n`);

    const migrationsDir = join(__dirname, 'migrations');
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} migration files:\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const file of files) {
      try {
        process.stdout.write(`  ${file}... `);
        const sql = readFileSync(join(migrationsDir, file), 'utf8');
        await client.query(sql);
        console.log(`${colors.green}✓${colors.reset}`);
        successCount++;
      } catch (error) {
        if (error.message.includes('already exists') ||
          error.message.includes('duplicate')) {
          console.log(`${colors.yellow}⚠ (already applied)${colors.reset}`);
          skipCount++;
        } else {
          console.log(`${colors.red}✗${colors.reset}`);
          console.log(`    Error: ${error.message}`);
          errorCount++;
        }
      }
    }

    console.log(`\n${colors.cyan}Migration Summary:${colors.reset}`);
    console.log(`  ${colors.green}✓ Applied: ${successCount}${colors.reset}`);
    console.log(`  ${colors.yellow}⚠ Skipped: ${skipCount}${colors.reset}`);
    if (errorCount > 0) {
      console.log(`  ${colors.red}✗ Errors: ${errorCount}${colors.reset}`);
    }

    // Show tables
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log(`\n${colors.cyan}Tables in database (${result.rows.length}):${colors.reset}`);
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    await client.end();

    console.log(`\n${colors.green}✓ Migrations complete!${colors.reset}\n`);
    process.exit(0);

  } catch (error) {
    console.log(`\n${colors.red}✗ Failed to connect: ${error.message}${colors.reset}`);
    console.log(`\nTroubleshooting:`);
    console.log(`1. Check if PostgreSQL is running`);
    console.log(`2. Verify database '${DB_NAME}' exists`);
    console.log(`3. Check credentials in .env file`);
    console.log(`4. See MANUAL_DB_SETUP.md for manual setup\n`);
    process.exit(1);
  }
}

runMigrations();
