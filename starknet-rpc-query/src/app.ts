import { loadConfig } from './utils/config';
import { logger } from './utils/logger';
import { Database } from './database/Database';
import { StarknetRPCClient } from './services/rpc/StarknetRPCClient';
import { HistoricalDataFetcher } from './services/ingestion/HistoricalDataFetcher';
import { QueryService } from './services/query/QueryService';

export class StarknetRPCQueryApp {
  private config = loadConfig();
  private db = new Database(this.config.database);
  private rpc = new StarknetRPCClient(this.config.rpc.url, this.config.rpc.timeout);
  private historicalFetcher = new HistoricalDataFetcher(this.rpc, this.db);
  private query = new QueryService(this.db);

  async start(): Promise<void> {
    try {
      console.log('🔧 Step 1: Loading config...');
      const config = this.config;
      console.log('✅ Config loaded successfully');
    } catch (error: any) {
      console.error('❌ Step 1 FAILED - Config loading:', error.message);
      throw error;
    }

    try {
      console.log('🔧 Step 2: Connecting to database...');
      await this.db.connect();
      console.log('✅ Database connected successfully');
    } catch (error: any) {
      console.error('❌ Step 2 FAILED - Database connection:', error.message);
      throw error;
    }

    try {
      console.log('🔧 Step 3: Running migrations...');
      await this.db.runMigrations();
      console.log('✅ Migrations completed successfully');
    } catch (error: any) {
      console.error('❌ Step 3 FAILED - Database migrations:', error.message);
      throw error;
    }

    try {
      console.log('🔧 Step 4: Testing RPC connection...');
      const blockNumber = await this.rpc.getBlockNumber();
      console.log(`✅ RPC connected - Current block: ${blockNumber}`);
    } catch (error: any) {
      console.error('❌ Step 4 FAILED - RPC connection:', error.message);
      console.error('Full error:', error);
      console.log('🛑 STOPPING HERE - Fix RPC connection issue first');
      process.exit(1);
    }

    try {
      console.log('🔧 Step 5: Starting historical data fetch...');
      // Start with just 10 recent blocks instead of 3 months
      console.log('📊 Fetching only 10 recent blocks for testing...');
      const currentBlock = await this.rpc.getBlockNumber();
      const startBlock = currentBlock - 10n;
      
      for (let i = startBlock; i <= currentBlock; i++) {
        console.log(`Processing block ${i}...`);
        await (this.historicalFetcher as any).processBlock(i);
      }
      console.log('✅ Step 5: Recent blocks processed successfully');
    } catch (error: any) {
      console.error('❌ Step 5 FAILED - Historical data fetch:', error.message);
      console.error('Stack trace:', error.stack);
      throw error;
    }

    try {
      console.log('🔧 Step 6: Starting continuous sync...');
      this.historicalFetcher.startContinuousSync();
      console.log('✅ Continuous sync started');
    } catch (error: any) {
      console.error('❌ Step 6 FAILED - Continuous sync:', error.message);
      throw error;
    }

    console.log('🎉 All steps completed successfully!');
  }

  async stop(): Promise<void> {
    this.historicalFetcher.stop();
    await this.db.disconnect();
    logger.info('Application stopped');
  }

  getQueryService(): QueryService {
    return this.query;
  }
}

if (require.main === module) {
  const app = new StarknetRPCQueryApp();
  
  process.on('SIGINT', async () => {
    logger.info('Shutting down gracefully...');
    await app.stop();
    process.exit(0);
  });

  app.start().catch((error) => {
    logger.error('Application failed:', error);
    process.exit(1);
  });
}
