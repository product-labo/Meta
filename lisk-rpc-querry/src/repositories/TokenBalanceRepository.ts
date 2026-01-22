import { query } from '../database/db';

export interface TokenBalance {
  address: string;
  token_id: string;
  available_balance: number;
  locked_balance: number;
  last_updated_height: number;
}

export async function upsertTokenBalance(balance: TokenBalance): Promise<void> {
  const sql = `
    INSERT INTO token_balances (address, token_id, available_balance, locked_balance, last_updated_height)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (address, token_id) DO UPDATE SET
      available_balance = EXCLUDED.available_balance,
      locked_balance = EXCLUDED.locked_balance,
      last_updated_height = EXCLUDED.last_updated_height,
      updated_at = CURRENT_TIMESTAMP
  `;
  
  await query(sql, [
    balance.address,
    balance.token_id,
    balance.available_balance,
    balance.locked_balance,
    balance.last_updated_height
  ]);
}

export async function getTokenBalance(address: string, token_id: string) {
  const result = await query(
    'SELECT * FROM token_balances WHERE address = $1 AND token_id = $2',
    [address, token_id]
  );
  return result.rows[0] || null;
}

export async function getAllBalances(address: string) {
  const result = await query('SELECT * FROM token_balances WHERE address = $1', [address]);
  return result.rows;
}
