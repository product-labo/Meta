import { Block, Transaction, TransactionReceipt, ContractClass, BlockIdentifier } from '../models';

/**
 * Interface for Starknet RPC client operations
 * Handles communication with Starknet nodes and RPC protocol specifics
 */
export interface IStarknetRPCClient {
  /**
   * Retrieve block information by identifier
   */
  getBlock(blockId: BlockIdentifier): Promise<Block>;

  /**
   * Retrieve transaction information by hash
   */
  getTransaction(txHash: string): Promise<Transaction>;

  /**
   * Retrieve transaction receipt by hash
   */
  getTransactionReceipt(txHash: string): Promise<TransactionReceipt>;

  /**
   * Retrieve contract class information by class hash
   */
  getContractClass(classHash: string): Promise<ContractClass>;

  /**
   * Execute a contract call (view function)
   */
  call(contractAddress: string, functionName: string, calldata: any[]): Promise<any>;

  /**
   * Get storage value at specific key for a contract
   */
  getStorageAt(contractAddress: string, key: string, blockId?: BlockIdentifier): Promise<string>;

  /**
   * Get the latest block number
   */
  getLatestBlockNumber(): Promise<bigint>;

  /**
   * Check if the RPC endpoint is healthy
   */
  isHealthy(): Promise<boolean>;
}

/**
 * Interface for managing RPC connections
 */
export interface IConnectionManager {
  /**
   * Establish connection to RPC endpoint
   */
  connect(endpoint: string): Promise<void>;

  /**
   * Validate endpoint availability
   */
  validateEndpoint(endpoint: string): Promise<boolean>;

  /**
   * Check connection health
   */
  checkHealth(): Promise<boolean>;

  /**
   * Disconnect from endpoint
   */
  disconnect(): Promise<void>;
}

/**
 * Interface for formatting RPC requests
 */
export interface IRequestFormatter {
  /**
   * Format request according to Starknet RPC specifications
   */
  formatRequest(method: string, params: any[]): any;

  /**
   * Validate request parameters
   */
  validateParams(method: string, params: any[]): boolean;
}

/**
 * Interface for parsing RPC responses
 */
export interface IResponseParser {
  /**
   * Parse and validate RPC response
   */
  parseResponse<T>(response: any): T;

  /**
   * Validate response against JSON schema
   */
  validateResponse(response: any, schema: any): boolean;

  /**
   * Parse blockchain-specific formats (hex, addresses, hashes)
   */
  parseBlockchainFormat(value: string, type: 'hex' | 'address' | 'hash'): string;
}