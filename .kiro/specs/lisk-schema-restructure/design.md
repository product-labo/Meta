# Design Document

## Overview

This design specifies a complete restructuring of the Lisk blockchain indexer database schema to achieve full fidelity with Lisk's modular architecture. The new schema replaces the current EVM-style design with a Lisk-native approach that properly captures modular account state, token locks, command-based transactions, and provides complete auditability through state snapshots and deltas.

The design follows these principles:
1. **Full Fidelity**: Capture all Lisk blockchain data without information loss
2. **Modular Architecture**: Support Lisk's module system (token, pos, governance, etc.)
3. **Complete Auditability**: Enable state replay and transaction auditing through deltas
4. **Referential Integrity**: Enforce all relationships with foreign keys and CASCADE behavior
5. **Zero Data Loss**: Store raw RPC responses for debugging and recovery
6. **Performance**: Optimize for common query patterns with appropriate indexes

## Architecture

### Database Schema Overview

```
┌─────────────────┐
│  chain_config   │ ← Chain-level configuration
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   sync_state    │ ← Synchronization progress
└─────────────────┘

┌─────────────────┐
│     blocks      │ ← Canonical block data
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  transactions   │ ← Command execution containers
└────────┬────────┘
         │
         ├→ ┌─────────────────┐
         │  │     events      │ ← Execution facts
         │  └─────────────────┘
         │
         ├→ ┌──────────────────────────┐
         │  │ account_state_deltas     │ ← Precise state changes
         │  └──────────────────────────┘
         │
         └→ ┌──────────────────────────┐
            │  transaction_accounts    │ ← Account relationships
            └──────────────────────────┘

┌─────────────────┐
│    accounts     │ ← Address registry
└────────┬────────┘
         │
         ├→ ┌──────────────────────────┐
         │  │ account_state_snapshots  │ ← Full state per module
         │  └──────────────────────────┘
         │
         ├→ ┌─────────────────┐
         │  │ token_balances  │ ← Fast balance queries
         │  └─────────────────┘
         │
         └→ ┌─────────────────┐
            │  token_locks    │ ← Lock management
            └─────────────────┘

┌──────────────────────────┐
│  raw_rpc_responses       │ ← Zero data loss
└──────────────────────────┘
```

### Data Flow

```
Lisk RPC Node
      ↓
  [Indexer]
      ↓
1. Fetch Block → Insert into blocks table
      ↓
2. Fetch Transactions → Insert into transactions table
      ↓
3. Fetch Events → Insert into events table
      ↓
4. Compute State Deltas → Insert into account_state_deltas table
      ↓
5. Update State Snapshots → Insert/Update account_state_snapshots table
      ↓
6. Update Token Balances → Insert/Update token_balances table
      ↓
7. Update Token Locks → Insert/Update/Delete token_locks table
      ↓
8. Update Sync State → Update sync_state table
```

## Components and Interfaces

### 1. Chain Configuration Table

**Purpose**: Store chain-level metadata and sync control parameters.

**Schema**:
```sql
CREATE TABLE chain_config (
    chain_id INTEGER PRIMARY KEY,
    chain_name VARCHAR(50) NOT NULL,
    rpc_url VARCHAR(255) NOT NULL,
    start_block BIGINT NOT NULL DEFAULT 0,
    finality_depth INTEGER NOT NULL DEFAULT 12,
    reorg_depth INTEGER NOT NULL DEFAULT 64,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
- Primary key on `chain_id`

**Relationships**:
- Referenced by `sync_state.chain_id`
- Referenced by `blocks.chain_id`

### 2. Synchronization State Table

**Purpose**: Track indexing progress per chain.

**Schema**:
```sql
CREATE TABLE sync_state (
    chain_id INTEGER PRIMARY KEY REFERENCES chain_config(chain_id) ON DELETE CASCADE,
    last_synced_height BIGINT NOT NULL DEFAULT 0,
    last_finalized_height BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
- Primary key on `chain_id`

**Relationships**:
- `chain_id` → `chain_config.chain_id` (CASCADE DELETE)

### 3. Blocks Table

**Purpose**: Store canonical block data with full fidelity.

**Schema**:
```sql
CREATE TABLE blocks (
    block_id VARCHAR(64) PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chain_config(chain_id) ON DELETE CASCADE,
    height BIGINT NOT NULL,
    timestamp BIGINT NOT NULL,
    previous_block_id VARCHAR(64) REFERENCES blocks(block_id) ON DELETE SET NULL,
    generator_address VARCHAR(41) NOT NULL,
    transaction_root VARCHAR(64) NOT NULL,
    state_root VARCHAR(64) NOT NULL,
    asset_root VARCHAR(64) NOT NULL,
    payload_length INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chain_id, height)
);
```

**Indexes**:
- Primary key on `block_id`
- Unique index on `(chain_id, height)`
- Index on `height`
- Index on `timestamp`
- Index on `generator_address`
- Index on `previous_block_id`

**Relationships**:
- `chain_id` → `chain_config.chain_id` (CASCADE DELETE)
- `previous_block_id` → `blocks.block_id` (SET NULL)
- Referenced by `transactions.block_id`

### 4. Transactions Table

**Purpose**: Store command execution containers with module/command information.

**Schema**:
```sql
CREATE TABLE transactions (
    tx_id VARCHAR(64) PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chain_config(chain_id) ON DELETE CASCADE,
    block_id VARCHAR(64) NOT NULL REFERENCES blocks(block_id) ON DELETE CASCADE,
    block_height BIGINT NOT NULL,
    module VARCHAR(50) NOT NULL,
    command VARCHAR(50) NOT NULL,
    function_key VARCHAR(101) NOT NULL, -- module.command
    sender_address VARCHAR(41) NOT NULL,
    nonce BIGINT NOT NULL,
    fee BIGINT NOT NULL,
    params JSONB NOT NULL,
    signatures JSONB NOT NULL,
    execution_status VARCHAR(20) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
- Primary key on `tx_id`
- Index on `chain_id`
- Index on `block_id`
- Index on `block_height`
- Index on `sender_address`
- Index on `module`
- Index on `command`
- Index on `function_key`
- Index on `execution_status`
- GIN index on `params`

**Relationships**:
- `chain_id` → `chain_config.chain_id` (CASCADE DELETE)
- `block_id` → `blocks.block_id` (CASCADE DELETE)
- Referenced by `events.tx_id`
- Referenced by `account_state_deltas.tx_id`
- Referenced by `transaction_accounts.tx_id`
- Referenced by `token_locks.related_tx_id`

### 5. Events Table

**Purpose**: Store execution facts emitted by modules.

**Schema**:
```sql
CREATE TABLE events (
    event_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chain_config(chain_id) ON DELETE CASCADE,
    tx_id VARCHAR(64) NOT NULL REFERENCES transactions(tx_id) ON DELETE CASCADE,
    block_height BIGINT NOT NULL,
    event_index INTEGER NOT NULL,
    module VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    data JSONB NOT NULL,
    topics JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tx_id, event_index)
);
```

**Indexes**:
- Primary key on `event_id`
- Unique index on `(tx_id, event_index)`
- Index on `chain_id`
- Index on `tx_id`
- Index on `block_height`
- Index on `module`
- Index on `name`
- GIN index on `data`
- GIN index on `topics`

**Relationships**:
- `chain_id` → `chain_config.chain_id` (CASCADE DELETE)
- `tx_id` → `transactions.tx_id` (CASCADE DELETE)

**Receiver Detection**:
Events are used to detect receiver addresses. When processing events:
- Extract receiver addresses from event data (e.g., token.transfer events contain recipient)
- Create account records for receivers
- Create transaction_accounts relationships with role='receiver'

### 6. Accounts Table

**Purpose**: Registry of all addresses that have interacted with the blockchain.

**Schema**:
```sql
CREATE TABLE accounts (
    address VARCHAR(41) PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chain_config(chain_id) ON DELETE CASCADE,
    first_seen_height BIGINT NOT NULL,
    last_seen_height BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(address, chain_id)
);
```

**Indexes**:
- Primary key on `address`
- Unique index on `(address, chain_id)`
- Index on `chain_id`
- Index on `first_seen_height`
- Index on `last_seen_height`

**Relationships**:
- `chain_id` → `chain_config.chain_id` (CASCADE DELETE)
- Referenced by `account_state_snapshots.address`
- Referenced by `account_state_deltas.address`
- Referenced by `token_balances.address`
- Referenced by `token_locks.address`
- Referenced by `transaction_accounts.address`

### 7. Account State Snapshots Table

**Purpose**: Capture complete account state per module at any block height.

**Schema**:
```sql
CREATE TABLE account_state_snapshots (
    snapshot_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chain_config(chain_id) ON DELETE CASCADE,
    address VARCHAR(41) NOT NULL REFERENCES accounts(address) ON DELETE CASCADE,
    block_height BIGINT NOT NULL,
    module VARCHAR(50) NOT NULL,
    state JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chain_id, address, block_height, module)
);
```

**Indexes**:
- Primary key on `snapshot_id`
- Unique index on `(chain_id, address, block_height, module)` - **Enforces snapshot uniqueness**
- Index on `chain_id`
- Index on `address`
- Index on `block_height`
- Index on `module`
- GIN index on `state`

**Relationships**:
- `chain_id` → `chain_config.chain_id` (CASCADE DELETE)
- `address` → `accounts.address` (CASCADE DELETE)

### 8. Account State Deltas Table

**Purpose**: Track precise state changes caused by each transaction.

**Schema**:
```sql
CREATE TABLE account_state_deltas (
    delta_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chain_config(chain_id) ON DELETE CASCADE,
    tx_id VARCHAR(64) NOT NULL REFERENCES transactions(tx_id) ON DELETE CASCADE,
    address VARCHAR(41) NOT NULL REFERENCES accounts(address) ON DELETE CASCADE,
    block_height BIGINT NOT NULL,
    module VARCHAR(50) NOT NULL,
    state_before JSONB NOT NULL,
    state_after JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
- Primary key on `delta_id`
- Index on `chain_id`
- Index on `tx_id`
- Index on `address`
- Index on `block_height`
- Index on `module`
- GIN index on `state_before`
- GIN index on `state_after`

**Relationships**:
- `chain_id` → `chain_config.chain_id` (CASCADE DELETE)
- `tx_id` → `transactions.tx_id` (CASCADE DELETE)
- `address` → `accounts.address` (CASCADE DELETE)

### 9. Token Balances Table

**Purpose**: Fast balance queries without complex JSONB operations.

**Schema**:
```sql
CREATE TABLE token_balances (
    address VARCHAR(41) NOT NULL REFERENCES accounts(address) ON DELETE CASCADE,
    chain_id INTEGER NOT NULL REFERENCES chain_config(chain_id) ON DELETE CASCADE,
    block_height BIGINT NOT NULL,
    available_balance BIGINT NOT NULL,
    locked_balance BIGINT NOT NULL,
    total_balance BIGINT NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (chain_id, address, block_height)
);
```

**Indexes**:
- Primary key on `(chain_id, address, block_height)`
- Index on `chain_id`
- Index on `address`
- Index on `block_height`
- Index on `total_balance`

**Relationships**:
- `chain_id` → `chain_config.chain_id` (CASCADE DELETE)
- `address` → `accounts.address` (CASCADE DELETE)

### 10. Token Locks Table

**Purpose**: Explicit tracking of all token locks (staking, governance, time-based).

**Schema**:
```sql
CREATE TABLE token_locks (
    lock_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chain_config(chain_id) ON DELETE CASCADE,
    address VARCHAR(41) NOT NULL REFERENCES accounts(address) ON DELETE CASCADE,
    module_source VARCHAR(50) NOT NULL,
    amount BIGINT NOT NULL,
    lock_type VARCHAR(50) NOT NULL,
    unlock_height BIGINT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    related_tx_id VARCHAR(64) REFERENCES transactions(tx_id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
- Primary key on `lock_id`
- Index on `chain_id`
- Index on `address`
- Index on `module_source`
- Index on `lock_type`
- Index on `unlock_height`
- Index on `is_active`
- Index on `related_tx_id`

**Relationships**:
- `chain_id` → `chain_config.chain_id` (CASCADE DELETE)
- `address` → `accounts.address` (CASCADE DELETE)
- `related_tx_id` → `transactions.tx_id` (SET NULL)

**is_active Field**:
- `true` - Lock is currently active and balance is locked
- `false` - Lock has been released or expired, kept for historical tracking

### 11. Transaction Accounts Table

**Purpose**: Resolve all accounts involved in a transaction with their roles.

**Schema**:
```sql
CREATE TABLE transaction_accounts (
    id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chain_config(chain_id) ON DELETE CASCADE,
    tx_id VARCHAR(64) NOT NULL REFERENCES transactions(tx_id) ON DELETE CASCADE,
    address VARCHAR(41) NOT NULL REFERENCES accounts(address) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tx_id, address, role)
);
```

**Indexes**:
- Primary key on `id`
- Unique index on `(tx_id, address, role)`
- Index on `chain_id`
- Index on `tx_id`
- Index on `address`
- Index on `role`

**Relationships**:
- `chain_id` → `chain_config.chain_id` (CASCADE DELETE)
- `tx_id` → `transactions.tx_id` (CASCADE DELETE)
- `address` → `accounts.address` (CASCADE DELETE)

**Receiver Detection from Events**:
When processing events, extract receiver addresses:
1. Parse event data for recipient/receiver fields
2. Create account record if not exists
3. Create transaction_accounts entry with role='receiver'
4. Common event patterns:
   - `token.transfer` → data.recipientAddress
   - `token.transferCrossChain` → data.recipientAddress
   - `pos.delegate` → data.delegateAddress

### 12. Raw RPC Responses Table

**Purpose**: Zero data loss debugging and recovery.

**Schema**:
```sql
CREATE TABLE raw_rpc_responses (
    id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chain_config(chain_id) ON DELETE CASCADE,
    rpc_method VARCHAR(100) NOT NULL,
    block_height BIGINT,
    response_json JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
- Primary key on `id`
- Index on `chain_id`
- Index on `rpc_method`
- Index on `block_height`
- Index on `created_at`

**Relationships**:
- `chain_id` → `chain_config.chain_id` (CASCADE DELETE)

## Data Models

### Block Model

```typescript
interface Block {
  block_id: string;           // Unique block identifier
  chain_id: number;           // Chain reference
  height: number;             // Sequential block number
  timestamp: number;          // Unix timestamp
  previous_block_id: string;  // Previous block reference
  generator_address: string;  // Block generator
  transaction_root: string;   // Merkle root of transactions
  state_root: string;         // Merkle root of state
  asset_root: string;         // Merkle root of assets
  payload_length: number;     // Block payload size
}
```

### Transaction Model

```typescript
interface Transaction {
  tx_id: string;              // Unique transaction identifier
  block_id: string;           // Block reference
  block_height: number;       // Block height
  module: string;             // Module name (e.g., "token")
  command: string;            // Command name (e.g., "transfer")
  function_key: string;       // "module.command"
  sender_address: string;     // Transaction sender
  nonce: number;              // Sender nonce
  fee: number;                // Transaction fee
  params: object;             // Command parameters
  signatures: object[];       // Transaction signatures
  execution_status: string;   // "success" | "failed"
  error_message?: string;     // Error if failed
}
```

### Event Model

```typescript
interface Event {
  event_id: number;           // Auto-increment ID
  tx_id: string;              // Transaction reference
  block_height: number;       // Block height
  event_index: number;        // Event order in transaction
  module: string;             // Module that emitted event
  name: string;               // Event name
  data: object;               // Event data
  topics: string[];           // Event topics for filtering
}
```

### Account State Snapshot Model

```typescript
interface AccountStateSnapshot {
  snapshot_id: number;        // Auto-increment ID
  address: string;            // Account address
  block_height: number;       // Block height
  module: string;             // Module name
  state: object;              // Module-specific state
}

// Example: Token module state
interface TokenModuleState {
  availableBalance: string;
  lockedBalances: Array<{
    module: string;
    amount: string;
  }>;
}

// Example: PoS module state
interface PosModuleState {
  validator: {
    name: string;
    commission: number;
  };
  stakes: Array<{
    delegator: string;
    amount: string;
  }>;
}
```

### Account State Delta Model

```typescript
interface AccountStateDelta {
  delta_id: number;           // Auto-increment ID
  tx_id: string;              // Transaction that caused change
  address: string;            // Account address
  block_height: number;       // Block height
  module: string;             // Module name
  state_before: object;       // State before transaction
  state_after: object;        // State after transaction
}
```

### Token Balance Model

```typescript
interface TokenBalance {
  address: string;            // Account address
  block_height: number;       // Block height
  available_balance: number;  // Unlocked balance
  locked_balance: number;     // Total locked balance
  total_balance: number;      // available + locked
}
```

### Token Lock Model

```typescript
interface TokenLock {
  lock_id: number;            // Auto-increment ID
  address: string;            // Account address
  module_source: string;      // Module that created lock
  amount: number;             // Locked amount
  lock_type: string;          // "pos_stake" | "governance_vote" | "time_based"
  unlock_height?: number;     // When lock expires (null = indefinite)
  related_tx_id?: string;     // Transaction that created lock
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Chain Configuration Completeness
*For any* chain configuration, when inserted into the database, all required fields (chain_id, chain_name, rpc_url, start_block, finality_depth, reorg_depth) should be present and non-null.
**Validates: Requirements 1.2**

### Property 2: Chain ID Uniqueness
*For any* two chain configurations, attempting to insert both with the same chain_id should result in the second insert being rejected.
**Validates: Requirements 1.3**

### Property 3: Multi-Chain Support
*For any* set of chains, each chain should have independent sync state, blocks, and transactions that can be queried separately by chain_id.
**Validates: Requirements 1.4**

### Property 4: Sync State One-to-One Relationship
*For any* chain, there should be exactly one sync_state record, and creating a second sync_state for the same chain should be rejected.
**Validates: Requirements 2.1**

### Property 5: Sync Height Update on Block Index
*For any* block that is successfully indexed, the sync_state.last_synced_height should be updated to match the block's height.
**Validates: Requirements 2.2**

### Property 6: Finality Height Update
*For any* block that reaches finality, the sync_state.last_finalized_height should be updated to match the block's height.
**Validates: Requirements 2.3**

### Property 7: Sync State Cascade Delete
*For any* chain, deleting the chain_config record should automatically delete the associated sync_state record.
**Validates: Requirements 2.4**

### Property 8: Block Field Completeness
*For any* block, when inserted into the database, all required fields (height, timestamp, previous_block_id, generator_address, transaction_root, state_root, asset_root, payload_length) should be present.
**Validates: Requirements 3.2**

### Property 9: Block Height Uniqueness Per Chain
*For any* chain, attempting to insert two blocks with the same height should result in the second insert being rejected.
**Validates: Requirements 3.3**

### Property 10: Block Chain Structure Integrity
*For any* sequence of blocks, each block's previous_block_id should reference a valid block_id, maintaining the blockchain structure.
**Validates: Requirements 3.4**

### Property 11: Block Reorganization Support
*For any* block reorganization, the indexer should be able to update or remove blocks, and the resulting chain should maintain referential integrity.
**Validates: Requirements 3.5**

### Property 12: Transaction Field Completeness
*For any* transaction, when inserted into the database, all required fields (block_height, block_id, module, command, function_key, sender_address, nonce, fee, params, signatures, execution_status) should be present.
**Validates: Requirements 4.2**

### Property 13: Function Key Computation
*For any* transaction, the function_key should equal module + "." + command.
**Validates: Requirements 4.3**

### Property 14: Transaction Params Round-Trip
*For any* transaction params object, storing it as JSONB and retrieving it should produce an equivalent object.
**Validates: Requirements 4.4**

### Property 15: Transaction Signatures Round-Trip
*For any* transaction signatures array, storing it as JSONB and retrieving it should produce an equivalent array.
**Validates: Requirements 4.5**

### Property 16: Transaction Cascade Delete
*For any* block, deleting the block should automatically delete all associated transactions.
**Validates: Requirements 4.6**

### Property 17: Failed Transaction Error Recording
*For any* transaction with execution_status = 'failed', the error_message field should be non-null and contain error information.
**Validates: Requirements 4.7**

### Property 18: Event Field Completeness
*For any* event, when inserted into the database, all required fields (tx_id, block_height, event_index, module, name, data, topics) should be present.
**Validates: Requirements 5.2**

### Property 19: Event Data Round-Trip
*For any* event data object, storing it as JSONB and retrieving it should produce an equivalent object.
**Validates: Requirements 5.3**

### Property 20: Event Topics Round-Trip
*For any* event topics array, storing it as JSONB and retrieving it should produce an equivalent array.
**Validates: Requirements 5.4**

### Property 21: Event Cascade Delete
*For any* transaction, deleting the transaction should automatically delete all associated events.
**Validates: Requirements 5.5**

### Property 22: Event Ordering
*For any* transaction with multiple events, the events should be retrievable in the same order they were emitted (by event_index).
**Validates: Requirements 5.6**

### Property 23: Account First Seen Height
*For any* account, when first created, the first_seen_height should be set to the block height where the account first appeared.
**Validates: Requirements 6.2**

### Property 24: Account Last Seen Height Update
*For any* account that interacts with the blockchain, the last_seen_height should be updated to the most recent interaction block height.
**Validates: Requirements 6.3**

### Property 25: Account Role Coverage
*For any* transaction, accounts should be created for all roles (sender, receiver, validator, delegate) involved in the transaction.
**Validates: Requirements 6.4**

### Property 26: State Snapshot Field Completeness
*For any* account state snapshot, all required fields (address, block_height, module, state) should be present.
**Validates: Requirements 7.2**

### Property 27: State Snapshot Round-Trip
*For any* account state object, storing it as JSONB and retrieving it should produce an equivalent object.
**Validates: Requirements 7.3**

### Property 28: Multiple Module States Per Account
*For any* account, the account should be able to have independent state snapshots for multiple modules (token, pos, governance).
**Validates: Requirements 7.4**

### Property 29: State Snapshot Cascade Delete
*For any* account, deleting the account should automatically delete all associated state snapshots.
**Validates: Requirements 7.5**

### Property 30: Module State Independence
*For any* account with multiple module states, updating one module's state should not affect other modules' states.
**Validates: Requirements 7.6**

### Property 31: State Delta Field Completeness
*For any* state delta, all required fields (tx_id, address, block_height, module, state_before, state_after) should be present.
**Validates: Requirements 8.2**

### Property 32: State Delta Round-Trip
*For any* state_before and state_after objects, storing them as JSONB and retrieving them should produce equivalent objects.
**Validates: Requirements 8.3**

### Property 33: State Delta Transaction Cascade Delete
*For any* transaction, deleting the transaction should automatically delete all associated state deltas.
**Validates: Requirements 8.4**

### Property 34: State Delta Account Cascade Delete
*For any* account, deleting the account should automatically delete all associated state deltas.
**Validates: Requirements 8.5**

### Property 35: State Delta Completeness
*For any* state delta, both state_before and state_after should be non-null and contain state data.
**Validates: Requirements 8.6**

### Property 36: Token Balance Field Completeness
*For any* token balance record, all required fields (address, block_height, available_balance, locked_balance, total_balance) should be present.
**Validates: Requirements 9.2**

### Property 37: Token Balance Sum Invariant
*For any* token balance record, total_balance should equal available_balance + locked_balance.
**Validates: Requirements 9.3**

### Property 38: Token Balance Cascade Delete
*For any* account, deleting the account should automatically delete all associated token balance records.
**Validates: Requirements 9.4**

### Property 39: Token Balance Sync with State
*For any* token module state change, a corresponding token_balances record should be created or updated.
**Validates: Requirements 9.5**

### Property 40: Token Lock Field Completeness
*For any* token lock, all required fields (address, module_source, amount, lock_type) should be present.
**Validates: Requirements 10.2**

### Property 41: Token Lock Type Validity
*For any* token lock, the lock_type should be one of the valid values (pos_stake, governance_vote, time_based).
**Validates: Requirements 10.3**

### Property 42: Token Lock Unlock Height
*For any* token lock, if unlock_height is set, it should be greater than the current block height; if NULL, the lock is indefinite.
**Validates: Requirements 10.4**

### Property 43: Token Lock Cascade Delete
*For any* account, deleting the account should automatically delete all associated token locks.
**Validates: Requirements 10.5**

### Property 44: Token Lock Transaction Set NULL
*For any* token lock with a related_tx_id, deleting the transaction should set related_tx_id to NULL without deleting the lock.
**Validates: Requirements 10.6**

### Property 45: Token Lock Removal
*For any* token lock that is released, the lock record should be removed from the database.
**Validates: Requirements 10.7**

### Property 46: Transaction Account Relationship Field Completeness
*For any* transaction-account relationship, all required fields (tx_id, address, role) should be present.
**Validates: Requirements 11.2**

### Property 47: Transaction Account Role Validity
*For any* transaction-account relationship, the role should be one of the valid values (sender, receiver, validator, delegate).
**Validates: Requirements 11.3**

### Property 48: Transaction Account Transaction Cascade Delete
*For any* transaction, deleting the transaction should automatically delete all associated transaction-account relationships.
**Validates: Requirements 11.4**

### Property 49: Transaction Account Account Cascade Delete
*For any* account, deleting the account should automatically delete all associated transaction-account relationships.
**Validates: Requirements 11.5**

### Property 50: Transaction Sender Requirement
*For any* transaction, there should be at least one transaction-account relationship with role = 'sender'.
**Validates: Requirements 11.6**

### Property 51: Raw RPC Response Field Completeness
*For any* raw RPC response, all required fields (rpc_method, response_json) should be present.
**Validates: Requirements 12.2**

### Property 52: Raw RPC Response Round-Trip
*For any* RPC response JSON, storing it as JSONB and retrieving it should produce an equivalent object.
**Validates: Requirements 12.3**

### Property 53: Critical RPC Method Storage
*For any* RPC call to critical methods (getBlockByHeight, getTransactions, getEvents), the response should be stored in raw_rpc_responses.
**Validates: Requirements 12.4**

### Property 54: Block Cascade Delete Completeness
*For any* block, deleting the block should cascade delete all transactions, events, state deltas, and related data.
**Validates: Requirements 13.2**

### Property 55: Account Cascade Delete Completeness
*For any* account, deleting the account should cascade delete all state snapshots, deltas, balances, locks, and transaction relationships.
**Validates: Requirements 13.3**

### Property 56: Transaction Cascade Delete Completeness
*For any* transaction, deleting the transaction should cascade delete all events, state deltas, and account relationships.
**Validates: Requirements 13.4**

### Property 57: Optional Relationship Set NULL
*For any* optional relationship (e.g., token_locks.related_tx_id), deleting the referenced record should set the foreign key to NULL.
**Validates: Requirements 13.5**

### Property 58: Block Indexing Atomicity
*For any* block being indexed, either all related data (transactions, events, deltas, snapshots, locks) should be successfully inserted, or none should be inserted.
**Validates: Requirements 14.2**

### Property 59: Indexing Failure Rollback
*For any* block indexing that fails, all changes for that block should be rolled back, leaving the database in its previous state.
**Validates: Requirements 14.4**

### Property 60: Idempotent Block Re-indexing
*For any* block, indexing it multiple times should produce the same final database state as indexing it once.
**Validates: Requirements 14.5**

## Error Handling

### Database Constraint Violations

**Foreign Key Violations**:
- When inserting a record with an invalid foreign key, the database will reject the insert with a constraint violation error
- The indexer should catch these errors and log them for debugging
- The indexer should not proceed with indexing until the referenced record exists

**Unique Constraint Violations**:
- When inserting a duplicate record (e.g., same chain_id, same block height), the database will reject the insert
- The indexer should handle this gracefully by either updating the existing record or skipping the insert
- For idempotent re-indexing, the indexer should use UPSERT operations

**Check Constraint Violations**:
- When inserting invalid data (e.g., negative balance), the database will reject the insert
- The indexer should validate data before insertion to prevent these errors

### RPC Failures

**Network Errors**:
- When the RPC node is unreachable, the indexer should retry with exponential backoff
- After max retries, the indexer should log the error and pause indexing

**Invalid RPC Responses**:
- When the RPC returns invalid data, the indexer should log the raw response to raw_rpc_responses
- The indexer should skip the invalid block and continue with the next block
- The indexer should alert operators about data quality issues

### Blockchain Reorganizations

**Reorg Detection**:
- When a block's previous_block_id doesn't match the expected parent, a reorg has occurred
- The indexer should roll back blocks beyond the reorg depth
- The indexer should re-index blocks from the common ancestor

**Reorg Handling**:
- Delete blocks and all related data beyond the reorg point
- Re-fetch blocks from the RPC node
- Re-index blocks in the correct order

### State Computation Errors

**Missing State**:
- When computing state deltas, if the previous state is missing, log an error
- The indexer should attempt to reconstruct state from earlier snapshots
- If reconstruction fails, mark the block as requiring manual review

**State Inconsistency**:
- When state_after doesn't match the expected state, log a warning
- Store both the computed state and the actual state for debugging
- Alert operators about potential indexing bugs

## Testing Strategy

### Unit Testing

Unit tests will verify specific examples and edge cases:

1. **Schema Validation Tests**:
   - Test that all tables are created with correct columns and types
   - Test that all foreign keys are defined correctly
   - Test that all indexes are created
   - Test that all constraints (unique, check) are enforced

2. **Cascade Delete Tests**:
   - Test that deleting a chain deletes sync_state
   - Test that deleting a block deletes all transactions
   - Test that deleting a transaction deletes all events
   - Test that deleting an account deletes all related data

3. **Constraint Tests**:
   - Test that duplicate chain_ids are rejected
   - Test that duplicate block heights per chain are rejected
   - Test that invalid foreign keys are rejected
   - Test that token balance sum invariant is enforced

4. **Edge Case Tests**:
   - Test empty params/signatures/data JSONB fields
   - Test NULL unlock_height for indefinite locks
   - Test SET NULL behavior for optional relationships
   - Test block reorganization scenarios

### Property-Based Testing

Property tests will verify universal properties across all inputs:

1. **Data Completeness Properties** (Properties 1, 8, 12, 18, 26, 31, 36, 40, 46, 51):
   - Generate random records and verify all required fields are present
   - Use generators that create valid blockchain data structures

2. **Round-Trip Properties** (Properties 14, 15, 19, 20, 27, 32, 52):
   - Generate random JSONB data and verify round-trip equality
   - Test with various data types (objects, arrays, nested structures)

3. **Invariant Properties** (Properties 13, 37):
   - Generate random data and verify invariants always hold
   - Test function_key computation
   - Test balance sum invariant

4. **Referential Integrity Properties** (Properties 7, 16, 21, 29, 33, 34, 38, 43, 44, 48, 49, 54, 55, 56, 57):
   - Generate random data with relationships
   - Test cascade deletes and SET NULL behavior
   - Verify no orphaned records remain

5. **Uniqueness Properties** (Properties 2, 9):
   - Generate duplicate data and verify rejection
   - Test unique constraints across multiple fields

6. **Ordering Properties** (Property 22):
   - Generate random event sequences
   - Verify events maintain order by event_index

7. **Atomicity Properties** (Properties 58, 59, 60):
   - Simulate indexing failures
   - Verify rollback behavior
   - Test idempotent re-indexing

### Property Test Configuration

- Each property test should run a minimum of 100 iterations
- Use fast-check (JavaScript/TypeScript) or Hypothesis (Python) for property-based testing
- Each test should be tagged with: **Feature: lisk-schema-restructure, Property {number}: {property_text}**

### Integration Testing

Integration tests will verify the complete indexing pipeline:

1. **End-to-End Indexing**:
   - Index a sequence of real Lisk blocks
   - Verify all data is stored correctly
   - Verify state snapshots and deltas are accurate

2. **Reorg Handling**:
   - Simulate a blockchain reorganization
   - Verify blocks are rolled back correctly
   - Verify re-indexing produces correct state

3. **Multi-Chain Support**:
   - Index multiple chains simultaneously
   - Verify data isolation between chains
   - Verify independent sync state per chain

4. **Performance Testing**:
   - Index large numbers of blocks
   - Measure query performance
   - Verify indexes are used effectively

### Test Data Generation

For property-based tests, we need generators for:

- **Chain Config**: Random chain_id, chain_name, rpc_url, etc.
- **Blocks**: Random block_id, height, timestamp, etc.
- **Transactions**: Random tx_id, module, command, params, etc.
- **Events**: Random event data and topics
- **Account State**: Random module-specific state structures
- **Token Locks**: Random lock amounts, types, unlock heights

Generators should produce valid Lisk data structures that match the actual blockchain format.

## Migration Strategy

### Phase 1: Schema Creation

1. Create new tables in a separate schema (e.g., `lisk_v2`)
2. Run all schema creation scripts
3. Verify all tables, indexes, and constraints are created
4. Run unit tests to verify schema correctness

### Phase 2: Data Migration

1. Write migration scripts to transform old data to new schema
2. Migrate chain_config and sync_state
3. Migrate blocks and transactions
4. Compute and populate state snapshots and deltas
5. Populate token_balances and token_locks
6. Populate transaction_accounts relationships
7. Verify data integrity after migration

### Phase 3: Indexer Update

1. Update indexer code to use new schema
2. Test indexer with new schema on testnet
3. Verify all data is indexed correctly
4. Run property tests against indexed data

### Phase 4: Cutover

1. Stop old indexer
2. Switch to new schema
3. Start new indexer
4. Monitor for errors
5. Verify sync state is correct

### Phase 5: Cleanup

1. Archive old schema
2. Drop old tables after verification period
3. Update documentation
4. Train operators on new schema

## Performance Considerations

### Index Strategy

**Primary Indexes** (automatically created):
- All primary keys
- All unique constraints

**Foreign Key Indexes**:
- All foreign key columns for efficient joins

**Query Optimization Indexes**:
- `blocks(height)` - for block range queries
- `blocks(timestamp)` - for time-based queries
- `transactions(sender_address)` - for wallet queries
- `transactions(module, command)` - for transaction type queries
- `events(module, name)` - for event filtering
- `account_state_snapshots(address, block_height)` - for state queries
- `token_balances(address)` - for balance queries
- `token_locks(address, unlock_height)` - for lock queries

**JSONB Indexes**:
- GIN indexes on all JSONB columns for efficient querying
- Specific path indexes for frequently queried JSONB fields

### Query Patterns

**Common Queries**:
1. Get latest block: `SELECT * FROM blocks ORDER BY height DESC LIMIT 1`
2. Get transactions by address: `SELECT * FROM transactions WHERE sender_address = $1`
3. Get account balance: `SELECT * FROM token_balances WHERE address = $1 ORDER BY block_height DESC LIMIT 1`
4. Get account locks: `SELECT * FROM token_locks WHERE address = $1 AND (unlock_height IS NULL OR unlock_height > $2)`
5. Get transaction events: `SELECT * FROM events WHERE tx_id = $1 ORDER BY event_index`

**Optimization Techniques**:
- Use prepared statements for repeated queries
- Use connection pooling
- Use read replicas for analytics queries
- Partition large tables by block_height for historical data

### Storage Considerations

**JSONB Storage**:
- JSONB columns are compressed automatically by PostgreSQL
- Use JSONB for flexible schema evolution
- Consider extracting frequently queried fields to dedicated columns

**Table Partitioning**:
- Consider partitioning blocks, transactions, and events by block_height
- Use range partitioning for time-based queries
- Partition by chain_id for multi-chain support

**Archival Strategy**:
- Archive old blocks beyond finality to separate tables
- Keep recent blocks in hot storage
- Use cold storage for historical data

## Security Considerations

### SQL Injection Prevention

- Use parameterized queries for all database operations
- Never concatenate user input into SQL strings
- Use ORM or query builder with parameter binding

### Access Control

- Use separate database users for indexer and API
- Grant minimum required permissions
- Use read-only users for analytics queries
- Audit database access logs

### Data Integrity

- Use database transactions for all multi-step operations
- Implement checksums for critical data
- Verify state roots against blockchain
- Monitor for data corruption

### Backup and Recovery

- Implement automated daily backups
- Test backup restoration regularly
- Store backups in multiple locations
- Implement point-in-time recovery

## Monitoring and Observability

### Metrics to Track

1. **Indexing Progress**:
   - Current synced height
   - Blocks per second
   - Lag behind chain tip
   - Reorg frequency

2. **Database Performance**:
   - Query latency
   - Connection pool usage
   - Table sizes
   - Index usage

3. **Data Quality**:
   - Failed transactions count
   - Missing state count
   - Constraint violations
   - RPC errors

4. **System Health**:
   - CPU usage
   - Memory usage
   - Disk I/O
   - Network bandwidth

### Alerting

- Alert when sync lag exceeds threshold
- Alert on database errors
- Alert on RPC failures
- Alert on data inconsistencies

### Logging

- Log all indexing operations
- Log all database errors
- Log all RPC calls to raw_rpc_responses
- Use structured logging for easy parsing

## Documentation

### Schema Documentation

- Document all tables, columns, and relationships
- Provide examples of common queries
- Document JSONB structure for each module
- Maintain ER diagrams

### API Documentation

- Document all query endpoints
- Provide example requests and responses
- Document rate limits and pagination
- Maintain OpenAPI/Swagger specs

### Operator Documentation

- Document deployment procedures
- Document backup and recovery procedures
- Document troubleshooting guides
- Document monitoring and alerting setup
