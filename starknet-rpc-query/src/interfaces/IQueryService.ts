import { 
  Block, BlockIdentifier,
  Transaction, TransactionReceipt,
  Contract, ContractClass,
  Event, EventFilter,
  Wallet, WalletInteraction
} from '../models';

/**
 * Interface for query service operations
 * Provides high-level access to indexed blockchain data
 */
export interface IQueryService {
  /**
   * Query block information
   */
  getBlock(identifier: BlockIdentifier): Promise<Block | null>;
  getBlocks(options?: QueryOptions): Promise<Block[]>;

  /**
   * Query transaction information
   */
  getTransaction(txHash: string): Promise<Transaction | null>;
  getTransactionReceipt(txHash: string): Promise<TransactionReceipt | null>;
  getTransactions(options?: QueryOptions): Promise<Transaction[]>;

  /**
   * Query contract information
   */
  getContract(address: string): Promise<Contract | null>;
  getContractClass(classHash: string): Promise<ContractClass | null>;
  getContracts(options?: QueryOptions): Promise<Contract[]>;

  /**
   * Query events
   */
  getEvents(filter: EventFilter): Promise<Event[]>;
  getEventsByTransaction(txHash: string): Promise<Event[]>;
  getEventsByContract(contractAddress: string): Promise<Event[]>;

  /**
   * Query wallet information
   */
  getWallet(address: string): Promise<Wallet | null>;
  getWalletInteractions(address: string): Promise<WalletInteraction[]>;
  getWallets(options?: QueryOptions): Promise<Wallet[]>;

  /**
   * Historical state queries
   */
  getStorageAt(contractAddress: string, key: string, blockId?: BlockIdentifier): Promise<string>;
  getContractStateAt(contractAddress: string, blockId: BlockIdentifier): Promise<any>;

  /**
   * Analytics queries
   */
  getContractUsageStats(contractAddress: string): Promise<ContractUsageStats>;
  getWalletActivityStats(address: string): Promise<WalletActivityStats>;
  getNetworkStats(): Promise<NetworkStats>;
}

/**
 * Options for querying data
 */
export interface QueryOptions {
  where?: any;
  orderBy?: { field: string; direction: 'ASC' | 'DESC' }[];
  limit?: number;
  offset?: number;
  fromBlock?: bigint;
  toBlock?: bigint;
}

/**
 * Contract usage statistics
 */
export interface ContractUsageStats {
  contractAddress: string;
  totalTransactions: number;
  uniqueUsers: number;
  totalEvents: number;
  firstUsed: Date;
  lastUsed: Date;
  popularFunctions: FunctionUsage[];
}

/**
 * Function usage statistics
 */
export interface FunctionUsage {
  functionSelector: string;
  functionName?: string;
  callCount: number;
  uniqueCallers: number;
}

/**
 * Wallet activity statistics
 */
export interface WalletActivityStats {
  address: string;
  totalTransactions: number;
  contractsInteracted: number;
  firstActivity: Date;
  lastActivity: Date;
  favoriteContracts: ContractInteraction[];
}

/**
 * Contract interaction statistics
 */
export interface ContractInteraction {
  contractAddress: string;
  interactionCount: number;
  lastInteraction: Date;
}

/**
 * Network statistics
 */
export interface NetworkStats {
  totalBlocks: number;
  totalTransactions: number;
  totalContracts: number;
  totalWallets: number;
  averageBlockTime: number;
  transactionsPerSecond: number;
}