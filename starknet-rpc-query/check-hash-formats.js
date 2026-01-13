const { Client } = require('pg');
require('dotenv').config();

async function checkHashFormats() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('🔧 Checking hash formats...\n');
    
    // Check sample transaction hashes
    const sampleTxHashes = await client.query(`
      SELECT tx_hash, LENGTH(tx_hash) as hash_length
      FROM transactions 
      ORDER BY block_number DESC 
      LIMIT 5
    `);
    
    console.log('📊 Sample transaction hashes:');
    sampleTxHashes.rows.forEach((row, i) => {
      console.log(`  ${i+1}. ${row.tx_hash} (length: ${row.hash_length})`);
    });
    
    // Check sample block hashes
    const sampleBlockHashes = await client.query(`
      SELECT block_hash, LENGTH(block_hash) as hash_length
      FROM blocks 
      ORDER BY block_number DESC 
      LIMIT 5
    `);
    
    console.log('\n📊 Sample block hashes:');
    sampleBlockHashes.rows.forEach((row, i) => {
      console.log(`  ${i+1}. ${row.block_hash} (length: ${row.hash_length})`);
    });
    
    // Check hash length distribution
    const txHashLengths = await client.query(`
      SELECT LENGTH(tx_hash) as hash_length, COUNT(*) as count
      FROM transactions 
      GROUP BY LENGTH(tx_hash)
      ORDER BY hash_length
    `);
    
    console.log('\n📊 Transaction hash length distribution:');
    txHashLengths.rows.forEach(row => {
      console.log(`  Length ${row.hash_length}: ${row.count} hashes`);
    });
    
    const blockHashLengths = await client.query(`
      SELECT LENGTH(block_hash) as hash_length, COUNT(*) as count
      FROM blocks 
      GROUP BY LENGTH(block_hash)
      ORDER BY hash_length
    `);
    
    console.log('\n📊 Block hash length distribution:');
    blockHashLengths.rows.forEach(row => {
      console.log(`  Length ${row.hash_length}: ${row.count} hashes`);
    });
    
    await client.end();
    
  } catch (error) {
    console.error('❌ Hash format check failed:', error.message);
    await client.end();
  }
}

checkHashFormats();