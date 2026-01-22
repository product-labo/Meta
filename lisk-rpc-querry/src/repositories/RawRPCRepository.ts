import { query } from '../database/db';

export async function storeRawRPCResponse(
  rpc_method: string,
  response_json: any,
  block_height?: number,
  tx_id?: string
): Promise<void> {
  const sql = `
    INSERT INTO raw_rpc_responses (rpc_method, block_height, tx_id, response_json)
    VALUES ($1, $2, $3, $4)
  `;
  
  await query(sql, [
    rpc_method,
    block_height || null,
    tx_id || null,
    JSON.stringify(response_json)
  ]);
}

export async function getRawRPCResponse(rpc_method: string, block_height?: number, tx_id?: string) {
  let sql = 'SELECT * FROM raw_rpc_responses WHERE rpc_method = $1';
  const params: any[] = [rpc_method];
  
  if (block_height !== undefined) {
    sql += ' AND block_height = $2';
    params.push(block_height);
  }
  
  if (tx_id) {
    sql += ` AND tx_id = $${params.length + 1}`;
    params.push(tx_id);
  }
  
  sql += ' ORDER BY created_at DESC LIMIT 1';
  
  const result = await query(sql, params);
  return result.rows[0] || null;
}
