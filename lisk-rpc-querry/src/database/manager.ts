import { Pool, PoolClient } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

export class DatabaseManager {
  private pool: Pool;

  constructor(connectionString?: string) {
    if (connectionString) {
      this.pool = new Pool({
        connectionString,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 30000,
      });
    } else {
      // Use individual environment variables
      this.pool = new Pool({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 30000,
      });
    }
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async query(text: string, params?: any[]): Promise<any> {
    const client = await this.getClient();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  async migrate(): Promise<void> {
    const schemaPath = path.join(__dirname, '../../database/lisk-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      await client.query(schema);
      await client.query('COMMIT');
      console.log('Lisk database migration completed successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async initializeChainConfig(chainId: number, chainName: string, rpcUrl: string): Promise<void> {
    await this.query(`
      INSERT INTO lisk_chain_config (chain_id, chain_name, rpc_url)
      VALUES ($1, $2, $3)
      ON CONFLICT (chain_id) DO UPDATE SET
        chain_name = EXCLUDED.chain_name,
        rpc_url = EXCLUDED.rpc_url,
        updated_at = CURRENT_TIMESTAMP
    `, [chainId, chainName, rpcUrl]);

    await this.query(`
      INSERT INTO lisk_sync_state (chain_id, last_synced_block, last_finalized_block)
      VALUES ($1, 0, 0)
      ON CONFLICT (chain_id) DO NOTHING
    `, [chainId]);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
