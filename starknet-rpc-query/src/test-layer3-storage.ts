console.log('🔧 LAYER 3: Testing Data Storage...');

import { loadConfig } from './utils/config';
import { Database } from './database/Database';
import { StarknetRPCClient } from './services/rpc/StarknetRPCClient';

async function testDataStorageLayer() {
  try {
    console.log('Step 3A: Setting up components...');
    const config = loadConfig();
    const db = new Database(config.database);
    await db.connect();
    const rpc = new StarknetRPCClient('https://rpc.starknet.lava.build', 15000);
    console.log('✅ Components ready');
    
    console.log('Step 3B: Fetching a block...');
    const currentBlock = await rpc.getBlockNumber();
    const testBlockNumber = currentBlock - 1n;
    const block = await rpc.getBlock(testBlockNumber);
    console.log('✅ Block fetched:', {
      blockNumber: block.blockNumber,
      blockHash: block.blockHash,
      transactionCount: block.transactions?.length || 0
    });
    
    console.log('Step 3C: Testing block storage...');
    await db.transaction(async (client) => {
      console.log('Inserting block with values:', {
        block_number: Number(block.blockNumber),
        block_hash: block.blockHash,
        parent_block_hash: block.parentBlockHash,
        timestamp: Math.floor(block.timestamp.getTime() / 1000),
        finality_status: 'ACCEPTED_ON_L2'
      });
      
      const result = await client.query(`
        INSERT INTO blocks (block_number, block_hash, parent_block_hash, timestamp, finality_status)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (block_number) DO NOTHING
        RETURNING block_number
      `, [
        Number(block.blockNumber),
        block.blockHash,
        block.parentBlockHash,
        Math.floor(block.timestamp.getTime() / 1000),
        'ACCEPTED_ON_L2'
      ]);
      
      console.log('✅ Block insert result:', result.rows);
    });
    
    console.log('Step 3D: Testing transaction storage...');
    if (block.transactions && block.transactions.length > 0) {
      const tx = block.transactions[0];
      await db.transaction(async (client) => {
        console.log('Inserting transaction with values:', {
          tx_hash: tx.txHash,
          block_number: Number(block.blockNumber),
          tx_type: tx.txType,
          sender_address: tx.senderAddress,
          status: 'ACCEPTED_ON_L2'
        });
        
        const result = await client.query(`
          INSERT INTO transactions (tx_hash, block_number, tx_type, sender_address, status)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (tx_hash) DO NOTHING
          RETURNING tx_hash
        `, [
          tx.txHash,
          Number(block.blockNumber),
          tx.txType,
          tx.senderAddress,
          'ACCEPTED_ON_L2'
        ]);
        
        console.log('✅ Transaction insert result:', result.rows);
      });
    }
    
    console.log('🎉 Data Storage Layer working correctly!');
    
  } catch (error: any) {
    console.error('❌ Data Storage Layer failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testDataStorageLayer();
