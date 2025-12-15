import dotenv from 'dotenv';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

dotenv.config();

const { Pool } = pg;

// Parse connection string or use params
// Prioritize DATABASE_URL (Railway) as local might be down
const connectionString = process.env.DATABASE_URL || process.env.LOCAL_CONNECTION_STRING || 'postgresql://postgres:yourpassword@localhost:5432/boardling_lisk';

const pool = new Pool({
  connectionString,
});

async function runMigration() {
  console.log('Connecting to database...');
  try {
    const client = await pool.connect();
    console.log('Connected successfully.');

    const sqlPath = path.join(process.cwd(), 'migrations', 'add-chain-to-wallets.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running migration...');
    await client.query(sql);
    console.log('Migration completed successfully!');

    client.release();
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
