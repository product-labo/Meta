
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

async function runMigration() {
    try {
        console.log('Connecting...');
        const client = await pool.connect();
        console.log('Connected. Applying migration 021...');

        await client.query(`
            DO $$
            BEGIN
                -- Drop the old constraint if it exists
                IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_custodial_wallets_user_project') THEN
                    ALTER TABLE custodial_wallets DROP CONSTRAINT uq_custodial_wallets_user_project;
                    RAISE NOTICE 'Dropped old constraint';
                END IF;
            END $$;
        `);

        // Drop index if exists
        await client.query(`DROP INDEX IF EXISTS uq_custodial_wallets_user_project`);
        await client.query(`DROP INDEX IF EXISTS idx_custodial_wallets_unique_user_project_network`);

        // Create new unique index
        await client.query(`
            CREATE UNIQUE INDEX idx_custodial_wallets_unique_user_project_network 
            ON custodial_wallets (user_id, COALESCE(project_id, '00000000-0000-0000-0000-000000000000'), network)
        `);

        console.log('Migration 021 applied successfully.');
        client.release();
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

runMigration();
