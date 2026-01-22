import { DatabaseManager } from '../database/manager';

export interface Contract {
  address: string;
  deployerAddress: string;
  deploymentTxHash: string;
  deploymentBlockNumber: number;
  codeHash?: string;
  bytecodeSize?: number;
  isProxy?: boolean;
  proxyImplementation?: string;
}

export class ContractRepository {
  constructor(private db: DatabaseManager) {}

  async insertContract(chainId: number, contract: Contract): Promise<void> {
    await this.db.query(`
      INSERT INTO contracts (
        contract_address, chain_id, deployer_address, deployment_tx_hash,
        deployment_block_number, code_hash, bytecode_size, is_proxy, proxy_implementation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (contract_address) DO UPDATE SET
        code_hash = EXCLUDED.code_hash,
        bytecode_size = EXCLUDED.bytecode_size,
        is_proxy = EXCLUDED.is_proxy,
        proxy_implementation = EXCLUDED.proxy_implementation
    `, [
      contract.address, chainId, contract.deployerAddress, contract.deploymentTxHash,
      contract.deploymentBlockNumber, contract.codeHash, contract.bytecodeSize,
      contract.isProxy || false, contract.proxyImplementation
    ]);
  }

  async insertLog(log: any): Promise<void> {
    const blockNumber = parseInt(log.blockNumber, 16);
    const logIndex = parseInt(log.logIndex, 16);

    await this.db.query(`
      INSERT INTO logs (
        tx_hash, block_number, log_index, contract_address,
        topic0, topic1, topic2, topic3, data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (tx_hash, log_index) DO NOTHING
    `, [
      log.transactionHash, blockNumber, logIndex, log.address,
      log.topics[0] || null, log.topics[1] || null, 
      log.topics[2] || null, log.topics[3] || null, log.data
    ]);
  }

  async insertExecutionCall(call: any): Promise<number> {
    const result = await this.db.query(`
      INSERT INTO execution_calls (
        tx_hash, parent_call_id, call_depth, call_type, from_address,
        to_address, value, gas_limit, gas_used, input_data, output_data, error
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING call_id
    `, [
      call.txHash, call.parentCallId, call.callDepth, call.type,
      call.from, call.to, call.value || '0', call.gas, call.gasUsed,
      call.input, call.output, call.error
    ]);
    return result.rows[0].call_id;
  }

  async contractExists(address: string): Promise<boolean> {
    const result = await this.db.query(
      'SELECT 1 FROM contracts WHERE contract_address = $1',
      [address]
    );
    return result.rows.length > 0;
  }
}
