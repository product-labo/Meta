import { StarknetRPCClient } from './services/rpc/StarknetRPCClient';
import { Database } from './database/Database';
import { loadConfig } from './utils/config';
import { logger } from './utils/logger';

async function main() {
  try {
    const config = loadConfig();
    
    // Test database connection
    const db = new Database(config.database);
    await db.connect();
    await db.runMigrations();
    logger.info('Database setup complete');
    
    // Test RPC client
    const rpc = new StarknetRPCClient(config.rpc.url);
    const blockNumber = await rpc.getBlockNumber();
    logger.info(`Current block number: ${blockNumber}`);
    
    await db.disconnect();
    logger.info('Setup verification complete');
  } catch (error: any) {
    logger.error('Setup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
