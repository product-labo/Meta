import 'dotenv/config';
import { DatabaseManager } from './database/manager';
import { RpcClient } from './rpc/client';
import { logger } from './utils/logger';

class IndexerMonitor {
  private db: DatabaseManager;
  private rpc: RpcClient;

  constructor() {
    this.db = new DatabaseManager();
    this.rpc = new RpcClient();
  }

  async getStatus(): Promise<any> {
    const [dbStats, syncState, currentBlock] = await Promise.all([
      this.getDatabaseStats(),
      this.getSyncState(),
      this.rpc.getCurrentBlockNumber()
    ]);

    const blocksBehind = currentBlock - syncState.last_synced_block;
    const syncProgress = ((syncState.last_synced_block / currentBlock) * 100).toFixed(2);

    return {
      database: dbStats,
      sync: {
        ...syncState,
        current_blockchain_block: currentBlock,
        blocks_behind: blocksBehind,
        sync_progress: `${syncProgress}%`
      },
      performance: await this.getPerformanceStats()
    };
  }

  private async getDatabaseStats(): Promise<any> {
    const result = await this.db.query(`
      SELECT 
        (SELECT COUNT(*) FROM lisk_blocks) as total_blocks,
        (SELECT COUNT(*) FROM lisk_transactions) as total_transactions,
        (SELECT COUNT(*) FROM lisk_logs) as total_logs,
        (SELECT COUNT(*) FROM lisk_contracts) as total_contracts,
        (SELECT COUNT(*) FROM lisk_wallets) as total_wallets,
        (SELECT COUNT(*) FROM lisk_wallet_interactions) as total_interactions
    `);
    return result.rows[0];
  }

  private async getSyncState(): Promise<any> {
    const result = await this.db.query(`
      SELECT * FROM lisk_sync_state WHERE chain_id = 1135
    `);
    return result.rows[0];
  }

  private async getPerformanceStats(): Promise<any> {
    const result = await this.db.query(`
      SELECT 
        COUNT(*) as blocks_last_hour,
        AVG(transaction_count) as avg_txs_per_block
      FROM lisk_blocks 
      WHERE created_at > NOW() - INTERVAL '1 hour'
    `);
    return result.rows[0];
  }

  async displayStatus(): Promise<void> {
    try {
      const status = await this.getStatus();
      
      console.clear();
      console.log('🔍 LISK INDEXER MONITORING DASHBOARD');
      console.log('═'.repeat(60));
      console.log(`📊 Database Statistics:`);
      console.log(`  Blocks: ${status.database.total_blocks.toLocaleString()}`);
      console.log(`  Transactions: ${status.database.total_transactions.toLocaleString()}`);
      console.log(`  Logs/Events: ${status.database.total_logs.toLocaleString()}`);
      console.log(`  Contracts: ${status.database.total_contracts.toLocaleString()}`);
      console.log(`  Wallets: ${status.database.total_wallets.toLocaleString()}`);
      console.log(`  Interactions: ${status.database.total_interactions.toLocaleString()}`);
      console.log('');
      
      console.log(`🔄 Sync Status:`);
      console.log(`  Current Blockchain Block: ${status.sync.current_blockchain_block.toLocaleString()}`);
      console.log(`  Last Synced Block: ${status.sync.last_synced_block.toLocaleString()}`);
      console.log(`  Blocks Behind: ${status.sync.blocks_behind.toLocaleString()}`);
      console.log(`  Sync Progress: ${status.sync.sync_progress}`);
      console.log('');
      
      console.log(`⚡ Performance (Last Hour):`);
      console.log(`  Blocks Processed: ${status.performance.blocks_last_hour || 0}`);
      console.log(`  Avg Txs/Block: ${parseFloat(status.performance.avg_txs_per_block || 0).toFixed(1)}`);
      console.log('');
      
      console.log(`⏰ Last Updated: ${new Date().toLocaleString()}`);
      
    } catch (error) {
      console.error('Monitor error:', error);
    }
  }

  async close(): Promise<void> {
    await this.db.close();
  }
}

// CLI usage
if (require.main === module) {
  const monitor = new IndexerMonitor();
  
  const runMonitor = async () => {
    await monitor.displayStatus();
    setTimeout(runMonitor, 10000); // Update every 10 seconds
  };
  
  process.on('SIGINT', async () => {
    await monitor.close();
    process.exit(0);
  });
  
  runMonitor();
}
