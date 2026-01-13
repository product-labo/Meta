console.log('🔧 Testing event processing...');

import { loadConfig } from './src/utils/config';
import { Database } from './src/database/Database';
import { StarknetRPCClient } from './src/services/rpc/StarknetRPCClient';

async function testEventProcessing() {
  try {
    const config = loadConfig();
    const db = new Database(config.database);
    await db.connect();
    const rpc = new StarknetRPCClient('https://rpc.starknet.lava.build', 15000);
    
    console.log('Testing single block with events...');
    const currentBlock = await rpc.getBlockNumber();
    const testBlock = currentBlock - 1n;
    
    console.log(`Fetching block ${testBlock}...`);
    const block = await rpc.getBlockWithReceipts(testBlock);
    
    console.log(`Block ${testBlock} has ${block.transactions?.length || 0} transactions`);
    
    if (block.transactions) {
      for (const tx of block.transactions) {
        console.log(`TX ${tx.txHash}: type=${tx.txType}, events=${tx.events?.length || 0}`);
        if (tx.events && tx.events.length > 0) {
          console.log('  Events found:', tx.events);
        }
      }
    }
    
  } catch (error: any) {
    console.error('Test failed:', error.message);
  }
}

testEventProcessing();
