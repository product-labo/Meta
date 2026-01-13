console.log('🔧 SAFE HISTORICAL SYNC: Gradual blockchain data fetching...');

import { loadConfig } from './src/utils/config';
import { Database } from './src/database/Database';
import { StarknetRPCClient } from './src/services/rpc/StarknetRPCClient';
import { HistoricalDataFetcher } from './src/services/ingestion/HistoricalDataFetcher';

async function safeHistoricalSync() {
  try {
    const config = loadConfig();
    const db = new Database(config.database);
    await db.connect();
    const rpc = new StarknetRPCClient('https://rpc.starknet.lava.build', 15000);
    const fetcher = new HistoricalDataFetcher(rpc, db);
    
    // Get current state
    const currentBlock = await rpc.getBlockNumber();
    const result = await db.query('SELECT MAX(block_number) as latest FROM blocks');
    const latestInDb = BigInt(result[0].latest || 0);
    
    console.log(`📊 Current network block: ${currentBlock}`);
    console.log(`📊 Latest in database: ${latestInDb}`);
    
    // Safe parameters - start with 3 months back, process in small chunks
    const blocksPerHour = 120; // ~2 blocks per minute
    const hoursToFetch = 24 * 30 * 3; // 3 months = 2160 hours
    const targetBlocks = BigInt(blocksPerHour * hoursToFetch);
    const targetStartBlock = currentBlock - targetBlocks;
    
    // Don't go backwards from what we already have
    const startBlock = latestInDb >= targetStartBlock ? latestInDb + 1n : targetStartBlock;
    const endBlock = currentBlock - 10n; // Leave some buffer for real-time sync
    
    if (startBlock >= endBlock) {
      console.log('✅ Database is already up to date!');
      return;
    }
    
    const totalBlocks = endBlock - startBlock + 1n;
    console.log(`🎯 Target: Fetch ${totalBlocks} blocks (${startBlock} to ${endBlock})`);
    console.log(`⏱️  Estimated time: ${Math.ceil(Number(totalBlocks) / 60)} minutes`);
    
    // Process in small chunks with delays
    const chunkSize = 50; // Small chunks to be safe
    let processed = 0n;
    
    for (let current = startBlock; current <= endBlock; current += BigInt(chunkSize)) {
      const chunkEnd = current + BigInt(chunkSize - 1) > endBlock ? endBlock : current + BigInt(chunkSize - 1);
      
      console.log(`\n📦 Processing chunk: ${current} to ${chunkEnd} (${processed}/${totalBlocks} done)`);
      
      const chunkStart = Date.now();
      let chunkSuccess = 0;
      let chunkErrors = 0;
      
      for (let blockNum = current; blockNum <= chunkEnd; blockNum++) {
        try {
          await (fetcher as any).processBlock(blockNum);
          chunkSuccess++;
          processed++;
          
          // Progress indicator every 10 blocks
          if (blockNum % 10n === 0n) {
            const progress = (Number(processed) / Number(totalBlocks) * 100).toFixed(1);
            console.log(`  ⏳ ${progress}% - Block ${blockNum} processed`);
          }
        } catch (error: any) {
          chunkErrors++;
          console.error(`  ❌ Block ${blockNum} failed: ${error.message}`);
          
          // If too many errors, pause longer
          if (chunkErrors > 5) {
            console.log('  ⚠️  Too many errors, pausing 10 seconds...');
            await new Promise(resolve => setTimeout(resolve, 10000));
            chunkErrors = 0;
          }
        }
      }
      
      const chunkTime = (Date.now() - chunkStart) / 1000;
      console.log(`  ✅ Chunk completed: ${chunkSuccess} success, ${chunkErrors} errors in ${chunkTime}s`);
      
      // Check progress in database
      const progressResult = await db.query('SELECT COUNT(*) as count, MAX(block_number) as latest FROM blocks');
      console.log(`  📊 Database: ${progressResult[0].count} blocks, latest: ${progressResult[0].latest}`);
      
      // Safe delay between chunks (2 seconds)
      console.log('  ⏸️  Pausing 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Final status
    const finalResult = await db.query('SELECT COUNT(*) as blocks FROM blocks; SELECT COUNT(*) as transactions FROM transactions');
    console.log(`\n🎉 Safe historical sync completed!`);
    console.log(`📊 Final stats: ${finalResult[0].blocks} blocks, ${finalResult[1].transactions} transactions`);
    
  } catch (error: any) {
    console.error('❌ Safe historical sync failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

safeHistoricalSync();
