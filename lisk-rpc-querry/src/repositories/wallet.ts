import { DatabaseManager } from '../database/manager';

export interface WalletInteraction {
  walletAddress: string;
  contractAddress: string;
  functionSelector?: string;
  txHash: string;
  blockNumber: number;
  interactionType: 'call' | 'deploy' | 'transfer';
  value: string;
  gasUsed?: number;
}

export class WalletRepository {
  constructor(private db: DatabaseManager) {}

  async insertWalletInteraction(interaction: WalletInteraction): Promise<void> {
    await this.db.query(`
      INSERT INTO wallet_interactions (
        wallet_address, contract_address, function_selector, tx_hash,
        block_number, interaction_type, value, gas_used
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (tx_hash, wallet_address, contract_address) DO NOTHING
    `, [
      interaction.walletAddress, interaction.contractAddress, interaction.functionSelector,
      interaction.txHash, interaction.blockNumber, interaction.interactionType,
      interaction.value, interaction.gasUsed
    ]);
  }

  async insertFunction(contractAddress: string, selector: string, name: string, signature: string): Promise<void> {
    await this.db.query(`
      INSERT INTO functions (
        contract_address, function_selector, function_name, function_signature
      ) VALUES ($1, $2, $3, $4)
      ON CONFLICT (contract_address, function_selector) DO UPDATE SET
        function_name = EXCLUDED.function_name,
        function_signature = EXCLUDED.function_signature
    `, [contractAddress, selector, name, signature]);
  }

  async storeRawRPCResponse(chainId: number, method: string, params: any, response: any, blockNumber?: number, txHash?: string): Promise<void> {
    await this.db.query(`
      INSERT INTO raw_rpc_responses (
        chain_id, rpc_method, request_params, response_data, block_number, tx_hash
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [chainId, method, JSON.stringify(params), JSON.stringify(response), blockNumber, txHash]);
  }

  async getWalletInteractionCount(walletAddress: string): Promise<number> {
    const result = await this.db.query(
      'SELECT COUNT(*) as count FROM wallet_interactions WHERE wallet_address = $1',
      [walletAddress]
    );
    return parseInt(result.rows[0].count);
  }

  async getContractInteractionCount(contractAddress: string): Promise<number> {
    const result = await this.db.query(
      'SELECT COUNT(*) as count FROM wallet_interactions WHERE contract_address = $1',
      [contractAddress]
    );
    return parseInt(result.rows[0].count);
  }
}
