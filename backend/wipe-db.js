import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'boardling',
    password: process.env.DB_PASS || 'boardling123',
    database: process.env.DB_NAME || 'boardling',
});

async function wipe() {
    try {
        console.log('Testing connection...');
        await pool.query('SELECT NOW()');
        console.log('Dropping schema public...');
        await pool.query('DROP SCHEMA public CASCADE');
        console.log('Recreating schema public...');
        await pool.query('CREATE SCHEMA public');
        await pool.query('GRANT ALL ON SCHEMA public TO public');
        // Grant to current user if needed, but usually owner has access.
        // If the user 'boardling' is not a superuser, they might need explicit grants or might not be able to drop schema if they don't own it.
        // But usually in local dev setup it works or the user owns the DB.
        console.log('Wipe complete.');
        process.exit(0);
    } catch (e) {
        console.error('Wipe failed:', e);
        process.exit(1);
    }
}

wipe();
