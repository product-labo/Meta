const { Client } = require('pg');
const { StarknetRPCClient } = require('./dist/services/rpc/StarknetRPCClient');
require('dotenv').config();

async function verifyRealData() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  const rpc = new StarknetRPCClient(process.env.STARKNET_RPC_URL, 30000);

  try {
    await client.connect();
    console.log('🔧 Verifying real data against Starknet RPC...\n');
    
    // Get a recent transaction from our database
    const dbTx = await client.query(`
      SELECT tx_hash, block_number, sender_address, tx_type
      FROM transactions 
      WHERE block_number > (SELECT MAX(block_number) - 5 FROM blocks)
      ORDER BY block_number DESC 
      LIMIT 1
    `);
    
    if (dbTx.rows.length === 0) {
      console.log('❌ No recent transactions found in database');
      return;
    }
    
    const tx = dbTx.rows[0];
    console.log('📊 Database transaction:');
    console.log(`  - Hash: ${tx.tx_hash}`);
    console.log(`  - Block: ${tx.block_number}`);
    console.log(`  - Sender: ${tx.sender_address}`);
    console.log(`  - Type: ${tx.tx_type}`);
    
    // Fetch the same transaction from RPC
    console.log('\n🔍 Fetching from Starknet RPC...');
    try {
      const rpcTx = await rpc.getTransaction(tx.tx_hash);
      console.log('✅ RPC transaction found!');
      console.log(`  - Hash: ${rpcTx.transaction_hash}`);
      console.log(`  - Type: ${rpcTx.type}`);
      console.log(`  - Sender: ${rpcTx.sender_address || 'N/A'}`);
      
      // Compare data
      const hashMatch = tx.tx_hash === rpcTx.transaction_hash;
      const typeMatch = tx.tx_type === rpcTx.type;
      const senderMatch = tx.sender_address === (rpcTx.sender_address || null);
      
      console.log('\n📊 Data verification:');
      console.log(`  - Hash match: ${hashMatch ? '✅' : '❌'}`);
      console.log(`  - Type match: ${typeMatch ? '✅' : '❌'}`);
      console.log(`  - Sender match: ${senderMatch ? '✅' : '❌'}`);
      
      if (hashMatch && typeMatch) {
        console.log('\n🎉 DATA IS AUTHENTIC! Our database contains real Starknet data.');
      } else {
        console.log('\n⚠️ Data mismatch detected.');
      }
      
    } catch (rpcError) {
      console.log('❌ Failed to fetch from RPC:', rpcError.message);
    }
    
    // Get a recent block and verify
    console.log('\n🔍 Verifying block data...');
    const dbBlock = await client.query(`
      SELECT block_number, block_hash, parent_block_hash, timestamp
      FROM blocks 
      ORDER BY block_number DESC 
      LIMIT 1
    `);
    
    if (dbBlock.rows.length > 0) {
      const block = dbBlock.rows[0];
      console.log('📊 Latest block in database:');
      console.log(`  - Number: ${block.block_number}`);
      console.log(`  - Hash: ${block.block_hash}`);
      console.log(`  - Parent: ${block.parent_block_hash}`);
      console.log(`  - Timestamp: ${new Date(block.timestamp * 1000).toISOString()}`);
      
      try {
        const rpcBlock = await rpc.getBlock(parseInt(block.block_number));
        console.log('\n✅ RPC block found!');
        console.log(`  - Number: ${rpcBlock.block_number}`);
        console.log(`  - Hash: ${rpcBlock.block_hash}`);
        
        const blockHashMatch = block.block_hash === rpcBlock.block_hash;
        const blockNumberMatch = block.block_number === rpcBlock.block_number.toString();
        
        console.log('\n📊 Block verification:');
        console.log(`  - Number match: ${blockNumberMatch ? '✅' : '❌'}`);
        console.log(`  - Hash match: ${blockHashMatch ? '✅' : '❌'}`);
        
      } catch (blockError) {
        console.log('❌ Failed to fetch block from RPC:', blockError.message);
      }
    }
    
    // Check data statistics
    console.log('\n📊 Current database statistics:');
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM blocks) as blocks,
        (SELECT COUNT(*) FROM transactions) as transactions,
        (SELECT COUNT(*) FROM events) as events,
        (SELECT COUNT(*) FROM contracts) as contracts,
        (SELECT MAX(block_number) FROM blocks) as latest_block,
        (SELECT MIN(block_number) FROM blocks) as earliest_block
    `);
    
    const s = stats.rows[0];
    console.log(`  - Total blocks: ${s.blocks}`);
    console.log(`  - Total transactions: ${s.transactions}`);
    console.log(`  - Total events: ${s.events}`);
    console.log(`  - Total contracts: ${s.contracts}`);
    console.log(`  - Block range: ${s.earliest_block} to ${s.latest_block}`);
    
    const coverage = parseInt(s.blocks);
    const range = parseInt(s.latest_block) - parseInt(s.earliest_block) + 1;
    const completeness = ((coverage / range) * 100).toFixed(1);
    console.log(`  - Coverage: ${completeness}% of block range`);
    
    console.log('\n✅ Real data verification completed!');
    
    await client.end();
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    await client.end();
  }
}

verifyRealData();