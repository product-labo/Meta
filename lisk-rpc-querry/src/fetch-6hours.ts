import 'dotenv/config';
import { HistoricalIndexer } from './historical-indexer';
import { logger } from './utils/logger';

async function fetchLast6Hours() {
  const indexer = new HistoricalIndexer();
  
  try {
    logger.info('🕕 Fetching last 6 hours of Lisk data...');
    
    const rpc = (indexer as any).rpc;
    const db = (indexer as any).db;
    
    // Get current block
    const currentBlock = await rpc.getCurrentBlockNumber();
    
    // Calculate blocks for last 6 hours (6 * 1800 = 10,800 blocks)
    const sixHoursBlocks = 6 * 1800;
    const startBlock = Math.max(0, currentBlock - sixHoursBlocks);
    
    logger.info(`Processing blocks ${startBlock} to ${currentBlock} (${sixHoursBlocks} blocks)`);
    
    // Get initial stats
    const initialStats = await indexer.getStats();
    logger.info(`Initial: ${initialStats.blocks.count} blocks, ${initialStats.transactions.count} txs`);
    
    let processed = 0;
    const batchSize = 50;
    
    for (let i = startBlock; i <= currentBlock; i += batchSize) {
      const endBatch = Math.min(i + batchSize - 1, currentBlock);
      
      logger.info(`Batch: blocks ${i} to ${endBatch}`);
      
      for (let blockNum = i; blockNum <= endBatch; blockNum++) {
        try {
          await (indexer as any).processBlock(blockNum);
          processed++;
          
          if (processed % 100 === 0) {
            logger.info(`Progress: ${processed}/${sixHoursBlocks} blocks (${((processed/sixHoursBlocks)*100).toFixed(1)}%)`);
          }
          
        } catch (error) {
          logger.warn(`Failed block ${blockNum}: ${error}`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Batch delay
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Final stats
    const finalStats = await indexer.getStats();
    const blocksAdded = finalStats.blocks.count - initialStats.blocks.count;
    const txsAdded = finalStats.transactions.count - initialStats.transactions.count;
    
    logger.info(`✅ 6-hour fetch completed: +${blocksAdded} blocks, +${txsAdded} txs`);
    logger.info(`📊 Total: ${finalStats.blocks.count} blocks, ${finalStats.transactions.count} txs`);
    
  } catch (error) {
    logger.error('6-hour fetch failed:', error);
  } finally {
    await indexer.stop();
  }
}

fetchLast6Hours();
