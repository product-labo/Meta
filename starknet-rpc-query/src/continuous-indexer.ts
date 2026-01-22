import { loadConfig } from './utils/config';
import { logger } from './utils/logger';
import { Database } from './database/Database';
import { StarknetRPCClient } from './services/rpc/StarknetRPCClient';
import { IngestionOrchestrator } from './services/ingestion/IngestionOrchestrator';

export class ContinuousIndexer {
  private config = loadConfig();
  private db = new Database(this.config.database);
  private rpc = new StarknetRPCClient(this.config.rpc.url, this.config.rpc.timeout);
  private orchestrator = new IngestionOrchestrator(this.rpc, this.db, 5, 100);
  private isRunning = false;
  private syncInterval = 10000; // 10 seconds

  async start(): Promise<void> {
    try {
      console.log('🚀 Starting Continuous Starknet Indexer...');
      
      // Initialize connections
      await this.db.connect();
      console.log('✅ Database connected');
      
      // Test RPC connection
      const latestBlock = await this.rpc.getLatestBlockNumber();
      console.log(`✅ RPC connected - Latest block: ${latestBlock}`);
      
      // Start continuous sync
      this.isRunning = true;
      console.log('🔄 Starting continuous sync...');
      
      await this.continuousSync();
      
    } catch (error: any) {
      console.error('❌ Indexer startup failed:', error.message);
      throw error;
    }
  }

  async stop(): Promise<void> {
    console.log('🛑 Stopping continuous indexer...');
    this.isRunning = false;
  }

  private async continuousSync(): Promise<void> {
    while (this.isRunning) {
      try {
        // Get current state
        const latestRPCBlock = await this.rpc.getLatestBlockNumber();
        const latestDBBlock = await this.getLatestDBBlock();
        
        console.log(`📊 RPC Block: ${latestRPCBlock}, DB Block: ${latestDBBlock}`);
        
        if (latestRPCBlock > latestDBBlock) {
          const blocksToSync = Number(latestRPCBlock - latestDBBlock);
          console.log(`🔄 Syncing ${blocksToSync} blocks...`);
          
          // Sync missing blocks
          for (let blockNum = latestDBBlock + 1n; blockNum <= latestRPCBlock && blockNum <= latestDBBlock + 5n; blockNum++) {
            await this.syncBlock(blockNum);
          }
          
          console.log(`✅ Sync batch completed`);
        } else {
          console.log(`✅ Up to date - waiting for new blocks...`);
        }
        
        // Wait before next sync
        await this.sleep(this.syncInterval);
        
      } catch (error: any) {
        console.error('❌ Sync error:', error.message);
        await this.sleep(this.syncInterval * 2); // Wait longer on error
      }
    }
  }

  private async syncBlock(blockNumber: bigint): Promise<void> {
    try {
      console.log(`🔍 Syncing block ${blockNumber}...`);
      
      // Get block with transactions
      const block = await this.rpc.getBlockWithReceipts(blockNumber);
      
      // Process block through orchestrator
      await this.orchestrator.processBlock(block);
      
      console.log(`✅ Block ${blockNumber} synced successfully`);
      
    } catch (error: any) {
      console.error(`❌ Failed to sync block ${blockNumber}:`, error.message);
      throw error;
    }
  }

  private async getLatestDBBlock(): Promise<bigint> {
    try {
      const result = await this.db.query('SELECT MAX(block_number) as latest FROM starknet_blocks');
      const dbBlock = BigInt(result[0]?.latest || 0);
      
      // Continue from where we left off, but if starting fresh, start from block 1
      return dbBlock;
    } catch (error) {
      return 0n;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Graceful shutdown
  setupGracefulShutdown(): void {
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      await this.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      await this.stop();
      process.exit(0);
    });
  }
}

// Start indexer if this file is run directly
if (require.main === module) {
  const indexer = new ContinuousIndexer();
  indexer.setupGracefulShutdown();
  
  indexer.start().catch((error) => {
    console.error('❌ Indexer failed to start:', error);
    process.exit(1);
  });
}
