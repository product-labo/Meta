const { Client } = require('pg');
require('dotenv').config();

async function testDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('🔧 Testing database connection...');
    console.log('📋 Database URL:', process.env.DATABASE_URL);
    
    await client.connect();
    console.log('✅ Database connected successfully!');
    
    // Test basic query
    const result = await client.query('SELECT NOW() as current_time, version()');
    console.log('📊 Current time:', result.rows[0].current_time);
    console.log('📊 PostgreSQL version:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
    
    // Check if tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📊 Tables in database:', tablesResult.rows.length);
    tablesResult.rows.forEach(row => {
      console.log('  -', row.table_name);
    });
    
    await client.end();
    console.log('✅ Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    await client.end();
  }
}

testDatabase();