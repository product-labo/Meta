import { query } from '../database/db';

export async function linkTransactionAccount(
  tx_id: string,
  address: string,
  role: 'sender' | 'receiver' | 'validator' | 'delegator'
): Promise<void> {
  const sql = `
    INSERT INTO transaction_accounts (tx_id, address, role)
    VALUES ($1, $2, $3)
    ON CONFLICT (tx_id, address, role) DO NOTHING
  `;
  
  await query(sql, [tx_id, address, role]);
}

export async function getTransactionAccounts(tx_id: string) {
  const result = await query('SELECT * FROM transaction_accounts WHERE tx_id = $1', [tx_id]);
  return result.rows;
}

export async function getAccountTransactions(address: string, role?: string) {
  const sql = role
    ? 'SELECT * FROM transaction_accounts WHERE address = $1 AND role = $2'
    : 'SELECT * FROM transaction_accounts WHERE address = $1';
  
  const params = role ? [address, role] : [address];
  const result = await query(sql, params);
  return result.rows;
}
