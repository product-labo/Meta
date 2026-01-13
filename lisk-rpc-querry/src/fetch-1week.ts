import 'dotenv/config';
import { HistoricalIndexer } from './historical-indexer';
import { DatabaseMonitor } from './monitor';
import { logger } from './utils/logger';

async function fetch1WeekHistory() {
  const indexer = new HistoricalIndexer();
  const monitor = new DatabaseMonitor();
  
  try {
    logger.info('📅 Starting 1-week historical data fetch...');
    
    const rpc = (indexer as any).rpc;
    const db = (indexer as any).db;
    const syncState = (indexer as any).syncState;
    
    // Start monitoring every 30 seconds
    monitor.startMonitoring(30000);
    
    // Get current block
    const currentBlock = await rpc.getCurrentBlockNumber();
    
    // Calculate 1 week of blocks (7 days * 43,200 blocks/day = 302,400 blocks)
    const oneWeekBlocks = 7 * 43200;
    const startBlock = Math.max(0, currentBlock - oneWeekBlocks);
    
    logger.info(`📊 Fetching ${oneWeekBlocks} blocks: ${startBlock} to ${currentBlock}`);
    logger.info(`⏱️  Estimated time: ~6-8 hours at current rate`);
    
    // Get initial stats
    const initialStats = await indexer.getStats();
    logger.info(`🏁 Starting: ${initialStats.blocks.count} blocks, ${initialStats.transactions.count} txs`);
    
    let processed = 0;
    let totalTxs = 0;
    const batchSize = 200; // Larger batches for efficiency
    const startTime = Date.now();
    
    for (let i = startBlock; i <= currentBlock; i += batchSize) {
      const endBatch = Math.min(i + batchSize - 1, currentBlock);
      const batchStart = Date.now();
      
      logger.info(`🔄 Processing batch: ${i} to ${endBatch}`);
      
      for (let blockNum = i; blockNum <= endBatch; blockNum++) {
        try {
          const blockData = await rpc.getBlockByNumber(blockNum, true);
          
          // Store block
          await db.query(`
            INSERT INTO lisk_blocks (
              block_number, chain_id, block_hash, parent_hash, timestamp,
              gas_limit, gas_used, miner, transaction_count
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (block_number) DO NOTHING
          `, [
            parseInt(blockData.number, 16), 1135, blockData.hash, blockData.parentHash,
            parseInt(blockData.timestamp, 16), parseInt(blockData.gasLimit, 16),
            parseInt(blockData.gasUsed, 16), blockData.miner, blockData.transactions?.length || 0
          ]);
          
          // Store transactions
          if (blockData.transactions?.length > 0) {
            for (const tx of blockData.transactions) {
              await db.query(`
                INSERT INTO lisk_transactions (
                  tx_hash, block_number, transaction_index, from_address, to_address,
                  value, gas_limit, gas_price, nonce, input_data
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (tx_hash) DO NOTHING
              `, [
                tx.hash, parseInt(blockData.number, 16), parseInt(tx.transactionIndex, 16),
                tx.from, tx.to, tx.value || '0', parseInt(tx.gas, 16),
                parseInt(tx.gasPrice || '0', 16), parseInt(tx.nonce, 16), tx.input
              ]);
              totalTxs++;
            }
          }
          
          processed++;
          
        } catch (error) {
          logger.warn(`❌ Block ${blockNum}: ${error}`);
        }
        
        // Minimal delay
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      
      // Update sync state every batch
      await syncState.updateLastSynced(endBatch, 1135);
      
      // Progress report
      const progress = ((processed / oneWeekBlocks) * 100).toFixed(2);
      const elapsed = (Date.now() - startTime) / 1000 / 60; // minutes
      const rate = processed / elapsed; // blocks per minute
      const eta = (oneWeekBlocks - processed) / rate; // minutes remaining
      
      logger.info(`📈 Progress: ${processed}/${oneWeekBlocks} (${progress}%) | Rate: ${rate.toFixed(0)} blocks/min | ETA: ${eta.toFixed(0)} min | Txs: ${totalTxs}`);
      
      // Batch delay
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Final stats
    const finalStats = await indexer.getStats();
    const blocksAdded = finalStats.blocks.count - initialStats.blocks.count;
    const txsAdded = finalStats.transactions.count - initialStats.transactions.count;
    const totalTime = (Date.now() - startTime) / 1000 / 60; // minutes
    
    logger.info('🎉 1-week historical fetch completed!');
    logger.info(`📊 Results: +${blocksAdded} blocks, +${txsAdded} transactions`);
    logger.info(`⏱️  Total time: ${totalTime.toFixed(1)} minutes`);
    logger.info(`📈 Final: ${finalStats.blocks.count} blocks (${finalStats.blocks.earliest}-${finalStats.blocks.latest})`);
    
  } catch (error) {
    logger.error('❌ 1-week fetch failed:', error);
  } finally {
    await indexer.stop();
    await monitor.stop();
    logger.info('🛑 Stopped indexer and monitor');
  }
}

// Warning and countdown
logger.warn('⚠️  FETCHING 1 WEEK OF LISK DATA (~302,400 blocks)');
logger.warn('⚠️  Estimated time: 6-8 hours');
logger.warn('⚠️  Press Ctrl+C to cancel within 5 seconds...');

setTimeout(() => {
  fetch1WeekHistory();
}, 5000);
