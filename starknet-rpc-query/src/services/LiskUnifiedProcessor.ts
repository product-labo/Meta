import { Database } from '../database/Database';
import { UnifiedDatabaseAdapter } from './UnifiedDatabaseAdapter';
import { logger } from '../utils/logger';

export class LiskUnifiedProcessor {
  private db: Database;
  private unifiedDb: UnifiedDatabaseAdapter;

  constructor(db: Database) {
    this.db = db;
    this.unifiedDb = new UnifiedDatabaseAdapter(db, 1); // Chain ID 1 for Lisk
  }

  async processLiskTransaction(txData: any): Promise<void> {
    try {
      // Insert transaction into unified database
      const transactionId = await this.unifiedDb.insertTransaction({
        hash: txData.tx_hash,
        blockNumber: txData.block_number,
        timestamp: txData.block_timestamp || new Date(),
        from: txData.from_address,
        to: txData.to_address,
        value: txData.value || 0,
        gasLimit: txData.gas_limit,
        gasUsed: txData.gas_used,
        gasPrice: txData.gas_price,
        fee: txData.gas_fee,
        status: txData.status || 'success',
        inputData: txData.input_data,
        chainSpecific: {
          nonce: txData.nonce,
          transactionIndex: txData.transaction_index,
          maxFeePerGas: txData.max_fee_per_gas,
          maxPriorityFeePerGas: txData.max_priority_fee_per_gas
        }
      });

      // Ensure wallet exists
      await this.unifiedDb.insertWallet({
        address: txData.from_address,
        firstSeenBlock: txData.block_number,
        firstSeenDate: txData.block_timestamp || new Date(),
        type: 'EOA'
      });

      if (txData.to_address) {
        await this.unifiedDb.insertWallet({
          address: txData.to_address,
          firstSeenBlock: txData.block_number,
          firstSeenDate: txData.block_timestamp || new Date(),
          type: 'Contract'
        });
      }

      logger.debug(`Processed Lisk transaction ${txData.tx_hash} into unified database`);
    } catch (error) {
      logger.error(`Error processing Lisk transaction ${txData.tx_hash}:`, error);
    }
  }

  async processLiskContract(contractData: any): Promise<void> {
    try {
      await this.unifiedDb.insertContract({
        address: contractData.contract_address,
        deployer: contractData.deployer_address,
        deploymentTx: contractData.deployment_tx_hash,
        deploymentBlock: contractData.deployment_block_number,
        type: 'Smart Contract',
        isProxy: false,
        abiHash: contractData.code_hash,
        isVerified: contractData.is_verified || false
      });

      logger.debug(`Processed Lisk contract ${contractData.contract_address} into unified database`);
    } catch (error) {
      logger.error(`Error processing Lisk contract ${contractData.contract_address}:`, error);
    }
  }

  async processLiskWalletInteraction(interactionData: any): Promise<void> {
    try {
      // Get contract_id from unified contracts table
      const contractResult = await this.db.query(`
        SELECT contract_id FROM contracts 
        WHERE chain_id = 1 AND contract_address = $1
      `, [interactionData.contract_address]);

      const contractId = contractResult.rows[0]?.contract_id;

      // Get transaction_id from unified transactions table
      const txResult = await this.db.query(`
        SELECT transaction_id FROM transactions 
        WHERE chain_id = 1 AND tx_hash = $1
      `, [interactionData.tx_hash]);

      const transactionId = txResult.rows[0]?.transaction_id;

      if (contractId && transactionId) {
        await this.unifiedDb.insertWalletInteraction({
          walletAddress: interactionData.wallet_address,
          contractId: contractId,
          transactionId: transactionId,
          type: interactionData.interaction_type,
          value: interactionData.interaction_value || 0,
          gasUsed: interactionData.gas_used || 0,
          success: interactionData.success !== false,
          timestamp: interactionData.block_timestamp || new Date()
        });

        // Update contract metrics
        await this.unifiedDb.updateContractMetrics(contractId);
      }

      logger.debug(`Processed Lisk wallet interaction for ${interactionData.wallet_address}`);
    } catch (error) {
      logger.error(`Error processing Lisk wallet interaction:`, error);
    }
  }
}
