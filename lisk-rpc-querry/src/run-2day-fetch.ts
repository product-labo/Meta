import 'dotenv/config';
import { HistoricalIndexer } from './historical-indexer';
import { DatabaseMonitor } from './monitor';
import { logger } from './utils/logger';

async function run2DayHistoricalFetch() {
  const indexer = new HistoricalIndexer();
  const monitor = new DatabaseMonitor();
  
  try {
    logger.info('🚀 Starting 2-day historical data fetch with monitoring...');
    
    // Start monitoring
    monitor.startMonitoring(10000); // Every 10 seconds
    
    // Get initial stats
    const initialStats = await indexer.getStats();
    logger.info(`📊 Initial state: ${initialStats.blocks.count} blocks, ${initialStats.transactions.count} txs`);
    
    // Start the 2-day fetch
    await indexer.fetchLast2Days();
    
    // Final stats
    const finalStats = await indexer.getStats();
    const blocksAdded = finalStats.blocks.count - initialStats.blocks.count;
    const txsAdded = finalStats.transactions.count - initialStats.transactions.count;
    
    logger.info('🎉 2-day historical fetch completed!');
    logger.info(`📈 Results: +${blocksAdded} blocks, +${txsAdded} transactions`);
    logger.info(`📊 Total: ${finalStats.blocks.count} blocks (${finalStats.blocks.earliest}-${finalStats.blocks.latest})`);
    
  } catch (error) {
    logger.error('❌ Historical fetch failed:', error);
  } finally {
    await indexer.stop();
    await monitor.stop();
    logger.info('🛑 Stopped indexer and monitor');
  }
}

// Add warning about the operation
logger.warn('⚠️  This will fetch ~86,400 blocks (2 days of Lisk data)');
logger.warn('⚠️  Estimated time: 2-4 hours depending on RPC speed');
logger.warn('⚠️  Press Ctrl+C to cancel within 10 seconds...');

// 10 second delay to allow cancellation
setTimeout(() => {
  run2DayHistoricalFetch();
}, 10000);
