# Starknet Schema Structure Verification Report

## Executive Summary

**Verification Date**: January 14, 2026  
**Schema Files Analyzed**: 4 migration files + 1 documentation file  
**Overall Status**: ⚠️ **PARTIAL IMPLEMENTATION** - Core tables exist but missing critical analytics tables

---

## 1. Core Blockchain Tables (✅ IMPLEMENTED)

### 1.1 Starknet Blocks
**Status**: ✅ Fully Implemented  
**Location**: `backend/migrations/create-starknet-tables.sql`

```sql
CREATE TABLE starknet_blocks (
    block_number bigint PRIMARY KEY,
    block_hash varchar(66) UNIQUE,
    parent_block_hash varchar(66),
    timestamp bigint,
    finality_status varchar(20) DEFAULT 'PENDING',
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
)
```

**Foreign Keys**: None (root table)  
**Indexes**: 3 (hash, timestamp, finality_status)

### 1.2 Starknet Transactions
**Status**: ✅ Fully Implemented  
**Location**: `backend/migrations/create-starknet-tables.sql`

```sql
CREATE TABLE starknet_transactions (
    tx_hash varchar(66) PRIMARY KEY,
    block_number bigint REFERENCES starknet_blocks(block_number),
    tx_type varchar(20),
    sender_address varchar(66),
    entry_point_selector varchar(66),
    status varchar(20) DEFAULT 'PENDING',
    actual_fee bigint,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
)
```

**Foreign Keys**: 1 (block_number → starknet_blocks)  
**Indexes**: 3 (block_number, sender_address, tx_type)

### 1.3 Starknet Contracts
**Status**: ✅ Fully Implemented  
**Location**: `backend/migrations/create-starknet-tables.sql`

```sql
CREATE TABLE starknet_contracts (
    contract_address varchar(66) PRIMARY KEY,
    class_hash varchar(66),
    deployer_address varchar(66),
    deployment_tx_hash varchar(66) REFERENCES starknet_transactions(tx_hash),
    deployment_block bigint REFERENCES starknet_blocks(block_number),
    is_proxy boolean DEFAULT false,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
)
```

**Foreign Keys**: 2 (deployment_block, deployment_tx_hash)  
**Indexes**: 0 (missing - should have class_hash, deployer_address)

### 1.4 Starknet Events
**Status**: ✅ Fully Implemented  
**Location**: `backend/migrations/create-starknet-tables.sql`

```sql
CREATE TABLE starknet_events (
    event_id bigserial PRIMARY KEY,
    tx_hash varchar(66) REFERENCES starknet_transactions(tx_hash),
    contract_address varchar(66),
    block_number bigint REFERENCES starknet_blocks(block_number),
    event_index integer,
    keys text[],
    data text[],
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
)
```

**Foreign Keys**: 2 (tx_hash, block_number)  
**Indexes**: 3 (contract_address, block_number, tx_hash)

### 1.5 Starknet Wallets
**Status**: ✅ Fully Implemented  
**Location**: `backend/migrations/create-starknet-tables.sql`

```sql
CREATE TABLE starknet_wallets (
    address varchar(66) PRIMARY KEY,
    first_seen_block bigint REFERENCES starknet_blocks(block_number),
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
)
```

**Foreign Keys**: 1 (first_seen_block)  
**Indexes**: 0

### 1.6 Starknet Wallet Interactions
**Status**: ✅ Fully Implemented  
**Location**: `backend/migrations/create-starknet-tables.sql`

```sql
CREATE TABLE starknet_wallet_interactions (
    interaction_id bigserial PRIMARY KEY,
    wallet_address varchar(66) REFERENCES starknet_wallets(address),
    contract_address varchar(66) REFERENCES starknet_contracts(contract_address),
    tx_hash varchar(66) REFERENCES starknet_transactions(tx_hash),
    block_number bigint REFERENCES starknet_blocks(block_number),
    interaction_type varchar(20),
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
)
```

**Foreign Keys**: 4 (wallet_address, contract_address, tx_hash, block_number)  
**Indexes**: 2 (wallet_address, contract_address)

---

## 2. Extended Analytics Tables (✅ IMPLEMENTED)

### 2.1 Starknet Function Signatures
**Status**: ✅ Implemented  
**Location**: `backend/migrations/phase1-fixed-tables.sql`

```sql
CREATE TABLE starknet_function_signatures (
    signature_id bigserial PRIMARY KEY,
    chain_id integer DEFAULT 2,
    contract_address varchar(66),
    function_selector varchar(10),
    function_name varchar(100),
    function_signature text,
    input_types text[],
    output_types text[],
    is_payable boolean DEFAULT false,
    is_view boolean DEFAULT false,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
)
```

**Foreign Keys**: 0 (chain_id not enforced)  
**Indexes**: 2 (function_selector, contract_address)

### 2.2 Starknet Tokens
**Status**: ✅ Implemented  
**Location**: `backend/migrations/phase1-fixed-tables.sql`

```sql
CREATE TABLE starknet_tokens (
    token_id bigserial PRIMARY KEY,
    chain_id integer DEFAULT 2,
    token_address varchar(66) UNIQUE,
    name varchar(100),
    symbol varchar(20),
    decimals integer DEFAULT 18,
    total_supply numeric(78,0),
    token_type varchar(20) DEFAULT 'ERC20',
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
)
```

**Foreign Keys**: 0 (chain_id not enforced)  
**Indexes**: 2 (token_address, symbol)

### 2.3 Starknet Token Transfers
**Status**: ✅ Implemented  
**Location**: `backend/migrations/phase1-fixed-tables.sql`

```sql
CREATE TABLE starknet_token_transfers (
    transfer_id bigserial PRIMARY KEY,
    chain_id integer DEFAULT 2,
    tx_hash varchar(66) REFERENCES starknet_transactions(tx_hash),
    block_number bigint,
    log_index integer,
    token_address varchar(66),
    from_address varchar(66),
    to_address varchar(66),
    amount numeric(78,0),
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
)
```

**Foreign Keys**: 1 (tx_hash only - missing block_number FK)  
**Indexes**: 4 (tx_hash, token_address, from_address, to_address)

### 2.4 Starknet Daily Metrics
**Status**: ✅ Implemented  
**Location**: `backend/migrations/phase1-missing-tables.sql`

```sql
CREATE TABLE starknet_daily_metrics (
    metric_id bigserial PRIMARY KEY,
    chain_id integer REFERENCES chains(chain_id),
    date date,
    total_transactions bigint DEFAULT 0,
    successful_transactions bigint DEFAULT 0,
    failed_transactions bigint DEFAULT 0,
    unique_addresses bigint DEFAULT 0,
    total_gas_used bigint DEFAULT 0,
    new_contracts bigint DEFAULT 0,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chain_id, date)
)
```

**Foreign Keys**: 1 (chain_id → chains)  
**Indexes**: 0 (missing date index)

---

## 3. Missing Tables (❌ NOT IMPLEMENTED)

### 3.1 contract_classes
**Status**: ❌ Missing  
**Expected Location**: Should be in core tables  
**Purpose**: Store contract class definitions and ABI data

```sql
-- EXPECTED BUT MISSING
CREATE TABLE starknet_contract_classes (
    class_hash varchar(66) PRIMARY KEY,
    abi_json jsonb,
    declared_tx_hash varchar(66),
    declared_block bigint,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
)
```

### 3.2 execution_calls
**Status**: ❌ Missing  
**Expected Location**: Should be in core tables  
**Purpose**: Track function calls during transaction execution

```sql
-- EXPECTED BUT MISSING
CREATE TABLE starknet_execution_calls (
    call_id bigserial PRIMARY KEY,
    tx_hash varchar(66),
    contract_address varchar(66),
    entry_point_selector varchar(66),
    call_status varchar(20),
    call_index integer,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
)
```

### 3.3 raw_rpc_responses
**Status**: ❌ Missing  
**Expected Location**: Should be in core tables  
**Purpose**: Store raw RPC responses for debugging

```sql
-- EXPECTED BUT MISSING
CREATE TABLE starknet_raw_rpc_responses (
    response_id bigserial PRIMARY KEY,
    rpc_method varchar(100),
    block_number bigint,
    response_json jsonb,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
)
```

### 3.4 sync_state
**Status**: ❌ Missing  
**Expected Location**: Should be in core tables  
**Purpose**: Track indexer synchronization state

```sql
-- EXPECTED BUT MISSING
CREATE TABLE starknet_sync_state (
    id serial PRIMARY KEY,
    chain_id integer,
    last_synced_block bigint,
    last_finalized_block bigint,
    sync_status varchar(20),
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP
)
```

### 3.5 chain_config
**Status**: ❌ Missing  
**Expected Location**: Should be in core tables  
**Purpose**: Store Starknet chain configuration

```sql
-- EXPECTED BUT MISSING
CREATE TABLE starknet_chain_config (
    chain_id integer PRIMARY KEY,
    chain_name varchar(50),
    rpc_endpoint varchar(255),
    explorer_url varchar(255),
    finality_depth integer,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
)
```

---

## 4. Relational Integrity Analysis

### 4.1 Foreign Key Coverage

**Core Tables (6 tables)**:
- starknet_blocks: 0/0 FKs (root table) ✅
- starknet_transactions: 1/1 FKs ✅
- starknet_contracts: 2/2 FKs ✅
- starknet_events: 2/2 FKs ✅
- starknet_wallets: 1/1 FKs ✅
- starknet_wallet_interactions: 4/4 FKs ✅

**Extended Tables (4 tables)**:
- starknet_function_signatures: 0/1 FKs (chain_id not enforced) ⚠️
- starknet_tokens: 0/1 FKs (chain_id not enforced) ⚠️
- starknet_token_transfers: 1/2 FKs (missing block_number FK) ⚠️
- starknet_daily_metrics: 1/1 FKs ✅

**Overall FK Score**: 11/14 = **78.6%** (6/10 relational score)

### 4.2 Missing Foreign Keys

1. **starknet_function_signatures.chain_id** → Should reference chains(chain_id)
2. **starknet_tokens.chain_id** → Should reference chains(chain_id)
3. **starknet_token_transfers.block_number** → Should reference starknet_blocks(block_number)

### 4.3 Missing Indexes

1. **starknet_contracts**: Should have indexes on class_hash, deployer_address
2. **starknet_wallets**: Should have index on first_seen_block
3. **starknet_daily_metrics**: Should have index on date
4. **starknet_events**: Should have index on event_index

---

## 5. Comparison with Lisk Schema

| Aspect | Starknet | Lisk (Current) | Lisk (Proposed) |
|--------|----------|----------------|-----------------|
| Core Tables | 6 | 8 | 12 |
| Foreign Keys | 11/14 (78.6%) | Similar | 100% |
| Missing Tables | 5 critical | N/A | 0 |
| chain_id Support | Partial | No | Yes (everywhere) |
| Historical Tracking | No | No | Yes (is_active) |
| Modular State | No | No | Yes (snapshots/deltas) |
| Raw RPC Storage | No | Yes | Yes |
| Relational Score | 6/10 | 10/10 | 10/10 |

---

## 6. Critical Issues Identified

### 6.1 HIGH PRIORITY

1. **Missing chain_id enforcement**: Extended tables have chain_id but no foreign key constraint
2. **Missing contract_classes table**: Cannot store ABI data or class definitions
3. **Missing sync_state table**: No way to track indexer progress
4. **Missing raw_rpc_responses**: No debugging capability for RPC issues

### 6.2 MEDIUM PRIORITY

5. **Missing execution_calls table**: Cannot track internal function calls
6. **Missing chain_config table**: No centralized chain configuration
7. **Incomplete indexes**: Missing performance indexes on several tables
8. **No historical tracking**: Cannot mark records as inactive (must delete)

### 6.3 LOW PRIORITY

9. **No snapshot/delta tables**: Cannot audit state changes over time
10. **No modular state support**: Starknet doesn't have Lisk's module system, but could benefit from similar patterns

---

## 7. Recommendations

### 7.1 Immediate Actions (Required)

1. **Add missing core tables**:
   - starknet_contract_classes
   - starknet_sync_state
   - starknet_chain_config
   - starknet_raw_rpc_responses
   - starknet_execution_calls

2. **Enforce chain_id foreign keys**:
   ```sql
   ALTER TABLE starknet_function_signatures 
   ADD CONSTRAINT fk_chain_id FOREIGN KEY (chain_id) REFERENCES chains(chain_id);
   
   ALTER TABLE starknet_tokens 
   ADD CONSTRAINT fk_chain_id FOREIGN KEY (chain_id) REFERENCES chains(chain_id);
   ```

3. **Add missing foreign key**:
   ```sql
   ALTER TABLE starknet_token_transfers 
   ADD CONSTRAINT fk_block_number FOREIGN KEY (block_number) 
   REFERENCES starknet_blocks(block_number);
   ```

### 7.2 Performance Improvements

4. **Add missing indexes**:
   ```sql
   CREATE INDEX idx_starknet_contracts_class_hash ON starknet_contracts(class_hash);
   CREATE INDEX idx_starknet_contracts_deployer ON starknet_contracts(deployer_address);
   CREATE INDEX idx_starknet_wallets_first_seen ON starknet_wallets(first_seen_block);
   CREATE INDEX idx_starknet_daily_metrics_date ON starknet_daily_metrics(date);
   CREATE INDEX idx_starknet_events_index ON starknet_events(event_index);
   ```

### 7.3 Future Enhancements

5. **Add historical tracking**: Consider adding is_active flags to key tables
6. **Add state snapshots**: For auditing contract state changes over time
7. **Add transaction receipts**: Store full receipt data separately

---

## 8. Data Mapping Capability Assessment

### 8.1 Can Starknet Schema Map Any Data Type?

**Current Capability**: ⚠️ **PARTIAL**

**Supported Data Types**:
- ✅ Block data (headers, timestamps, hashes)
- ✅ Transaction data (hashes, types, fees, status)
- ✅ Contract deployments (addresses, class hashes, deployers)
- ✅ Events (keys, data arrays)
- ✅ Wallet interactions (addresses, interaction types)
- ✅ Token transfers (ERC20-style transfers)
- ✅ Function signatures (selectors, names, types)
- ✅ Daily metrics (aggregated statistics)

**Missing Data Types**:
- ❌ Contract class definitions (ABI, bytecode)
- ❌ Internal function calls (execution traces)
- ❌ Raw RPC responses (debugging data)
- ❌ State snapshots (historical state)
- ❌ Sync state (indexer progress)
- ❌ Chain configuration (RPC endpoints, finality)

**Verdict**: The schema can map **most** Starknet data types but is missing critical infrastructure tables for complete data fidelity.

### 8.2 Comparison with Lisk Proposed Schema

The Lisk proposed schema is **more comprehensive** because it includes:
- Full state snapshot/delta tracking
- Modular state management
- Raw RPC storage for zero data loss
- Explicit lock tracking
- Transaction-account relationship resolution
- Chain configuration and sync state

Starknet schema should adopt similar patterns for completeness.

---

## 9. Summary

### Current State
- **Core blockchain tables**: ✅ Implemented (6/6)
- **Extended analytics tables**: ✅ Implemented (4/4)
- **Infrastructure tables**: ❌ Missing (5/5)
- **Foreign key integrity**: ⚠️ Partial (78.6%)
- **Index coverage**: ⚠️ Incomplete
- **Relational score**: **6/10**

### Required Changes
1. Add 5 missing infrastructure tables
2. Enforce 3 missing foreign key constraints
3. Add 5 missing performance indexes
4. Consider historical tracking (is_active flags)
5. Consider state snapshot/delta tables

### Effort Estimate
- **High priority fixes**: 2-4 hours
- **Performance improvements**: 1-2 hours
- **Future enhancements**: 4-8 hours
- **Total**: 7-14 hours

---

## 10. Next Steps

Would you like me to:

1. **Create a Starknet schema restructure spec** (similar to Lisk) with all missing tables and improvements?
2. **Generate migration SQL** to add missing tables and constraints immediately?
3. **Create a comparison document** showing Starknet vs Lisk schema side-by-side?
4. **Focus on specific issues** (e.g., just add missing tables, or just fix foreign keys)?

The Starknet schema is functional but incomplete. It needs the same level of rigor and completeness as the proposed Lisk schema to be truly robust and production-ready.
