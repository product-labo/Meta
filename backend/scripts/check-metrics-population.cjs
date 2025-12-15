const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

async function main() {
    try {
        const res = await pool.query('SELECT project_id, total_users, gas_consumed FROM project_metrics');
        console.log('Project Metrics Count:', res.rowCount);
        if (res.rowCount > 0) {
            console.log('Sample:', res.rows[0]);
        } else {
            console.log('No metrics found.');
        }

        const txs = await pool.query('SELECT COUNT(*) FROM mc_transaction_details');
        console.log('Indexer TX Count:', txs.rows[0].count);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
main();
