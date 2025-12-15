const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const result = dotenv.config({ path: path.join(__dirname, '../.env') });
if (result.error) {
    console.error('Error loading .env file:', result.error);
    process.exit(1);
}

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
    ssl: process.env.DB_SSL_ENABLED === 'true' ? { rejectUnauthorized: false } : undefined
});

async function runMigration() {
    console.log('Running Migration 023...');
    const client = await pool.connect();

    try {
        const migrationPath = path.join(__dirname, '../migrations/023_add_mc_indexer_tables.sql');
        console.log('Reading migration from:', migrationPath);
        const sql = fs.readFileSync(migrationPath, 'utf8');
        console.log('SQL Length:', sql.length);

        console.log('Applying SQL...');
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log('✅ Migration 023 applied successfully.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration Failed:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
