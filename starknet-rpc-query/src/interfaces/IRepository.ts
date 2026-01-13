import { 
  Block, BlockCreateInput, BlockIdentifier,
  Transaction, TransactionCreateInput,
  Contract, ContractCreateInput,
  ContractClass, ContractClassCreateInput,
  ExecutionCall, ExecutionCallCreateInput,
  Event, EventCreateInput, EventFilter,
  Wallet, WalletCreateInput,
  WalletInteraction, WalletInteractionCreateInput
} from '../models';

/**
 * Base repository interface with common CRUD operations
 */
export interface IBaseRepository<T, TCreateInput> {
  /**
   * Create a new entity
   */
  create(input: TCreateInput): Promise<T>;

  /**
   * Find entity by ID
   */
  findById(id: string | bigint): Promise<T | null>;

  /**
   * Update an existing entity
   */
  update(id: string | bigint, updates: Partial<T>): Promise<T>;

  /**
   * Delete an entity
   */
  delete(id: string | bigint): Promise<boolean>;

  /**
   * Find entities with pagination
   */
  findMany(options?: FindOptions): Promise<T[]>;

  /**
   * Count entities matching criteria
   */
  count(where?: any): Promise<number>;
}

/**
 * Repository interface for Block entities
 */
export interface IBlockRepository extends IBaseRepository<Block, BlockCreateInput> {
  findByBlockNumber(blockNumber: bigint): Promise<Block | null>;
  findByBlockHash(blockHash: string): Promise<Block | null>;
  findByIdentifier(identifier: BlockIdentifier): Promise<Block | null>;
  findLatest(): Promise<Block | null>;
  findByFinalityStatus(status: string): Promise<Block[]>;
}

/**
 * Repository interface for Transaction entities
 */
export interface ITransactionRepository extends IBaseRepository<Transaction, TransactionCreateInput> {
  findByTxHash(txHash: string): Promise<Transaction | null>;
  findByBlockNumber(blockNumber: bigint): Promise<Transaction[]>;
  findBySender(senderAddress: string): Promise<Transaction[]>;
  findByStatus(status: string): Promise<Transaction[]>;
}

/**
 * Repository interface for Contract entities
 */
export interface IContractRepository extends IBaseRepository<Contract, ContractCreateInput> {
  findByAddress(contractAddress: string): Promise<Contract | null>;
  findByClassHash(classHash: string): Promise<Contract[]>;
  findProxyContracts(): Promise<Contract[]>;
  findByDeployer(deployerAddress: string): Promise<Contract[]>;
}

/**
 * Repository interface for ContractClass entities
 */
export interface IContractClassRepository extends IBaseRepository<ContractClass, ContractClassCreateInput> {
  findByClassHash(classHash: string): Promise<ContractClass | null>;
  findByEntryPoint(selector: string): Promise<ContractClass[]>;
}

/**
 * Repository interface for ExecutionCall entities
 */
export interface IExecutionCallRepository extends IBaseRepository<ExecutionCall, ExecutionCallCreateInput> {
  findByTxHash(txHash: string): Promise<ExecutionCall[]>;
  findByContract(contractAddress: string): Promise<ExecutionCall[]>;
  findCallHierarchy(txHash: string): Promise<ExecutionCall[]>;
}

/**
 * Repository interface for Event entities
 */
export interface IEventRepository extends IBaseRepository<Event, EventCreateInput> {
  findByTxHash(txHash: string): Promise<Event[]>;
  findByContract(contractAddress: string): Promise<Event[]>;
  findByFilter(filter: EventFilter): Promise<Event[]>;
  findBySelector(eventSelector: string): Promise<Event[]>;
}

/**
 * Repository interface for Wallet entities
 */
export interface IWalletRepository extends IBaseRepository<Wallet, WalletCreateInput> {
  findByAddress(address: string): Promise<Wallet | null>;
  findActiveWallets(fromBlock: bigint, toBlock: bigint): Promise<Wallet[]>;
  updateActivity(address: string, blockNumber: bigint): Promise<void>;
}

/**
 * Repository interface for WalletInteraction entities
 */
export interface IWalletInteractionRepository extends IBaseRepository<WalletInteraction, WalletInteractionCreateInput> {
  findByWallet(walletAddress: string): Promise<WalletInteraction[]>;
  findByContract(contractAddress: string): Promise<WalletInteraction[]>;
  findByFunction(functionSelector: string): Promise<WalletInteraction[]>;
}

/**
 * Options for finding entities
 */
export interface FindOptions {
  where?: any;
  orderBy?: { field: string; direction: 'ASC' | 'DESC' }[];
  limit?: number;
  offset?: number;
}