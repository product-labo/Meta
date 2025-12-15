
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load env
const result = dotenv.config({ path: path.join(__dirname, '../.env') });
if (result.error) {
    console.log('Error loading .env:', result.error);
} else {
    console.log('.env loaded successfully');
}

const config = {
    host: process.env.DB_HOST || 'localhost (default)',
    port: process.env.DB_PORT || '5432 (default)',
    user: process.env.DB_USER || 'zcash_user (default)',
    database: process.env.DB_NAME || 'zcash_indexer (default)',
    passwordLength: (process.env.DB_PASS || '').length
};

console.log('DB Config:', config);

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'zcash_user',
    password: process.env.DB_PASS || 'yourpassword',
    database: process.env.DB_NAME || 'zcash_indexer',
    connectionTimeoutMillis: 5000,
});

async function testConnection() {
    try {
        console.log('Connecting...');
        const client = await pool.connect();
        console.log('Connected!');

        console.log('Querying last project...');
        const res = await client.query('SELECT * FROM projects ORDER BY created_at DESC LIMIT 1');

        if (res.rows.length > 0) {
            console.log('Last saved project found:');
            console.log(JSON.stringify(res.rows[0], null, 2));
        } else {
            console.log('No projects found.');
        }

        client.release();

    } catch (err) {
        console.error('Connection failed:', err);
    } finally {
        await pool.end();
    }
}

testConnection();
