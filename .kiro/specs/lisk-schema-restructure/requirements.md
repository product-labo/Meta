# Requirements Document

## Introduction

This specification defines the restructuring of the Lisk blockchain indexer database schema to achieve full fidelity with Lisk's modular architecture. The current schema follows an EVM-style design that does not properly capture Lisk's unique features: modular account state, token locks, and command-based transactions. This restructuring will create a robust, rigid, and fully relational database that supports complete auditability, state replay, and zero data loss.

## Glossary

- **Lisk_Indexer**: The system that ingests blockchain data from Lisk RPC nodes and stores it in PostgreSQL
- **Module**: A Lisk blockchain component that manages specific functionality (token, pos, governance, etc.)
- **Command**: An executable function within a module (e.g., token.transfer, pos.stake)
- **Account_State**: The complete state of an account across all modules at a specific block height
- **State_Delta**: The precise change in account state caused by a single transaction
- **Token_Lock**: A locked balance that cannot be transferred until specific conditions are met
- **Function_Key**: The unique identifier for a command in format "module.command"
- **Block_Height**: The sequential block number on the Lisk blockchain
- **Finality**: The point at which a block is considered irreversible
- **Reorg**: A blockchain reorganization where blocks are replaced with an alternative chain

## Requirements

### Requirement 1: Chain Configuration Management

**User Story:** As a blockchain indexer operator, I want to configure multiple Lisk chains, so that I can index mainnet, testnet, and custom networks independently.

#### Acceptance Criteria

1. THE Lisk_Indexer SHALL store chain-level metadata in a chain_config table
2. WHEN a chain is configured, THE Lisk_Indexer SHALL record chain_id, chain_name, rpc_url, start_block, finality_depth, and reorg_depth
3. THE chain_id SHALL be the primary key and unique identifier for each chain
4. THE Lisk_Indexer SHALL support multiple chains simultaneously through the chain_id foreign key

### Requirement 2: Synchronization State Tracking

**User Story:** As a blockchain indexer operator, I want to track synchronization progress per chain, so that I can resume indexing after interruptions and monitor sync status.

#### Acceptance Criteria

1. THE Lisk_Indexer SHALL maintain a sync_state table with one record per chain
2. WHEN a block is successfully indexed, THE Lisk_Indexer SHALL update last_synced_height
3. WHEN a block reaches finality, THE Lisk_Indexer SHALL update last_finalized_height
4. THE sync_state.chain_id SHALL reference chain_config.chain_id with CASCADE behavior

### Requirement 3: Canonical Block Storage

**User Story:** As a blockchain analyst, I want to query block data with full fidelity, so that I can analyze blockchain structure and validate chain integrity.

#### Acceptance Criteria

1. THE Lisk_Indexer SHALL store blocks in a blocks table with block_id as primary key
2. WHEN a block is indexed, THE Lisk_Indexer SHALL record height, timestamp, previous_block_id, generator_address, transaction_root, state_root, asset_root, and payload_length
3. THE height SHALL be unique per chain to prevent duplicate blocks
4. THE previous_block_id SHALL reference blocks.block_id to maintain chain structure
5. THE Lisk_Indexer SHALL support block reorganizations by updating or removing blocks

### Requirement 4: Transaction Command Storage

**User Story:** As a blockchain analyst, I want to query transaction data with module and command information, so that I can analyze specific transaction types and execution patterns.

#### Acceptance Criteria

1. THE Lisk_Indexer SHALL store transactions in a transactions table with tx_id as primary key
2. WHEN a transaction is indexed, THE Lisk_Indexer SHALL record block_height, block_id, module, command, function_key, sender_address, nonce, fee, params, signatures, execution_status, and error_message
3. THE function_key SHALL be computed as "module.command" for efficient querying
4. THE params SHALL be stored as JSONB to preserve all transaction parameters
5. THE signatures SHALL be stored as JSONB to preserve all signature data
6. THE transactions.block_id SHALL reference blocks.block_id with CASCADE DELETE
7. WHEN a transaction fails, THE Lisk_Indexer SHALL record execution_status as 'failed' and store error_message

### Requirement 5: Event Emission Storage

**User Story:** As a blockchain analyst, I want to query all events emitted by transactions, so that I can track state changes and analyze module behavior.

#### Acceptance Criteria

1. THE Lisk_Indexer SHALL store events in an events table with event_id as primary key
2. WHEN an event is emitted, THE Lisk_Indexer SHALL record tx_id, block_height, event_index, module, name, data, and topics
3. THE data SHALL be stored as JSONB to preserve all event data
4. THE topics SHALL be stored as JSONB array for efficient filtering
5. THE events.tx_id SHALL reference transactions.tx_id with CASCADE DELETE
6. THE event_index SHALL maintain the order of events within a transaction

### Requirement 6: Account Registry

**User Story:** As a blockchain analyst, I want to track all accounts that have interacted with the blockchain, so that I can analyze account activity and first appearance.

#### Acceptance Criteria

1. THE Lisk_Indexer SHALL maintain an accounts table with address as primary key
2. WHEN an account first appears on-chain, THE Lisk_Indexer SHALL record address and first_seen_height
3. WHEN an account interacts with the blockchain, THE Lisk_Indexer SHALL update last_seen_height
4. THE Lisk_Indexer SHALL create account records for senders, receivers, validators, and delegators

### Requirement 7: Modular Account State Snapshots

**User Story:** As a blockchain auditor, I want to capture complete account state per module at any block height, so that I can verify state correctness and replay transactions.

#### Acceptance Criteria

1. THE Lisk_Indexer SHALL store account state in an account_state_snapshots table with snapshot_id as primary key
2. WHEN account state changes, THE Lisk_Indexer SHALL record address, block_height, module, and state
3. THE state SHALL be stored as JSONB to preserve module-specific data structures
4. THE Lisk_Indexer SHALL support multiple modules per account (token, pos, governance, etc.)
5. THE account_state_snapshots.address SHALL reference accounts.address with CASCADE DELETE
6. FOR ALL modules, THE Lisk_Indexer SHALL capture state independently

### Requirement 8: Precise State Change Tracking

**User Story:** As a blockchain auditor, I want to track exact state changes caused by each transaction, so that I can audit transactions and replay state transitions.

#### Acceptance Criteria

1. THE Lisk_Indexer SHALL store state changes in an account_state_deltas table with delta_id as primary key
2. WHEN a transaction modifies account state, THE Lisk_Indexer SHALL record tx_id, address, block_height, module, state_before, and state_after
3. THE state_before and state_after SHALL be stored as JSONB to capture exact changes
4. THE account_state_deltas.tx_id SHALL reference transactions.tx_id with CASCADE DELETE
5. THE account_state_deltas.address SHALL reference accounts.address with CASCADE DELETE
6. FOR ALL state modifications, THE Lisk_Indexer SHALL record both before and after states

### Requirement 9: Fast Token Balance Queries

**User Story:** As an application developer, I want to query token balances efficiently, so that I can display account balances without complex JSONB queries.

#### Acceptance Criteria

1. THE Lisk_Indexer SHALL maintain a token_balances table with (address, block_height) as composite key
2. WHEN token state changes, THE Lisk_Indexer SHALL record address, block_height, available_balance, locked_balance, and total_balance
3. THE total_balance SHALL equal available_balance plus locked_balance
4. THE token_balances.address SHALL reference accounts.address with CASCADE DELETE
5. THE Lisk_Indexer SHALL update token_balances for every token module state change

### Requirement 10: Token Lock Management

**User Story:** As a blockchain analyst, I want to track all token locks explicitly, so that I can analyze staking, governance, and time-based locks.

#### Acceptance Criteria

1. THE Lisk_Indexer SHALL store token locks in a token_locks table with lock_id as primary key
2. WHEN a token lock is created, THE Lisk_Indexer SHALL record chain_id, address, module_source, amount, lock_type, unlock_height, is_active, and related_tx_id
3. THE lock_type SHALL identify the purpose (pos_stake, governance_vote, time_based)
4. THE unlock_height SHALL specify when the lock expires (NULL for indefinite locks)
5. THE is_active SHALL indicate whether the lock is currently active (true) or has been released (false)
6. THE token_locks.chain_id SHALL reference chain_config.chain_id with CASCADE DELETE
7. THE token_locks.address SHALL reference accounts.address with CASCADE DELETE
8. THE token_locks.related_tx_id SHALL reference transactions.tx_id with SET NULL
9. WHEN a lock is released, THE Lisk_Indexer SHALL set is_active to false (not delete the record)

### Requirement 11: Transaction-Account Relationship Tracking

**User Story:** As a blockchain analyst, I want to identify all accounts involved in a transaction with their roles, so that I can analyze transaction patterns and account relationships.

#### Acceptance Criteria

1. THE Lisk_Indexer SHALL store relationships in a transaction_accounts table with id as primary key
2. WHEN a transaction involves an account, THE Lisk_Indexer SHALL record chain_id, tx_id, address, and role
3. THE role SHALL identify the account's participation (sender, receiver, validator, delegate)
4. THE transaction_accounts.chain_id SHALL reference chain_config.chain_id with CASCADE DELETE
5. THE transaction_accounts.tx_id SHALL reference transactions.tx_id with CASCADE DELETE
6. THE transaction_accounts.address SHALL reference accounts.address with CASCADE DELETE
7. FOR ALL transactions, THE Lisk_Indexer SHALL record at minimum the sender role
8. WHEN processing events, THE Lisk_Indexer SHALL extract receiver addresses from event data and create receiver role relationships

### Requirement 12: Zero Data Loss with Raw RPC Storage

**User Story:** As a blockchain indexer operator, I want to store raw RPC responses, so that I can debug indexing issues and recover from data corruption.

#### Acceptance Criteria

1. THE Lisk_Indexer SHALL store raw RPC responses in a raw_rpc_responses table
2. WHEN an RPC call is made, THE Lisk_Indexer SHALL record rpc_method, block_height, and response_json
3. THE response_json SHALL be stored as JSONB to preserve exact RPC output
4. THE Lisk_Indexer SHALL store responses for critical methods (getBlockByHeight, getTransactions, getEvents)
5. THE raw_rpc_responses table SHALL support debugging and data recovery

### Requirement 13: Referential Integrity and Cascade Behavior

**User Story:** As a database administrator, I want all foreign keys to enforce referential integrity, so that the database remains consistent during updates and deletions.

#### Acceptance Criteria

1. THE Lisk_Indexer SHALL define foreign keys for all relationships
2. WHEN a block is deleted, THE Lisk_Indexer SHALL cascade delete all related transactions, events, and state changes
3. WHEN an account is deleted, THE Lisk_Indexer SHALL cascade delete all related state snapshots, deltas, balances, and locks
4. WHEN a transaction is deleted, THE Lisk_Indexer SHALL cascade delete all related events, state deltas, and account relationships
5. THE Lisk_Indexer SHALL use SET NULL for optional relationships (e.g., token_locks.related_tx_id)

### Requirement 14: Indexing Order and Data Consistency

**User Story:** As a blockchain indexer operator, I want data to be indexed in the correct order, so that state transitions are accurate and auditable.

#### Acceptance Criteria

1. THE Lisk_Indexer SHALL index data in this order: Block → Transactions → Events → Account deltas → State snapshots → Locks
2. WHEN indexing a block, THE Lisk_Indexer SHALL complete all related data before marking the block as synced
3. THE Lisk_Indexer SHALL use database transactions to ensure atomicity
4. IF indexing fails, THE Lisk_Indexer SHALL rollback all changes for that block
5. THE Lisk_Indexer SHALL support idempotent re-indexing of blocks

### Requirement 15: Performance Optimization with Indexes

**User Story:** As an application developer, I want fast queries on common access patterns, so that my application remains responsive.

#### Acceptance Criteria

1. THE Lisk_Indexer SHALL create indexes on all foreign keys
2. THE Lisk_Indexer SHALL create indexes on frequently queried columns (block_height, sender_address, module, command)
3. THE Lisk_Indexer SHALL create composite indexes for common query patterns
4. THE Lisk_Indexer SHALL create JSONB indexes for params, data, and state fields
5. THE Lisk_Indexer SHALL optimize for queries by address, block range, and transaction type
