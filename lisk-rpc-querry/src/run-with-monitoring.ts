import 'dotenv/config';
import { LiskIndexer } from './lisk-indexer';
import { DatabaseMonitor } from './monitor';
import { logger } from './utils/logger';

async function runIndexerWithMonitoring() {
  const indexer = new LiskIndexer();
  const monitor = new DatabaseMonitor();
  
  try {
    // Start monitoring
    logger.info('🚀 Starting Lisk Indexer with real-time monitoring...');
    monitor.startMonitoring(2000); // Every 2 seconds
    
    // Wait a bit for initial stats
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Run indexer for 20 blocks
    await indexer.start(20);
    
    // Keep monitoring for a bit after indexing
    logger.info('📊 Indexing complete, monitoring for 10 more seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    logger.error('Error:', error);
  } finally {
    await indexer.stop();
    await monitor.stop();
    logger.info('🛑 Stopped indexer and monitor');
  }
}

runIndexerWithMonitoring();
