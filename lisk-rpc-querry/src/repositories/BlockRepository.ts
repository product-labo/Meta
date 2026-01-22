import { query } from '../database/db';

export interface Block {
  block_id: string;
  chain_id: number;
  height: number;
  timestamp: number;
  previous_block_id: string | null;
  generator_address: string;
  transaction_root: string;
  state_root: string;
  asset_root: string;
  payload_length: number;
}

export async function insertBlock(block: Block): Promise<void> {
  const sql = `
    INSERT INTO blocks (
      block_id, chain_id, height, timestamp, previous_block_id,
      generator_address, transaction_root, state_root, asset_root, payload_length
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (block_id) DO NOTHING
  `;
  
  await query(sql, [
    block.block_id,
    block.chain_id,
    block.height,
    block.timestamp,
    block.previous_block_id,
    block.generator_address,
    block.transaction_root,
    block.state_root,
    block.asset_root,
    block.payload_length
  ]);
}

export async function getBlock(block_id: string) {
  const result = await query('SELECT * FROM blocks WHERE block_id = $1', [block_id]);
  return result.rows[0] || null;
}

export async function getBlockByHeight(chain_id: number, height: number) {
  const result = await query(
    'SELECT * FROM blocks WHERE chain_id = $1 AND height = $2',
    [chain_id, height]
  );
  return result.rows[0] || null;
}

export async function deleteBlocksAboveHeight(chain_id: number, height: number): Promise<void> {
  await query('DELETE FROM blocks WHERE chain_id = $1 AND height > $2', [chain_id, height]);
}
