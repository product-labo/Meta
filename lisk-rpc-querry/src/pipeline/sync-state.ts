import { DatabaseManager } from '../database/manager';

export class SyncStateManager {
  constructor(private db: DatabaseManager) {}

  async getLastSynced(chainId: number = 1135): Promise<number> {
    const result = await this.db.query(
      'SELECT last_synced_block FROM lisk_sync_state WHERE chain_id = $1',
      [chainId]
    );
    return result.rows[0]?.last_synced_block || 0;
  }

  async updateLastSynced(blockNumber: number, chainId: number = 1135): Promise<void> {
    await this.db.query(`
      INSERT INTO lisk_sync_state (chain_id, last_synced_block, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (chain_id) 
      DO UPDATE SET last_synced_block = $2, updated_at = NOW()
    `, [chainId, blockNumber]);
  }

  async getLastFinalized(chainId: number = 1135): Promise<number> {
    const result = await this.db.query(
      'SELECT last_finalized_block FROM lisk_sync_state WHERE chain_id = $1',
      [chainId]
    );
    return result.rows[0]?.last_finalized_block || 0;
  }

  async updateLastFinalized(blockNumber: number, chainId: number = 1135): Promise<void> {
    await this.db.query(`
      INSERT INTO lisk_sync_state (chain_id, last_finalized_block, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (chain_id) 
      DO UPDATE SET last_finalized_block = $2, updated_at = NOW()
    `, [chainId, blockNumber]);
  }
}
