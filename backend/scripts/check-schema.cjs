
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

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

async function checkSchema() {
    try {
        console.log('Connecting...');
        const client = await pool.connect();
        console.log('Connected.');

        console.log('--- Users Table ---');
        const users = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users'
        `);
        users.rows.forEach(row => console.log(`${row.column_name}: ${row.data_type}`));

        console.log('\n--- Projects Table ---');
        const projects = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'projects'
        `);
        projects.rows.forEach(row => console.log(`${row.column_name}: ${row.data_type}`));

        client.release();
    } catch (err) {
        console.error('Error:', err);
    } finally {
        console.log('Closing pool...');
        await pool.end();
        console.log('Done.');
    }
}

checkSchema();
