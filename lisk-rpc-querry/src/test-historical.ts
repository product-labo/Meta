import 'dotenv/config';
import { HistoricalIndexer } from './historical-indexer';
import { logger } from './utils/logger';

async function testHistoricalFetch() {
  const indexer = new HistoricalIndexer();
  
  try {
    logger.info('🧪 Testing historical indexer with last 100 blocks...');
    
    // Get initial stats
    const initialStats = await indexer.getStats();
    logger.info(`Initial: ${initialStats.blocks.count} blocks, ${initialStats.transactions.count} txs`);
    
    // Modify the indexer to fetch only last 100 blocks for testing
    const rpc = (indexer as any).rpc;
    const currentBlock = await rpc.getCurrentBlockNumber();
    const startBlock = currentBlock - 100;
    
    logger.info(`Testing with blocks ${startBlock} to ${currentBlock}`);
    
    // Process 10 blocks as a test
    for (let i = 0; i < 10; i++) {
      const blockNum = startBlock + i;
      try {
        await (indexer as any).processBlock(blockNum);
        logger.info(`✅ Processed block ${blockNum}`);
      } catch (error) {
        logger.warn(`❌ Failed block ${blockNum}: ${error}`);
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Get final stats
    const finalStats = await indexer.getStats();
    logger.info(`Final: ${finalStats.blocks.count} blocks, ${finalStats.transactions.count} txs`);
    logger.info(`Added: ${finalStats.blocks.count - initialStats.blocks.count} blocks, ${finalStats.transactions.count - initialStats.transactions.count} txs`);
    
  } catch (error) {
    logger.error('Test failed:', error);
  } finally {
    await indexer.stop();
  }
}

testHistoricalFetch();
