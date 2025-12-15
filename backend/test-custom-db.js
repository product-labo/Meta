
import pg from 'pg';
const { Pool } = pg;

const config = {
    user: 'zcash_user',
    host: '127.0.0.1', // Force IPv4 to avoid node resolution issues
    database: 'zcash_indexer',
    password: 'yourpassword',
    port: 5432,
    connectionTimeoutMillis: 5000, // Fail fast
};

console.log('Testing connection with config:', config);

const pool = new Pool(config);

async function testConnection() {
    try {
        const client = await pool.connect();
        console.log('Successfully connected to database!');

        const res = await client.query('SELECT NOW()');
        console.log('Database time:', res.rows[0].now);

        // Optional: Check if tables exist
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('Tables found:', tables.rows.map(r => r.table_name));

        client.release();
    } catch (err) {
        console.error('Connection failed:', err.message);
    } finally {
        await pool.end();
    }
}

testConnection();
