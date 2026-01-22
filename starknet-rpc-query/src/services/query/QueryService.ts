import { Database } from '../../database/Database';
import { IQueryService, QueryOptions, ContractUsageStats, WalletActivityStats, NetworkStats } from '../../interfaces/IQueryService';
import { Block, BlockIdentifier, Transaction, TransactionReceipt, Contract, ContractClass, Event, EventFilter, Wallet, WalletInteraction } from '../../models';
import { logger } from '../../utils/logger';

export class QueryService implements IQueryService {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
  }

  async getBlock(identifier: BlockIdentifier): Promise<Block | null> {
    try {
      let query: string;
      let params: any[];

      if (typeof identifier === 'bigint') {
        query = 'SELECT * FROM blocks WHERE block_number = $1';
        params = [identifier.toString()];
      } else if (typeof identifier === 'string' && identifier !== 'latest' && identifier !== 'pending') {
        query = 'SELECT * FROM blocks WHERE block_hash = $1';
        params = [identifier];
      } else {
        query = 'SELECT * FROM blocks ORDER BY block_number DESC LIMIT 1';
        params = [];
      }

      const result = await this.db.query<any>(query, params);
      if (!result[0]) return null;

      return {
        blockNumber: BigInt(result[0].block_number),
        blockHash: result[0].block_hash,
        parentBlockHash: result[0].parent_block_hash,
        timestamp: result[0].timestamp,
        finalityStatus: result[0].finality_status,
        createdAt: result[0].created_at,
      };
    } catch (error: any) {
      logger.error('Error fetching block:', error.message);
      throw error;
    }
  }

  async getBlocks(options?: QueryOptions): Promise<Block[]> {
    try {
      let query = 'SELECT * FROM blocks';
      const params: any[] = [];
      let paramIndex = 1;

      if (options?.fromBlock || options?.toBlock) {
        query += ' WHERE';
        if (options.fromBlock) {
          query += ` block_number >= $${paramIndex}`;
          params.push(options.fromBlock.toString());
          paramIndex++;
        }
        if (options.toBlock) {
          if (options.fromBlock) query += ' AND';
          query += ` block_number <= $${paramIndex}`;
          params.push(options.toBlock.toString());
          paramIndex++;
        }
      }

      query += ' ORDER BY block_number DESC';
      if (options?.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(options.limit);
      }

      const result = await this.db.query<any>(query, params);
      return result.map(row => ({
        blockNumber: BigInt(row.block_number),
        blockHash: row.block_hash,
        parentBlockHash: row.parent_block_hash,
        timestamp: row.timestamp,
        finalityStatus: row.finality_status,
        createdAt: row.created_at,
      }));
    } catch (error: any) {
      logger.error('Error fetching blocks:', error.message);
      throw error;
    }
  }

  async getTransaction(txHash: string): Promise<Transaction | null> {
    try {
      const result = await this.db.query<any>(
        'SELECT * FROM transactions WHERE tx_hash = $1',
        [txHash]
      );
      return result[0] || null;
    } catch (error: any) {
      logger.error('Error fetching transaction:', error.message);
      throw error;
    }
  }

  async getTransactionReceipt(txHash: string): Promise<TransactionReceipt | null> {
    try {
      const result = await this.db.query<any>(
        'SELECT * FROM transaction_receipts WHERE tx_hash = $1',
        [txHash]
      );
      return result[0] || null;
    } catch (error: any) {
      logger.error('Error fetching transaction receipt:', error.message);
      throw error;
    }
  }

  async getTransactions(options?: QueryOptions): Promise<Transaction[]> {
    try {
      let query = 'SELECT * FROM transactions';
      const params: any[] = [];
      let paramIndex = 1;

      if (options?.fromBlock || options?.toBlock) {
        query += ' WHERE';
        if (options.fromBlock) {
          query += ` block_number >= $${paramIndex}`;
          params.push(options.fromBlock.toString());
          paramIndex++;
        }
        if (options.toBlock) {
          if (options.fromBlock) query += ' AND';
          query += ` block_number <= $${paramIndex}`;
          params.push(options.toBlock.toString());
          paramIndex++;
        }
      }

      query += ' ORDER BY block_number DESC';
      if (options?.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(options.limit);
      }

      const result = await this.db.query<Transaction>(query, params);
      return result;
    } catch (error: any) {
      logger.error('Error fetching transactions:', error.message);
      throw error;
    }
  }

  async getContract(address: string): Promise<Contract | null> {
    try {
      const result = await this.db.query<Contract>(
        'SELECT * FROM contracts WHERE contract_address = $1',
        [address]
      );
      return result[0] || null;
    } catch (error: any) {
      logger.error('Error fetching contract:', error.message);
      throw error;
    }
  }

  async getContractClass(classHash: string): Promise<ContractClass | null> {
    try {
      const result = await this.db.query<ContractClass>(
        'SELECT * FROM contract_classes WHERE class_hash = $1',
        [classHash]
      );
      return result[0] || null;
    } catch (error: any) {
      logger.error('Error fetching contract class:', error.message);
      throw error;
    }
  }

  async getContracts(options?: QueryOptions): Promise<Contract[]> {
    try {
      let query = 'SELECT * FROM contracts ORDER BY created_at DESC';
      const params: any[] = [];

      if (options?.limit) {
        query += ' LIMIT $1';
        params.push(options.limit);
      }

      const result = await this.db.query<Contract>(query, params);
      return result;
    } catch (error: any) {
      logger.error('Error fetching contracts:', error.message);
      throw error;
    }
  }

  async getEvents(filter: EventFilter): Promise<Event[]> {
    try {
      let query = 'SELECT * FROM events WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (filter.contractAddress) {
        query += ` AND contract_address = $${paramIndex}`;
        params.push(filter.contractAddress);
        paramIndex++;
      }

      if (filter.fromBlock) {
        query += ` AND block_number >= $${paramIndex}`;
        params.push(filter.fromBlock.toString());
        paramIndex++;
      }

      if (filter.toBlock) {
        query += ` AND block_number <= $${paramIndex}`;
        params.push(filter.toBlock.toString());
        paramIndex++;
      }

      query += ' ORDER BY block_number DESC';
      if (filter.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filter.limit);
      }

      const result = await this.db.query<Event>(query, params);
      return result;
    } catch (error: any) {
      logger.error('Error fetching events:', error.message);
      throw error;
    }
  }

  async getEventsByTransaction(txHash: string): Promise<Event[]> {
    try {
      const result = await this.db.query<Event>(
        'SELECT * FROM events WHERE tx_hash = $1',
        [txHash]
      );
      return result;
    } catch (error: any) {
      logger.error('Error fetching events by transaction:', error.message);
      throw error;
    }
  }

  async getEventsByContract(contractAddress: string): Promise<Event[]> {
    try {
      const result = await this.db.query<Event>(
        'SELECT * FROM events WHERE contract_address = $1 ORDER BY block_number DESC LIMIT 100',
        [contractAddress]
      );
      return result;
    } catch (error: any) {
      logger.error('Error fetching events by contract:', error.message);
      throw error;
    }
  }

  async getWallet(address: string): Promise<Wallet | null> {
    try {
      const result = await this.db.query<Wallet>(
        'SELECT * FROM wallets WHERE wallet_address = $1',
        [address]
      );
      return result[0] || null;
    } catch (error: any) {
      logger.error('Error fetching wallet:', error.message);
      throw error;
    }
  }

  async getWalletInteractions(address: string): Promise<WalletInteraction[]> {
    try {
      const result = await this.db.query<WalletInteraction>(
        'SELECT * FROM wallet_interactions WHERE wallet_address = $1 ORDER BY timestamp DESC',
        [address]
      );
      return result;
    } catch (error: any) {
      logger.error('Error fetching wallet interactions:', error.message);
      throw error;
    }
  }

  async getWallets(options?: QueryOptions): Promise<Wallet[]> {
    try {
      let query = 'SELECT * FROM wallets ORDER BY created_at DESC';
      const params: any[] = [];

      if (options?.limit) {
        query += ' LIMIT $1';
        params.push(options.limit);
      }

      const result = await this.db.query<Wallet>(query, params);
      return result;
    } catch (error: any) {
      logger.error('Error fetching wallets:', error.message);
      throw error;
    }
  }

  async getStorageAt(_contractAddress: string, _key: string, _blockId?: BlockIdentifier): Promise<string> {
    // This would typically call the RPC client for current state
    throw new Error('getStorageAt not implemented - requires RPC client integration');
  }

  async getContractStateAt(_contractAddress: string, _blockId: BlockIdentifier): Promise<any> {
    // This would typically call the RPC client for historical state
    throw new Error('getContractStateAt not implemented - requires RPC client integration');
  }

  async getContractUsageStats(contractAddress: string): Promise<ContractUsageStats> {
    try {
      const result = await this.db.query<any>(`
        SELECT 
          COUNT(*) as total_transactions,
          COUNT(DISTINCT sender_address) as unique_users,
          MIN(timestamp) as first_used,
          MAX(timestamp) as last_used
        FROM transactions 
        WHERE contract_address = $1
      `, [contractAddress]);

      return {
        contractAddress,
        totalTransactions: parseInt(result[0].total_transactions),
        uniqueUsers: parseInt(result[0].unique_users),
        totalEvents: 0, // Would need events count
        firstUsed: result[0].first_used,
        lastUsed: result[0].last_used,
        popularFunctions: [], // Would need function analysis
      };
    } catch (error: any) {
      logger.error('Error fetching contract usage stats:', error.message);
      throw error;
    }
  }

  async getWalletActivityStats(address: string): Promise<WalletActivityStats> {
    try {
      const result = await this.db.query<any>(`
        SELECT 
          COUNT(*) as total_transactions,
          COUNT(DISTINCT contract_address) as contracts_interacted,
          MIN(timestamp) as first_activity,
          MAX(timestamp) as last_activity
        FROM transactions 
        WHERE sender_address = $1
      `, [address]);

      return {
        address,
        totalTransactions: parseInt(result[0].total_transactions),
        contractsInteracted: parseInt(result[0].contracts_interacted),
        firstActivity: result[0].first_activity,
        lastActivity: result[0].last_activity,
        favoriteContracts: [], // Would need contract interaction analysis
      };
    } catch (error: any) {
      logger.error('Error fetching wallet activity stats:', error.message);
      throw error;
    }
  }

  async getNetworkStats(): Promise<NetworkStats> {
    try {
      const blockCount = await this.db.query<{count: string}>('SELECT COUNT(*) as count FROM blocks');
      const txCount = await this.db.query<{count: string}>('SELECT COUNT(*) as count FROM transactions');
      const contractCount = await this.db.query<{count: string}>('SELECT COUNT(*) as count FROM contracts');
      const walletCount = await this.db.query<{count: string}>('SELECT COUNT(*) as count FROM wallets');

      return {
        totalBlocks: parseInt(blockCount[0].count),
        totalTransactions: parseInt(txCount[0].count),
        totalContracts: parseInt(contractCount[0].count),
        totalWallets: parseInt(walletCount[0].count),
        averageBlockTime: 0, // Would need block time analysis
        transactionsPerSecond: 0, // Would need TPS calculation
      };
    } catch (error: any) {
      logger.error('Error fetching network stats:', error.message);
      throw error;
    }
  }
}
