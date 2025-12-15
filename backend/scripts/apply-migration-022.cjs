const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'postgres',
    database: process.env.DB_NAME || 'boardling',
});

async function applyMigration() {
    try {
        const migrationPath = path.join(__dirname, '../migrations/022_add_comprehensive_metrics.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Applying Migration 022...');
        await pool.query(migrationSql);
        console.log('Migration Applied Successfully!');

    } catch (e) {
        console.error('Migration Failed:', e);
    } finally {
        pool.end();
    }
}

applyMigration();
