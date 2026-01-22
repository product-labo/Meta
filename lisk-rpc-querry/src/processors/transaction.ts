import { DatabaseManager } from '../database/manager';
import { RpcClient } from '../rpc/client';

export interface TransactionData {
  tx_hash: string;
  block_number: number;
  transaction_index: number;
  from_address: string;
  to_address: string | null;
  value: string;
  gas_limit: number;
  gas_price: number | null;
  max_fee_per_gas: number | null;
  max_priority_fee_per_gas: number | null;
  nonce: number;
  input_data: string;
  transaction_type: number;
}

export class TransactionProcessor {
  constructor(private db: DatabaseManager, private rpc: RpcClient) {}

  async processBlock(blockNumber: number): Promise<TransactionData[]> {
    const block = await this.rpc.getBlockByNumber(blockNumber, true);
    const transactions: TransactionData[] = [];

    for (const tx of block.transactions) {
      const txData: TransactionData = {
        tx_hash: tx.hash,
        block_number: parseInt(tx.blockNumber, 16),
        transaction_index: parseInt(tx.transactionIndex, 16),
        from_address: tx.from.toLowerCase(),
        to_address: tx.to?.toLowerCase() || null,
        value: tx.value,
        gas_limit: parseInt(tx.gas, 16),
        gas_price: tx.gasPrice ? parseInt(tx.gasPrice, 16) : null,
        max_fee_per_gas: tx.maxFeePerGas ? parseInt(tx.maxFeePerGas, 16) : null,
        max_priority_fee_per_gas: tx.maxPriorityFeePerGas ? parseInt(tx.maxPriorityFeePerGas, 16) : null,
        nonce: parseInt(tx.nonce, 16),
        input_data: tx.input,
        transaction_type: parseInt(tx.type || '0x0', 16)
      };

      await this.store(txData);
      transactions.push(txData);
    }

    return transactions;
  }

  private async store(tx: TransactionData): Promise<void> {
    await this.db.query(`
      INSERT INTO transactions (
        tx_hash, block_number, transaction_index, from_address, to_address,
        value, gas_limit, gas_price, max_fee_per_gas, max_priority_fee_per_gas,
        nonce, input_data, transaction_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (tx_hash) DO NOTHING
    `, [
      tx.tx_hash, tx.block_number, tx.transaction_index, tx.from_address, tx.to_address,
      tx.value, tx.gas_limit, tx.gas_price, tx.max_fee_per_gas, tx.max_priority_fee_per_gas,
      tx.nonce, tx.input_data, tx.transaction_type
    ]);
  }
}
