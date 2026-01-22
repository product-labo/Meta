import { StarknetRPCClient } from '../rpc/StarknetRPCClient';
import { Database } from '../../database/Database';
import { logger } from '../../utils/logger';

export class ContractProcessor {
  private rpc: StarknetRPCClient;
  private db: Database;

  constructor(rpc: StarknetRPCClient, db: Database) {
    this.rpc = rpc;
    this.db = db;
  }

  async processContractDeployment(txHash: string, contractAddress: string, blockNumber: bigint): Promise<void> {
    try {
      const transaction = await this.rpc.getTransaction(txHash);
      
      await this.db.transaction(async (client) => {
        let classHash: string;
        
        if (transaction.txType === 'DEPLOY') {
          classHash = (transaction as any).classHash;
        } else if (transaction.txType === 'DEPLOY_ACCOUNT') {
          classHash = (transaction as any).classHash;
        } else {
          // For INVOKE transactions that deploy contracts
          classHash = await this.extractClassHashFromCalldata(transaction);
        }

        // Store contract class if not exists
        await this.storeContractClass(client, classHash, txHash, blockNumber);

        // Store contract deployment in starknet_contracts
        await client.query(`
          INSERT INTO starknet_contracts (contract_address, class_hash, deployer_address, deployment_tx_hash, deployment_block, is_proxy)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (contract_address) DO UPDATE SET
            class_hash = EXCLUDED.class_hash,
            deployer_address = EXCLUDED.deployer_address,
            deployment_tx_hash = EXCLUDED.deployment_tx_hash,
            deployment_block = EXCLUDED.deployment_block,
            is_proxy = EXCLUDED.is_proxy
        `, [
          contractAddress,
          classHash,
          transaction.senderAddress,
          txHash,
          blockNumber.toString(),
          await this.detectProxy(contractAddress, classHash)
        ]);

        // Extract and store functions from ABI
        await this.processFunctions(client, contractAddress, classHash);
      });

      logger.debug(`Processed contract deployment ${contractAddress}`);
    } catch (error: any) {
      logger.error(`Failed to process contract deployment ${contractAddress}:`, error);
      throw error;
    }
  }

  private async storeContractClass(client: any, classHash: string, txHash: string, blockNumber: bigint): Promise<void> {
    try {
      const contractClass = await this.rpc.getContractClass(classHash);
      
      await client.query(`
        INSERT INTO contract_classes (class_hash, abi_json, declared_tx_hash, declared_block)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (class_hash) DO NOTHING
      `, [
        classHash,
        JSON.stringify(contractClass.abi || []),
        txHash,
        blockNumber.toString()
      ]);
    } catch (error: any) {
      logger.warn(`Could not fetch contract class ${classHash}:`, error.message);
      
      // Store minimal class info
      await client.query(`
        INSERT INTO contract_classes (class_hash, abi_json, declared_tx_hash, declared_block)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (class_hash) DO NOTHING
      `, [
        classHash,
        '[]',
        txHash,
        blockNumber.toString()
      ]);
    }
  }

  private async processFunctions(client: any, contractAddress: string, classHash: string): Promise<void> {
    try {
      const contractClass = await this.rpc.getContractClass(classHash);
      
      if (contractClass.abi) {
        for (const abiItem of contractClass.abi) {
          if (abiItem.type === 'function') {
            await client.query(`
              INSERT INTO functions (class_hash, contract_address, function_name, state_mutability)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (class_hash, contract_address, function_name) DO NOTHING
            `, [
              classHash,
              contractAddress,
              abiItem.name,
              abiItem.state_mutability || 'external'
            ]);
          }
        }
      }
    } catch (error: any) {
      logger.warn(`Could not process functions for ${contractAddress}:`, error.message);
    }
  }

  private async detectProxy(contractAddress: string, classHash: string): Promise<boolean> {
    try {
      // Check for common proxy patterns
      const implementationSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
      
      const implementation = await this.rpc.getStorageAt(contractAddress, implementationSlot);
      
      if (implementation && implementation !== '0x0') {
        // Store proxy relationship
        await this.db.query(`
          INSERT INTO proxy_links (proxy_address, implementation_address, effective_class_hash)
          VALUES ($1, $2, $3)
          ON CONFLICT (proxy_address, implementation_address) DO NOTHING
        `, [contractAddress, implementation, classHash]);
        
        return true;
      }
      
      return false;
    } catch (error: any) {
      logger.debug(`Proxy detection failed for ${contractAddress}:`, error.message);
      return false;
    }
  }

  private async extractClassHashFromCalldata(transaction: any): Promise<string> {
    // Extract class hash from transaction calldata
    if (transaction.calldata && transaction.calldata.length > 0) {
      // Look for class hash in calldata (implementation-specific)
      return transaction.calldata[0];
    }
    
    // Fallback: try to get from contract storage
    throw new Error('Could not extract class hash from transaction');
  }

  async trackContractUpgrade(contractAddress: string, newClassHash: string, txHash: string, blockNumber: bigint): Promise<void> {
    try {
      await this.db.transaction(async (client) => {
        // Update contract class hash
        await client.query(`
          UPDATE contracts 
          SET class_hash = $1 
          WHERE contract_address = $2
        `, [newClassHash, contractAddress]);

        // Record upgrade in contract versions
        await client.query(`
          INSERT INTO contract_versions (implementation_address, class_hash, upgrade_tx_hash, upgrade_block)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (implementation_address, class_hash) DO NOTHING
        `, [contractAddress, newClassHash, txHash, blockNumber.toString()]);

        // Store new class if needed
        await this.storeContractClass(client, newClassHash, txHash, blockNumber);
      });

      logger.info(`Tracked contract upgrade for ${contractAddress} to class ${newClassHash}`);
    } catch (error: any) {
      logger.error(`Failed to track contract upgrade for ${contractAddress}:`, error);
      throw error;
    }
  }

  async getContractInfo(contractAddress: string): Promise<any> {
    try {
      const result = await this.db.query(`
        SELECT c.*, cc.abi_json
        FROM contracts c
        JOIN contract_classes cc ON c.class_hash = cc.class_hash
        WHERE c.contract_address = $1
      `, [contractAddress]);

      return result.length > 0 ? result[0] : null;
    } catch (error: any) {
      logger.error(`Failed to get contract info for ${contractAddress}:`, error);
      return null;
    }
  }

  async getProxyImplementation(proxyAddress: string): Promise<string | null> {
    try {
      const result = await this.db.query(`
        SELECT implementation_address
        FROM proxy_links
        WHERE proxy_address = $1
        ORDER BY proxy_address DESC
        LIMIT 1
      `, [proxyAddress]);

      return result.length > 0 ? result[0].implementation_address : null;
    } catch (error: any) {
      logger.error(`Failed to get proxy implementation for ${proxyAddress}:`, error);
      return null;
    }
  }
}
