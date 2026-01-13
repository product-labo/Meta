const { Client } = require('pg');
require('dotenv').config();

async function checkCurrentData() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('🔧 Checking current data in database...');
    
    // Check blocks
    const blocksResult = await client.query('SELECT COUNT(*) as count, MIN(block_number) as min_block, MAX(block_number) as max_block FROM blocks');
    console.log('📊 Blocks:', blocksResult.rows[0]);
    
    // Check transactions
    const txResult = await client.query('SELECT COUNT(*) as count FROM transactions');
    console.log('📊 Transactions:', txResult.rows[0].count);
    
    // Check events
    const eventsResult = await client.query('SELECT COUNT(*) as count FROM events');
    console.log('📊 Events:', eventsResult.rows[0].count);
    
    // Check contracts
    const contractsResult = await client.query('SELECT COUNT(*) as count FROM contracts');
    console.log('📊 Contracts:', contractsResult.rows[0].count);
    
    // Check wallets
    const walletsResult = await client.query('SELECT COUNT(*) as count FROM wallets');
    console.log('📊 Wallets:', walletsResult.rows[0].count);
    
    // Check latest block timestamp
    if (parseInt(blocksResult.rows[0].count) > 0) {
      const latestBlock = await client.query('SELECT block_number, timestamp, finality_status FROM blocks ORDER BY block_number DESC LIMIT 1');
      console.log('📊 Latest block:', latestBlock.rows[0]);
    }
    
    await client.end();
    
  } catch (error) {
    console.error('❌ Data check failed:', error.message);
    await client.end();
  }
}

checkCurrentData();