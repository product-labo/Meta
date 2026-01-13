import { DatabaseManager } from '../database/manager';
import { RpcClient } from '../rpc/client';
import { BlockProcessor } from '../processors/block';
import { TransactionProcessor } from '../processors/transaction';
import { ReceiptProcessor } from '../processors/receipt';
import { ContractProcessor } from '../processors/contract';
import { TraceProcessor } from '../processors/trace';
import { LogProcessor } from '../processors/log';
import { WalletProcessor } from '../processors/wallet';
import { SyncStateManager } from './sync-state';
import { logger } from '../utils/logger';

export class PipelineOrchestrator {
  private db: DatabaseManager;
  private rpc: RpcClient;
  private syncState: SyncStateManager;
  private processors: {
    block: BlockProcessor;
    transaction: TransactionProcessor;
    receipt: ReceiptProcessor;
    contract: ContractProcessor;
    trace: TraceProcessor;
    log: LogProcessor;
    wallet: WalletProcessor;
  };

  constructor(db: DatabaseManager, rpc: RpcClient) {
    this.db = db;
    this.rpc = rpc;
    this.syncState = new SyncStateManager(db);
    
    this.processors = {
      block: new BlockProcessor(db, rpc),
      transaction: new TransactionProcessor(db, rpc),
      receipt: new ReceiptProcessor(db, rpc),
      contract: new ContractProcessor(db, rpc),
      trace: new TraceProcessor(db, rpc),
      log: new LogProcessor(db, rpc),
      wallet: new WalletProcessor(db)
    };
  }

  async processBlock(blockNumber: number): Promise<void> {
    logger.info(`Processing block ${blockNumber}`);
    
    try {
      // 1. Block ingestion
      const block = await this.processors.block.process(blockNumber);
      
      // 2. Transaction ingestion
      const transactions = await this.processors.transaction.processBlock(blockNumber);
      
      // 3. Receipt ingestion (parallel)
      const receipts = await Promise.all(
        transactions.map(tx => this.processors.receipt.process(tx.tx_hash))
      );
      
      // 4. Contract detection
      const contracts = await this.processors.contract.detectFromReceipts(receipts);
      
      // 5. Execution tracing (parallel)
      await Promise.all(
        transactions.map(tx => this.processors.trace.process(tx.tx_hash))
      );
      
      // 6. Log processing
      await this.processors.log.processBlock(blockNumber);
      
      // 7. Wallet tracking
      await this.processors.wallet.processBlock(blockNumber);
      
      // 8. Update sync state
      await this.syncState.updateLastSynced(blockNumber);
      
      logger.info(`Completed processing block ${blockNumber}`);
    } catch (error) {
      logger.error(`Failed to process block ${blockNumber}:`, error);
      throw error;
    }
  }

  async processRange(startBlock: number, endBlock: number): Promise<void> {
    for (let blockNumber = startBlock; blockNumber <= endBlock; blockNumber++) {
      await this.processBlock(blockNumber);
    }
  }

  async startLiveSync(): Promise<void> {
    logger.info('Starting live sync');
    
    while (true) {
      try {
        const currentBlock = await this.rpc.getCurrentBlockNumber();
        const lastSynced = await this.syncState.getLastSynced();
        
        if (currentBlock > lastSynced) {
          // Process reorg safety blocks
          const reorgStart = Math.max(lastSynced - 10, 0);
          await this.processRange(reorgStart, currentBlock);
        }
        
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second interval
      } catch (error) {
        logger.error('Live sync error:', error);
        await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30s on error
      }
    }
  }
}
