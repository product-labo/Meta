import { StarknetRPCClient } from '../rpc/StarknetRPCClient';
import { Database } from '../../database/Database';
import { UnifiedDatabaseAdapter } from '../UnifiedDatabaseAdapter';
import { logger } from '../../utils/logger';

export class BlockProcessor {
  private rpc: StarknetRPCClient;
  private db: Database;
  private unifiedDb: UnifiedDatabaseAdapter;

  constructor(rpc: StarknetRPCClient, db: Database) {
    this.rpc = rpc;
    this.db = db;
    this.unifiedDb = new UnifiedDatabaseAdapter(db, 2); // Chain ID 2 for Starknet
  }

  async processBlock(blockNumber: bigint): Promise<void> {
    try {
      const block = await this.rpc.getBlock(blockNumber);
      
      await this.db.transaction(async (client) => {
        // Insert into legacy starknet_blocks for compatibility
        await client.query(`
          INSERT INTO starknet_blocks (block_number, block_hash, parent_block_hash, timestamp, finality_status)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (block_number) DO UPDATE SET
            block_hash = EXCLUDED.block_hash,
            parent_block_hash = EXCLUDED.parent_block_hash,
            timestamp = EXCLUDED.timestamp,
            finality_status = EXCLUDED.finality_status
        `, [
          block.blockNumber,
          block.blockHash,
          block.parentBlockHash,
          block.timestamp,
          this.determineFinalityStatus(block)
        ]);

        // Process transactions and insert into unified database
        if (block.transactions) {
          for (const tx of block.transactions) {
            const transactionId = await this.unifiedDb.insertTransaction({
              hash: tx.transactionHash,
              blockNumber: block.blockNumber,
              timestamp: new Date(Number(block.timestamp) * 1000),
              from: tx.senderAddress,
              to: tx.contractAddress,
              value: tx.calldata?.[0] || 0,
              gasLimit: tx.maxFee,
              gasUsed: tx.actualFee,
              gasPrice: tx.maxFee,
              fee: tx.actualFee,
              status: tx.executionStatus === 'SUCCEEDED' ? 'success' : 'failed',
              inputData: JSON.stringify(tx.calldata),
              chainSpecific: {
                nonce: tx.nonce,
                version: tx.version,
                signature: tx.signature
              }
            });

            // Insert wallet interaction
            if (tx.contractAddress) {
              await this.unifiedDb.insertWalletInteraction({
                walletAddress: tx.senderAddress,
                contractId: null, // Will be resolved later
                transactionId: transactionId,
                type: 'invoke',
                value: tx.calldata?.[0] || 0,
                gasUsed: tx.actualFee,
                success: tx.executionStatus === 'SUCCEEDED',
                timestamp: new Date(Number(block.timestamp) * 1000)
              });
            }
          }
        }

        // Detect and handle reorganizations
        await this.handleReorganization(client, block);
      });

      logger.debug(`Processed block ${blockNumber} into unified database`);
    } catch (error: any) {
      logger.error(`Failed to process block ${blockNumber}:`, error);
      throw error;
    }
  }

  private determineFinalityStatus(block: any): string {
    // Determine finality based on block data
    if (block.status === 'ACCEPTED_ON_L1') {
      return 'ACCEPTED_ON_L1';
    } else if (block.status === 'ACCEPTED_ON_L2') {
      return 'ACCEPTED_ON_L2';
    } else {
      return 'PENDING';
    }
  }

  private async handleReorganization(client: any, block: any): Promise<void> {
    // Check for reorganization by comparing parent hash
    if (!block.parent_hash) return;

    const parentBlock = await client.query(
      'SELECT block_hash FROM blocks WHERE block_number = $1',
      [(BigInt(block.block_number) - 1n).toString()]
    );

    if (parentBlock.length > 0 && parentBlock[0].block_hash !== block.parent_hash) {
      logger.warn(`Reorganization detected at block ${block.block_number}`);
      
      // Mark affected blocks for reprocessing
      await client.query(`
        UPDATE blocks 
        SET finality_status = 'REORGANIZED' 
        WHERE block_number >= $1 AND finality_status != 'ACCEPTED_ON_L1'
      `, [block.block_number]);

      // Log reorganization event
      await client.query(`
        INSERT INTO raw_rpc_responses (rpc_method, prep_number, response_json)
        VALUES ('reorganization_detected', $1, $2)
      `, [
        block.block_number,
        JSON.stringify({
          block_number: block.block_number,
          expected_parent: parentBlock[0].block_hash,
          actual_parent: block.parent_hash,
          timestamp: new Date().toISOString()
        })
      ]);
    }
  }

  async validateBlockChain(startBlock: bigint, endBlock: bigint): Promise<boolean> {
    try {
      const blocks = await this.db.query(`
        SELECT block_number, block_hash, parent_block_hash 
        FROM blocks 
        WHERE block_number BETWEEN $1 AND $2 
        ORDER BY block_number
      `, [startBlock.toString(), endBlock.toString()]);

      for (let i = 1; i < blocks.length; i++) {
        const currentBlock = blocks[i];
        const previousBlock = blocks[i - 1];

        if (BigInt(currentBlock.block_number) - BigInt(previousBlock.block_number) === 1n) {
          if (currentBlock.parent_block_hash !== previousBlock.block_hash) {
            logger.error(`Chain validation failed: block ${currentBlock.block_number} parent mismatch`);
            return false;
          }
        }
      }

      return true;
    } catch (error: any) {
      logger.error('Block chain validation failed:', error);
      return false;
    }
  }

  async getBlockStatus(blockNumber: bigint): Promise<string | null> {
    try {
      const result = await this.db.query(
        'SELECT finality_status FROM blocks WHERE block_number = $1',
        [blockNumber.toString()]
      );

      return result.length > 0 ? result[0].finality_status : null;
    } catch (error: any) {
      logger.error(`Failed to get block status for ${blockNumber}:`, error);
      return null;
    }
  }

  async updateBlockFinality(blockNumber: bigint, finalityStatus: string): Promise<void> {
    try {
      await this.db.query(
        'UPDATE blocks SET finality_status = $1 WHERE block_number = $2',
        [finalityStatus, blockNumber.toString()]
      );

      logger.debug(`Updated block ${blockNumber} finality to ${finalityStatus}`);
    } catch (error: any) {
      logger.error(`Failed to update block finality for ${blockNumber}:`, error);
      throw error;
    }
  }
}
