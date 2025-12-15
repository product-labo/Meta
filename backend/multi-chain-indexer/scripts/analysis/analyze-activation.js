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

async function analyzeActivation() {
    console.log('⚡ Analyzing User Activation (Engagement Quality)...');

    try {
        const client = await pool.connect();

        // DEFINITION: An "Activated" user is someone who has performed >= X transactions
        const ACTIVATION_THRESHOLD = 2; // e.g., 2 transactions to be considered "activated" (not just a one-off)

        const activationQuery = `
            WITH UserStats AS (
                SELECT 
                    from_address,
                    chain_id,
                    COUNT(*) as tx_count,
                    MIN(captured_at) as first_seen,
                    MAX(captured_at) as last_seen
                FROM mc_transaction_details
                GROUP BY from_address, chain_id
            )
            SELECT 
                chain_id,
                COUNT(*) as total_users,
                COUNT(CASE WHEN tx_count >= $1 THEN 1 END) as activated_users,
                (COUNT(CASE WHEN tx_count >= $1 THEN 1 END)::numeric / COUNT(*) * 100)::numeric(5,2) as activation_rate_percent,
                AVG(tx_count)::numeric(10,2) as avg_tx_per_user
            FROM UserStats
            GROUP BY chain_id;
        `;

        console.log(`\n🔍 Activation Stats (Threshold: ${ACTIVATION_THRESHOLD}+ Transactions):`);
        const result = await client.query(activationQuery, [ACTIVATION_THRESHOLD]);
        console.table(result.rows);

        // Power Users (Top 10%)
        const powerUserQuery = `
             WITH UserStats AS (
                SELECT 
                    from_address,
                    COUNT(*) as tx_count
                FROM mc_transaction_details
                GROUP BY from_address
            ),
            Percentiles AS (
                SELECT 
                    percentile_cont(0.9) WITHIN GROUP (ORDER BY tx_count) as p90_threshold
                FROM UserStats
            )
            SELECT 
                u.from_address,
                u.tx_count,
                'Power User' as status
            FROM UserStats u, Percentiles p
            WHERE u.tx_count >= p.p90_threshold
            ORDER BY u.tx_count DESC
            LIMIT 10;
        `;

        console.log('\n🏆 Top Measured Power Users:');
        const powerResult = await client.query(powerUserQuery);
        console.table(powerResult.rows);

        client.release();
    } catch (err) {
        console.error('❌ Error analyzing activation:', err);
    } finally {
        await pool.end();
    }
}

analyzeActivation();
