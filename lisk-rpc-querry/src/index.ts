import { DatabaseManager } from './database/manager';
import { RpcClient } from './rpc/client';
import { PipelineOrchestrator } from './pipeline/orchestrator';
import { logger } from './utils/logger';

async function main() {
  try {
    // Initialize database connection
    const db = new DatabaseManager(process.env.DATABASE_URL!);

    // Initialize RPC client with fallback support
    const rpc = new RpcClient();
    
    logger.info(`Using RPC endpoints: ${rpc.getAllRpcUrls().join(', ')}`);
    logger.info(`Current active RPC: ${rpc.getCurrentRpcUrl()}`);

    // Initialize pipeline orchestrator
    const orchestrator = new PipelineOrchestrator(db, rpc);

    // Start syncing from the latest block
    const currentBlock = await rpc.getCurrentBlockNumber();
    logger.info(`Starting sync from block: ${currentBlock}`);

    // Process blocks in batches
    for (let blockNumber = currentBlock; blockNumber >= 0; blockNumber--) {
      try {
        await orchestrator.processBlock(blockNumber);
        logger.info(`Successfully processed block ${blockNumber}`);
      } catch (error) {
        logger.error(`Failed to process block ${blockNumber}:`, error);
        // RPC client will automatically try fallback endpoints
      }
    }

  } catch (error) {
    logger.error('Application error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
