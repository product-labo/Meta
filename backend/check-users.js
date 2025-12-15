import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'zcash_indexer',
  user: process.env.DB_USER || 'zcash_user',
  password: process.env.DB_PASS || 'yourpassword',
});

async function checkUsers() {
  try {
    // Check users table structure
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Users table structure:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check if there are any users
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`\n👥 Total users: ${userCount.rows[0].count}`);
    
    // Get sample users
    const users = await pool.query(`
      SELECT id, name, email, subscription_status, subscription_expires_at, 
             onboarding_completed, balance_zec, created_at
      FROM users
      LIMIT 5
    `);
    
    if (users.rows.length > 0) {
      console.log('\n📝 Sample users:');
      users.rows.forEach(user => {
        console.log(`\n  ID: ${user.id}`);
        console.log(`  Name: ${user.name}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Subscription: ${user.subscription_status || 'NULL'}`);
        console.log(`  Expires: ${user.subscription_expires_at || 'NULL'}`);
        console.log(`  Onboarding: ${user.onboarding_completed}`);
        console.log(`  Balance: ${user.balance_zec || 'NULL'}`);
      });
    } else {
      console.log('\n⚠️  No users found in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsers();
