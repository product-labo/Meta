import { StarknetRPCClient } from '../rpc/StarknetRPCClient';
import { Database } from '../../database/Database';
import { logger } from '../../utils/logger';

export class HistoricalDataFetcher {
  private rpc: StarknetRPCClient;
  private db: Database;
  private isRunning = false;

  constructor(rpc: StarknetRPCClient, db: Database) {
    this.rpc = rpc;
    this.db = db;
  }

  async fetchHistoricalData(monthsBack: number = 3): Promise<void> {
    const currentBlock = await this.rpc.getBlockNumber();
    
    // Starknet produces ~1 block per 10-30 seconds, ~2880 blocks/day
    const blocksPerDay = 2880;
    const daysBack = monthsBack * 30;
    const startBlock = currentBlock - BigInt(blocksPerDay * daysBack);
    
    logger.info(`Fetching historical data from block ${startBlock} to ${currentBlock}`);
    
    // Check what we already have
    const lastProcessed = await this.getLastProcessedBlock();
    const actualStartBlock = lastProcessed ? lastProcessed + 1n : startBlock;
    
    logger.info(`Starting from block ${actualStartBlock}`);
    
    this.isRunning = true;
    await this.processBlockRange(actualStartBlock, currentBlock);
  }

  async startContinuousSync(): Promise<void> {
    logger.info('Starting continuous sync...');
    
    while (this.isRunning) {
      try {
        const latestBlock = await this.rpc.getBlockNumber();
        const lastProcessed = await this.getLastProcessedBlock();
        
        if (!lastProcessed || latestBlock > lastProcessed) {
          const nextBlock = lastProcessed ? lastProcessed + 1n : latestBlock;
          await this.processBlock(nextBlock);
          logger.info(`Processed block ${nextBlock}`);
        }
        
        await this.sleep(10000); // 10 seconds
      } catch (error: any) {
        logger.error('Sync error:', error);
        await this.sleep(30000); // Wait 30s on error
      }
    }
  }

  private async processBlockRange(startBlock: bigint, endBlock: bigint): Promise<void> {
    const batchSize = 10;
    
    for (let current = startBlock; current <= endBlock; current += BigInt(batchSize)) {
      const batchEnd = current + BigInt(batchSize - 1) > endBlock ? 
        endBlock : current + BigInt(batchSize - 1);
      
      const promises = [];
      for (let block = current; block <= batchEnd; block++) {
        promises.push(this.processBlock(block));
      }
      
      await Promise.allSettled(promises);
      logger.info(`Processed blocks ${current} to ${batchEnd}`);
      
      // Small delay to avoid overwhelming the RPC
      await this.sleep(1000);
    }
  }

  private async processBlock(blockNumber: bigint): Promise<void> {
    try {
      console.log(`🔍 Step A: Fetching block ${blockNumber} from RPC...`);
      const block = await this.rpc.getBlockWithReceipts(blockNumber);
      console.log(`✅ Step A: Block ${blockNumber} fetched successfully`);
      console.log(`📊 Block data:`, {
        blockNumber: block.blockNumber,
        blockHash: block.blockHash,
        parentBlockHash: block.parentBlockHash,
        timestamp: block.timestamp,
        transactionCount: block.transactions?.length || 0
      });
      
      console.log(`🔍 Step B: Starting database transaction...`);
      await this.db.transaction(async (client) => {
        console.log(`🔍 Step C: Inserting block ${blockNumber}...`);
        // Insert block into starknet_blocks table
        await client.query(`
          INSERT INTO starknet_blocks (block_number, block_hash, parent_block_hash, timestamp, finality_status)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (block_number) DO NOTHING
        `, [
          Number(block.blockNumber), // Convert BigInt to number for database
          block.blockHash,
          block.parentBlockHash,
          Math.floor(block.timestamp.getTime() / 1000), // Convert Date to Unix timestamp
          'ACCEPTED_ON_L2'
        ]);
        console.log(`✅ Step C: Block ${blockNumber} inserted successfully`);
        
        // Process transactions
        if (block.transactions) {
          console.log(`🔍 Step D: Processing ${block.transactions.length} transactions...`);
          for (const tx of block.transactions) {
            console.log(`🔍 Processing transaction:`, {
              txHash: tx.txHash,
              txType: tx.txType,
              senderAddress: tx.senderAddress
            });
            await client.query(`
              INSERT INTO starknet_transactions (tx_hash, block_number, tx_type, sender_address, status)
              VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT (tx_hash) DO NOTHING
            `, [
              tx.txHash,
              Number(block.blockNumber), // Convert BigInt to number
              tx.txType,
              tx.senderAddress,
              'ACCEPTED_ON_L2'
            ]);

            // Process events from this transaction
            if (tx.events && tx.events.length > 0) {
              console.log(`🔍 Processing ${tx.events.length} events from tx ${tx.txHash}`);
              for (const event of tx.events) {
                // Insert event without contract_address constraint for now
                await client.query(`
                  INSERT INTO starknet_events (tx_hash, block_number)
                  VALUES ($1, $2)
                `, [
                  tx.txHash,
                  Number(block.blockNumber)
                ]);
              }
            }

            // Process contract deployments
            if (tx.txType === 'DEPLOY_ACCOUNT' || tx.txType === 'DEPLOY') {
              console.log(`🔍 Processing contract deployment: ${tx.txHash}`);
              await client.query(`
                INSERT INTO starknet_contracts (contract_address, deployment_tx_hash, deployment_block, created_at)
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (contract_address) DO NOTHING
              `, [
                tx.senderAddress, // For DEPLOY_ACCOUNT, this is the deployed contract
                tx.txHash,
                Number(block.blockNumber)
              ]);
            }
          }
          console.log(`✅ Step D: All ${block.transactions.length} transactions processed`);
        } else {
          console.log(`ℹ️ Step D: No transactions in block ${blockNumber}`);
        }
      });
      console.log(`🎉 Block ${blockNumber} processing completed successfully!`);
    } catch (error: any) {
      console.error(`❌ ERROR processing block ${blockNumber}:`, error.message);
      console.error(`❌ Full error:`, error);
      console.error(`❌ Stack trace:`, error.stack);
      logger.error(`Error processing block ${blockNumber}:`, error);
    }
  }

  private async getLastProcessedBlock(): Promise<bigint | null> {
    const result = await this.db.query<{block_number: string}>(
      'SELECT MAX(block_number) as block_number FROM blocks'
    );
    
    return result[0]?.block_number ? BigInt(result[0].block_number) : null;
  }

  stop(): void {
    this.isRunning = false;
    logger.info('Stopping historical data fetcher...');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
