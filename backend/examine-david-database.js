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

async function examineDatabase() {
  try {
    console.log('🔍 Examining database:', process.env.DB_NAME);
    console.log('=' .repeat(60));
    
    // Get all tables
    const tablesResult = await pool.query(`
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log(`\n📊 Found ${tablesResult.rows.length} tables:\n`);
    
    for (const table of tablesResult.rows) {
      console.log(`\n🔸 TABLE: ${table.table_name.toUpperCase()}`);
      console.log('-'.repeat(40));
      
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
      `, [table.table_name]);
      
      console.log('📋 Structure:');
      structure.rows.forEach(col => {
        const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`  • ${col.column_name}: ${col.data_type}${length} ${nullable}${defaultVal}`);
      });
      
      // Get row count
      try {
        const countResult = await pool.query(`SELECT COUNT(*) FROM "${table.table_name}"`);
        console.log(`📊 Row count: ${countResult.rows[0].count}`);
        
        // Show sample data if table has rows
        if (parseInt(countResult.rows[0].count) > 0) {
          const sampleResult = await pool.query(`SELECT * FROM "${table.table_name}" LIMIT 3`);
          console.log('📝 Sample data:');
          sampleResult.rows.forEach((row, index) => {
            console.log(`  Row ${index + 1}:`, JSON.stringify(row, null, 2));
          });
        }
      } catch (error) {
        console.log(`❌ Error getting data: ${error.message}`);
      }
      
      // Get indexes
      try {
        const indexResult = await pool.query(`
          SELECT 
            indexname, 
            indexdef
          FROM pg_indexes 
          WHERE tablename = $1 
          AND schemaname = 'public';
        `, [table.table_name]);
        
        if (indexResult.rows.length > 0) {
          console.log('🔍 Indexes:');
          indexResult.rows.forEach(idx => {
            console.log(`  • ${idx.indexname}`);
          });
        }
      } catch (error) {
        console.log(`❌ Error getting indexes: ${error.message}`);
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
        `, [table.table_name]);
        
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
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Database examination complete!');
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await pool.end();
  }
}

examineDatabase();
