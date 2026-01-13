import 'dotenv/config';
import { LiskIndexer } from './lisk-indexer';
import { logger } from './utils/logger';

async function processLatestBlocks() {
  const indexer = new LiskIndexer();
  
  try {
    logger.info('🔄 Processing latest 5 blocks...');
    await indexer.start(5);
    
  } catch (error) {
    logger.error('Error:', error);
  } finally {
    await indexer.stop();
  }
}

processLatestBlocks();
