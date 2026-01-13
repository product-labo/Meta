import 'dotenv/config';
import { LiskIndexer } from './lisk-indexer';
import { logger } from './utils/logger';

async function testEnhancedIndexer() {
  const indexer = new LiskIndexer();
  
  try {
    logger.info('Testing enhanced indexer with 5 blocks...');
    await indexer.start(5);
    logger.info('Test completed successfully');
  } catch (error) {
    logger.error('Test failed:', error);
  } finally {
    await indexer.stop();
  }
}

testEnhancedIndexer();
