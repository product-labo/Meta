#!/usr/bin/env node

/**
 * MetaGauge Smart Contract Schema Migration Runner
 * Runs the 018_metagauge_smart_contract_schema migration
 */

import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

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

async function runMigration() {
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}     METAGAUGE SMART CONTRACT SCHEMA MIGRATION${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'boardling_lisk'
  });

  try {
    console.log(`${colors.cyan}Connecting to database...${colors.reset}`);
    console.log(`Host: ${client.host}:${client.port}`);
    console.log(`Database: ${client.database}\n`);

    await client.connect();
    console.log(`${colors.green}✓ Connected to PostgreSQL${colors.reset}\n`);

    // Read migration file
    const migrationPath = join(__dirname, 'migrations', '018_metagauge_smart_contract_schema.sql');
    console.log(`${colors.cyan}Reading migration file...${colors.reset}`);
    console.log(`Path: ${migrationPath}\n`);

    const sql = readFileSync(migrationPath, 'utf8');

    // Execute migration
    console.log(`${colors.cyan}Executing migration...${colors.reset}\n`);

    await client.query('BEGIN');

    try {
      await client.query(sql);
      await client.query('COMMIT');

      console.log(`${colors.green}✓ Migration executed successfully!${colors.reset}\n`);

      // Verify tables created
      console.log(`${colors.cyan}Verifying tables...${colors.reset}`);

      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'sc_%'
        ORDER BY table_name
      `);

      console.log(`${colors.green}✓ Created ${result.rows.length} tables:${colors.reset}`);
      result.rows.forEach(row => {
        console.log(`  ${colors.green}✓${colors.reset} ${row.table_name}`);
      });

      // Verify views created
      const viewsResult = await client.query(`
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'v_%'
        ORDER BY table_name
      `);

      console.log(`\n${colors.green}✓ Created ${viewsResult.rows.length} views:${colors.reset}`);
      viewsResult.rows.forEach(row => {
        console.log(`  ${colors.green}✓${colors.reset} ${row.table_name}`);
      });

      // Verify functions created
      const functionsResult = await client.query(`
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_type = 'FUNCTION'
        AND routine_name IN ('update_subscription_from_contract', 'log_subscription_event', 'update_updated_at_column')
        ORDER BY routine_name
      `);

      console.log(`\n${colors.green}✓ Created ${functionsResult.rows.length} functions:${colors.reset}`);
      functionsResult.rows.forEach(row => {
        console.log(`  ${colors.green}✓${colors.reset} ${row.routine_name}`);
      });

      // Check subscription plans
      const plansResult = await client.query(`
        SELECT tier, name, monthly_price, yearly_price, active
        FROM sc_subscription_plans
        ORDER BY tier_number
      `);

      console.log(`\n${colors.green}✓ Loaded ${plansResult.rows.length} subscription plans:${colors.reset}`);
      plansResult.rows.forEach(row => {
        console.log(`  ${colors.green}✓${colors.reset} ${row.tier.padEnd(12)} - ${row.name.padEnd(15)} (${row.monthly_price} ETH/month, ${row.yearly_price} ETH/year)`);
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}✓ Migration completed successfully!${colors.reset}`);
    console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

    console.log(`${colors.cyan}Next steps:${colors.reset}`);
    console.log(`1. Start the backend: npm start`);
    console.log(`2. Test smart contract endpoints: curl http://localhost:3002/api/sc-payments/health`);
    console.log(`3. Sync subscription plans: curl http://localhost:3002/api/sc-payments/plans`);
    console.log(`4. Connect wallet and subscribe!\n`);

  } catch (error) {
    console.error(`${colors.red}✗ Migration failed: ${error.message}${colors.reset}\n`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
