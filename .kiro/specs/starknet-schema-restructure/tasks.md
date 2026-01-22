# Implementation Plan: Starknet Schema Restructure

## Overview

This implementation plan transforms the current Starknet schema into a production-ready, fully relational database with complete foreign key coverage, historical data preservation, and zero data loss. The plan follows an incremental approach: infrastructure tables first, then core table enhancements, followed by extended analytics tables, and finally comprehensive testing.

Entities and Primary Keys

chain_config (chain_id PK)

sync_state (id PK, FK chain_id)

raw_rpc_responses (id PK, FK chain_id)

starknet_blocks (block_number, chain_id PK composite)

starknet_transactions (tx_hash, chain_id PK composite, FK block_number, chain_id)

starknet_contract_classes (class_hash, chain_id PK composite)

starknet_contracts (contract_address, chain_id PK composite, FK class_hash, chain_id)

starknet_execution_calls (call_id PK, FK tx_hash, chain_id)

starknet_events (tx_hash, event_index, chain_id PK composite, FK contract_address, chain_id)

starknet_wallets (address, chain_id PK composite)

starknet_wallet_interactions (id PK, FK wallet_address, chain_id, FK contract_address, chain_id)

starknet_tokens (token_address, chain_id PK composite)

starknet_token_transfers (tx_hash, event_index, chain_id PK composite, FK token_address, chain_id)

starknet_function_signatures (function_selector, contract_address, chain_id PK composite, FK contract_address, chain_id)

starknet_daily_metrics (date, chain_id PK composite, FK chain_id)

Key Relationships

chain_config

One-to-many: starknet_blocks, starknet_transactions, starknet_contract_classes, starknet_contracts, starknet_execution_calls, starknet_events, starknet_wallets, starknet_wallet_interactions, starknet_tokens, starknet_token_transfers, starknet_function_signatures, starknet_daily_metrics

starknet_blocks → transactions

One-to-many, FK block_number, chain_id

starknet_contract_classes → contracts

One-to-many, FK class_hash, chain_id

starknet_contracts → events

One-to-many, FK contract_address, chain_id

transactions → events

One-to-many, FK tx_hash, chain_id

transactions → execution_calls

One-to-many, FK tx_hash, chain_id

execution_calls → execution_calls (self-reference)

Parent call hierarchy, FK parent_call_id

wallets → wallet_interactions

One-to-many, FK wallet_address, chain_id

contracts → wallet_interactions

One-to-many, FK contract_address, chain_id

tokens → token_transfers

One-to-many, FK token_address, chain_id

blocks → token_transfers

One-to-many, FK block_number, chain_id

contracts → function_signatures

One-to-many, FK contract_address, chain_id

Extras

is_active column in blocks, transactions, events for historical preservation

Composite unique constraints to enforce uniqueness per chain

Indexes for performance on common query paths

## Tasks

- [ ] 1. Create infrastructure foundation tables
  - Create chain_config table for multi-chain support
  - Create sync_state table for indexer progress tracking
  - Create raw_rpc_responses table for debugging
  - Add chain_id column to all existing tables
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

- [ ] 2. Implement contract class storage system
  - [ ] 2.1 Create starknet_contract_classes table
    - Define table with class_hash, abi_json, compiled_class_hash, contract_type
    - Add foreign keys for chain_id, declared_tx_hash, declared_block
    - Add indexes on class_hash and contract_type
    - Add COMMENT statements for documentation
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ] 2.2 Write property test for contract class storage
    - **Property 1: Class hash uniqueness per chain**
    - **Validates: Requirements 5.2**

  - [ ] 2.3 Add class_hash foreign key to starknet_contracts
    - Alter starknet_contracts to reference starknet_contract_classes(class_hash)
    - Add ON DELETE RESTRICT to prevent orphaned contracts
    - _Requirements: 6.5, 17.1, 17.4_

  - [ ] 2.4 Write property test for contract-class relationship
    - **Property 2: Contract class reference integrity**
    - **Validates: Requirements 6.5, 17.1**

- [ ] 3. Enhance core blockchain tables with historical tracking
  - [ ] 3.1 Add is_active column to starknet_blocks
    - Add is_active BOOLEAN NOT NULL DEFAULT true
    - Create index on is_active for filtering
    - Update existing records to set is_active = true
    - _Requirements: 16.3, 16.6_

  - [ ] 3.2 Add is_active column to starknet_transactions
    - Add is_active BOOLEAN NOT NULL DEFAULT true
    - Create index on is_active for filtering
    - Update existing records to set is_active = true
    - _Requirements: 16.4, 16.6_

  - [ ] 3.3 Add is_active column to starknet_events
    - Add is_active BOOLEAN NOT NULL DEFAULT true
    - Create index on is_active for filtering
    - Update existing records to set is_active = true
    - _Requirements: 16.5, 16.6_

  - [ ] 3.4 Write property test for historical preservation
    - **Property 3: Reorganization preserves history**
    - **Validates: Requirements 16.1, 16.2, 16.7**

- [ ] 4. Implement execution call tracking
  - [ ] 4.1 Create starknet_execution_calls table
    - Define table with call_id, tx_hash, contract_address, entry_point_selector
    - Add caller_address, call_type, calldata, result, execution_status
    - Add parent_call_id for call hierarchy
    - Add foreign keys for chain_id, tx_hash
    - Add indexes on tx_hash, contract_address, entry_point_selector
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [ ] 4.2 Write property test for execution call hierarchy
    - **Property 4: Call hierarchy integrity**
    - **Validates: Requirements 8.7**

- [ ] 5. Enhance blocks table with additional fields
  - [ ] 5.1 Add missing columns to starknet_blocks
    - Add chain_id INTEGER NOT NULL with foreign key to chain_config
    - Add sequencer_address VARCHAR(66)
    - Add transaction_count INTEGER DEFAULT 0
    - Add event_count INTEGER DEFAULT 0
    - Create composite unique constraint on (chain_id, block_number)
    - _Requirements: 3.4, 3.5, 3.6, 3.2_

  - [ ] 5.2 Write property test for block uniqueness
    - **Property 5: Block number uniqueness per chain**
    - **Validates: Requirements 3.2**

  - [ ] 5.3 Create performance indexes on starknet_blocks
    - Create index on sequencer_address
    - Create index on (chain_id, timestamp) for time-range queries
    - Create index on (chain_id, finality_status) for status filtering
    - _Requirements: 18.1, 18.2, 18.3_

  - [ ] 5.4 Write property test for block query performance
    - **Property 6: Block queries use indexes**
    - **Validates: Requirements 18.1, 18.3**

- [ ] 6. Enhance transactions table with complete data
  - [ ] 6.1 Add missing columns to starknet_transactions
    - Add chain_id INTEGER NOT NULL with foreign key to chain_config
    - Add nonce BIGINT
    - Add max_fee BIGINT
    - Add calldata TEXT[]
    - Add signature TEXT[]
    - Add is_active BOOLEAN NOT NULL DEFAULT true
    - Create composite unique constraint on (chain_id, tx_hash)
    - _Requirements: 4.5, 4.6, 4.8, 4.9_

  - [ ] 6.2 Write property test for transaction uniqueness
    - **Property 7: Transaction hash uniqueness per chain**
    - **Validates: Requirements 4.2**

  - [ ] 6.3 Create performance indexes on starknet_transactions
    - Create index on (chain_id, block_number, status)
    - Create index on (chain_id, sender_address, nonce)
    - Create index on (chain_id, is_active)
    - _Requirements: 18.1, 18.2, 18.4_

  - [ ] 6.4 Write property test for transaction query performance
    - **Property 8: Transaction queries use indexes**
    - **Validates: Requirements 18.1, 18.2**

- [ ] 7. Checkpoint - Verify core table enhancements
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Enhance contracts table with proxy detection
  - [ ] 8.1 Add missing columns to starknet_contracts
    - Add chain_id INTEGER NOT NULL with foreign key to chain_config
    - Add implementation_address VARCHAR(66) for proxy contracts
    - Create composite unique constraint on (chain_id, contract_address)
    - Add foreign key from class_hash to starknet_contract_classes
    - _Requirements: 6.4, 6.7, 6.5_

  - [ ] 8.2 Write property test for contract uniqueness
    - **Property 9: Contract address uniqueness per chain**
    - **Validates: Requirements 6.2**

  - [ ] 8.3 Create performance indexes on starknet_contracts
    - Create index on (chain_id, class_hash)
    - Create index on (chain_id, deployer_address)
    - Create index on (chain_id, is_proxy)
    - _Requirements: 18.1, 18.4_

  - [ ] 8.4 Write property test for proxy contract detection
    - **Property 10: Proxy contracts have implementation address**
    - **Validates: Requirements 6.4**

- [ ] 9. Enhance events table with complete indexing
  - [ ] 9.1 Add missing columns to starknet_events
    - Add chain_id INTEGER NOT NULL with foreign key to chain_config
    - Add is_active BOOLEAN NOT NULL DEFAULT true
    - Create composite unique constraint on (chain_id, tx_hash, event_index)
    - Add foreign key from contract_address to starknet_contracts
    - _Requirements: 7.2, 7.4, 7.5, 7.7_

  - [ ] 9.2 Write property test for event uniqueness
    - **Property 11: Event uniqueness per transaction**
    - **Validates: Requirements 7.2**

  - [ ] 9.3 Create performance indexes on starknet_events
    - Create index on (chain_id, contract_address, block_number)
    - Create index on (chain_id, keys) using GIN for array queries
    - Create index on (chain_id, is_active)
    - _Requirements: 18.1, 18.2, 18.4_

  - [ ] 9.4 Write property test for event ordering
    - **Property 12: Events maintain emission order**
    - **Validates: Requirements 7.3**

- [ ] 10. Enhance wallets table with account type detection
  - [ ] 10.1 Add missing columns to starknet_wallets
    - Add chain_id INTEGER NOT NULL with foreign key to chain_config
    - Add account_type VARCHAR(20) to distinguish wallet vs contract accounts
    - Create composite unique constraint on (chain_id, address)
    - _Requirements: 9.6, 9.7_

  - [ ] 10.2 Write property test for wallet uniqueness
    - **Property 13: Wallet address uniqueness per chain**
    - **Validates: Requirements 9.2**

  - [ ] 10.3 Create performance indexes on starknet_wallets
    - Create index on (chain_id, account_type)
    - Create index on (chain_id, first_seen_block)
    - _Requirements: 18.1, 18.4_

  - [ ] 10.4 Write property test for wallet detection from events
    - **Property 14: Transfer recipients create wallet records**
    - **Validates: Requirements 9.4**

- [ ] 11. Enhance wallet_interactions table with interaction types
  - [ ] 11.1 Add missing columns to starknet_wallet_interactions
    - Add chain_id INTEGER NOT NULL with foreign key to chain_config
    - Update interaction_type to support DEPLOY, INVOKE, TRANSFER_IN, TRANSFER_OUT
    - _Requirements: 10.2, 10.6_

  - [ ] 11.2 Write property test for interaction classification
    - **Property 15: Interactions are correctly classified**
    - **Validates: Requirements 10.2**

  - [ ] 11.3 Create performance indexes on starknet_wallet_interactions
    - Create index on (chain_id, wallet_address, interaction_type)
    - Create index on (chain_id, contract_address, interaction_type)
    - _Requirements: 18.1, 18.2_

  - [ ] 11.4 Write property test for interaction queries
    - **Property 16: Interaction queries by wallet are efficient**
    - **Validates: Requirements 10.7**

- [ ] 12. Checkpoint - Verify enhanced core tables
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Implement token registry system
  - [ ] 13.1 Enhance starknet_tokens table
    - Add chain_id foreign key constraint to chain_config
    - Add token_type validation (ERC20, ERC721, ERC1155, OTHER)
    - Create composite unique constraint on (chain_id, token_address)
    - _Requirements: 11.2, 11.5, 11.6_

  - [ ] 13.2 Write property test for token uniqueness
    - **Property 17: Token address uniqueness per chain**
    - **Validates: Requirements 11.2**

  - [ ] 13.3 Create performance indexes on starknet_tokens
    - Create index on (chain_id, token_type)
    - Create index on (chain_id, symbol)
    - _Requirements: 18.1, 18.4_

  - [ ] 13.4 Write property test for token type detection
    - **Property 18: Token types are correctly identified**
    - **Validates: Requirements 11.3, 11.4, 11.5**

- [ ] 14. Implement token transfer tracking
  - [ ] 14.1 Enhance starknet_token_transfers table
    - Add chain_id foreign key constraint to chain_config
    - Add block_number foreign key constraint to starknet_blocks
    - Add event_index to link back to source event
    - Add token_id for NFT transfers (nullable for ERC20)
    - Create composite unique constraint on (chain_id, tx_hash, event_index)
    - _Requirements: 12.3, 12.4, 12.5, 12.6, 12.8_

  - [ ] 14.2 Write property test for transfer detection
    - **Property 19: Transfer events create transfer records**
    - **Validates: Requirements 12.2**

  - [ ] 14.3 Create performance indexes on starknet_token_transfers
    - Create index on (chain_id, token_address, block_number)
    - Create index on (chain_id, from_address)
    - Create index on (chain_id, to_address)
    - _Requirements: 18.1, 18.2, 18.4_

  - [ ] 14.4 Write property test for transfer queries
    - **Property 20: Transfer queries by address are efficient**
    - **Validates: Requirements 12.7**

- [ ] 15. Implement function signature registry
  - [ ] 15.1 Enhance starknet_function_signatures table
    - Add chain_id foreign key constraint to chain_config
    - Add contract_address foreign key constraint to starknet_contracts
    - Add is_view BOOLEAN to mark view functions
    - Create composite unique constraint on (chain_id, contract_address, function_selector)
    - _Requirements: 13.4, 13.5, 13.6_

  - [ ] 15.2 Write property test for signature extraction from ABI
    - **Property 21: ABI parsing extracts all functions**
    - **Validates: Requirements 13.3**

  - [ ] 15.3 Create performance indexes on starknet_function_signatures
    - Create index on (chain_id, function_selector)
    - Create index on (chain_id, contract_address)
    - _Requirements: 18.1, 18.4_

  - [ ] 15.4 Write property test for signature queries
    - **Property 22: Function lookup by selector is efficient**
    - **Validates: Requirements 13.7**

- [ ] 16. Implement daily metrics aggregation
  - [ ] 16.1 Enhance starknet_daily_metrics table
    - Add chain_id foreign key constraint to chain_config
    - Add average_gas_price NUMERIC(78,0)
    - Enforce unique constraint on (chain_id, date)
    - _Requirements: 15.3, 15.5, 15.6_

  - [ ] 16.2 Write property test for metrics computation
    - **Property 23: Daily metrics match raw transaction counts**
    - **Validates: Requirements 15.1, 15.2**

  - [ ] 16.3 Create performance indexes on starknet_daily_metrics
    - Create index on (chain_id, date)
    - _Requirements: 18.1, 18.3_

  - [ ] 16.4 Write property test for incremental metrics updates
    - **Property 24: Metrics update correctly with new blocks**
    - **Validates: Requirements 15.7**

- [ ] 17. Checkpoint - Verify extended analytics tables
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. Implement data validation constraints
  - [ ] 18.1 Add CHECK constraints for address format
    - Add CHECK constraint on blocks.sequencer_address for 0x prefix
    - Add CHECK constraint on transactions.sender_address for 0x prefix
    - Add CHECK constraint on contracts.contract_address for 0x prefix
    - Add CHECK constraint on wallets.address for 0x prefix
    - _Requirements: 19.4_

  - [ ] 18.2 Write property test for address validation
    - **Property 25: Invalid addresses are rejected**
    - **Validates: Requirements 19.4**

  - [ ] 18.3 Add CHECK constraints for hash format
    - Add CHECK constraint on blocks.block_hash for 66 character length
    - Add CHECK constraint on transactions.tx_hash for 66 character length
    - Add CHECK constraint on contract_classes.class_hash for 66 character length
    - _Requirements: 19.5_

  - [ ] 18.4 Write property test for hash validation
    - **Property 26: Invalid hashes are rejected**
    - **Validates: Requirements 19.5**

  - [ ] 18.5 Add CHECK constraints for enum fields
    - Add CHECK constraint on blocks.finality_status (PENDING, ACCEPTED_ON_L2, ACCEPTED_ON_L1)
    - Add CHECK constraint on transactions.status (ACCEPTED_ON_L2, ACCEPTED_ON_L1, REJECTED)
    - Add CHECK constraint on transactions.tx_type (INVOKE, DEPLOY_ACCOUNT, DECLARE, DEPLOY, L1_HANDLER)
    - Add CHECK constraint on execution_calls.call_type (CALL, DELEGATE_CALL, LIBRARY_CALL)
    - _Requirements: 19.3_

  - [ ] 18.6 Write property test for enum validation
    - **Property 27: Invalid enum values are rejected**
    - **Validates: Requirements 19.3**

  - [ ] 18.7 Add CHECK constraints for timestamp ranges
    - Add CHECK constraint on blocks.timestamp > 0
    - Add CHECK constraint on blocks.timestamp < 2147483647 (year 2038)
    - _Requirements: 19.7_

  - [ ] 18.8 Write property test for timestamp validation
    - **Property 28: Invalid timestamps are rejected**
    - **Validates: Requirements 19.7**

- [ ] 19. Implement CASCADE and RESTRICT behaviors
  - [ ] 19.1 Configure foreign key CASCADE for chain_id
    - Update all chain_id foreign keys to ON DELETE CASCADE
    - This allows removing a chain and all its data atomically
    - _Requirements: 17.2_

  - [ ] 19.2 Write property test for chain deletion cascade
    - **Property 29: Deleting chain removes all chain data**
    - **Validates: Requirements 17.2**

  - [ ] 19.3 Configure foreign key RESTRICT for blocks
    - Update block_number foreign keys to ON DELETE RESTRICT
    - Prevents deleting blocks that have child transactions/events
    - _Requirements: 17.3_

  - [ ] 19.4 Write property test for block deletion restriction
    - **Property 30: Cannot delete blocks with transactions**
    - **Validates: Requirements 17.3**

  - [ ] 19.5 Validate all foreign key references
    - Add application-level validation before insertions
    - Ensure referenced records exist before creating relationships
    - _Requirements: 17.4, 17.7_

  - [ ] 19.6 Write property test for referential integrity
    - **Property 31: All foreign keys reference existing records**
    - **Validates: Requirements 17.4, 17.7**

- [ ] 20. Add comprehensive schema documentation
  - [ ] 20.1 Add table-level COMMENT statements
    - Add COMMENT to chain_config describing multi-chain support
    - Add COMMENT to sync_state describing indexer progress
    - Add COMMENT to all 15 tables with purpose and data flow
    - _Requirements: 20.1, 20.4_

  - [ ] 20.2 Add column-level COMMENT statements
    - Add COMMENT to key columns (block_hash, tx_hash, class_hash, etc.)
    - Add COMMENT to foreign key columns explaining relationships
    - Add COMMENT to enum-like columns listing valid values
    - _Requirements: 20.2, 20.3_

  - [ ] 20.3 Document index purposes
    - Add COMMENT to each index explaining query patterns it optimizes
    - Document composite indexes and their column order rationale
    - _Requirements: 20.5_

  - [ ] 20.4 Create data dictionary document
    - Generate markdown document listing all tables, columns, types
    - Include foreign key relationships diagram
    - Document data flow from RPC to tables
    - _Requirements: 20.6, 20.4_

  - [ ] 20.5 Document design decisions
    - Document why is_active is used instead of deletion
    - Document CASCADE vs RESTRICT choices
    - Document index selection rationale
    - _Requirements: 20.7_

- [ ] 21. Final checkpoint - Comprehensive verification
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 22. Create migration scripts
  - [ ] 22.1 Create forward migration script
    - Generate SQL script to apply all schema changes
    - Include transaction boundaries for atomicity
    - Add rollback points for each major section
    - Test on empty database
    - _Requirements: All_

  - [ ] 22.2 Write property test for migration idempotency
    - **Property 32: Running migration twice produces same result**
    - **Validates: Migration safety**

  - [ ] 22.3 Create backward migration script
    - Generate SQL script to revert all changes
    - Test rollback on migrated database
    - Verify data preservation during rollback
    - _Requirements: All_

  - [ ] 22.4 Write property test for migration reversibility
    - **Property 33: Forward then backward migration preserves data**
    - **Validates: Migration safety**

  - [ ] 22.5 Create data migration script
    - Generate script to populate new columns from existing data
    - Handle chain_id assignment for existing records
    - Set is_active = true for all existing records
    - _Requirements: 16.6, 3.6, 4.8_

  - [ ] 22.6 Write property test for data migration correctness
    - **Property 34: Data migration preserves all existing records**
    - **Validates: Data integrity during migration**

- [ ] 23. Performance testing and optimization
  - [ ] 23.1 Test query performance with indexes
    - Benchmark common queries (block by hash, transactions by sender, events by contract)
    - Verify indexes are used via EXPLAIN ANALYZE
    - Measure query times before and after indexing
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

  - [ ] 23.2 Write property test for index usage
    - **Property 35: Common queries use indexes**
    - **Validates: Requirements 18.1**

  - [ ] 23.3 Test foreign key constraint performance
    - Measure insertion performance with FK validation
    - Test bulk insert performance
    - Verify FK checks don't cause bottlenecks
    - _Requirements: 17.1, 17.4_

  - [ ] 23.4 Write property test for insertion performance
    - **Property 36: Bulk inserts complete within time bounds**
    - **Validates: Requirements 18.6**

- [ ] 24. Integration testing with indexer
  - [ ] 24.1 Test chain_config initialization
    - Verify chain_config table is populated on startup
    - Test RPC endpoint validation
    - Test multiple chain support
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ] 24.2 Write property test for chain configuration
    - **Property 37: Chain config validates RPC endpoints**
    - **Validates: Requirements 1.2**

  - [ ] 24.3 Test sync_state tracking
    - Verify sync_state updates with each block
    - Test resume from last synced block
    - Test sync status transitions
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 24.4 Write property test for sync state consistency
    - **Property 38: Sync state matches last indexed block**
    - **Validates: Requirements 2.4**

  - [ ] 24.5 Test historical data preservation during reorg
    - Simulate blockchain reorganization
    - Verify old blocks marked as inactive
    - Verify new blocks inserted with is_active = true
    - _Requirements: 16.1, 16.2, 16.7_

  - [ ] 24.6 Write property test for reorganization handling
    - **Property 39: Reorgs preserve historical data**
    - **Validates: Requirements 16.1, 16.2**

  - [ ] 24.7 Test raw RPC response storage
    - Enable debug mode
    - Verify RPC responses are stored
    - Test retention policy
    - _Requirements: 14.1, 14.2, 14.3, 14.6, 14.7_

  - [ ] 24.8 Write property test for RPC response storage
    - **Property 40: Debug mode stores all RPC responses**
    - **Validates: Requirements 14.7**

- [ ] 25. Final comprehensive verification
  - [ ] 25.1 Verify all foreign keys are enforced
    - Test inserting records with invalid foreign keys
    - Verify all FK constraints reject invalid data
    - _Requirements: 17.1, 17.4, 17.7_

  - [ ] 25.2 Write property test for complete FK coverage
    - **Property 41: All relationship columns have FK constraints**
    - **Validates: Requirements 17.1, 17.6**

  - [ ] 25.3 Verify all indexes are created
    - Query pg_indexes to list all indexes
    - Verify count matches design specification
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

  - [ ] 25.4 Write property test for index coverage
    - **Property 42: All specified indexes exist**
    - **Validates: Requirements 18.1**

  - [ ] 25.5 Verify all constraints are enforced
    - Test NOT NULL constraints
    - Test UNIQUE constraints
    - Test CHECK constraints
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.7_

  - [ ] 25.6 Write property test for constraint enforcement
    - **Property 43: All constraints reject invalid data**
    - **Validates: Requirements 19.1, 19.2, 19.3**

  - [ ] 25.7 Verify schema documentation is complete
    - Check all tables have COMMENT statements
    - Check key columns have COMMENT statements
    - Verify data dictionary is generated
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7_

  - [ ] 25.8 Write property test for documentation completeness
    - **Property 44: All tables and key columns have comments**
    - **Validates: Requirements 20.1, 20.2**

- [ ] 26. Final checkpoint - Production readiness verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All property tests are required for comprehensive validation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at major milestones
- Migration scripts must be tested on both empty and populated databases
- Performance testing should use realistic data volumes
- Integration testing should simulate real indexer workflows
- All foreign keys must be enforced before production deployment
- Historical data preservation is critical for audit compliance
