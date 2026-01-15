import { query } from '../database/db';

export interface ChainConfig {
  chain_id: number;
  chain_name: string;
  rpc_url: string;
  start_block: number;
  finality_depth: number;
  reorg_depth: number;
}

export async function insertChainConfig(config: ChainConfig): Promise<void> {
  const sql = `
    INSERT INTO chain_config (chain_id, chain_name, rpc_url, start_block, finality_depth, reorg_depth)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (chain_id) DO UPDATE SET
      chain_name = EXCLUDED.chain_name,
      rpc_url = EXCLUDED.rpc_url,
      start_block = EXCLUDED.start_block,
      finality_depth = EXCLUDED.finality_depth,
      reorg_depth = EXCLUDED.reorg_depth,
      updated_at = CURRENT_TIMESTAMP
  `;
  
  await query(sql, [
    config.chain_id,
    config.chain_name,
    config.rpc_url,
    config.start_block,
    config.finality_depth,
    config.reorg_depth
  ]);
}

export async function getChainConfig(chain_id: number): Promise<ChainConfig | null> {
  const result = await query('SELECT * FROM chain_config WHERE chain_id = $1', [chain_id]);
  return result.rows[0] || null;
}

export async function initializeSyncState(chain_id: number): Promise<void> {
  const sql = `
    INSERT INTO sync_state (chain_id, last_synced_height, last_finalized_height)
    VALUES ($1, 0, 0)
    ON CONFLICT (chain_id) DO NOTHING
  `;
  await query(sql, [chain_id]);
}

export async function updateSyncState(
  chain_id: number,
  last_synced_height: number,
  last_finalized_height?: number
): Promise<void> {
  const sql = last_finalized_height !== undefined
    ? `UPDATE sync_state SET last_synced_height = $2, last_finalized_height = $3, updated_at = CURRENT_TIMESTAMP WHERE chain_id = $1`
    : `UPDATE sync_state SET last_synced_height = $2, updated_at = CURRENT_TIMESTAMP WHERE chain_id = $1`;
  
  const params = last_finalized_height !== undefined
    ? [chain_id, last_synced_height, last_finalized_height]
    : [chain_id, last_synced_height];
  
  await query(sql, params);
}

export async function getSyncState(chain_id: number) {
  const result = await query('SELECT * FROM sync_state WHERE chain_id = $1', [chain_id]);
  return result.rows[0] || null;
}
