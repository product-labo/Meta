import 'dotenv/config';
import { DatabaseManager } from './database/manager';
import { logger } from './utils/logger';

export class DatabaseMonitor {
  private db: DatabaseManager;

  constructor() {
    this.db = new DatabaseManager();
  }

  async getStats(): Promise<any> {
    const [blocks, transactions, receipts, syncState] = await Promise.all([
      this.db.query('SELECT COUNT(*) as count, MAX(block_number) as latest FROM lisk_blocks'),
      this.db.query('SELECT COUNT(*) as count FROM lisk_transactions'),
      this.db.query('SELECT COUNT(*) as count FROM lisk_transaction_receipts'),
      this.db.query('SELECT last_synced_block FROM lisk_sync_state WHERE chain_id = 1135')
    ]);

    return {
      blocks: blocks.rows[0],
      transactions: transactions.rows[0],
      receipts: receipts.rows[0],
      lastSynced: syncState.rows[0]?.last_synced_block || 0,
      timestamp: new Date().toISOString()
    };
  }

  async startMonitoring(intervalMs: number = 5000): Promise<void> {
    logger.info('📊 Starting database monitoring...');
    
    const monitor = async () => {
      try {
        const stats = await this.getStats();
        logger.info(`📈 Stats: ${stats.blocks.count} blocks | ${stats.transactions.count} txs | ${stats.receipts.count} receipts | Last synced: ${stats.lastSynced} | Latest: ${stats.blocks.latest}`);
      } catch (error) {
        logger.error('Monitor error:', error);
      }
    };

    // Initial stats
    await monitor();
    
    // Start monitoring
    setInterval(monitor, intervalMs);
  }

  async stop(): Promise<void> {
    await this.db.close();
  }
}

if (require.main === module) {
  const monitor = new DatabaseMonitor();
  monitor.startMonitoring(3000); // Every 3 seconds
}
