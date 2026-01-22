import 'dotenv/config';
import { LiskIndexer } from './lisk-indexer';
import { logger } from './utils/logger';

class ContinuousSync {
  private indexer: LiskIndexer;
  private isRunning = false;
  private syncInterval = 30000; // 30 seconds

  constructor() {
    this.indexer = new LiskIndexer();
  }

  async start(): Promise<void> {
    this.isRunning = true;
    logger.info('🔄 Starting continuous sync service...');
    
    while (this.isRunning) {
      try {
        await this.indexer.start(10); // Process 10 blocks at a time
        logger.info(`⏰ Waiting ${this.syncInterval/1000}s before next sync...`);
        await this.sleep(this.syncInterval);
      } catch (error) {
        logger.error('Sync error:', error);
        logger.info('⏳ Retrying in 30 seconds...');
        await this.sleep(30000); // Wait 30s on error
      }
    }
  }

  stop(): void {
    this.isRunning = false;
    logger.info('🛑 Stopping continuous sync service...');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const syncService = new ContinuousSync();

process.on('SIGINT', () => {
  syncService.stop();
  process.exit(0);
});

syncService.start();
