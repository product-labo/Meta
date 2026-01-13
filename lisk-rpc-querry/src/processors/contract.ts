import { DatabaseManager } from '../database/manager';
import { RpcClient } from '../rpc/client';
import { ReceiptData } from './receipt';
import { createHash } from 'crypto';

export interface ContractData {
  contract_address: string;
  chain_id: number;
  deployer_address: string;
  deployment_tx_hash: string;
  deployment_block_number: number;
  code_hash?: string;
  bytecode_size?: number;
  is_proxy: boolean;
  proxy_implementation?: string;
}

export class ContractProcessor {
  constructor(private db: DatabaseManager, private rpc: RpcClient) {}

  async detectFromReceipts(receipts: ReceiptData[]): Promise<ContractData[]> {
    const contracts: ContractData[] = [];
    
    for (const receipt of receipts) {
      if (receipt.contract_address) {
        const contract = await this.detectFromReceipt(receipt);
        if (contract) contracts.push(contract);
      }
    }
    
    return contracts;
  }

  async detectFromReceipt(receipt: ReceiptData): Promise<ContractData | null> {
    if (!receipt.contract_address) return null;

    // Check if contract already exists
    const existing = await this.db.query(
      'SELECT contract_address FROM contracts WHERE contract_address = $1',
      [receipt.contract_address]
    );
    if (existing.rows.length > 0) return null;

    // Get transaction details
    const tx = await this.rpc.getTransactionByHash(receipt.tx_hash);
    
    // Get contract code
    const code = await this.rpc.getCode(receipt.contract_address);
    const codeHash = code !== '0x' ? createHash('sha256').update(code).digest('hex') : null;
    
    const contractData: ContractData = {
      contract_address: receipt.contract_address,
      chain_id: 1135, // Lisk mainnet
      deployer_address: tx.from.toLowerCase(),
      deployment_tx_hash: receipt.tx_hash,
      deployment_block_number: parseInt(tx.blockNumber, 16),
      code_hash: codeHash,
      bytecode_size: code !== '0x' ? (code.length - 2) / 2 : 0,
      is_proxy: this.detectProxy(code),
      proxy_implementation: await this.getProxyImplementation(receipt.contract_address)
    };

    await this.store(contractData);
    return contractData;
  }

  private detectProxy(code: string): boolean {
    if (!code || code === '0x') return false;
    
    const proxyPatterns = [
      '363d3d373d3d3d363d73', // EIP-1167 minimal proxy
      '3d602d80600a3d3981f3', // Another common proxy pattern
    ];

    return proxyPatterns.some(pattern => code.toLowerCase().includes(pattern));
  }

  private async getProxyImplementation(contractAddress: string): Promise<string | null> {
    try {
      // Try EIP-1967 implementation slot
      const implementationSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
      const implementation = await this.rpc.getStorageAt(contractAddress, implementationSlot);
      
      if (implementation && implementation !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        return `0x${implementation.slice(-40)}`;
      }
    } catch (error) {
      console.warn(`Failed to get proxy implementation for ${contractAddress}:`, error);
    }
    
    return null;
  }

  private async store(contract: ContractData): Promise<void> {
    await this.db.query(`
      INSERT INTO contracts (
        contract_address, chain_id, deployer_address, deployment_tx_hash,
        deployment_block_number, code_hash, bytecode_size, is_proxy, proxy_implementation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (contract_address) DO NOTHING
    `, [
      contract.contract_address, contract.chain_id, contract.deployer_address,
      contract.deployment_tx_hash, contract.deployment_block_number,
      contract.code_hash, contract.bytecode_size, contract.is_proxy, contract.proxy_implementation
    ]);
  }
}
