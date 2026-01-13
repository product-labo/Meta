#!/usr/bin/env node

import { Command } from 'commander';
import { DatabaseManager } from './database/manager';
import { RpcClient } from './rpc/client';
import { PipelineOrchestrator } from './pipeline/orchestrator';
import { logger } from './utils/logger';

const program = new Command();

program
  .name('lisk-rpc-query')
  .description('Lisk blockchain data indexer with RPC fallback support')
  .version('1.0.0');

program
  .command('sync')
  .description('Start syncing blockchain data')
  .option('-f, --from <block>', 'Start from specific block number')
  .option('-t, --to <block>', 'Sync up to specific block number')
  .action(async (options) => {
    const db = new DatabaseManager(process.env.DATABASE_URL!);
    const rpc = new RpcClient();
    
    try {
      logger.info(`Connected to database: ${process.env.DB_NAME}`);
      logger.info(`Available RPC endpoints: ${rpc.getAllRpcUrls().length}`);
      
      const orchestrator = new PipelineOrchestrator(db, rpc);
      
      const fromBlock = options.from ? parseInt(options.from) : await rpc.getCurrentBlockNumber();
      const toBlock = options.to ? parseInt(options.to) : 0;
      
      logger.info(`Syncing from block ${fromBlock} to ${toBlock}`);
      
      for (let blockNumber = fromBlock; blockNumber >= toBlock; blockNumber--) {
        await orchestrator.processBlock(blockNumber);
      }
      
    } catch (error) {
      logger.error('Sync failed:', error);
      process.exit(1);
    }
  });

program
  .command('test-rpc')
  .description('Test RPC endpoints connectivity')
  .action(async () => {
    const rpc = new RpcClient();
    
    logger.info('Testing RPC endpoints...');
    logger.info(`Available endpoints: ${rpc.getAllRpcUrls().join(', ')}`);
    
    try {
      const blockNumber = await rpc.getCurrentBlockNumber();
      logger.info(`✅ Current block: ${blockNumber} (using ${rpc.getCurrentRpcUrl()})`);
    } catch (error) {
      logger.error('❌ All RPC endpoints failed:', error);
    }
  });

program.parse();
