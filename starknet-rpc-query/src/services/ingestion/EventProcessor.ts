import { StarknetRPCClient } from '../rpc/StarknetRPCClient';
import { Database } from '../../database/Database';
import { logger } from '../../utils/logger';

export class EventProcessor {
  private rpc: StarknetRPCClient;
  private db: Database;

  constructor(rpc: StarknetRPCClient, db: Database) {
    this.rpc = rpc;
    this.db = db;
  }

  async processTransactionEvents(txHash: string, blockNumber: bigint): Promise<void> {
    try {
      const receipt = await this.rpc.getTransactionReceipt(txHash);
      
      if (receipt.events && receipt.events.length > 0) {
        await this.db.transaction(async (client) => {
          for (const event of receipt.events) {
            await this.processEvent(client, event, txHash, blockNumber);
          }
        });
      }

      logger.debug(`Processed ${receipt.events?.length || 0} events for transaction ${txHash}`);
    } catch (error: any) {
      logger.error(`Failed to process events for transaction ${txHash}:`, error);
      throw error;
    }
  }

  private async processEvent(client: any, event: any, txHash: string, blockNumber: bigint): Promise<void> {
    try {
      // Insert event into starknet_events
      await client.query(`
        INSERT INTO starknet_events (tx_hash, contract_address, block_number, event_index, keys, data)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        txHash,
        event.from_address,
        blockNumber.toString(),
        event.event_index || 0,
        event.keys || [],
        event.data || []
      ]);

      // Track wallet interactions from event
      await this.trackWalletInteractions(client, event, txHash, blockNumber);
      
    } catch (error: any) {
      logger.error(`Failed to process event for tx ${txHash}:`, error);
      // Don't throw - continue processing other events
    }
  }

  private async getFunctionId(client: any, contractAddress: string, eventSelector: string): Promise<number | null> {
    if (!eventSelector) return null;

    try {
      const result = await client.query(`
        SELECT function_id
        FROM functions
        WHERE contract_address = $1 AND function_name = $2
        LIMIT 1
      `, [contractAddress, this.selectorToFunctionName(eventSelector)]);

      return result.length > 0 ? result[0].function_id : null;
    } catch (error: any) {
      return null;
    }
  }

  private async trackWalletInteractions(client: any, event: any, txHash: string, blockNumber: bigint): Promise<void> {
    // Extract wallet addresses from event data
    const walletAddresses = this.extractWalletAddresses(event);

    for (const walletAddress of walletAddresses) {
      try {
        await client.query(`
          INSERT INTO starknet_wallet_interactions (wallet_address, contract_address, tx_hash, block_number, interaction_type)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          walletAddress,
          event.from_address,
          txHash,
          blockNumber.toString(),
          'EVENT'
        ]);
      } catch (error: any) {
        // Ignore duplicate or constraint errors
        logger.debug(`Failed to track wallet interaction: ${error.message}`);
      }
    }
  }

  private extractWalletAddresses(event: any): string[] {
    const addresses: string[] = [];

    // Extract from event keys (typically contains addresses)
    if (event.keys) {
      for (const key of event.keys) {
        if (this.isValidAddress(key)) {
          addresses.push(key);
        }
      }
    }

    // Extract from event data
    if (event.data) {
      for (const dataItem of event.data) {
        if (this.isValidAddress(dataItem)) {
          addresses.push(dataItem);
        }
      }
    }

    return [...new Set(addresses)]; // Remove duplicates
  }

  private isValidAddress(value: string): boolean {
    return typeof value === 'string' && 
           value.startsWith('0x') && 
           value.length === 66 &&
           /^0x[0-9a-fA-F]{64}$/.test(value);
  }

  private selectorToFunctionName(selector: string): string {
    // This is a simplified mapping - in practice, you'd need a more sophisticated
    // selector-to-function-name mapping system
    const commonSelectors: { [key: string]: string } = {
      '0x99cd8bde557814842a3121e8ddfd433a539b8c9f14bf31ebf108d12e6196e9': 'Transfer',
      '0x134692b230b9e1ffa39098904722134159652b09c5bc41d88d6698779d228ff': 'Approval',
      '0x5ad857f66a5b55f1301207b4649da1c0fd4544b1b7cc283a0743a0e4b9c77': 'Mint',
      '0x1a35984e05126dbecb7c3bb9929e7dd9106d460c59b1633739a5c733a5fb': 'Burn'
    };

    return commonSelectors[selector] || 'Unknown';
  }

  async getEventsByContract(contractAddress: string, limit: number = 100): Promise<any[]> {
    try {
      return await this.db.query(`
        SELECT e.*, f.function_name, b.timestamp
        FROM events e
        LEFT JOIN functions f ON e.function_id = f.function_id
        JOIN blocks b ON e.block_number = b.block_number
        WHERE e.contract_address = $1
        ORDER BY e.block_number DESC, e.event_id DESC
        LIMIT $2
      `, [contractAddress, limit]);
    } catch (error: any) {
      logger.error(`Failed to get events for contract ${contractAddress}:`, error);
      return [];
    }
  }

  async getEventsByWallet(walletAddress: string, limit: number = 100): Promise<any[]> {
    try {
      return await this.db.query(`
        SELECT wi.*, e.*, f.function_name, b.timestamp
        FROM wallet_interactions wi
        JOIN events e ON wi.tx_hash = e.tx_hash AND wi.contract_address = e.contract_address
        LEFT JOIN functions f ON wi.function_id = f.function_id
        JOIN blocks b ON wi.block_number = b.block_number
        WHERE wi.wallet_address = $1
        ORDER BY wi.block_number DESC
        LIMIT $2
      `, [walletAddress, limit]);
    } catch (error: any) {
      logger.error(`Failed to get events for wallet ${walletAddress}:`, error);
      return [];
    }
  }

  async filterEvents(contractAddress?: string, functionName?: string, fromBlock?: bigint, toBlock?: bigint): Promise<any[]> {
    try {
      let query = `
        SELECT e.*, f.function_name, b.timestamp
        FROM events e
        LEFT JOIN functions f ON e.function_id = f.function_id
        JOIN blocks b ON e.block_number = b.block_number
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (contractAddress) {
        query += ` AND e.contract_address = $${paramIndex}`;
        params.push(contractAddress);
        paramIndex++;
      }

      if (functionName) {
        query += ` AND f.function_name = $${paramIndex}`;
        params.push(functionName);
        paramIndex++;
      }

      if (fromBlock) {
        query += ` AND e.block_number >= $${paramIndex}`;
        params.push(fromBlock.toString());
        paramIndex++;
      }

      if (toBlock) {
        query += ` AND e.block_number <= $${paramIndex}`;
        params.push(toBlock.toString());
        paramIndex++;
      }

      query += ` ORDER BY e.block_number DESC, e.event_id DESC LIMIT 1000`;

      return await this.db.query(query, params);
    } catch (error: any) {
      logger.error('Failed to filter events:', error);
      return [];
    }
  }
}
