#!/usr/bin/env node

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    user: 'david_user',
    password: 'Davidsoyaya@1015',
    host: 'localhost',
    port: 5432,
    database: 'david'
});

async function checkSchema() {
    try {
        console.log('🔍 Checking bi_contract_index table schema...\n');
        
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'bi_contract_index' 
            ORDER BY ordinal_position
        `);
        
        console.log('📋 bi_contract_index table columns:');
        result.rows.forEach(row => {
            console.log(`  ${row.column_name}: ${row.data_type} (${row.is_nullable})`);
        });
        
        // Also check a sample row
        console.log('\n📊 Sample data:');
        const sample = await pool.query('SELECT * FROM bi_contract_index LIMIT 1');
        if (sample.rows.length > 0) {
            console.log('Sample row keys:', Object.keys(sample.rows[0]));
            console.log('Sample row:', sample.rows[0]);
        } else {
            console.log('No data found in bi_contract_index table');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkSchema();