const { Client } = require('pg');
require('dotenv').config();

async function testExplorerEndpoints() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('🔧 Testing Explorer Data Queries...\n');
    
    // Test stats query
    console.log('📊 Network Statistics:');
    const statsResult = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM blocks) as blocks,
        (SELECT COUNT(*) FROM transactions) as transactions,
        (SELECT COUNT(*) FROM contracts) as contracts,
        (SELECT COUNT(*) FROM events) as events,
        (SELECT COUNT(*) FROM wallets) as wallets
    `);
    const stats = statsResult.rows[0];
    console.log(`  - Blocks: ${parseInt(stats.blocks).toLocaleString()}`);
    console.log(`  - Transactions: ${parseInt(stats.transactions).toLocaleString()}`);
    console.log(`  - Contracts: ${parseInt(stats.contracts).toLocaleString()}`);
    console.log(`  - Events: ${parseInt(stats.events).toLocaleString()}`);
    console.log(`  - Wallets: ${parseInt(stats.wallets).toLocaleString()}`);
    
    // Test latest blocks
    console.log('\n📦 Latest Blocks:');
    const blocksResult = await client.query(`
      SELECT b.block_number, b.block_hash, b.timestamp, b.finality_status,
             COUNT(t.tx_hash) as tx_count
      FROM blocks b
      LEFT JOIN transactions t ON b.block_number = t.block_number
      GROUP BY b.block_number, b.block_hash, b.timestamp, b.finality_status
      ORDER BY b.block_number DESC 
      LIMIT 5
    `);
    
    blocksResult.rows.forEach((block, i) => {
      const date = new Date(block.timestamp * 1000).toLocaleString();
      console.log(`  ${i+1}. Block ${block.block_number} - ${block.tx_count} txs - ${date}`);
      console.log(`     Hash: ${block.block_hash.substring(0, 20)}...`);
    });
    
    // Test recent transactions
    console.log('\n💸 Recent Transactions:');
    const txResult = await client.query(`
      SELECT tx_hash, block_number, tx_type, sender_address
      FROM transactions 
      ORDER BY block_number DESC 
      LIMIT 5
    `);
    
    txResult.rows.forEach((tx, i) => {
      console.log(`  ${i+1}. ${tx.tx_hash.substring(0, 20)}... (Block ${tx.block_number})`);
      console.log(`     Type: ${tx.tx_type}, Sender: ${tx.sender_address ? tx.sender_address.substring(0, 20) + '...' : 'N/A'}`);
    });
    
    // Test active contracts
    console.log('\n📋 Most Active Contracts:');
    const contractsResult = await client.query(`
      SELECT c.contract_address, c.class_hash, c.deployment_block,
             COUNT(wi.wallet_address) as interaction_count
      FROM contracts c
      LEFT JOIN wallet_interactions wi ON c.contract_address = wi.contract_address
      GROUP BY c.contract_address, c.class_hash, c.deployment_block
      ORDER BY interaction_count DESC
      LIMIT 5
    `);
    
    contractsResult.rows.forEach((contract, i) => {
      console.log(`  ${i+1}. ${contract.contract_address.substring(0, 20)}... (${contract.interaction_count} interactions)`);
      console.log(`     Class: ${contract.class_hash.substring(0, 20)}..., Block: ${contract.deployment_block || 'N/A'}`);
    });
    
    console.log('\n🎉 Explorer data is ready! All queries working correctly.');
    console.log('\n💡 Next steps:');
    console.log('  1. Start the web explorer: node simple-explorer.js');
    console.log('  2. Open browser: http://localhost:3001');
    console.log('  3. Explore your indexed Starknet data!');
    
    await client.end();
    
  } catch (error) {
    console.error('❌ Explorer test failed:', error.message);
    await client.end();
  }
}

testExplorerEndpoints();