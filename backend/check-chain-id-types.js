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

async function checkDataTypes() {
    try {
        console.log('🔍 Checking chain_id data types...\n');
        
        // Check bi_contract_index chain_id type
        const bciResult = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'bi_contract_index' AND column_name = 'chain_id'
        `);
        console.log('bi_contract_index.chain_id:', bciResult.rows[0]);
        
        // Check mc_transaction_details chain_id type
        const tdResult = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'mc_transaction_details' AND column_name = 'chain_id'
        `);
        console.log('mc_transaction_details.chain_id:', tdResult.rows[0]);
        
        // Check sample values
        console.log('\n📊 Sample values:');
        const sampleBci = await pool.query('SELECT chain_id FROM bi_contract_index LIMIT 1');
        const sampleTd = await pool.query('SELECT chain_id FROM mc_transaction_details LIMIT 1');
        
        console.log('Sample bi_contract_index.chain_id:', sampleBci.rows[0]);
        console.log('Sample mc_transaction_details.chain_id:', sampleTd.rows[0]);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkDataTypes();