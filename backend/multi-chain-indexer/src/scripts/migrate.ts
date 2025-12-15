
import { Client } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env from indexer root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: parseInt(process.env.DB_PORT || '5432'),
};

async function runMigration() {
    console.log('=== Running Multi-Chain Indexer Migrations ===');
    console.log(`Target: ${config.database} @ ${config.host}`);

    const client = new Client(config);

    try {
        await client.connect();

        const migrationFile = path.join(__dirname, '../../migrations/001_initial_schema.sql');
        console.log(`Applying: ${migrationFile}`);

        const sql = fs.readFileSync(migrationFile, 'utf8');

        await client.query(sql);
        console.log('Migration applied successfully.');

    } catch (error: any) {
        console.error('Migration Failed:', error.message);
    } finally {
        await client.end();
    }
}

runMigration();
