import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
});

pool.query(`UPDATE users SET subscription_expires_at = NOW() + INTERVAL '30 days' WHERE subscription_expires_at IS NULL`)
  .then(result => {
    console.log(`✅ Updated ${result.rowCount} users with expiration dates`);
    return pool.end();
  })
  .catch(err => {
    console.error('Error:', err.message);
    pool.end();
  });
