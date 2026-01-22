# Requirements Document: Starknet Schema Restructure

## Introduction

This specification defines a comprehensive, production-ready database schema for indexing Starknet blockchain data. The schema must support full-fidelity data capture, robust relational integrity, efficient querying, and zero data loss. It addresses critical gaps identified in the current implementation including missing infrastructure tables, incomplete foreign key constraints, and lack of historical tracking capabilities.

## Glossary

- **Starknet_Indexer**: The system component responsible for fetching and storing Starknet blockchain data
- **Block**: A container of transactions on the Starknet blockchain with a unique block number and hash
- **Transaction**: An execution request on Starknet (INVOKE, DEPLOY_ACCOUNT, DECLARE, etc.)
- **Contract**: A deployed smart contract on Starknet identified by address and class hash
- **Contract_Class**: The code definition and ABI for a contract, identified by class hash
- **Event**: Data emitted by contracts during transaction execution
- **Execution_Call**: An internal function call made during transaction execution
- **Wallet**: An account address that can initiate transactions
- **Token**: An ERC20-compatible token contract on Starknet
- **Chain_ID**: A unique identifier for the blockchain network (mainnet, testnet, etc.)
- **Finality_Status**: The confirmation level of a block (PENDING, ACCEPTED_ON_L2, ACCEPTED_ON_L1)
- **RPC**: Remote Procedure Call interface for querying blockchain nodes
- **ABI**: Application Binary Interface defining contract functions and events
- **Entry_Point_Selector**: A hash identifying which function to call in a contract

## Requirements

### Requirement 1: Chain Configuration Management

**User Story:** As a system administrator, I want to configure multiple Starknet networks, so that I can index mainnet, testnet, and custom networks independently.

#### Acceptance Criteria

1. THE Starknet_Indexer SHALL store chain configuration including chain_id, chain_name, RPC endpoint, and explorer URL
2. WHEN a new chain is added, THE Starknet_Indexer SHALL validate the RPC endpoint connectivity
3. THE Starknet_Indexer SHALL support multiple active chains simultaneously
4. WHEN chain configuration is updated, THE Starknet_Indexer SHALL apply changes without data loss
5. THE Starknet_Indexer SHALL store finality depth and reorg depth parameters per chain

### Requirement 2: Synchronization State Tracking

**User Story:** As a system operator, I want to track indexer synchronization progress, so that I can monitor indexing status and resume after interruptions.

#### Acceptance Criteria

1. THE Starknet_Indexer SHALL store the last successfully synced block number per chain
2. THE Starknet_Indexer SHALL store the last finalized block number per chain
3. WHEN indexing is interrupted, THE Starknet_Indexer SHALL resume from the last synced block
4. THE Starknet_Indexer SHALL update sync state atomically with block data insertion
5. THE Starknet_Indexer SHALL track sync status (syncing, synced, error, paused)
6. THE Starknet_Indexer SHALL record the timestamp of the last successful sync

### Requirement 3: Block Data Storage

**User Story:** As a blockchain analyst, I want complete block data stored, so that I can analyze blockchain history and verify data integrity.

#### Acceptance Criteria

1. THE Starknet_Indexer SHALL store block_number, block_hash, parent_block_hash, and timestamp for each block
2. THE Starknet_Indexer SHALL enforce block_number uniqueness per chain
3. THE Starknet_Indexer SHALL store finality_status for each block
4. THE Starknet_Indexer SHALL store sequencer_address when available
5. THE Starknet_Indexer SHALL store transaction_count and event_count per block
6. THE Starknet_Indexer SHALL reference chain_id with foreign key constraint
7. WHEN a block is reorganized, THE Starknet_Indexer SHALL mark the old block as inactive rather than deleting it

### Requirement 4: Transaction Data Storage

**User Story:** As a blockchain analyst, I want complete transaction data stored, so that I can track all on-chain activity and analyze transaction patterns.

#### Acceptance Criteria

1. THE Starknet_Indexer SHALL store tx_hash, block_number, tx_type, sender_address, and entry_point_selector for each transaction
2. THE Starknet_Indexer SHALL enforce tx_hash uniqueness per chain
3. THE Starknet_Indexer SHALL store transaction status (ACCEPTED_ON_L2, ACCEPTED_ON_L1, REJECTED)
4. THE Starknet_Indexer SHALL store actual_fee and max_fee for each transaction
5. THE Starknet_Indexer SHALL store nonce for each transaction
6. THE Starknet_Indexer SHALL store calldata and signature arrays
7. THE Starknet_Indexer SHALL reference block_number with foreign key constraint
8. THE Starknet_Indexer SHALL reference chain_id with foreign key constraint
9. WHEN a transaction is in a reorganized block, THE Starknet_Indexer SHALL mark it as inactive

### Requirement 5: Contract Class Storage

**User Story:** As a smart contract developer, I want contract class definitions and ABIs stored, so that I can decode contract calls and events.

#### Acceptance Criteria

1. THE Starknet_Indexer SHALL store class_hash, ABI JSON, and contract type for each contract class
2. THE Starknet_Indexer SHALL enforce class_hash uniqueness per chain
3. THE Starknet_Indexer SHALL store the transaction hash that declared the class
4. THE Starknet_Indexer SHALL store the block number where the class was declared
5. THE Starknet_Indexer SHALL store compiled_class_hash for Cairo 1.0+ contracts
6. THE Starknet_Indexer SHALL reference chain_id with foreign key constraint
7. THE Starknet_Indexer SHALL parse and validate ABI JSON structure

### Requirement 6: Contract Instance Storage

**User Story:** As a blockchain analyst, I want deployed contract instances tracked, so that I can analyze contract deployment patterns and relationships.

#### Acceptance Criteria

1. THE Starknet_Indexer SHALL store contract_address, class_hash, deployer_address, and deployment transaction for each contract
2. THE Starknet_Indexer SHALL enforce contract_address uniqueness per chain
3. THE Starknet_Indexer SHALL detect and mark proxy contracts
4. THE Starknet_Indexer SHALL store implementation_address for proxy contracts
5. THE Starknet_Indexer SHALL reference class_hash with foreign key constraint
6. THE Starknet_Indexer SHALL reference deployment_tx_hash with foreign key constraint
7. THE Starknet_Indexer SHALL reference chain_id with foreign key constraint

### Requirement 7: Event Emission Tracking

**User Story:** As a DeFi analyst, I want all contract events captured, so that I can track token transfers, swaps, and other protocol activities.

#### Acceptance Criteria

1. THE Starknet_Indexer SHALL store tx_hash, contract_address, event_index, keys array, and data array for each event
2. THE Starknet_Indexer SHALL enforce event uniqueness by (chain_id, tx_hash, event_index)
3. THE Starknet_Indexer SHALL store events in the order they were emitted
4. THE Starknet_Indexer SHALL reference tx_hash with foreign key constraint
5. THE Starknet_Indexer SHALL reference contract_address with foreign key constraint
6. THE Starknet_Indexer SHALL reference block_number with foreign key constraint
7. THE Starknet_Indexer SHALL reference chain_id with foreign key constraint
8. THE Starknet_Indexer SHALL support querying events by contract address and key patterns

### Requirement 8: Execution Call Tracking

**User Story:** As a security analyst, I want internal contract calls tracked, so that I can analyze execution flows and detect suspicious patterns.

#### Acceptance Criteria

1. THE Starknet_Indexer SHALL store tx_hash, contract_address, entry_point_selector, and call_index for each execution call
2. THE Starknet_Indexer SHALL store caller_address and call_type (CALL, DELEGATE_CALL, LIBRARY_CALL)
3. THE Starknet_Indexer SHALL store calldata and result arrays
4. THE Starknet_Indexer SHALL store execution status (SUCCESS, REVERTED)
5. THE Starknet_Indexer SHALL reference tx_hash with foreign key constraint
6. THE Starknet_Indexer SHALL reference chain_id with foreign key constraint
7. THE Starknet_Indexer SHALL maintain call hierarchy through parent_call_id

### Requirement 9: Wallet Address Registry

**User Story:** As a blockchain analyst, I want wallet addresses tracked, so that I can analyze user behavior and wallet activity patterns.

#### Acceptance Criteria

1. THE Starknet_Indexer SHALL store address and first_seen_block for each wallet
2. THE Starknet_Indexer SHALL enforce address uniqueness per chain
3. THE Starknet_Indexer SHALL detect wallet addresses from transaction senders
4. THE Starknet_Indexer SHALL detect wallet addresses from event data (transfer recipients)
5. THE Starknet_Indexer SHALL reference first_seen_block with foreign key constraint
6. THE Starknet_Indexer SHALL reference chain_id with foreign key constraint
7. THE Starknet_Indexer SHALL distinguish between wallet accounts and contract accounts

### Requirement 10: Wallet-Contract Interaction Tracking

**User Story:** As a product analyst, I want wallet-contract interactions tracked, so that I can measure user engagement and protocol adoption.

#### Acceptance Criteria

1. THE Starknet_Indexer SHALL store wallet_address, contract_address, tx_hash, and interaction_type for each interaction
2. THE Starknet_Indexer SHALL classify interaction types (DEPLOY, INVOKE, TRANSFER_IN, TRANSFER_OUT)
3. THE Starknet_Indexer SHALL reference wallet_address with foreign key constraint
4. THE Starknet_Indexer SHALL reference contract_address with foreign key constraint
5. THE Starknet_Indexer SHALL reference tx_hash with foreign key constraint
6. THE Starknet_Indexer SHALL reference chain_id with foreign key constraint
7. THE Starknet_Indexer SHALL support querying interactions by wallet or contract

### Requirement 11: Token Contract Registry

**User Story:** As a DeFi analyst, I want token contracts identified and tracked, so that I can analyze token economics and value flows.

#### Acceptance Criteria

1. THE Starknet_Indexer SHALL store token_address, name, symbol, decimals, and total_supply for each token
2. THE Starknet_Indexer SHALL enforce token_address uniqueness per chain
3. THE Starknet_Indexer SHALL detect ERC20 tokens by interface compliance
4. THE Starknet_Indexer SHALL detect ERC721 and ERC1155 tokens
5. THE Starknet_Indexer SHALL store token_type (ERC20, ERC721, ERC1155, OTHER)
6. THE Starknet_Indexer SHALL reference chain_id with foreign key constraint
7. THE Starknet_Indexer SHALL update total_supply when detected from events

### Requirement 12: Token Transfer Tracking

**User Story:** As a DeFi analyst, I want token transfers tracked, so that I can analyze value flows and trading patterns.

#### Acceptance Criteria

1. THE Starknet_Indexer SHALL store tx_hash, token_address, from_address, to_address, and amount for each transfer
2. THE Starknet_Indexer SHALL detect transfers from Transfer events
3. THE Starknet_Indexer SHALL store event_index to link back to the source event
4. THE Starknet_Indexer SHALL reference tx_hash with foreign key constraint
5. THE Starknet_Indexer SHALL reference token_address with foreign key constraint
6. THE Starknet_Indexer SHALL reference chain_id with foreign key constraint
7. THE Starknet_Indexer SHALL support querying transfers by token, sender, or recipient
8. THE Starknet_Indexer SHALL handle NFT transfers (token_id for ERC721/ERC1155)

### Requirement 13: Function Signature Registry

**User Story:** As a smart contract analyst, I want function signatures stored, so that I can decode transaction calldata and understand contract interactions.

#### Acceptance Criteria

1. THE Starknet_Indexer SHALL store contract_address, function_selector, function_name, and function_signature
2. THE Starknet_Indexer SHALL store input_types and output_types arrays
3. THE Starknet_Indexer SHALL detect function signatures from contract ABIs
4. THE Starknet_Indexer SHALL mark functions as view or external
5. THE Starknet_Indexer SHALL reference contract_address with foreign key constraint
6. THE Starknet_Indexer SHALL reference chain_id with foreign key constraint
7. THE Starknet_Indexer SHALL support querying by function_selector

### Requirement 14: Raw RPC Response Storage

**User Story:** As a system operator, I want raw RPC responses stored, so that I can debug indexing issues and verify data integrity.

#### Acceptance Criteria

1. THE Starknet_Indexer SHALL store rpc_method, request_params, and response_json for each RPC call
2. THE Starknet_Indexer SHALL store block_number or tx_hash to link responses to blockchain data
3. THE Starknet_Indexer SHALL store response_timestamp
4. THE Starknet_Indexer SHALL reference chain_id with foreign key constraint
5. THE Starknet_Indexer SHALL support querying by rpc_method and block_number
6. THE Starknet_Indexer SHALL implement retention policy for old RPC responses
7. WHEN debugging is enabled, THE Starknet_Indexer SHALL store all RPC responses

### Requirement 15: Daily Metrics Aggregation

**User Story:** As a business analyst, I want daily blockchain metrics computed, so that I can track network growth and activity trends.

#### Acceptance Criteria

1. THE Starknet_Indexer SHALL compute total_transactions, successful_transactions, and failed_transactions per day
2. THE Starknet_Indexer SHALL compute unique_addresses per day
3. THE Starknet_Indexer SHALL compute total_gas_used and average_gas_price per day
4. THE Starknet_Indexer SHALL compute new_contracts deployed per day
5. THE Starknet_Indexer SHALL enforce uniqueness by (chain_id, date)
6. THE Starknet_Indexer SHALL reference chain_id with foreign key constraint
7. THE Starknet_Indexer SHALL update metrics incrementally as new blocks are indexed

### Requirement 16: Historical Data Preservation

**User Story:** As a blockchain auditor, I want historical data preserved during reorganizations, so that I can audit chain history and detect anomalies.

#### Acceptance Criteria

1. WHEN a block is reorganized, THE Starknet_Indexer SHALL mark affected blocks as inactive rather than deleting them
2. WHEN a transaction is reorganized, THE Starknet_Indexer SHALL mark it as inactive rather than deleting it
3. THE Starknet_Indexer SHALL add is_active boolean field to blocks table
4. THE Starknet_Indexer SHALL add is_active boolean field to transactions table
5. THE Starknet_Indexer SHALL add is_active boolean field to events table
6. THE Starknet_Indexer SHALL default is_active to true for new records
7. THE Starknet_Indexer SHALL support querying both active and inactive records

### Requirement 17: Referential Integrity Enforcement

**User Story:** As a database administrator, I want strict referential integrity enforced, so that data relationships remain consistent and queries are reliable.

#### Acceptance Criteria

1. THE Starknet_Indexer SHALL enforce foreign key constraints on all relationship columns
2. THE Starknet_Indexer SHALL use CASCADE behavior for chain_id deletions
3. THE Starknet_Indexer SHALL use RESTRICT behavior for block deletions when child records exist
4. THE Starknet_Indexer SHALL validate foreign key references before insertion
5. THE Starknet_Indexer SHALL create indexes on all foreign key columns
6. THE Starknet_Indexer SHALL ensure chain_id is present in all chain-specific tables
7. THE Starknet_Indexer SHALL validate that referenced records exist before creating relationships

### Requirement 18: Performance Optimization

**User Story:** As a system operator, I want optimized query performance, so that API responses are fast and the system scales efficiently.

#### Acceptance Criteria

1. THE Starknet_Indexer SHALL create indexes on frequently queried columns (block_hash, tx_hash, contract_address)
2. THE Starknet_Indexer SHALL create composite indexes for common query patterns
3. THE Starknet_Indexer SHALL create indexes on timestamp columns for time-range queries
4. THE Starknet_Indexer SHALL create indexes on foreign key columns
5. THE Starknet_Indexer SHALL partition large tables by date or block_number when appropriate
6. THE Starknet_Indexer SHALL use BIGINT for block_number and BIGSERIAL for auto-increment IDs
7. THE Starknet_Indexer SHALL use appropriate data types to minimize storage (VARCHAR vs TEXT)

### Requirement 19: Data Validation and Constraints

**User Story:** As a data engineer, I want data validation enforced at the database level, so that invalid data cannot be inserted.

#### Acceptance Criteria

1. THE Starknet_Indexer SHALL enforce NOT NULL constraints on required fields
2. THE Starknet_Indexer SHALL enforce UNIQUE constraints on natural keys (block_hash, tx_hash, contract_address)
3. THE Starknet_Indexer SHALL enforce CHECK constraints on enum-like fields (status, tx_type)
4. THE Starknet_Indexer SHALL validate address format (0x followed by hex characters)
5. THE Starknet_Indexer SHALL validate hash format (66 characters for Starknet hashes)
6. THE Starknet_Indexer SHALL use DEFAULT values for optional fields
7. THE Starknet_Indexer SHALL validate timestamp values are within reasonable ranges

### Requirement 20: Schema Documentation

**User Story:** As a developer, I want comprehensive schema documentation, so that I can understand table purposes and relationships.

#### Acceptance Criteria

1. THE Starknet_Indexer SHALL add COMMENT statements to all tables describing their purpose
2. THE Starknet_Indexer SHALL add COMMENT statements to key columns explaining their meaning
3. THE Starknet_Indexer SHALL document foreign key relationships in comments
4. THE Starknet_Indexer SHALL document data flow from RPC to tables in comments
5. THE Starknet_Indexer SHALL document index purposes in comments
6. THE Starknet_Indexer SHALL maintain a data dictionary as part of the schema
7. THE Starknet_Indexer SHALL document any non-obvious design decisions
