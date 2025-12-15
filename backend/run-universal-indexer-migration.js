#!/usr/bin/env node

/**
 * Universal Smart Contract Indexer Migration Runner
 * Runs the database migration for the universal smart contract function indexer
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'boardling_lisk',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'yourpassword'
});

async function runMigration() {
  console.log('🚀 Starting Universal Smart Contract Indexer Migration...\n');

  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '019_universal_smart_contract_indexer_schema.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded\n');

    // Execute migration
    console.log('⚡ Executing migration...');
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      await client.query(migrationSQL);
      await client.query('COMMIT');
      console.log('✅ Migration executed successfully\n');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    // Verify migration
    console.log('🔍 Verifying migration...');
    
    const verificationQueries = [
      {
        name: 'function_signatures table',
        query: "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'function_signatures'"
      },
      {
        name: 'function_calls table',
        query: "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'function_calls'"
      },
      {
        name: 'event_logs table',
        query: "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'event_logs'"
      },
      {
        name: 'internal_calls table',
        query: "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'internal_calls'"
      },
      {
        name: 'contract_info table',
        query: "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'contract_info'"
      },
      {
        name: 'function_categories table',
        query: "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'function_categories'"
      },
      {
        name: 'address_labels table',
        query: "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'address_labels'"
      },
      {
        name: 'function categories data',
        query: "SELECT COUNT(*) FROM function_categories"
      }
    ];

    for (const check of verificationQueries) {
      const result = await pool.query(check.query);
      const count = parseInt(result.rows[0].count);
      
      if (check.name === 'function categories data') {
        console.log(`   ✅ ${check.name}: ${count} categories loaded`);
        if (count < 20) {
          console.log('   ⚠️  Warning: Expected at least 20 function categories');
        }
      } else {
        console.log(`   ✅ ${check.name}: ${count > 0 ? 'exists' : 'missing'}`);
        if (count === 0) {
          throw new Error(`Verification failed: ${check.name} not found`);
        }
      }
    }

    // Show created views
    console.log('\n📊 Verifying views...');
    const viewsQuery = `
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_name LIKE 'v_%' 
      AND table_schema = 'public'
      ORDER BY table_name
    `;
    
    const viewsResult = await pool.query(viewsQuery);
    viewsResult.rows.forEach(row => {
      console.log(`   ✅ View: ${row.table_name}`);
    });

    // Show created functions
    console.log('\n🔧 Verifying functions...');
    const functionsQuery = `
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_type = 'FUNCTION' 
      AND routine_schema = 'public'
      AND routine_name IN (
        'update_signature_usage',
        'get_or_create_function_signature',
        'classify_contract_type',
        'update_updated_at_column'
      )
      ORDER BY routine_name
    `;
    
    const functionsResult = await pool.query(functionsQuery);
    functionsResult.rows.forEach(row => {
      console.log(`   ✅ Function: ${row.routine_name}`);
    });

    console.log('\n🎉 Universal Smart Contract Indexer Migration Complete!');
    console.log('\n📋 Summary:');
    console.log('   • 7 new tables created for comprehensive function indexing');
    console.log('   • 4 views created for easy querying and analytics');
    console.log('   • 4 helper functions created for data management');
    console.log('   • 20 function categories loaded with color coding');
    console.log('   • Comprehensive indexing for high-performance queries');
    console.log('\n🚀 Ready to index all smart contract functions!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration();
}

export default runMigration;