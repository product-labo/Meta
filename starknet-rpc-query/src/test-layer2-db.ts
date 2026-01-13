console.log('🔧 LAYER 2: Testing Database Connection...');

import { loadConfig } from './utils/config';
import { Database } from './database/Database';

async function testDatabaseLayer() {
  try {
    console.log('Step 2A: Loading config...');
    const config = loadConfig();
    console.log('✅ Config loaded');
    
    console.log('Step 2B: Creating database instance...');
    const db = new Database(config.database);
    console.log('✅ Database instance created');
    
    console.log('Step 2C: Connecting to database...');
    await db.connect();
    console.log('✅ Database connected');
    
    console.log('Step 2D: Testing query...');
    const result = await db.query('SELECT COUNT(*) as count FROM blocks');
    console.log('✅ Query result:', result[0]);
    
    console.log('Step 2E: Testing transaction...');
    await db.transaction(async (client) => {
      const testResult = await client.query('SELECT 1 as test');
      console.log('✅ Transaction test:', testResult.rows[0]);
    });
    
    console.log('🎉 Database Layer working correctly!');
    return db;
    
  } catch (error: any) {
    console.error('❌ Database Layer failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testDatabaseLayer();
