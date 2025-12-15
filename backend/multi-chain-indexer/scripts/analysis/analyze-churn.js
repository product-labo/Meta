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

async function analyzeChurn() {
    console.log('📉 Analyzing User Churn (Lost Users)...');

    try {
        const client = await pool.connect();

        // DEFINITION: Users who were active > 30 days ago but have 0 transactions in the last 30 days.
        const CHURN_WINDOW_DAYS = 30;

        const churnQuery = `
            WITH LastActivity AS (
                SELECT 
                    from_address,
                    MAX(captured_at) as last_seen_at
                FROM mc_transaction_details
                GROUP BY from_address
            )
            SELECT 
                COUNT(*) as total_churned_users,
                COUNT(CASE WHEN last_seen_at < NOW() - INTERVAL '30 days' THEN 1 END) as churned_30d,
                COUNT(CASE WHEN last_seen_at < NOW() - INTERVAL '60 days' THEN 1 END) as churned_60d,
                COUNT(CASE WHEN last_seen_at < NOW() - INTERVAL '90 days' THEN 1 END) as churned_90d
            FROM LastActivity
            WHERE last_seen_at < NOW() - INTERVAL '30 days'; -- Filter purely for efficiency if needed
        `;

        console.log(`\n🚫 Churn Statistics (Inactive for > ${CHURN_WINDOW_DAYS} days):`);
        const result = await client.query(churnQuery);
        console.table(result.rows);

        // List Recent Churns (Users we just lost in the window)
        // Active between 60-30 days ago, but NOT active in last 30 days
        const recentChurnListQuery = `
            SELECT 
                from_address,
                MAX(captured_at) as last_active_date,
                COUNT(*) as lifetime_tx_count
            FROM mc_transaction_details
            GROUP BY from_address
            HAVING MAX(captured_at) < NOW() - INTERVAL '30 days'
               AND MAX(captured_at) > NOW() - INTERVAL '60 days'
            ORDER BY lifetime_tx_count DESC
            LIMIT 10;
        `;

        console.log('\n⚠️ Recently Curbed High-Value Users (Risk List):');
        const listResult = await client.query(recentChurnListQuery);
        console.table(listResult.rows);

        client.release();
    } catch (err) {
        console.error('❌ Error analyzing churn:', err);
    } finally {
        await pool.end();
    }
}

analyzeChurn();
