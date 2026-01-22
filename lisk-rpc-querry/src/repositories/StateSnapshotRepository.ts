import { query } from '../database/db';

export interface AccountStateSnapshot {
  address: string;
  block_height: number;
  module: string;
  state_data: any;
}

export async function insertStateSnapshot(snapshot: AccountStateSnapshot): Promise<void> {
  const sql = `
    INSERT INTO account_state_snapshots (address, block_height, module, state_data)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (address, block_height, module) DO UPDATE SET
      state_data = EXCLUDED.state_data
  `;
  
  await query(sql, [
    snapshot.address,
    snapshot.block_height,
    snapshot.module,
    JSON.stringify(snapshot.state_data)
  ]);
}

export async function getStateSnapshot(address: string, block_height: number, module: string) {
  const result = await query(
    'SELECT * FROM account_state_snapshots WHERE address = $1 AND block_height = $2 AND module = $3',
    [address, block_height, module]
  );
  return result.rows[0] || null;
}

export async function getLatestStateSnapshot(address: string, module: string) {
  const result = await query(
    'SELECT * FROM account_state_snapshots WHERE address = $1 AND module = $2 ORDER BY block_height DESC LIMIT 1',
    [address, module]
  );
  return result.rows[0] || null;
}
