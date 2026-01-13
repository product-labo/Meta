import { pgTable, uuid, text, bigint, boolean, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

// Core blockchain networks
export const ba_chains = pgTable("ba_chains", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(), // 'ethereum', 'starknet', 'beacon'
  chainId: bigint("chain_id", { mode: "number" }),
  rpcUrl: text("rpc_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

// Contract categories (NFT, DeFi, DEX, etc.)
export const ba_categories = pgTable("ba_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(), // 'nft', 'dex', 'defi', 'gaming', 'dao'
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow()
});

// Smart contracts being tracked
export const ba_smart_contracts = pgTable("ba_smart_contracts", {
  id: uuid("id").primaryKey().defaultRandom(),
  chainId: uuid("chain_id").references(() => ba_chains.id).notNull(),
  categoryId: uuid("category_id").references(() => ba_categories.id),
  address: text("address").notNull(),
  name: text("name"),
  symbol: text("symbol"),
  deploymentBlock: bigint("deployment_block", { mode: "number" }),
  deploymentTx: text("deployment_tx"),
  abi: jsonb("abi"), // Contract ABI
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Function signatures for contract interactions
export const ba_function_signatures = pgTable("ba_function_signatures", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractId: uuid("contract_id").references(() => ba_smart_contracts.id).notNull(),
  signature: text("signature").notNull(), // "0x12345678"
  functionName: text("function_name").notNull(), // "transfer"
  functionAbi: jsonb("function_abi"), // Specific function ABI
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

// Wallet addresses
export const ba_wallets = pgTable("ba_wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  address: text("address").notNull(),
  label: text("label"), // Optional wallet label
  firstSeen: timestamp("first_seen"),
  lastSeen: timestamp("last_seen"),
  totalTransactions: bigint("total_transactions", { mode: "number" }).default(0),
  totalValue: text("total_value").default("0"), // Store as string for precision
  createdAt: timestamp("created_at").defaultNow()
});

// All blockchain transactions
export const ba_transactions = pgTable("ba_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  chainId: uuid("chain_id").references(() => ba_chains.id).notNull(),
  contractId: uuid("contract_id").references(() => ba_smart_contracts.id),
  functionSigId: uuid("function_sig_id").references(() => ba_function_signatures.id),
  fromWalletId: uuid("from_wallet_id").references(() => ba_wallets.id),
  toWalletId: uuid("to_wallet_id").references(() => ba_wallets.id),
  hash: text("hash").notNull(),
  blockNumber: bigint("block_number", { mode: "number" }).notNull(),
  blockHash: text("block_hash"),
  transactionIndex: integer("transaction_index"),
  gasUsed: bigint("gas_used", { mode: "number" }),
  gasPrice: bigint("gas_price", { mode: "number" }),
  maxFeePerGas: bigint("max_fee_per_gas", { mode: "number" }),
  value: text("value").default("0"), // Store as string for precision
  status: text("status"), // 'succeeded', 'reverted'
  timestamp: timestamp("timestamp").notNull(),
  inputData: text("input_data"),
  decodedInput: jsonb("decoded_input"), // Decoded function parameters
  rawData: jsonb("raw_data"), // Full transaction object
  createdAt: timestamp("created_at").defaultNow()
});

// Smart contract events/logs
export const ba_events = pgTable("ba_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id").references(() => ba_transactions.id).notNull(),
  contractId: uuid("contract_id").references(() => ba_smart_contracts.id).notNull(),
  eventName: text("event_name"),
  eventSignature: text("event_signature"),
  logIndex: integer("log_index").notNull(),
  topics: jsonb("topics"),
  data: text("data"),
  decodedData: jsonb("decoded_data"), // Decoded event parameters
  createdAt: timestamp("created_at").defaultNow()
});

// Transaction receipts
export const ba_receipts = pgTable("ba_receipts", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id").references(() => ba_transactions.id).notNull(),
  cumulativeGasUsed: bigint("cumulative_gas_used", { mode: "number" }),
  effectiveGasPrice: bigint("effective_gas_price", { mode: "number" }),
  contractAddress: text("contract_address"), // For contract creation
  logsBloom: text("logs_bloom"),
  transactionType: integer("transaction_type"),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at").defaultNow()
});

// Starknet-specific data
export const ba_starknet_messages = pgTable("ba_starknet_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id").references(() => ba_transactions.id).notNull(),
  fromAddress: text("from_address"),
  toAddress: text("to_address"),
  payload: jsonb("payload"),
  messageIndex: integer("message_index"),
  createdAt: timestamp("created_at").defaultNow()
});

// Beacon chain validator data
export const ba_validators = pgTable("ba_validators", {
  id: uuid("id").primaryKey().defaultRandom(),
  validatorIndex: integer("validator_index").notNull(),
  pubkey: text("pubkey"),
  withdrawalCredentials: text("withdrawal_credentials"),
  balance: bigint("balance", { mode: "number" }),
  effectiveBalance: bigint("effective_balance", { mode: "number" }),
  status: text("status"), // 'active_ongoing', 'exited_unslashed', etc.
  slashed: boolean("slashed").default(false),
  activationEpoch: bigint("activation_epoch", { mode: "number" }),
  exitEpoch: bigint("exit_epoch", { mode: "number" }),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow()
});

// Indexer state tracking
export const ba_indexer_state = pgTable("ba_indexer_state", {
  id: uuid("id").primaryKey().defaultRandom(),
  chainId: uuid("chain_id").references(() => ba_chains.id).notNull(),
  indexerName: text("indexer_name").notNull(),
  lastProcessedBlock: bigint("last_processed_block", { mode: "number" }),
  lastProcessedHash: text("last_processed_hash"),
  isRunning: boolean("is_running").default(false),
  lastError: text("last_error"),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Export all tables for Drizzle
export const schema = {
  ba_chains,
  ba_categories,
  ba_smart_contracts,
  ba_function_signatures,
  ba_wallets,
  ba_transactions,
  ba_events,
  ba_receipts,
  ba_starknet_messages,
  ba_validators,
  ba_indexer_state
};
