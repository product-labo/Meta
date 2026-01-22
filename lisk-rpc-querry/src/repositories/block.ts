import { DatabaseManager } from '../database/manager';

export interface Block {
  number: string;
  hash: string;
  parentHash: string;
  timestamp: string;
  gasLimit: string;
  gasUsed: string;
  miner: string;
  difficulty: string;
  totalDifficulty: string;
  size: string;
  transactions: any[];
}

export class BlockRepository {
  constructor(private db: DatabaseManager) {}

  async insertBlock(chainId: number, block: Block): Promise<void> {
    const blockNumber = parseInt(block.number, 16);
    const timestamp = parseInt(block.timestamp, 16);
    const gasLimit = parseInt(block.gasLimit, 16);
    const gasUsed = parseInt(block.gasUsed, 16);
    const size = parseInt(block.size, 16);

    await this.db.query(`
      INSERT INTO blocks (
        block_number, chain_id, block_hash, parent_hash, timestamp,
        gas_limit, gas_used, miner, difficulty, total_difficulty,
        size, transaction_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (block_number) DO UPDATE SET
        block_hash = EXCLUDED.block_hash,
        parent_hash = EXCLUDED.parent_hash,
        timestamp = EXCLUDED.timestamp,
        gas_limit = EXCLUDED.gas_limit,
        gas_used = EXCLUDED.gas_used,
        miner = EXCLUDED.miner,
        difficulty = EXCLUDED.difficulty,
        total_difficulty = EXCLUDED.total_difficulty,
        size = EXCLUDED.size,
        transaction_count = EXCLUDED.transaction_count
    `, [
      blockNumber, chainId, block.hash, block.parentHash, timestamp,
      gasLimit, gasUsed, block.miner, block.difficulty, block.totalDifficulty,
      size, block.transactions.length
    ]);
  }

  async getLastSyncedBlock(chainId: number): Promise<number> {
    const result = await this.db.query(
      'SELECT last_synced_block FROM sync_state WHERE chain_id = $1',
      [chainId]
    );
    return result.rows[0]?.last_synced_block || 0;
  }

  async updateSyncState(chainId: number, lastSyncedBlock: number): Promise<void> {
    await this.db.query(`
      UPDATE sync_state 
      SET last_synced_block = $2, updated_at = CURRENT_TIMESTAMP
      WHERE chain_id = $1
    `, [chainId, lastSyncedBlock]);
  }

  async blockExists(blockNumber: number): Promise<boolean> {
    const result = await this.db.query(
      'SELECT 1 FROM blocks WHERE block_number = $1',
      [blockNumber]
    );
    return result.rows.length > 0;
  }
}
