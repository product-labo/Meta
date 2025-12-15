
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'postgres',
    database: process.env.DB_NAME || 'boardling',
});

async function runSingleMigration() {
    console.log('Running targeted migration: fix_custody_constraints.sql');
    try {
        await pool.query('BEGIN');

        const sqlPath = path.join(__dirname, 'migrations', 'fix_custody_constraints.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executing SQL...');
        await pool.query(sql);

        await pool.query('COMMIT');
        console.log('Migration successful!');
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
    }
}

runSingleMigration();
