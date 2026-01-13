import 'dotenv/config';
import { RpcClient } from './rpc/client';
import { DatabaseManager } from './database/manager';
import { SyncStateManager } from './pipeline/sync-state';
import { logger } from './utils/logger';

export class HistoricalIndexer {
  private db: DatabaseManager;
  private rpc: RpcClient;
  private syncState: SyncStateManager;
  private chainId = 1135;

  constructor() {
    this.db = new DatabaseManager();
    this.rpc = new RpcClient();
    this.syncState = new SyncStateManager(this.db);
  }

  async fetchLast2Days(): Promise<void> {
    try {
      logger.info('🕐 Starting 2-day historical data fetch...');
      
      // Get current block
      const currentBlock = await this.rpc.getCurrentBlockNumber();
      logger.info(`Current block: ${currentBlock}`);
      
      // Calculate blocks for last 2 days
      // Lisk: ~2 second block time = 43,200 blocks per day
      const blocksPerDay = 43200;
      const twoDaysBlocks = blocksPerDay * 2;
      const startBlock = Math.max(0, currentBlock - twoDaysBlocks);
      
      logger.info(`Fetching blocks ${startBlock} to ${currentBlock} (${twoDaysBlocks} blocks)`);
      
      // Process in batches to avoid overwhelming RPC
      const batchSize = 100;
      let processed = 0;
      
      for (let i = startBlock; i <= currentBlock; i += batchSize) {
        const endBatch = Math.min(i + batchSize - 1, currentBlock);
        
        logger.info(`Processing batch: blocks ${i} to ${endBatch}`);
        
        for (let blockNum = i; blockNum <= endBatch; blockNum++) {
          try {
            await this.processBlock(blockNum);
            processed++;
            
            if (processed % 50 === 0) {
              logger.info(`Progress: ${processed}/${twoDaysBlocks} blocks (${((processed/twoDaysBlocks)*100).toFixed(1)}%)`);
            }
            
          } catch (error) {
            logger.warn(`Failed to process block ${blockNum}: ${error}`);
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Batch delay
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      logger.info(`✅ Historical fetch completed: ${processed} blocks processed`);
      
    } catch (error) {
      logger.error('Historical fetch failed:', error);
      throw error;
    }
  }

  private async processBlock(blockNumber: number): Promise<void> {
    try {
      // Fetch block data
      const blockData = await this.rpc.getBlockByNumber(blockNumber, true);
      
      // Store block
      await this.storeBlock(blockData);
      
      // Process transactions
      if (blockData.transactions && blockData.transactions.length > 0) {
        for (const tx of blockData.transactions) {
          await this.processTransaction(tx, parseInt(blockData.number, 16));
        }
      }
      
      // Update sync state every 100 blocks
      if (blockNumber % 100 === 0) {
        await this.syncState.updateLastSynced(parseInt(blockData.number, 16), this.chainId);
      }
      
    } catch (error) {
      throw new Error(`Block ${blockNumber}: ${error}`);
    }
  }

  private async storeBlock(blockData: any): Promise<void> {
    await this.db.query(`
      INSERT INTO lisk_blocks (
        block_number, chain_id, block_hash, parent_hash, timestamp,
        gas_limit, gas_used, miner, transaction_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (block_number) DO NOTHING
    `, [
      parseInt(blockData.number, 16),
      this.chainId,
      blockData.hash,
      blockData.parentHash,
      parseInt(blockData.timestamp, 16),
      parseInt(blockData.gasLimit, 16),
      parseInt(blockData.gasUsed, 16),
      blockData.miner,
      blockData.transactions?.length || 0
    ]);
  }

  private async processTransaction(txData: any, blockNumber: number): Promise<void> {
    // Store transaction
    await this.db.query(`
      INSERT INTO lisk_transactions (
        tx_hash, block_number, transaction_index, from_address, to_address,
        value, gas_limit, gas_price, nonce, input_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (tx_hash) DO NOTHING
    `, [
      txData.hash,
      blockNumber,
      parseInt(txData.transactionIndex, 16),
      txData.from,
      txData.to,
      txData.value || '0',
      parseInt(txData.gas, 16),
      parseInt(txData.gasPrice || '0', 16),
      parseInt(txData.nonce, 16),
      txData.input
    ]);

    // Get transaction receipt
    try {
      const receipt = await this.rpc.getTransactionReceipt(txData.hash);
      await this.storeTransactionReceipt(receipt);
    } catch (error) {
      // Receipt might not be available for all transactions
    }
  }

  private async storeTransactionReceipt(receiptData: any): Promise<void> {
    await this.db.query(`
      INSERT INTO lisk_transaction_receipts (
        tx_hash, status, gas_used, cumulative_gas_used, contract_address
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (tx_hash) DO NOTHING
    `, [
      receiptData.transactionHash,
      parseInt(receiptData.status, 16),
      parseInt(receiptData.gasUsed, 16),
      parseInt(receiptData.cumulativeGasUsed, 16),
      receiptData.contractAddress
    ]);
  }

  async getStats(): Promise<any> {
    const [blocks, transactions, receipts] = await Promise.all([
      this.db.query('SELECT COUNT(*) as count, MIN(block_number) as earliest, MAX(block_number) as latest FROM lisk_blocks'),
      this.db.query('SELECT COUNT(*) as count FROM lisk_transactions'),
      this.db.query('SELECT COUNT(*) as count FROM lisk_transaction_receipts')
    ]);

    return {
      blocks: blocks.rows[0],
      transactions: transactions.rows[0],
      receipts: receipts.rows[0]
    };
  }

  async stop(): Promise<void> {
    await this.db.close();
  }
}

// CLI usage
if (require.main === module) {
  const indexer = new HistoricalIndexer();
  
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    await indexer.stop();
    process.exit(0);
  });
  
  indexer.fetchLast2Days()
    .then(async () => {
      const stats = await indexer.getStats();
      logger.info(`📊 Final stats: ${stats.blocks.count} blocks (${stats.blocks.earliest}-${stats.blocks.latest}), ${stats.transactions.count} txs, ${stats.receipts.count} receipts`);
      await indexer.stop();
    })
    .catch(async (error) => {
      logger.error('Historical indexer failed:', error);
      await indexer.stop();
      process.exit(1);
    });
}
