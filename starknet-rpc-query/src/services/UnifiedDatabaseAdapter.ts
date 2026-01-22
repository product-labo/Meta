import { Database } from '../database/Database';

export class UnifiedDatabaseAdapter {
  private db: Database;
  private chainId: number;

  constructor(db: Database, chainId: number) {
    this.db = db;
    this.chainId = chainId; // 1 for Lisk, 2 for Starknet
  }

  async insertContract(contractData: any): Promise<void> {
    await this.db.query(`
      INSERT INTO contracts (
        chain_id, contract_address, deployer_address, 
        deployment_tx_hash, deployment_block_number, 
        contract_type, is_proxy, abi_hash, is_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (chain_id, contract_address) DO UPDATE SET
        deployer_address = EXCLUDED.deployer_address,
        deployment_tx_hash = EXCLUDED.deployment_tx_hash,
        deployment_block_number = EXCLUDED.deployment_block_number,
        is_verified = EXCLUDED.is_verified
    `, [
      this.chainId,
      contractData.address,
      contractData.deployer,
      contractData.deploymentTx,
      contractData.deploymentBlock,
      contractData.type || 'Unknown',
      contractData.isProxy || false,
      contractData.abiHash,
      contractData.isVerified || false
    ]);
  }

  async insertTransaction(txData: any): Promise<bigint> {
    const result = await this.db.query(`
      INSERT INTO transactions (
        chain_id, tx_hash, block_number, block_timestamp,
        from_address, to_address, value, gas_limit, gas_used,
        gas_price, transaction_fee, status, input_data, chain_specific_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (chain_id, tx_hash) DO UPDATE SET
        block_number = EXCLUDED.block_number,
        block_timestamp = EXCLUDED.block_timestamp,
        status = EXCLUDED.status
      RETURNING transaction_id
    `, [
      this.chainId,
      txData.hash,
      txData.blockNumber,
      txData.timestamp,
      txData.from,
      txData.to,
      txData.value || 0,
      txData.gasLimit,
      txData.gasUsed,
      txData.gasPrice,
      txData.fee,
      txData.status || 'success',
      txData.inputData,
      JSON.stringify(txData.chainSpecific || {})
    ]);
    
    return result.rows[0].transaction_id;
  }

  async insertWallet(walletData: any): Promise<bigint> {
    const result = await this.db.query(`
      INSERT INTO wallets (
        wallet_address, chain_id, first_seen_block, 
        first_seen_date, wallet_type
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (chain_id, wallet_address) DO UPDATE SET
        last_activity_date = NOW(),
        total_transactions = wallets.total_transactions + 1
      RETURNING wallet_id
    `, [
      walletData.address,
      this.chainId,
      walletData.firstSeenBlock,
      walletData.firstSeenDate,
      walletData.type || 'EOA'
    ]);
    
    return result.rows[0].wallet_id;
  }

  async insertWalletInteraction(interactionData: any): Promise<void> {
    await this.db.query(`
      INSERT INTO wallet_interactions (
        chain_id, wallet_address, contract_id, transaction_id,
        interaction_type, interaction_value, gas_used, 
        success, block_timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT DO NOTHING
    `, [
      this.chainId,
      interactionData.walletAddress,
      interactionData.contractId,
      interactionData.transactionId,
      interactionData.type || 'call',
      interactionData.value || 0,
      interactionData.gasUsed || 0,
      interactionData.success !== false,
      interactionData.timestamp
    ]);
  }

  async updateContractMetrics(contractId: bigint): Promise<void> {
    await this.db.query(`
      INSERT INTO contract_metrics_realtime (
        contract_id, total_transactions, unique_users, total_volume,
        last_24h_transactions, last_updated
      )
      SELECT 
        $1,
        COUNT(wi.interaction_id),
        COUNT(DISTINCT wi.wallet_address),
        COALESCE(SUM(wi.interaction_value), 0),
        COUNT(CASE WHEN wi.block_timestamp > NOW() - INTERVAL '24 hours' THEN 1 END),
        NOW()
      FROM wallet_interactions wi
      WHERE wi.contract_id = $1
      ON CONFLICT (contract_id) DO UPDATE SET
        total_transactions = EXCLUDED.total_transactions,
        unique_users = EXCLUDED.unique_users,
        total_volume = EXCLUDED.total_volume,
        last_24h_transactions = EXCLUDED.last_24h_transactions,
        last_updated = NOW()
    `, [contractId]);
  }
}
