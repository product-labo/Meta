import { query } from '../database/db';

export interface AccountStateDelta {
  tx_id: string;
  address: string;
  block_height: number;
  module: string;
  field_path: string;
  old_value: any;
  new_value: any;
}

export async function insertStateDelta(delta: AccountStateDelta): Promise<void> {
  const sql = `
    INSERT INTO account_state_deltas (tx_id, address, block_height, module, field_path, old_value, new_value)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `;
  
  await query(sql, [
    delta.tx_id,
    delta.address,
    delta.block_height,
    delta.module,
    delta.field_path,
    delta.old_value ? JSON.stringify(delta.old_value) : null,
    JSON.stringify(delta.new_value)
  ]);
}

export async function getStateDeltas(tx_id: string) {
  const result = await query('SELECT * FROM account_state_deltas WHERE tx_id = $1', [tx_id]);
  return result.rows;
}

export async function getAccountDeltas(address: string, module: string) {
  const result = await query(
    'SELECT * FROM account_state_deltas WHERE address = $1 AND module = $2 ORDER BY block_height',
    [address, module]
  );
  return result.rows;
}
