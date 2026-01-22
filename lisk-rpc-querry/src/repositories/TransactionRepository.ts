import { query } from '../database/db';

export interface Transaction {
  tx_id: string;
  chain_id: number;
  block_id: string;
  block_height: number;
  module: string;
  command: string;
  sender_address: string;
  nonce: number;
  fee: number;
  params: any;
  signatures: any;
  execution_status: string;
  error_message?: string;
}

export async function insertTransaction(tx: Transaction): Promise<void> {
  const function_key = `${tx.module}.${tx.command}`;
  
  const sql = `
    INSERT INTO transactions (
      tx_id, chain_id, block_id, block_height, module, command, function_key,
      sender_address, nonce, fee, params, signatures, execution_status, error_message
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    ON CONFLICT (tx_id) DO NOTHING
  `;
  
  await query(sql, [
    tx.tx_id,
    tx.chain_id,
    tx.block_id,
    tx.block_height,
    tx.module,
    tx.command,
    function_key,
    tx.sender_address,
    tx.nonce,
    tx.fee,
    JSON.stringify(tx.params),
    JSON.stringify(tx.signatures),
    tx.execution_status,
    tx.error_message || null
  ]);
}

export async function getTransaction(tx_id: string) {
  const result = await query('SELECT * FROM transactions WHERE tx_id = $1', [tx_id]);
  return result.rows[0] || null;
}

export async function getTransactionsByBlock(block_id: string) {
  const result = await query('SELECT * FROM transactions WHERE block_id = $1 ORDER BY tx_id', [block_id]);
  return result.rows;
}
