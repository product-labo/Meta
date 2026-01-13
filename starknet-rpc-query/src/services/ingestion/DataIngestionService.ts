import { IDataIngestion } from '../../interfaces/IDataIngestion';
import { StarknetRPCClient } from '../rpc/StarknetRPCClient';
import { Database } from '../../database/Database';
import { logger } from '../../utils/logger';

export class DataIngestionService implements IDataIngestion {
  private rpc: StarknetRPCClient;
  private db: Database;
  private isRunning = false;

  constructor(rpc: StarknetRPCClient, db: Database) {
    this.rpc = rpc;
    this.db = db;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    logger.info('Starting data ingestion...');
    
    while (this.isRunning) {
      try {
        await this.processLatestBlock();
        await this.sleep(10000); // 10 second interval
      } catch (error: any) {
        logger.error('Ingestion error:', error);
        await this.sleep(5000); // Wait 5s on error
      }
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    logger.info('Stopping data ingestion...');
  }

  private async processLatestBlock(): Promise<void> {
    const latestBlockNumber = await this.rpc.getBlockNumber();
    
    // Get last processed block from DB
    const lastProcessed = await this.db.query<{block_number: string}>(
      'SELECT MAX(block_number) as block_number FROM blocks'
    );
    
    const lastBlock = lastProcessed[0]?.block_number ? 
      BigInt(lastProcessed[0].block_number) : 0n;
    
    if (latestBlockNumber > lastBlock) {
      const blockToProcess = lastBlock + 1n;
      await this.ingestBlock(blockToProcess);
      logger.info(`Processed block ${blockToProcess}`);
    }
  }

  private async ingestBlock(blockNumber: bigint): Promise<void> {
    const block = await this.rpc.getBlock(blockNumber);
    
    await this.db.transaction(async (client) => {
      // Insert block
      await client.query(`
        INSERT INTO starknet_blocks (block_number, block_hash, parent_block_hash, timestamp, finality_status)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (block_number) DO NOTHING
      `, [
        block.blockNumber,
        block.blockHash,
        block.parentBlockHash,
        block.timestamp,
        'ACCEPTED_ON_L2'
      ]);
      
      // Process transactions
      for (const tx of block.transactions || []) {
        await client.query(`
          INSERT INTO starknet_transactions (tx_hash, block_number, tx_type, sender_address, status)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (tx_hash) DO NOTHING
        `, [
          tx.txHash,
          block.blockNumber,
          tx.txType,
          tx.senderAddress,
          'ACCEPTED_ON_L2'
        ]);
      }
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
