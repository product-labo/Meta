import { DatabaseManager } from '../database/manager';
import { logger } from '../utils/logger';

export class BlockProcessor {
  constructor(private db: DatabaseManager) {}

  async processBlock(blockData: any, chainId: number): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO lisk_blocks (
          block_number, chain_id, block_hash, parent_hash, timestamp,
          gas_limit, gas_used, miner, transaction_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (block_number) DO NOTHING
      `, [
        parseInt(blockData.number, 16),
        chainId,
        blockData.hash,
        blockData.parentHash,
        parseInt(blockData.timestamp, 16),
        parseInt(blockData.gasLimit, 16),
        parseInt(blockData.gasUsed, 16),
        blockData.miner,
        blockData.transactions?.length || 0
      ]);

      logger.debug(`Block ${parseInt(blockData.number, 16)} stored successfully`);
    } catch (error) {
      logger.error(`Failed to store block ${parseInt(blockData.number, 16)}:`, error);
      throw error;
    }
  }
}
