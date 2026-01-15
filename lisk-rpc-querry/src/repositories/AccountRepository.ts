import { query } from '../database/db';

export interface Account {
  address: string;
  chain_id: number;
  first_seen_height: number;
  last_seen_height: number;
}

export async function upsertAccount(account: Account): Promise<void> {
  const sql = `
    INSERT INTO accounts (address, chain_id, first_seen_height, last_seen_height)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (address) DO UPDATE SET
      last_seen_height = GREATEST(accounts.last_seen_height, EXCLUDED.last_seen_height),
      updated_at = CURRENT_TIMESTAMP
  `;
  
  await query(sql, [
    account.address,
    account.chain_id,
    account.first_seen_height,
    account.last_seen_height
  ]);
}

export async function getAccount(address: string) {
  const result = await query('SELECT * FROM accounts WHERE address = $1', [address]);
  return result.rows[0] || null;
}
