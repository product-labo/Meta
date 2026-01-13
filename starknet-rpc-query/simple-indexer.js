const axios = require('axios');
const { Client } = require('pg');

const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'david',
  user: 'david_user',
  password: 'Davidsoyaya@1015'
};

const RPC_URL = 'https://rpc.starknet.lava.build';

async function fetchAndStoreBlocks() {
  const client = new Client(DB_CONFIG);
  await client.connect();
  
  try {
    // Get current latest block from DB
    const result = await client.query('SELECT MAX(block_number) as latest FROM blocks');
    const latestInDb = parseInt(result.rows[0].latest) || 0;
    
    console.log(`Latest block in DB: ${latestInDb}`);
    
    // Get current block from RPC
    const rpcResponse = await axios.post(RPC_URL, {
      jsonrpc: '2.0',
      method: 'starknet_blockNumber',
      id: 1
    });
    
    const currentBlock = parseInt(rpcResponse.data.result, 16);
    console.log(`Current network block: ${currentBlock}`);
    
    // Fetch missing blocks
    for (let blockNum = latestInDb + 1; blockNum <= Math.min(latestInDb + 5, currentBlock); blockNum++) {
      try {
        console.log(`Fetching block ${blockNum}...`);
        
        const blockResponse = await axios.post(RPC_URL, {
          jsonrpc: '2.0',
          method: 'starknet_getBlockWithTxs',
          params: [{ block_number: blockNum }],
          id: 1
        });
        
        const block = blockResponse.data.result;
        
        // Insert block
        await client.query(`
          INSERT INTO blocks (block_number, block_hash, parent_block_hash, timestamp, finality_status, created_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (block_number) DO NOTHING
        `, [
          blockNum,
          block.block_hash,
          block.parent_hash,
          new Date(block.timestamp * 1000),
          'ACCEPTED_ON_L2'
        ]);
        
        // Insert transactions
        if (block.transactions) {
          for (const tx of block.transactions) {
            await client.query(`
              INSERT INTO transactions (tx_hash, block_number, tx_type, sender_address, status, created_at)
              VALUES ($1, $2, $3, $4, $5, NOW())
              ON CONFLICT (tx_hash) DO NOTHING
            `, [
              tx.transaction_hash,
              blockNum,
              tx.type || 'UNKNOWN',
              tx.sender_address || '0x0',
              'ACCEPTED_ON_L2'
            ]);
          }
        }
        
        console.log(`✅ Block ${blockNum} stored with ${block.transactions?.length || 0} transactions`);
        
      } catch (error) {
        console.error(`❌ Error fetching block ${blockNum}:`, error.message);
      }
    }
    
  } finally {
    await client.end();
  }
}

// Run continuously
async function startIndexer() {
  console.log('🚀 Starting simple indexer...');
  
  while (true) {
    try {
      await fetchAndStoreBlocks();
      console.log('⏳ Waiting 10 seconds...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    } catch (error) {
      console.error('💥 Indexer error:', error.message);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

startIndexer();
