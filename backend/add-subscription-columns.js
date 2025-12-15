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

async function addSubscriptionColumns() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Adding subscription-related columns to users table...\n');
    
    // Add subscription_status column
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'free'
    `);
    console.log('✅ Added subscription_status column');
    
    // Add subscription_expires_at column
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE
    `);
    console.log('✅ Added subscription_expires_at column');
    
    // Add onboarding_completed column
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false
    `);
    console.log('✅ Added onboarding_completed column');
    
    // Add balance_zec column
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS balance_zec DECIMAL(20, 8) DEFAULT 0
    `);
    console.log('✅ Added balance_zec column');
    
    // Initialize subscription for existing users
    await client.query(`
      UPDATE users 
      SET subscription_status = 'free',
          subscription_expires_at = NOW() + INTERVAL '30 days',
          onboarding_completed = false,
          balance_zec = 0
      WHERE subscription_status IS NULL
    `);
    console.log('✅ Initialized subscription data for existing users');
    
    // Verify the changes
    const result = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('subscription_status', 'subscription_expires_at', 'onboarding_completed', 'balance_zec')
      ORDER BY column_name
    `);
    
    console.log('\n📋 Verified columns:');
    result.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (default: ${col.column_default || 'none'})`);
    });
    
    console.log('\n🎉 Database schema updated successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addSubscriptionColumns();
