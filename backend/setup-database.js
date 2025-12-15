#!/usr/bin/env node

/**
 * Database Setup Script for Boardling
 * 
 * This script helps set up the PostgreSQL database with all required tables
 * for the unified backend system.
 */

import { readFileSync } from 'fs';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'boardling',
  password: process.env.DB_PASS || 'boardling123',
  database: process.env.DB_NAME || 'boardling',
});

async function setupDatabase() {
  console.log('🗄️  Setting up Boardling database...\n');

  try {
    // Test connection
    console.log('1. Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');

    // Read and execute main schema
    console.log('2. Creating main database schema...');
    const schemaSQL = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schemaSQL);
    console.log('✅ Main schema created\n');

    // Execute migrations
    console.log('3. Running database migrations...');
    const migrationFiles = [
      '001_add_wallet_analytics.sql',
      '003_add_processed_transactions.sql',
      '003_shielded_tables.sql',
      '004_add_cohort_tables.sql',
      '004_alternative_wallets.sql',
      '005_add_adoption_stages.sql',
      '006_unified_invoice_system.sql',
      '007_add_wallet_behavior_flows.sql'
    ];

    for (const file of migrationFiles) {
      try {
        const migrationPath = join(__dirname, 'migrations', file);
        const migrationSQL = readFileSync(migrationPath, 'utf8');
        await pool.query(migrationSQL);
        console.log(`✅ Migration ${file} completed`);
      } catch (error) {
        console.log(`⚠️  Migration ${file} skipped (may already exist)`);
      }
    }

    console.log('\n4. Creating test data...');

    // Create a test user
    const testUser = await pool.query(`
      INSERT INTO users (name, email, password_hash) 
      VALUES ('Test User', 'test@boardling.com', '$2a$10$example.hash.for.testing')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, email
    `);

    console.log(`✅ Test user created: ${testUser.rows[0].email}`);

    // Create a test project
    // Create test projects for Explorer
    // Using the design's "Project Alpha" and "Project Beta" for comparison
    const projectsData = [
      {
        name: 'Uniswap V3', description: 'DEX Protocol', chain: 'Ethereum', category: 'defi',
        growth_score: 94, revenue: 2400000, volume: 1900000, audit: 'Audited',
        metrics: { calls: 2847, success: 94.2, drop: 12.3, adoption: 73.4, prod: 6.8, churn: 3, rev_feat: 1247, gas: 0.023, fees: 2.5, cash: 847000, mom: 24.7 }
      },
      {
        name: 'Aave', description: 'Lending Protocol', chain: 'Ethereum', category: 'defi',
        growth_score: 89, revenue: 1200000, volume: 1500000, audit: 'Audited',
        metrics: { calls: 1923, success: 87.1, drop: 18.7, adoption: 61.2, prod: 8.1, churn: 7, rev_feat: 2134, gas: 0.041, fees: 1.8, cash: 623000, mom: 16.3 }
      },
      {
        name: 'Project Alpha', description: 'New Protocol', chain: 'Starknet', category: 'infrastructure',
        growth_score: 92, revenue: 800000, volume: 900000, audit: 'Audit Pending',
        metrics: { calls: 3000, success: 95.0, drop: 10.0, adoption: 80.0, prod: 7.5, churn: 2, rev_feat: 1500, gas: 0.010, fees: 2.0, cash: 500000, mom: 30.0 }
      },
      {
        name: 'Project Beta', description: 'Competitor', chain: 'Polygon', category: 'infrastructure',
        growth_score: 85, revenue: 600000, volume: 700000, audit: 'Audit Pending',
        metrics: { calls: 2500, success: 88.0, drop: 15.0, adoption: 65.0, prod: 8.0, churn: 5, rev_feat: 1100, gas: 0.030, fees: 1.5, cash: 400000, mom: 20.0 }
      }
    ];

    for (const p of projectsData) {
      const proj = await pool.query(`
            INSERT INTO projects (user_id, name, description, chain, category, growth_score, revenue_7d, volume, audit_status, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
            ON CONFLICT DO NOTHING
            RETURNING id
        `, [testUser.rows[0].id, p.name, p.description, p.chain, p.category, p.growth_score, p.revenue, p.volume, p.audit]);

      if (proj.rows[0] && p.metrics) {
        const m = p.metrics;
        await pool.query(`
                INSERT INTO project_metrics (project_id, calls_per_feature, success_rate, drop_off_rate, adoption_rate, productivity_score, churn_triggers, revenue_per_feature, gas_efficiency, fees_structure, cash_in, mom_growth)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (project_id) DO UPDATE SET calls_per_feature = $2
            `, [proj.rows[0].id, m.calls, m.success, m.drop, m.adoption, m.prod, m.churn, m.rev_feat, m.gas, m.fees, m.cash, m.mom]);
      }
    }

    console.log(`✅ Seed projects with metrics created: ${projectsData.length}`);

    // Seed Alerts
    // "Retention Drop below 20%"
    // "Revenue Threshold hits 100,000"
    const projAlpha = await pool.query("SELECT id FROM projects WHERE name = 'Project Alpha'");
    if (projAlpha.rows.length > 0) {
      await pool.query(`
            INSERT INTO alerts (user_id, project_id, type, condition, threshold, frequency)
            VALUES 
            ($1, $2, 'retention', 'drops below', 20.0, 'immediate'),
            ($1, $2, 'revenue', 'hits', 100000.0, 'weekly')
        `, [testUser.rows[0].id, projAlpha.rows[0].id]);
      console.log('✅ Seed alerts created for Project Alpha');
    }

    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Start the unified backend: npm start');
    console.log('2. Start the frontend: npm run dev (in the root directory)');
    console.log('3. Visit http://localhost:5173 to test the application');
    console.log('\n🔐 Test credentials:');
    console.log('Email: test@boardling.com');
    console.log('Password: (you can register a new account or use the test user)');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure PostgreSQL is running');
    console.log('2. Check your .env file configuration');
    console.log('3. Try running: docker run --name boardling-postgres -e POSTGRES_PASSWORD=boardling123 -e POSTGRES_USER=boardling -e POSTGRES_DB=boardling -p 5432:5432 -d postgres:15');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run setup
setupDatabase();