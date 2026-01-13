import { StarknetRPCClient } from '../rpc/StarknetRPCClient';
import { Database } from '../../database/Database';
import { EventProcessor } from './EventProcessor';
import { ContractProcessor } from './ContractProcessor';
import { TransactionProcessor } from './TransactionProcessor';
import { logger } from '../../utils/logger';

export class IngestionOrchestrator {
  private rpc: StarknetRPCClient;
  private db: Database;
  private eventProcessor: EventProcessor;
  private contractProcessor: ContractProcessor;
  private transactionProcessor: TransactionProcessor;
  private isRunning = false;
  private batchSize: number;
  private checkpointInterval: number;
  private lastProcessedBlock: bigint = 0n;

  constructor(rpc: StarknetRPCClient, db: Database, batchSize: number = 10, checkpointInterval: number = 100) {
    this.rpc = rpc;
    this.db = db;
    this.eventProcessor = new EventProcessor(rpc, db);
    this.contractProcessor = new ContractProcessor(rpc, db);
    this.transactionProcessor = new TransactionProcessor(rpc, db);
    this.batchSize = batchSize;
    this.checkpointInterval = checkpointInterval;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    logger.info('Starting ingestion orchestrator...');
    
    // Load last checkpoint
    await this.loadCheckpoint();
    
    while (this.isRunning) {
      try {
        await this.processBatch();
        await this.sleep(5000); // 5 second interval
      } catch (error: any) {
        logger.error('Ingestion batch failed:', error);
        await this.sleep(10000); // Wait longer on error
      }
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    await this.saveCheckpoint();
    logger.info('Ingestion orchestrator stopped');
  }

  private async processBatch(): Promise<void> {
    const latestBlock = await this.rpc.getBlockNumber();
    
    if (latestBlock <= this.lastProcessedBlock) {
      return; // No new blocks
    }

    const endBlock = Math.min(
      Number(this.lastProcessedBlock + BigInt(this.batchSize)),
      Number(latestBlock)
    );

    logger.info(`Processing blocks ${this.lastProcessedBlock + 1n} to ${endBlock}`);

    // Process blocks in batch with recovery
    const processedBlocks: bigint[] = [];
    
    for (let blockNum = Number(this.lastProcessedBlock + 1n); blockNum <= endBlock; blockNum++) {
      try {
        await this.processBlockIdempotent(BigInt(blockNum));
        processedBlocks.push(BigInt(blockNum));
      } catch (error: any) {
        logger.error(`Failed to process block ${blockNum}:`, error);
        // Continue with next block - individual failures don't stop the batch
      }
    }

    // Update checkpoint
    if (processedBlocks.length > 0) {
      this.lastProcessedBlock = processedBlocks[processedBlocks.length - 1];
      
      if (processedBlocks.length % this.checkpointInterval === 0) {
        await this.saveCheckpoint();
      }
    }
  }

  private async processBlockIdempotent(blockNumber: bigint): Promise<void> {
    // Check if block already processed
    const existing = await this.db.query(
      'SELECT 1 FROM blocks WHERE block_number = $1',
      [blockNumber.toString()]
    );

    if (existing.length > 0) {
      return; // Already processed - idempotent operation
    }

    const block = await this.rpc.getBlock(blockNumber);
    
    // Insert block FIRST - separate transaction
    await this.db.query(`
      INSERT INTO starknet_blocks (block_number, block_hash, parent_block_hash, timestamp, finality_status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (block_number) DO NOTHING
    `, [
      block.blockNumber,
      block.blockHash,
      block.parentBlockHash,
      Math.floor(block.timestamp.getTime() / 1000),
      'ACCEPTED_ON_L2'
    ]);

    // Process transactions AFTER block is committed
    if (block.transactions) {
      for (const tx of block.transactions) {
        try {
          await this.transactionProcessor.processTransaction(tx.txHash, BigInt(block.blockNumber), tx);
          
          // Process contract deployments
          if (tx.txType === 'DEPLOY' || tx.txType === 'DEPLOY_ACCOUNT') {
            const contractAddress = await this.extractContractAddress(tx);
            if (contractAddress) {
              await this.contractProcessor.processContractDeployment(
                tx.txHash,
                contractAddress, 
                BigInt(block.blockNumber)
              );
            }
          }
          
          // Process events
          try {
            await this.eventProcessor.processTransactionEvents(tx.txHash, BigInt(block.blockNumber));
          } catch (receiptError) {
            logger.warn(`Event processing failed for ${tx.txHash}:`, receiptError);
          }
          
          // Process wallet identification
          await this.processWalletFromTransaction(tx, BigInt(block.blockNumber));
        } catch (txError) {
          logger.error(`Failed to process transaction ${tx.txHash}:`, txError);
        }
      }
    }
  }

  async processBlock(block: any): Promise<void> {
    // Insert block FIRST in separate transaction into starknet_blocks
    await this.db.query(`
      INSERT INTO starknet_blocks (block_number, block_hash, parent_block_hash, timestamp, finality_status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (block_number) DO NOTHING
    `, [
      block.blockNumber.toString(),
      block.blockHash,
      block.parentBlockHash,
      Math.floor(block.timestamp.getTime() / 1000),
      'ACCEPTED_ON_L2'
    ]);

    // Process transactions AFTER block is committed
    if (block.transactions) {
      for (const tx of block.transactions) {
        try {
          await this.transactionProcessor.processTransaction(tx.txHash, BigInt(block.blockNumber), tx);
          
          // Process contract deployments
          if (tx.txType === 'DEPLOY' || tx.txType === 'DEPLOY_ACCOUNT') {
            const contractAddress = await this.extractContractAddress(tx);
            if (contractAddress) {
              await this.contractProcessor.processContractDeployment(
                tx.txHash, 
                contractAddress, 
                BigInt(block.blockNumber)
              );
            }
          }
          
          // Process events
          try {
            await this.eventProcessor.processTransactionEvents(tx.txHash, BigInt(block.blockNumber));
          } catch (receiptError) {
            logger.warn(`Event processing failed for ${tx.txHash}:`, receiptError);
          }
          
          // Process wallet identification
          await this.processWalletFromTransaction(tx, BigInt(block.blockNumber));
        } catch (txError) {
          logger.error(`Failed to process transaction ${tx.txHash}:`, txError);
          // Continue with next transaction - don't fail the entire block
        }
      }
    }
  }

  private async extractContractAddress(tx: any): Promise<string | null> {
    try {
      // For DEPLOY_ACCOUNT, the contract address is usually in the receipt
      const receipt = await this.rpc.getTransactionReceipt(tx.txHash);
      
      // Look for contract deployment events or receipt data
      if (receipt.events && receipt.events.length > 0) {
        // Contract address is often the from_address of the first event
        return receipt.events[0].fromAddress;
      }
      
      // Fallback: try to compute from transaction data
      return null;
    } catch (error) {
      logger.warn(`Could not extract contract address for ${tx.txHash}`);
      return null;
    }
  }

  private async processWalletFromTransaction(tx: any, blockNumber: bigint): Promise<void> {
    try {
      if (tx.sender_address && tx.sender_address !== '0x0') {
        await this.db.query(`
          INSERT INTO starknet_wallets (address, first_seen_block)
          VALUES ($1, $2)
          ON CONFLICT (address) DO NOTHING
        `, [tx.sender_address, blockNumber.toString()]);
      }
    } catch (error) {
      logger.warn(`Failed to process wallet for transaction ${tx.tx_hash}:`, error);
    }
  }

  private async loadCheckpoint(): Promise<void> {
    try {
      const result = await this.db.query(
        'SELECT MAX(block_number) as last_block FROM starknet_blocks'
      );
      
      if (result[0]?.last_block) {
        this.lastProcessedBlock = BigInt(result[0].last_block);
        logger.info(`Loaded checkpoint: last processed block ${this.lastProcessedBlock}`);
      }
    } catch (error: any) {
      logger.warn('Failed to load checkpoint, starting from 0:', error);
      this.lastProcessedBlock = 0n;
    }
  }

  private async saveCheckpoint(): Promise<void> {
    try {
      // Store checkpoint in a dedicated table
      await this.db.query(`
        INSERT INTO ingestion_checkpoints (checkpoint_name, block_number, updated_at)
        VALUES ('main_ingestion', $1, CURRENT_TIMESTAMP)
        ON CONFLICT (checkpoint_name) DO UPDATE SET
          block_number = EXCLUDED.block_number,
          updated_at = EXCLUDED.updated_at
      `, [this.lastProcessedBlock.toString()]);
      
      logger.info(`Saved checkpoint: block ${this.lastProcessedBlock}`);
    } catch (error: any) {
      logger.error('Failed to save checkpoint:', error);
    }
  }

  getLastProcessedBlock(): bigint {
    return this.lastProcessedBlock;
  }

  isIngestionRunning(): boolean {
    return this.isRunning;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
