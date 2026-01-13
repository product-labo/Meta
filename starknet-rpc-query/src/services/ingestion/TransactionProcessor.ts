import { StarknetRPCClient } from '../rpc/StarknetRPCClient';
import { Database } from '../../database/Database';
import { logger } from '../../utils/logger';

export class TransactionProcessor {
  private rpc: StarknetRPCClient;
  private db: Database;

  constructor(rpc: StarknetRPCClient, db: Database) {
    this.rpc = rpc;
    this.db = db;
  }

  async processTransaction(txHash: string, blockNumber: bigint, transactionData?: any): Promise<void> {
    try {
      let transaction, receipt;
      
      if (transactionData) {
        // Use provided transaction data (from block processing)
        transaction = transactionData;
        receipt = await this.rpc.getTransactionReceipt(txHash).catch(() => null);
      } else {
        // Fetch transaction data (for individual processing)
        [transaction, receipt] = await Promise.all([
          this.rpc.getTransaction(txHash),
          this.rpc.getTransactionReceipt(txHash).catch(() => null)
        ]);
      }

      await this.db.transaction(async (client) => {
        // Insert transaction with proper block reference into starknet_transactions
        await client.query(`
          INSERT INTO starknet_transactions (tx_hash, block_number, tx_type, sender_address, entry_point_selector, status, actual_fee)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (tx_hash) DO UPDATE SET
            block_number = EXCLUDED.block_number,
            tx_type = EXCLUDED.tx_type,
            sender_address = EXCLUDED.sender_address,
            entry_point_selector = EXCLUDED.entry_point_selector,
            status = EXCLUDED.status,
            actual_fee = EXCLUDED.actual_fee
        `, [
          txHash,
          blockNumber.toString(),
          transaction.txType,
          transaction.senderAddress,
          transaction.entryPointSelector,
          receipt?.execution_status || 'ACCEPTED_ON_L2',
          receipt?.actual_fee?.amount || transaction.actualFee || '0'
        ]);

        // Process execution trace if available
        if (receipt && receipt.execution_status === 'SUCCEEDED') {
          await this.processExecutionTrace(client, txHash, blockNumber);
        }

        // Handle transaction failures
        if (receipt && receipt.execution_status === 'REVERTED') {
          await this.processTransactionFailure(client, txHash, receipt);
        }
      });

      logger.debug(`Processed transaction ${txHash}`);
    } catch (error: any) {
      logger.error(`Failed to process transaction ${txHash}:`, error);
      throw error;
    }
  }

  private async processExecutionTrace(client: any, txHash: string, _blockNumber: bigint): Promise<void> {
    try {
      // Note: traceTransaction is not available in current RPC client
      // This would require starknet_traceTransaction RPC method
      logger.debug(`Execution trace processing skipped for ${txHash} - method not implemented`);
    } catch (error: any) {
      logger.warn(`Execution trace not available for ${txHash}:`, error.message);
    }
  }

  private async processExecutionCalls(client: any, txHash: string, invocation: any, parentCallId: number | null): Promise<void> {
    // Insert execution call
    const callResult = await client.query(`
      INSERT INTO execution_calls (tx_hash, parent_call_id, contract_address, entry_point_selector, call_status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING call_id
    `, [
      txHash,
      parentCallId,
      invocation.contract_address,
      invocation.entry_point_selector,
      invocation.call_type === 'CALL' ? 'SUCCEEDED' : 'FAILED'
    ]);

    const callId = callResult[0].call_id;

    // Process nested calls recursively
    if (invocation.internal_calls) {
      for (const internalCall of invocation.internal_calls) {
        await this.processExecutionCalls(client, txHash, internalCall, callId);
      }
    }

    // Process call failures
    if (invocation.revert_reason) {
      await client.query(`
        INSERT INTO execution_failures (call_id, failure_reason, error_message)
        VALUES ($1, $2, $3)
      `, [
        callId,
        'EXECUTION_REVERTED',
        invocation.revert_reason
      ]);
    }
  }

  private async processTransactionFailure(client: any, txHash: string, receipt: any): Promise<void> {
    const failureType = this.categorizeFailure(receipt);
    
    await client.query(`
      INSERT INTO transaction_failures (tx_hash, failure_type, failure_reason, error_message, fee_charged)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (tx_hash) DO UPDATE SET
        failure_type = EXCLUDED.failure_type,
        failure_reason = EXCLUDED.failure_reason,
        error_message = EXCLUDED.error_message,
        fee_charged = EXCLUDED.fee_charged
    `, [
      txHash,
      failureType,
      receipt.revert_reason || 'Transaction reverted',
      receipt.revert_reason || 'No error message available',
      receipt.actual_fee || '0'
    ]);
  }

  private categorizeFailure(receipt: any): string {
    if (receipt.revert_reason) {
      if (receipt.revert_reason.includes('insufficient')) {
        return 'INSUFFICIENT_BALANCE';
      } else if (receipt.revert_reason.includes('nonce')) {
        return 'NONCE_ERROR';
      } else if (receipt.revert_reason.includes('validation')) {
        return 'VALIDATION_FAILURE';
      }
    }
    
    return 'EXECUTION_ERROR';
  }

  async getTransactionStatus(txHash: string): Promise<string | null> {
    try {
      const result = await this.db.query(
        'SELECT status FROM transactions WHERE tx_hash = $1',
        [txHash]
      );

      return result.length > 0 ? result[0].status : null;
    } catch (error: any) {
      logger.error(`Failed to get transaction status for ${txHash}:`, error);
      return null;
    }
  }

  async updateTransactionStatus(txHash: string, status: string): Promise<void> {
    try {
      await this.db.query(
        'UPDATE transactions SET status = $1 WHERE tx_hash = $2',
        [status, txHash]
      );

      logger.debug(`Updated transaction ${txHash} status to ${status}`);
    } catch (error: any) {
      logger.error(`Failed to update transaction status for ${txHash}:`, error);
      throw error;
    }
  }

  async getFailedTransactions(blockNumber: bigint): Promise<string[]> {
    try {
      const result = await this.db.query(`
        SELECT t.tx_hash 
        FROM transactions t
        JOIN transaction_failures tf ON t.tx_hash = tf.tx_hash
        WHERE t.block_number = $1
      `, [blockNumber.toString()]);

      return result.map(row => row.tx_hash);
    } catch (error: any) {
      logger.error(`Failed to get failed transactions for block ${blockNumber}:`, error);
      return [];
    }
  }
}
