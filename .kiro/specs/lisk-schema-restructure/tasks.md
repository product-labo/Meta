# Implementation Plan: Lisk Schema Restructure

## Overview

This implementation plan restructures the Lisk blockchain indexer database schema to achieve full fidelity with Lisk's modular architecture. The plan follows a phased approach: schema creation, data migration, indexer updates, and testing.
LISK INDEXER ER DIAGRAM (TEXTUAL)

1. chain_config

PK: chain_id

chain_name

rpc_url

start_block

finality_depth

reorg_depth

Relationships:

1 → 1 sync_state

1 → * blocks

2. sync_state

PK: chain_id, FK → chain_config.chain_id

last_synced_block

last_finalized_block

sync_state

Relationships:

1 → 1 chain_config

3. blocks

PK: block_id (or block_hash)

FK: chain_id → chain_config.chain_id

block_number

timestamp

previous_block_id → blocks.block_id

generator_address

transaction_root

state_root

asset_root

payload_length

Relationships:

1 → * transactions

1 → * events (via transactions)

4. transactions

PK: tx_id (tx_hash)

FK: block_id → blocks.block_id

FK: chain_id → chain_config.chain_id

sender_address → accounts.address

module

command

function_key

params JSONB

signatures JSONB

fee

nonce

execution_status

error_message

Relationships:

1 → * events

1 → * account_state_deltas

1 → * transaction_accounts

0..1 → * token_locks (related_tx_id)

5. events

PK: event_id

FK: tx_id → transactions.tx_id

FK: block_id → blocks.block_id

event_index

module

name

data JSONB

topics JSONB

6. accounts

PK: address

chain_id → chain_config.chain_id

first_seen_height

last_seen_height

Relationships:

1 → * account_state_snapshots

1 → * account_state_deltas

1 → * token_balances

1 → * token_locks

1 → * transaction_accounts

7. account_state_snapshots

PK: snapshot_id

FK: address → accounts.address

block_height

module

state JSONB

Constraints:

Unique(address, module, block_height)

8. account_state_deltas

PK: delta_id

FK: tx_id → transactions.tx_id

FK: address → accounts.address

block_height

module

state_before JSONB

state_after JSONB

9. token_balances

PK: (address, block_height)

FK: address → accounts.address

available_balance

locked_balance

total_balance

10. token_locks

PK: lock_id

FK: address → accounts.address

FK: related_tx_id → transactions.tx_id

module_source

lock_type (pos_stake, governance_vote, time_based)

amount

unlock_height

is_active BOOLEAN

11. transaction_accounts

PK: id

FK: tx_id → transactions.tx_id

FK: address → accounts.address

role (sender, receiver, validator, delegate)

12. raw_rpc_responses

PK: rpc_method + block_height

response_json JSONB

RELATIONSHIP DIAGRAM SUMMARY

chain_config 1 → 1 sync_state

chain_config 1 → * blocks

blocks 1 → * transactions

transactions 1 → * events

transactions 1 → * account_state_deltas

transactions 1 → * transaction_accounts

transactions 0..1 → * token_locks (related_tx_id)

accounts 1 → * account_state_snapshots

accounts 1 → * account_state_deltas

accounts 1 → * token_balances

accounts 1 → * token_locks

accounts 1 → * transaction_accounts

Notes:

Use CASCADE for deletes from block → transactions → events/deltas.

Use SET NULL for token_locks.related_tx_id on transaction delete.

Enforce snapshot uniqueness per (address, module, block_height).

Events are strictly tied to transactions, not blocks directly.

## Tasks

- [ ] 1. Create new database schema with all tables
  - Create migration script for schema creation
  - Define all 12 tables with proper types and constraints
  - Define all foreign keys with CASCADE/SET NULL behavior
  - Create all indexes for performance optimization
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 10.1, 11.1, 12.1, 13.1, 15.1, 15.2, 15.3, 15.4_

- [ ] 1.1 Write property test for schema creation
  - **Property 1: Chain Configuration Completeness**
  - **Validates: Requirements 1.2**

- [ ] 2. Implement chain configuration management
  - [ ] 2.1 Create chain_config table insertion logic
    - Write function to insert chain configuration
    - Validate all required fields are present
    - Handle duplicate chain_id errors
    - _Requirements: 1.2, 1.3_

  - [ ] 2.2 Write property tests for chain configuration
    - **Property 2: Chain ID Uniqueness**
    - **Property 3: Multi-Chain Support**
    - **Validates: Requirements 1.3, 1.4**

  - [ ] 2.3 Create sync_state table management
    - Write function to create/update sync state
    - Ensure one-to-one relationship with chain_config
    - Implement sync height update logic
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 2.4 Write property tests for sync state
    - **Property 4: Sync State One-to-One Relationship**
    - **Property 5: Sync Height Update on Block Index**
    - **Property 6: Finality Height Update**
    - **Property 7: Sync State Cascade Delete**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

- [ ] 3. Implement block storage and management
  - [ ] 3.1 Create blocks table insertion logic
    - Write function to insert blocks
    - Validate all required fields
    - Handle block reorganizations
    - Maintain previous_block_id references
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

  - [ ] 3.2 Write property tests for blocks
    - **Property 8: Block Field Completeness**
    - **Property 9: Block Height Uniqueness Per Chain**
    - **Property 10: Block Chain Structure Integrity**
    - **Property 11: Block Reorganization Support**
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5**

- [ ] 4. Implement transaction storage
  - [ ] 4.1 Create transactions table insertion logic
    - Write function to insert transactions
    - Compute function_key from module and command
    - Store params and signatures as JSONB
    - Handle failed transactions with error messages
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.7_

  - [ ] 4.2 Write property tests for transactions
    - **Property 12: Transaction Field Completeness**
    - **Property 13: Function Key Computation**
    - **Property 14: Transaction Params Round-Trip**
    - **Property 15: Transaction Signatures Round-Trip**
    - **Property 16: Transaction Cascade Delete**
    - **Property 17: Failed Transaction Error Recording**
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.6, 4.7**

- [ ] 5. Implement event storage
  - [ ] 5.1 Create events table insertion logic
    - Write function to insert events
    - Maintain event_index ordering
    - Store data and topics as JSONB
    - _Requirements: 5.2, 5.3, 5.4, 5.6_

  - [ ] 5.2 Write property tests for events
    - **Property 18: Event Field Completeness**
    - **Property 19: Event Data Round-Trip**
    - **Property 20: Event Topics Round-Trip**
    - **Property 21: Event Cascade Delete**
    - **Property 22: Event Ordering**
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.5, 5.6**

- [ ] 6. Implement account registry
  - [ ] 6.1 Create accounts table management
    - Write function to create/update accounts
    - Set first_seen_height on creation
    - Update last_seen_height on activity
    - Create accounts for all roles (sender, receiver, validator, delegate)
    - _Requirements: 6.2, 6.3, 6.4_

  - [ ] 6.2 Write property tests for accounts
    - **Property 23: Account First Seen Height**
    - **Property 24: Account Last Seen Height Update**
    - **Property 25: Account Role Coverage**
    - **Validates: Requirements 6.2, 6.3, 6.4**

- [ ] 7. Implement modular account state snapshots
  - [ ] 7.1 Create account_state_snapshots table logic
    - Write function to insert/update state snapshots
    - Support multiple modules per account (token, pos, governance)
    - Store state as JSONB
    - Ensure module independence
    - _Requirements: 7.2, 7.3, 7.4, 7.6_

  - [ ] 7.2 Write property tests for state snapshots
    - **Property 26: State Snapshot Field Completeness**
    - **Property 27: State Snapshot Round-Trip**
    - **Property 28: Multiple Module States Per Account**
    - **Property 29: State Snapshot Cascade Delete**
    - **Property 30: Module State Independence**
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.5, 7.6**

- [ ] 8. Implement account state deltas
  - [ ] 8.1 Create account_state_deltas table logic
    - Write function to compute and insert state deltas
    - Capture state_before and state_after
    - Store deltas as JSONB
    - Link deltas to transactions
    - _Requirements: 8.2, 8.3, 8.6_

  - [ ] 8.2 Write property tests for state deltas
    - **Property 31: State Delta Field Completeness**
    - **Property 32: State Delta Round-Trip**
    - **Property 33: State Delta Transaction Cascade Delete**
    - **Property 34: State Delta Account Cascade Delete**
    - **Property 35: State Delta Completeness**
    - **Validates: Requirements 8.2, 8.3, 8.4, 8.5, 8.6**

- [ ] 9. Implement token balance tracking
  - [ ] 9.1 Create token_balances table logic
    - Write function to insert/update token balances
    - Compute total_balance as available + locked
    - Sync balances with token module state
    - _Requirements: 9.2, 9.3, 9.5_

  - [ ] 9.2 Write property tests for token balances
    - **Property 36: Token Balance Field Completeness**
    - **Property 37: Token Balance Sum Invariant**
    - **Property 38: Token Balance Cascade Delete**
    - **Property 39: Token Balance Sync with State**
    - **Validates: Requirements 9.2, 9.3, 9.4, 9.5**

- [ ] 10. Implement token lock management
  - [ ] 10.1 Create token_locks table logic
    - Write function to insert/update/delete token locks
    - Support lock types (pos_stake, governance_vote, time_based)
    - Handle unlock_height for expiring locks
    - Link locks to transactions with SET NULL behavior
    - _Requirements: 10.2, 10.3, 10.4, 10.7_

  - [ ] 10.2 Write property tests for token locks
    - **Property 40: Token Lock Field Completeness**
    - **Property 41: Token Lock Type Validity**
    - **Property 42: Token Lock Unlock Height**
    - **Property 43: Token Lock Cascade Delete**
    - **Property 44: Token Lock Transaction Set NULL**
    - **Property 45: Token Lock Removal**
    - **Validates: Requirements 10.2, 10.3, 10.4, 10.5, 10.6, 10.7**

- [ ] 11. Implement transaction-account relationships
  - [ ] 11.1 Create transaction_accounts table logic
    - Write function to insert transaction-account relationships
    - Support roles (sender, receiver, validator, delegate)
    - Ensure every transaction has at least a sender
    - _Requirements: 11.2, 11.3, 11.6_

  - [ ] 11.2 Write property tests for transaction-account relationships
    - **Property 46: Transaction Account Relationship Field Completeness**
    - **Property 47: Transaction Account Role Validity**
    - **Property 48: Transaction Account Transaction Cascade Delete**
    - **Property 49: Transaction Account Account Cascade Delete**
    - **Property 50: Transaction Sender Requirement**
    - **Validates: Requirements 11.2, 11.3, 11.4, 11.5, 11.6**

- [ ] 12. Implement raw RPC response storage
  - [ ] 12.1 Create raw_rpc_responses table logic
    - Write function to insert raw RPC responses
    - Store response_json as JSONB
    - Store responses for critical methods
    - _Requirements: 12.2, 12.3, 12.4_

  - [ ] 12.2 Write property tests for raw RPC responses
    - **Property 51: Raw RPC Response Field Completeness**
    - **Property 52: Raw RPC Response Round-Trip**
    - **Property 53: Critical RPC Method Storage**
    - **Validates: Requirements 12.2, 12.3, 12.4**

- [ ] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Implement cascade delete behavior
  - [ ] 14.1 Test block cascade deletes
    - Verify deleting a block deletes all transactions, events, and state changes
    - _Requirements: 13.2_

  - [ ] 14.2 Test account cascade deletes
    - Verify deleting an account deletes all snapshots, deltas, balances, and locks
    - _Requirements: 13.3_

  - [ ] 14.3 Test transaction cascade deletes
    - Verify deleting a transaction deletes all events, deltas, and relationships
    - _Requirements: 13.4_

  - [ ] 14.4 Test SET NULL behavior
    - Verify deleting a transaction sets token_locks.related_tx_id to NULL
    - _Requirements: 13.5_

  - [ ] 14.5 Write property tests for cascade behavior
    - **Property 54: Block Cascade Delete Completeness**
    - **Property 55: Account Cascade Delete Completeness**
    - **Property 56: Transaction Cascade Delete Completeness**
    - **Property 57: Optional Relationship Set NULL**
    - **Validates: Requirements 13.2, 13.3, 13.4, 13.5**

- [ ] 15. Implement indexing pipeline
  - [ ] 15.1 Create block indexing orchestrator
    - Implement indexing order: Block → Transactions → Events → Deltas → Snapshots → Locks
    - Use database transactions for atomicity
    - Implement rollback on failure
    - Support idempotent re-indexing
    - _Requirements: 14.2, 14.4, 14.5_

  - [ ] 15.2 Write property tests for indexing pipeline
    - **Property 58: Block Indexing Atomicity**
    - **Property 59: Indexing Failure Rollback**
    - **Property 60: Idempotent Block Re-indexing**
    - **Validates: Requirements 14.2, 14.4, 14.5**

- [ ] 16. Implement RPC client
  - [ ] 16.1 Create Lisk RPC client
    - Implement getBlockByHeight method
    - Implement getTransactions method
    - Implement getEvents method
    - Implement getAccountState method
    - Handle RPC errors with retry logic
    - Store raw responses in raw_rpc_responses table

  - [ ] 16.2 Implement error handling
    - Handle network errors with exponential backoff
    - Handle invalid RPC responses
    - Log errors for debugging

- [ ] 17. Implement state computation
  - [ ] 17.1 Create state delta computation
    - Compute state_before from previous snapshot
    - Compute state_after from transaction effects
    - Handle missing state gracefully

  - [ ] 17.2 Create state snapshot updates
    - Update snapshots after each transaction
    - Support multiple modules per account
    - Ensure module independence

  - [ ] 17.3 Create token balance computation
    - Extract balances from token module state
    - Compute available, locked, and total balances
    - Sync with state snapshots

  - [ ] 17.4 Create token lock extraction
    - Extract locks from token module state
    - Identify lock types (pos_stake, governance_vote, time_based)
    - Set unlock_height from lock data

- [ ] 18. Implement reorg handling
  - [ ] 18.1 Create reorg detection
    - Detect when previous_block_id doesn't match expected parent
    - Identify common ancestor block

  - [ ] 18.2 Create reorg rollback
    - Delete blocks beyond reorg point
    - Cascade delete all related data
    - Update sync_state to common ancestor

  - [ ] 18.3 Create reorg re-indexing
    - Re-fetch blocks from RPC node
    - Re-index blocks in correct order
    - Verify state consistency after reorg

- [ ] 19. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 20. Create data migration scripts
  - [ ] 20.1 Write migration for chain_config and sync_state
    - Transform old chain config to new format
    - Migrate sync state data

  - [ ] 20.2 Write migration for blocks and transactions
    - Transform old block data to new format
    - Transform old transaction data to new format
    - Compute function_key for all transactions

  - [ ] 20.3 Write migration for events
    - Transform old event data to new format
    - Ensure event_index ordering

  - [ ] 20.4 Write migration for accounts
    - Extract all unique addresses from transactions
    - Set first_seen_height and last_seen_height

  - [ ] 20.5 Write migration for state snapshots
    - Compute state snapshots from transaction history
    - Support multiple modules per account

  - [ ] 20.6 Write migration for state deltas
    - Compute state deltas from transaction history
    - Link deltas to transactions

  - [ ] 20.7 Write migration for token balances
    - Extract balances from state snapshots
    - Compute available, locked, and total balances

  - [ ] 20.8 Write migration for token locks
    - Extract locks from state snapshots
    - Identify lock types and unlock heights

  - [ ] 20.9 Write migration for transaction-account relationships
    - Extract relationships from transactions
    - Identify roles (sender, receiver, validator, delegate)

- [ ] 21. Test data migration
  - [ ] 21.1 Run migration on test data
    - Migrate sample blocks and transactions
    - Verify all data is migrated correctly

  - [ ] 21.2 Verify data integrity
    - Check all foreign keys are valid
    - Check all constraints are satisfied
    - Check all indexes are used

  - [ ] 21.3 Compare old and new data
    - Verify block counts match
    - Verify transaction counts match
    - Verify account counts match

- [ ] 22. Update indexer code
  - [ ] 22.1 Update indexer to use new schema
    - Replace old table references with new tables
    - Update queries to use new schema
    - Update insert/update logic

  - [ ] 22.2 Test indexer on testnet
    - Index testnet blocks with new schema
    - Verify all data is indexed correctly
    - Monitor for errors

  - [ ] 22.3 Run property tests against indexed data
    - Run all 60 property tests
    - Verify all properties hold
    - Fix any failures

- [ ] 23. Performance testing
  - [ ] 23.1 Test query performance
    - Measure query latency for common queries
    - Verify indexes are used
    - Optimize slow queries

  - [ ] 23.2 Test indexing performance
    - Measure blocks per second
    - Identify bottlenecks
    - Optimize indexing pipeline

  - [ ] 23.3 Test database size
    - Measure table sizes
    - Verify JSONB compression
    - Plan for archival strategy

- [ ] 24. Documentation
  - [ ] 24.1 Document schema
    - Create ER diagrams
    - Document all tables and columns
    - Document JSONB structures

  - [ ] 24.2 Document API
    - Document query endpoints
    - Provide example queries
    - Document rate limits

  - [ ] 24.3 Document operations
    - Document deployment procedures
    - Document backup and recovery
    - Document monitoring and alerting

- [ ] 25. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (60 properties total)
- Unit tests validate specific examples and edge cases
- Migration scripts transform old data to new schema
- Performance testing ensures the schema scales
