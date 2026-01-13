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

async function checkMetricsTables() {
    try {
        console.log('🔍 Checking metrics-related tables...\n');
        
        // Check mc_transaction_details
        console.log('📊 mc_transaction_details:');
        try {
            const mcResult = await pool.query('SELECT * FROM mc_transaction_details LIMIT 1');
            if (mcResult.rows.length > 0) {
                console.log('  Columns:', Object.keys(mcResult.rows[0]));
                console.log('  Sample:', mcResult.rows[0]);
            } else {
                console.log('  No data found');
            }
        } catch (error) {
            console.log('  Error:', error.message);
        }
        
        console.log('\n📈 project_metrics_realtime:');
        try {
            const pmResult = await pool.query('SELECT * FROM project_metrics_realtime LIMIT 1');
            if (pmResult.rows.length > 0) {
                console.log('  Columns:', Object.keys(pmResult.rows[0]));
            } else {
                console.log('  No data found');
            }
        } catch (error) {
            console.log('  Error:', error.message);
        }
        
        console.log('\n💰 wallet_metrics_realtime:');
        try {
            const wmResult = await pool.query('SELECT * FROM wallet_metrics_realtime LIMIT 1');
            if (wmResult.rows.length > 0) {
                console.log('  Columns:', Object.keys(wmResult.rows[0]));
            } else {
                console.log('  No data found');
            }
        } catch (error) {
            console.log('  Error:', error.message);
        }
        
        // Let's also check what data we actually have
        console.log('\n📋 Available data summary:');
        const tables = ['bi_contract_index', 'mc_transaction_details', 'contracts', 'transactions'];
        
        for (const table of tables) {
            try {
                const countResult = await pool.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`  ${table}: ${countResult.rows[0].count} rows`);
            } catch (error) {
                console.log(`  ${table}: Error - ${error.message}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkMetricsTables();