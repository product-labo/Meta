#!/usr/bin/env node

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

async function examineMultichainTables() {
  try {
    console.log('🔍 Examining key multichain tables...\n');
    
    const keyTables = [
      'chains',
      'mc_chains', 
      'mc_transaction_details',
      'transactions',
      'wallets',
      'contracts',
      'wallet_interactions'
    ];
    
    for (const tableName of keyTables) {
      console.log(`\n🔸 TABLE: ${tableName.toUpperCase()}`);
      console.log('-'.repeat(50));
      
      // Get table structure
      const structure = await pool.query(`
        SELECT 
          column_name, 
          data_type, 
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position;
      `, [tableName]);
      
      if (structure.rows.length === 0) {
        console.log('❌ Table not found');
        continue;
      }
      
      console.log('📋 Structure:');
      structure.rows.forEach(col => {
        const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`  • ${col.column_name}: ${col.data_type}${length} ${nullable}${defaultVal}`);
      });
      
      // Get row count and sample data
      try {
        const countResult = await pool.query(`SELECT COUNT(*) FROM "${tableName}"`);
        console.log(`📊 Row count: ${countResult.rows[0].count}`);
        
        if (parseInt(countResult.rows[0].count) > 0) {
          const sampleResult = await pool.query(`SELECT * FROM "${tableName}" LIMIT 2`);
          console.log('📝 Sample data:');
          sampleResult.rows.forEach((row, index) => {
            console.log(`  Row ${index + 1}:`, JSON.stringify(row, null, 2));
          });
        }
      } catch (error) {
        console.log(`❌ Error getting data: ${error.message}`);
      }
      
      // Get foreign keys
      try {
        const fkResult = await pool.query(`
          SELECT
            tc.constraint_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name = $1;
        `, [tableName]);
        
        if (fkResult.rows.length > 0) {
          console.log('🔗 Foreign Keys:');
          fkResult.rows.forEach(fk => {
            console.log(`  • ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
          });
        }
      } catch (error) {
        console.log(`❌ Error getting foreign keys: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await pool.end();
  }
}

examineMultichainTables();
