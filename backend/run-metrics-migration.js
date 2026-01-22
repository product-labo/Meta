#!/usr/bin/env node

/**
 * MetaGauge Metrics Database Migration Runner
 * Executes the comprehensive metrics schema migration
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'david_user',
    password: process.env.DB_PASS || 'Davidsoyaya@1015',
    database: process.env.DB_NAME || 'david'
};

async function runMigration() {
    const pool = new Pool(dbConfig);
    
    try {
        console.log(`📊 Connecting to database: ${dbConfig.database} on ${dbConfig.host}:${dbConfig.port}`);
        
        // Test connection
        const client = await pool.connect();
        console.log('✅ Database connection established');
        
        // Read migration SQL file
        const migrationPath = path.join(__dirname, 'migrations', '001_create_metrics_tables.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📄 Executing migration SQL...');
        
        // Execute migration
        await client.query(migrationSQL);
        
        console.log('✅ Migration executed successfully!');
        
        // Verify tables were created
        const tableCheckQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN (
                'project_metrics_realtime',
                'wallet_metrics_realtime', 
                'project_metrics_daily',
                'chain_metrics_daily',
                'category_metrics_realtime',
                'bi_contract_index',
                'bi_contract_categories',
                'mc_transaction_details',
                'mc_chains'
            )
            ORDER BY table_name;
        `;
        
        const result = await client.query(tableCheckQuery);
        
        console.log('\n📋 Created Tables:');
        result.rows.forEach(row => {
            console.log(`  ✓ ${row.table_name}`);
        });
        
        // Check row counts for reference tables
        const chainCountResult = await client.query('SELECT COUNT(*) FROM mc_chains');
        const categoryCountResult = await client.query('SELECT COUNT(*) FROM bi_contract_categories');
        
        console.log('\n📊 Initial Data:');
        console.log(`  • mc_chains: ${chainCountResult.rows[0].count} chains configured`);
        console.log(`  • bi_contract_categories: ${categoryCountResult.rows[0].count} categories available`);
        
        client.release();
        
        console.log('\n🎉 MetaGauge Metrics Database Migration Completed Successfully!');
        console.log('\n📝 Next Steps:');
        console.log('  1. Run data population script to migrate existing contract data');
        console.log('  2. Execute metrics calculation pipeline');
        console.log('  3. Test API endpoints with new metrics tables');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run migration if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     import.meta.url.endsWith(process.argv[1]);

if (isMainModule) {
    console.log('🚀 Starting MetaGauge Metrics Database Migration...');
    runMigration().catch(console.error);
}

export { runMigration };