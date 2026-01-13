import { DatabaseManager } from '../database/manager';
import { RpcClient } from '../rpc/client';

export interface ReceiptData {
  tx_hash: string;
  status: number;
  gas_used: number;
  cumulative_gas_used: number;
  contract_address: string | null;
  logs_bloom: string;
  effective_gas_price: number | null;
}

export class ReceiptProcessor {
  constructor(private db: DatabaseManager, private rpc: RpcClient) {}

  async process(txHash: string): Promise<ReceiptData> {
    const receipt = await this.rpc.getTransactionReceipt(txHash);
    
    const receiptData: ReceiptData = {
      tx_hash: receipt.transactionHash,
      status: parseInt(receipt.status, 16),
      gas_used: parseInt(receipt.gasUsed, 16),
      cumulative_gas_used: parseInt(receipt.cumulativeGasUsed, 16),
      contract_address: receipt.contractAddress?.toLowerCase() || null,
      logs_bloom: receipt.logsBloom,
      effective_gas_price: receipt.effectiveGasPrice ? parseInt(receipt.effectiveGasPrice, 16) : null
    };

    await this.store(receiptData);
    return receiptData;
  }

  private async store(receipt: ReceiptData): Promise<void> {
    await this.db.query(`
      INSERT INTO transaction_receipts (
        tx_hash, status, gas_used, cumulative_gas_used, contract_address,
        logs_bloom, effective_gas_price
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (tx_hash) DO NOTHING
    `, [
      receipt.tx_hash, receipt.status, receipt.gas_used, receipt.cumulative_gas_used,
      receipt.contract_address, receipt.logs_bloom, receipt.effective_gas_price
    ]);
  }
}
