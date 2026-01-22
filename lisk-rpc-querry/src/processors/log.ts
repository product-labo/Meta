import { DatabaseManager } from '../database/manager';
import { RpcClient } from '../rpc/client';

export interface LogData {
  tx_hash: string;
  block_number: number;
  log_index: number;
  contract_address: string;
  topic0: string | null;
  topic1: string | null;
  topic2: string | null;
  topic3: string | null;
  data: string;
}

export class LogProcessor {
  constructor(private db: DatabaseManager, private rpc: RpcClient) {}

  async processBlock(blockNumber: number): Promise<void> {
    const logs = await this.rpc.getLogs({
      fromBlock: `0x${blockNumber.toString(16)}`,
      toBlock: `0x${blockNumber.toString(16)}`
    });

    for (const log of logs) {
      await this.processLog(log);
    }
  }

  private async processLog(log: any): Promise<void> {
    const logData: LogData = {
      tx_hash: log.transactionHash,
      block_number: parseInt(log.blockNumber, 16),
      log_index: parseInt(log.logIndex, 16),
      contract_address: log.address.toLowerCase(),
      topic0: log.topics[0] || null,
      topic1: log.topics[1] || null,
      topic2: log.topics[2] || null,
      topic3: log.topics[3] || null,
      data: log.data
    };

    await this.store(logData);
  }

  private async store(log: LogData): Promise<void> {
    await this.db.query(`
      INSERT INTO logs (
        tx_hash, block_number, log_index, contract_address,
        topic0, topic1, topic2, topic3, data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (tx_hash, log_index) DO NOTHING
    `, [
      log.tx_hash, log.block_number, log.log_index, log.contract_address,
      log.topic0, log.topic1, log.topic2, log.topic3, log.data
    ]);
  }
}
