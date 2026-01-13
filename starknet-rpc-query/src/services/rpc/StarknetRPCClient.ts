import axios, { AxiosInstance } from 'axios';
import { IStarknetRPCClient } from '../../interfaces/IRPCClient';
import { Block, Transaction, TransactionReceipt, ContractClass, BlockIdentifier } from '../../models';
import { logger } from '../../utils/logger';

export class StarknetRPCClient implements IStarknetRPCClient {
  private client: AxiosInstance;

  constructor(url: string, timeout: number = 30000) {
    this.client = axios.create({
      baseURL: url,
      timeout: timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private serializeObject(obj: any): any {
    if (typeof obj === 'bigint') {
      return '0x' + obj.toString(16);
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.serializeObject(item));
    }
    if (typeof obj === 'object' && obj !== null) {
      const serialized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        serialized[key] = this.serializeObject(value);
      }
      return serialized;
    }
    return obj;
  }

  private async makeRequest(method: string, params: any[] = []): Promise<any> {
    try {
      // Convert BigInt values to hex strings for JSON serialization
      const serializedParams = params.map(param => {
        if (typeof param === 'bigint') {
          return '0x' + param.toString(16);
        }
        if (typeof param === 'object' && param !== null) {
          return this.serializeObject(param);
        }
        return param;
      });

      const response = await this.client.post('', {
        jsonrpc: '2.0',
        method,
        params: serializedParams,
        id: Date.now(),
      });

      if (response.data.error) {
        throw new Error(`RPC Error: ${response.data.error.message}`);
      }

      return response.data.result;
    } catch (error: any) {
      logger.error(`RPC request failed: ${method}`, error.message);
      throw error;
    }
  }

  async getBlock(blockId: BlockIdentifier): Promise<Block> {
    return this.getBlockWithReceipts(blockId);
  }

  async getBlockWithReceipts(blockId: BlockIdentifier): Promise<Block> {
    // Convert BigInt to proper block identifier format
    let blockIdentifier;
    if (typeof blockId === 'bigint') {
      blockIdentifier = { block_number: Number(blockId) };
    } else if (typeof blockId === 'number') {
      blockIdentifier = { block_number: blockId };
    } else {
      blockIdentifier = blockId;
    }
    
    const result = await this.makeRequest('starknet_getBlockWithTxs', [blockIdentifier]);
    
    // Transform transactions and fetch their receipts for events
    const transformedTransactions = [];
    if (result.transactions) {
      for (const tx of result.transactions) {
        const transformedTx = {
          txHash: tx.transaction_hash,
          blockNumber: BigInt(result.block_number),
          txType: tx.type || 'UNKNOWN',
          senderAddress: tx.sender_address || '0x0',
          entryPointSelector: tx.entry_point_selector,
          calldataHash: tx.calldata_hash,
          status: 'accepted_on_l2',
          actualFee: tx.actual_fee ? BigInt(tx.actual_fee) : undefined,
          maxFee: tx.max_fee ? BigInt(tx.max_fee) : undefined,
          nonce: tx.nonce ? BigInt(tx.nonce) : undefined,
          version: tx.version || '0x0',
          createdAt: new Date(),
          events: [] as any[]
        };

        // Fetch transaction receipt for events
        try {
          const receipt = await this.makeRequest('starknet_getTransactionReceipt', [tx.transaction_hash]);
          if (receipt.events) {
            transformedTx.events = receipt.events.map((event: any) => ({
              fromAddress: event.from_address,
              keys: event.keys || [],
              data: event.data || []
            }));
          }
        } catch (error) {
          // Continue if receipt fetch fails
          console.warn(`Failed to fetch receipt for tx ${tx.transaction_hash}`);
        }

        transformedTransactions.push(transformedTx);
      }
    }

    return {
      blockNumber: BigInt(result.block_number),
      blockHash: result.block_hash,
      parentBlockHash: result.parent_hash,
      timestamp: new Date(result.timestamp * 1000),
      finalityStatus: 'accepted_on_l2',
      createdAt: new Date(),
      transactions: transformedTransactions,
    };
  }

  async getTransaction(txHash: string): Promise<Transaction> {
    const result = await this.makeRequest('starknet_getTransactionByHash', [txHash]);
    return {
      txHash: result.transaction_hash,
      blockNumber: BigInt(0), // Will be set by caller
      txType: result.type || 'UNKNOWN',
      senderAddress: result.sender_address || '0x0',
      entryPointSelector: result.entry_point_selector,
      calldataHash: result.calldata_hash,
      status: 'accepted_on_l2',
      actualFee: result.actual_fee ? BigInt(result.actual_fee) : undefined,
      maxFee: result.max_fee ? BigInt(result.max_fee) : undefined,
      nonce: result.nonce ? BigInt(result.nonce) : undefined,
      version: result.version || '0x0',
      createdAt: new Date(),
    };
  }

  async getTransactionReceipt(txHash: string): Promise<TransactionReceipt> {
    const result = await this.makeRequest('starknet_getTransactionReceipt', [txHash]);
    return result;
  }

  async getContractClass(classHash: string): Promise<ContractClass> {
    const result = await this.makeRequest('starknet_getClass', [classHash]);
    return result;
  }

  async call(contractAddress: string, functionName: string, calldata: any[]): Promise<any> {
    const result = await this.makeRequest('starknet_call', [{
      contract_address: contractAddress,
      entry_point_selector: functionName,
      calldata,
    }, 'latest']);
    return result;
  }

  async getClassHashAt(contractAddress: string, blockId?: BlockIdentifier): Promise<string> {
    const result = await this.makeRequest('starknet_getClassHashAt', [
      blockId || 'latest',
      contractAddress
    ]);
    return result;
  }

  async getStorageAt(contractAddress: string, key: string, blockId?: BlockIdentifier): Promise<string> {
    const result = await this.makeRequest('starknet_getStorageAt', [
      contractAddress,
      key,
      blockId || 'latest',
    ]);
    return result;
  }

  async getLatestBlockNumber(): Promise<bigint> {
    const result = await this.makeRequest('starknet_blockNumber');
    return BigInt(result);
  }

  async getBlockNumber(): Promise<bigint> {
    return this.getLatestBlockNumber();
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.getLatestBlockNumber();
      return true;
    } catch {
      return false;
    }
  }
}
