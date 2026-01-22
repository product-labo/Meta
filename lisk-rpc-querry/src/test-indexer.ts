import 'dotenv/config';
import { LiskIndexer } from './lisk-indexer';
import { logger } from './utils/logger';

async function testIndexer() {
  const indexer = new LiskIndexer();
  
  try {
    // Test with just 1 block
    logger.info('🧪 Testing Lisk Indexer with 1 block...');
    await indexer.start();
    
  } catch (error) {
    logger.error('Test failed:', error);
  } finally {
    await indexer.stop();
  }
}

testIndexer();
