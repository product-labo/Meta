import { query } from '../database/db';

export interface Event {
  tx_id: string;
  block_id: string;
  block_height: number;
  event_index: number;
  module: string;
  name: string;
  data: any;
  topics?: any;
}

export async function insertEvent(event: Event): Promise<void> {
  const sql = `
    INSERT INTO events (tx_id, block_id, block_height, event_index, module, name, data, topics)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (tx_id, event_index) DO NOTHING
  `;
  
  await query(sql, [
    event.tx_id,
    event.block_id,
    event.block_height,
    event.event_index,
    event.module,
    event.name,
    JSON.stringify(event.data),
    event.topics ? JSON.stringify(event.topics) : null
  ]);
}

export async function getEventsByTransaction(tx_id: string) {
  const result = await query(
    'SELECT * FROM events WHERE tx_id = $1 ORDER BY event_index',
    [tx_id]
  );
  return result.rows;
}

export async function getEventsByBlock(block_id: string) {
  const result = await query(
    'SELECT * FROM events WHERE block_id = $1 ORDER BY event_index',
    [block_id]
  );
  return result.rows;
}
