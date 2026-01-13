/**
 * Check the schema of mc_transaction_details table
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'david_user',
    password: process.env.DB_PASS || 'Davidsoyaya@1015',
    database: process.env.DB_NAME || 'david',
};

async function checkSchema() {
    const pool = new Pool(dbConfig);

    try {
        console.log('🔍 Checking mc_transaction_details table schema...\n');

        const schemaQuery = `
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_name = 'mc_transaction_details'
            ORDER BY ordinal_position
        `;
        
        const result = await pool.query(schemaQuery);
        
        console.log('📊 Table Schema:');
        result.rows.forEach(row => {
            console.log(`   ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });

        // Also check a sample row to see the actual data structure
        console.log('\n📊 Sample Data:');
        const sampleQuery = `SELECT * FROM mc_transaction_details LIMIT 1`;
        const sampleResult = await pool.query(sampleQuery);
        
        if (sampleResult.rows.length > 0) {
            console.log('Sample row columns:', Object.keys(sampleResult.rows[0]));
        } else {
            console.log('No data found in table');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

checkSchema().catch(console.error);