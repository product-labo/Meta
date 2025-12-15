
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load env
console.log('Loading env...');
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'zcash_user',
    password: process.env.DB_PASS || 'yourpassword',
    database: process.env.DB_NAME || 'zcash_indexer',
    connectionTimeoutMillis: 5000,
});

async function checkLastProject() {
    try {
        console.log('Connecting to DB...');
        const client = await pool.connect();
        console.log('Connected. Querying...');
        const res = await client.query('SELECT * FROM projects ORDER BY created_at DESC LIMIT 1');

        if (res.rows.length > 0) {
            console.log('Last saved project found:');
            console.log(JSON.stringify(res.rows[0], null, 2));
        } else {
            console.log('No projects found.');
        }
        client.release();
    } catch (err) {
        console.error('Query failed:', err);
    } finally {
        console.log('Closing pool...');
        await pool.end();
        console.log('Done.');
    }
}

checkLastProject();
