console.log('🔧 LAYER 4: Testing HistoricalDataFetcher...');

import { loadConfig } from './utils/config';
import { Database } from './database/Database';
import { StarknetRPCClient } from './services/rpc/StarknetRPCClient';
import { HistoricalDataFetcher } from './services/ingestion/HistoricalDataFetcher';

async function testHistoricalFetcherLayer() {
  try {
    console.log('Step 4A: Setting up components...');
    const config = loadConfig();
    const db = new Database(config.database);
    await db.connect();
    const rpc = new StarknetRPCClient('https://rpc.starknet.lava.build', 15000);
    const fetcher = new HistoricalDataFetcher(rpc, db);
    console.log('✅ Components ready');
    
    console.log('Step 4B: Testing single block processing...');
    const currentBlock = await rpc.getBlockNumber();
    const testBlockNumber = currentBlock - 2n; // Use a different block
    
    console.log(`Processing block ${testBlockNumber}...`);
    await (fetcher as any).processBlock(testBlockNumber);
    console.log('✅ Single block processed successfully');
    
    console.log('🎉 HistoricalDataFetcher Layer working correctly!');
    
  } catch (error: any) {
    console.error('❌ HistoricalDataFetcher Layer failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testHistoricalFetcherLayer();
