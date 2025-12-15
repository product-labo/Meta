/**
 * Database Backup Script
 * Exports all tables and views to SQL format
 */

import pool from '../src/db/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const backupDir = path.join(__dirname, '../backups');
  const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

  try {
    // Create backups directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    console.log('🔄 Starting database backup...');
    
    let sqlDump = `-- =====================================================
-- DATABASE BACKUP
-- Generated: ${new Date().toISOString()}
-- =====================================================

`;

    // Get all tables
    const tablesResult = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log(`📊 Found ${tablesResult.rows.length} tables`);

    // Backup each table
    for (const { tablename } of tablesResult.rows) {
      console.log(`  Backing up table: ${tablename}`);
      
      // Get table structure
      const structureResult = await pool.query(`
        SELECT 
          'CREATE TABLE ' || quote_ident(tablename) || ' (' ||
          string_agg(
            quote_ident(attname) || ' ' || 
            format_type(atttypid, atttypmod) ||
            CASE WHEN attnotnull THEN ' NOT NULL' ELSE '' END ||
            CASE WHEN atthasdef THEN ' DEFAULT ' || pg_get_expr(adbin, adrelid) ELSE '' END,
            ', '
          ) || ');' as create_statement
        FROM pg_attribute a
        LEFT JOIN pg_attrdef ad ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
        WHERE a.attrelid = quote_ident($1)::regclass
        AND a.attnum > 0
        AND NOT a.attisdropped
        GROUP BY tablename, a.attrelid
      `, [tablename]);

      if (structureResult.rows.length > 0) {
        sqlDump += `\n-- Table: ${tablename}\n`;
        sqlDump += `DROP TABLE IF EXISTS ${tablename} CASCADE;\n`;
        sqlDump += `${structureResult.rows[0].create_statement}\n`;
      }

      // Get table data
      const dataResult = await pool.query(`SELECT * FROM ${tablename}`);
      
      if (dataResult.rows.length > 0) {
        sqlDump += `\n-- Data for ${tablename}\n`;
        
        for (const row of dataResult.rows) {
          const columns = Object.keys(row);
          const values = columns.map(col => {
            const val = row[col];
            if (val === null) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            if (val instanceof Date) return `'${val.toISOString()}'`;
            if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
            return val;
          });
          
          sqlDump += `INSERT INTO ${tablename} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
        }
      }
      
      sqlDump += '\n';
    }

    // Get all views
    const viewsResult = await pool.query(`
      SELECT viewname, definition
      FROM pg_views
      WHERE schemaname = 'public'
      ORDER BY viewname
    `);

    console.log(`👁️  Found ${viewsResult.rows.length} views`);

    if (viewsResult.rows.length > 0) {
      sqlDump += `\n-- =====================================================\n`;
      sqlDump += `-- VIEWS\n`;
      sqlDump += `-- =====================================================\n\n`;

      for (const { viewname, definition } of viewsResult.rows) {
        console.log(`  Backing up view: ${viewname}`);
        sqlDump += `-- View: ${viewname}\n`;
        sqlDump += `DROP VIEW IF EXISTS ${viewname} CASCADE;\n`;
        sqlDump += `CREATE VIEW ${viewname} AS\n${definition};\n\n`;
      }
    }

    // Get all functions
    const functionsResult = await pool.query(`
      SELECT 
        p.proname as function_name,
        pg_get_functiondef(p.oid) as function_definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      ORDER BY p.proname
    `);

    console.log(`⚙️  Found ${functionsResult.rows.length} functions`);

    if (functionsResult.rows.length > 0) {
      sqlDump += `\n-- =====================================================\n`;
      sqlDump += `-- FUNCTIONS\n`;
      sqlDump += `-- =====================================================\n\n`;

      for (const { function_name, function_definition } of functionsResult.rows) {
        console.log(`  Backing up function: ${function_name}`);
        sqlDump += `-- Function: ${function_name}\n`;
        sqlDump += `${function_definition};\n\n`;
      }
    }

    // Write to file
    fs.writeFileSync(backupFile, sqlDump);
    
    console.log(`\n✅ Backup completed successfully!`);
    console.log(`📁 Backup file: ${backupFile}`);
    console.log(`📊 File size: ${(fs.statSync(backupFile).size / 1024).toFixed(2)} KB`);

    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  }
}

backupDatabase();
