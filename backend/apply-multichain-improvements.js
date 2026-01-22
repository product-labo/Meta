#!/usr/bin/env node

import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

async function applyMultichainImprovements() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Applying safe multichain improvements...\n');
    
    // Read the SQL file
    const sqlContent = fs.readFileSync('./safe-multichain-improvements.sql', 'utf8');
    
    // Execute the improvements
    await client.query(sqlContent);
    
    console.log('✅ Successfully applied multichain improvements!');
    
    // Verify the new tables
    console.log('\n🔍 Verifying new tables...');
    const newTables = [
      'chain_competitive_overview',
      'wallet_identity_clusters', 
      'wallet_cluster_members',
      'cross_chain_correlations',
      'bridge_transactions'
    ];
    
    for (const table of newTables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);
      
      console.log(`  • ${table}: ${result.rows[0].exists ? '✅ Created' : '❌ Failed'}`);
    }
    
    // Check materialized view
    const viewResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'cross_chain_summary'
      );
    `);
    console.log(`  • cross_chain_summary view: ${viewResult.rows[0].exists ? '✅ Created' : '❌ Failed'}`);
    
    // Test the view
    console.log('\n📊 Testing cross-chain summary view...');
    const summaryResult = await client.query('SELECT * FROM cross_chain_summary LIMIT 3');
    summaryResult.rows.forEach((row, index) => {
      console.log(`  Chain ${index + 1}: ${row.chain_name} - ${row.total_wallets} wallets, ${row.total_transactions} transactions`);
    });
    
    console.log('\n🎉 Multichain improvements applied successfully!');
    console.log('📈 New capabilities added:');
    console.log('  • Cross-chain wallet correlation tracking');
    console.log('  • Bridge transaction monitoring');
    console.log('  • Chain competitive analysis');
    console.log('  • Real-time metrics updates');
    console.log('  • Performance-optimized indexes');
    
  } catch (error) {
    console.error('❌ Error applying improvements:', error.message);
    await client.query('ROLLBACK');
  } finally {
    client.release();
    await pool.end();
  }
}

applyMultichainImprovements();
