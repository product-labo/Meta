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

async function analyzeRetention() {
    console.log('🔄 Analyzing User Retention (Cohort Analysis)...');

    try {
        const client = await pool.connect();

        // Simpson's Paradox / Simple Monthly Retention
        // Users active in Month M who were also active in Month M-1

        const retentionQuery = `
            WITH MonthlyUsers AS (
                SELECT DISTINCT
                    DATE_TRUNC('month', captured_at) as month,
                    from_address
                FROM mc_transaction_details
            ),
            RetentionStats AS (
                SELECT 
                    curr.month as current_month,
                    COUNT(DISTINCT curr.from_address) as active_users,
                    COUNT(DISTINCT prev.from_address) as retained_users,
                    (COUNT(DISTINCT prev.from_address)::numeric / NULLIF(COUNT(DISTINCT curr.from_address), 0) * 100)::numeric(5,2) as retention_rate
                FROM MonthlyUsers curr
                LEFT JOIN MonthlyUsers prev ON prev.from_address = curr.from_address 
                    AND prev.month = curr.month - INTERVAL '1 month'
                GROUP BY curr.month
                ORDER BY curr.month DESC
            )
            SELECT 
                current_month,
                active_users,
                retained_users as returned_from_prev_month,
                retention_rate as retention_percent
            FROM RetentionStats;
        `;

        console.log('\n📅 Monthly Retention Rates:');
        const result = await client.query(retentionQuery);
        console.table(result.rows);

        client.release();
    } catch (err) {
        console.error('❌ Error analyzing retention:', err);
    } finally {
        await pool.end();
    }
}

analyzeRetention();
