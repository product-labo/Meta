const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: parseInt(process.env.DB_PORT || '5432'),
});

async function analyzeAdoption() {
    console.log('📊 Analyzing User Adoption (New User Growth)...');

    try {
        const client = await pool.connect();

        // 1. Daily New Users (Growth)
        // Users whose FIRST transaction was on a given day
        const dailyAdoptionQuery = `
            WITH FirstInteractions AS (
                SELECT 
                    from_address,
                    chain_id,
                    MIN(captured_at) as first_seen
                FROM mc_transaction_details
                GROUP BY from_address, chain_id
            )
            SELECT 
                DATE(first_seen) as date,
                chain_id,
                COUNT(*) as new_users
            FROM FirstInteractions
            GROUP BY DATE(first_seen), chain_id
            ORDER BY date DESC
            LIMIT 30;
        `;

        console.log('\n📅 Daily New Users (Last 30 Days):');
        const dailyResult = await client.query(dailyAdoptionQuery);
        console.table(dailyResult.rows);

        // 2. Cumulative Growth
        const totalUsersQuery = `
            SELECT 
                chain_id,
                COUNT(DISTINCT from_address) as total_unique_users
            FROM mc_transaction_details
            GROUP BY chain_id;
        `;

        console.log('\n📈 Total User Base by Chain:');
        const totalResult = await client.query(totalUsersQuery);
        console.table(totalResult.rows);

        client.release();
    } catch (err) {
        console.error('❌ Error analyzing adoption:', err);
    } finally {
        await pool.end();
    }
}

analyzeAdoption();
