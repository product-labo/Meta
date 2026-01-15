import { query } from '../database/db';

export interface TokenLock {
  address: string;
  token_id: string;
  module: string;
  amount: number;
  lock_height: number;
  unlock_height?: number;
  related_tx_id?: string;
}

export async function insertTokenLock(lock: TokenLock): Promise<void> {
  const sql = `
    INSERT INTO token_locks (address, token_id, module, amount, lock_height, unlock_height, related_tx_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `;
  
  await query(sql, [
    lock.address,
    lock.token_id,
    lock.module,
    lock.amount,
    lock.lock_height,
    lock.unlock_height || null,
    lock.related_tx_id || null
  ]);
}

export async function getActiveLocks(address: string, token_id: string) {
  const result = await query(
    'SELECT * FROM token_locks WHERE address = $1 AND token_id = $2 AND (unlock_height IS NULL OR unlock_height > $3)',
    [address, token_id, Date.now()]
  );
  return result.rows;
}

export async function unlockTokens(address: string, token_id: string, current_height: number): Promise<void> {
  await query(
    'DELETE FROM token_locks WHERE address = $1 AND token_id = $2 AND unlock_height <= $3',
    [address, token_id, current_height]
  );
}
