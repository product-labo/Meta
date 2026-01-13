import { DatabaseManager } from '../database/manager';

export interface Transaction {
  hash: string;
  blockNumber: string;
  transactionIndex: string;
  from: string;
  to: string | null;
  value: string;
  gas: string;
  gasPrice: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce: string;
  input: string;
  type: string;
}

export class TransactionRepository {
  constructor(private db: DatabaseManager) {}

  async insertTransaction(tx: Transaction): Promise<void> {
    const blockNumber = parseInt(tx.blockNumber, 16);
    const transactionIndex = parseInt(tx.transactionIndex, 16);
    const value = BigInt(tx.value).toString();
    const gasLimit = parseInt(tx.gas, 16);
    const gasPrice = tx.gasPrice ? parseInt(tx.gasPrice, 16) : null;
    const maxFeePerGas = tx.maxFeePerGas ? parseInt(tx.maxFeePerGas, 16) : null;
    const maxPriorityFeePerGas = tx.maxPriorityFeePerGas ? parseInt(tx.maxPriorityFeePerGas, 16) : null;
    const nonce = parseInt(tx.nonce, 16);
    const transactionType = parseInt(tx.type || '0x0', 16);

    await this.db.query(`
      INSERT INTO transactions (
        tx_hash, block_number, transaction_index, from_address, to_address,
        value, gas_limit, gas_price, max_fee_per_gas, max_priority_fee_per_gas,
        nonce, input_data, transaction_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (tx_hash) DO UPDATE SET
        block_number = EXCLUDED.block_number,
        transaction_index = EXCLUDED.transaction_index,
        from_address = EXCLUDED.from_address,
        to_address = EXCLUDED.to_address,
        value = EXCLUDED.value,
        gas_limit = EXCLUDED.gas_limit,
        gas_price = EXCLUDED.gas_price,
        max_fee_per_gas = EXCLUDED.max_fee_per_gas,
        max_priority_fee_per_gas = EXCLUDED.max_priority_fee_per_gas,
        nonce = EXCLUDED.nonce,
        input_data = EXCLUDED.input_data,
        transaction_type = EXCLUDED.transaction_type
    `, [
      tx.hash, blockNumber, transactionIndex, tx.from, tx.to,
      value, gasLimit, gasPrice, maxFeePerGas, maxPriorityFeePerGas,
      nonce, tx.input, transactionType
    ]);
  }

  async insertTransactionReceipt(receipt: any): Promise<void> {
    const gasUsed = parseInt(receipt.gasUsed, 16);
    const cumulativeGasUsed = parseInt(receipt.cumulativeGasUsed, 16);
    const status = parseInt(receipt.status, 16);
    const effectiveGasPrice = receipt.effectiveGasPrice ? parseInt(receipt.effectiveGasPrice, 16) : null;

    await this.db.query(`
      INSERT INTO transaction_receipts (
        tx_hash, status, gas_used, cumulative_gas_used, contract_address,
        logs_bloom, effective_gas_price
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (tx_hash) DO UPDATE SET
        status = EXCLUDED.status,
        gas_used = EXCLUDED.gas_used,
        cumulative_gas_used = EXCLUDED.cumulative_gas_used,
        contract_address = EXCLUDED.contract_address,
        logs_bloom = EXCLUDED.logs_bloom,
        effective_gas_price = EXCLUDED.effective_gas_price
    `, [
      receipt.transactionHash, status, gasUsed, cumulativeGasUsed,
      receipt.contractAddress, receipt.logsBloom, effectiveGasPrice
    ]);
  }

  async getTransactionsByBlock(blockNumber: number): Promise<any[]> {
    const result = await this.db.query(
      'SELECT * FROM transactions WHERE block_number = $1 ORDER BY transaction_index',
      [blockNumber]
    );
    return result.rows;
  }
}
