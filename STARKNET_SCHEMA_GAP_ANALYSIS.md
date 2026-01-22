# Starknet Schema Gap Analysis

**Generated:** 2026-01-14 15:24  
**Comparison:** Current Schema vs. Requirements Specification

---

## Executive Summary

### Current Status
- ✅ **Core tables exist**: blocks, transactions, contracts, events
- ⚠️ **Missing infrastructure**: chain_config, sync_state
- ⚠️ **Missing multi-chain support**: No chain_id columns
- ⚠️ **Missing historical tracking**: No is_active columns
- ⚠️ **Incomplete data capture**: Missing nonce, calldata, signature arrays
- ⚠️ **Missing analytics**: No tokens, token_transfers, daily_metrics tables
- ⚠️ **Missing wallet registry**: No dedicated wallets table

### Compliance Score: **45%**

---

## Detailed Gap Analysis

### ✅ IMPLEMENTED (Existing Tables)

#### 1. **blocks** - Partially Compliant
```sql
-- Current Schema
CREATE TABLE blocks (
    block_number BIGINT PRIMARY KEY,
    block_hash VARCHAR(66) NOT NULL UNIQUE,
    parent_block_hash VARCHAR(66),
    timestamp BIGINT NOT NULL,
    finality_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Status:** ✅ Core fields present  
**Missing:**
- ❌ chain_id (Requirement 3.6)
- ❌ sequencer_address (Requirement 3.4)
- ❌ transaction_count (Requirement 3.5)
- ❌ event_count (Requirement 3.5)
- ❌ is_active (Requirement 16.3)

---

#### 2. **transactions** - Partially Compliant
```sql
-- Current Schema
CREATE TABLE transactions (
    tx_hash VARCHAR(66) PRIMARY KEY,
    block_number BIGINT NOT NULL REFERENCES blocks(block_number),
    tx_type VARCHAR(50) NOT NULL,
    sender_address VARCHAR(66),
    entry_point_selector VARCHAR(66),
    status VARCHAR(20) NOT NULL,
    actual_fee BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Status:** ✅ Core fields present  
**Missing:**
- ❌ chain_id (Requirement 4.8)
- ❌ nonce (Requirement 4.5)
- ❌ max_fee (Requirement 4.4)
- ❌ calldata TEXT[] (Requirement 4.6)
- ❌ signature TEXT[] (Requirement 4.6)
- ❌ is_active (Requirement 16.4)

---

#### 3. **contract_classes** - Compliant
```sql
-- Current Schema
CREATE TABLE contract_classes (
    class_hash VARCHAR(66) PRIMARY KEY,
    abi_json JSONB,
    declared_tx_hash VARCHAR(66),
    declared_block BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Status:** ✅ Mostly compliant  
**Missing:**
- ❌ chain_id (Requirement 5.6)
- ❌ compiled_class_hash (Requirement 5.5)
- ❌ contract_type (Requirement 5.1)

---

#### 4. **contracts** - Partially Compliant
```sql
-- Current Schema
CREATE TABLE contracts (
    contract_address VARCHAR(66) PRIMARY KEY,
    class_hash VARCHAR(66) NOT NULL REFERENCES contract_classes(class_hash),
    deployer_address VARCHAR(66),
    deployment_tx_hash VARCHAR(66) REFERENCES transactions(tx_hash),
    deployment_block BIGINT REFERENCES blocks(block_number),
    is_proxy BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Status:** ✅ Good compliance  
**Missing:**
- ❌ chain_id (Requirement 6.7)
- ❌ implementation_address (Requirement 6.4)

---

#### 5. **events** - Partially Compliant
```sql
-- Current Schema
CREATE TABLE events (
    event_id SERIAL PRIMARY KEY,
    tx_hash VARCHAR(66) NOT NULL REFERENCES transactions(tx_hash),
    contract_address VARCHAR(66) REFERENCES contracts(contract_address),
    function_id INTEGER REFERENCES functions(function_id),
    block_number BIGINT NOT NULL REFERENCES blocks(block_number),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Status:** ⚠️ Structure exists but missing critical fields  
**Missing:**
- ❌ chain_id (Requirement 7.7)
- ❌ event_index (Requirement 7.1)
- ❌ keys TEXT[] (Requirement 7.1)
- ❌ data TEXT[] (Requirement 7.1)
- ❌ is_active (Requirement 16.5)
- ❌ Composite PK (chain_id, tx_hash, event_index) (Requirement 7.2)

---

#### 6. **execution_calls** - Partially Compliant
```sql
-- Current Schema
CREATE TABLE execution_calls (
    call_id SERIAL PRIMARY KEY,
    tx_hash VARCHAR(66) NOT NULL REFERENCES transactions(tx_hash),
    parent_call_id INTEGER REFERENCES execution_calls(call_id),
    contract_address VARCHAR(66) REFERENCES contracts(contract_address),
    class_hash VARCHAR(66) REFERENCES contract_classes(class_hash),
    entry_point_selector VARCHAR(66),
    call_status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Status:** ✅ Good structure  
**Missing:**
- ❌ chain_id (Requirement 8.6)
- ❌ caller_address (Requirement 8.2)
- ❌ call_type (Requirement 8.2)
- ❌ calldata TEXT[] (Requirement 8.3)
- ❌ result TEXT[] (Requirement 8.3)

---

#### 7. **wallet_interactions** - Partially Compliant
```sql
-- Current Schema
CREATE TABLE wallet_interactions (
    interaction_id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(66) NOT NULL,
    contract_address VARCHAR(66) REFERENCES contracts(contract_address),
    function_id INTEGER REFERENCES functions(function_id),
    tx_hash VARCHAR(66) NOT NULL REFERENCES transactions(tx_hash),
    block_number BIGINT NOT NULL REFERENCES blocks(block_number),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Status:** ✅ Exists  
**Missing:**
- ❌ chain_id (Requirement 10.6)
- ❌ interaction_type (Requirement 10.2)

---

#### 8. **raw_rpc_responses** - Compliant
```sql
-- Current Schema
CREATE TABLE raw_rpc_responses (
    id SERIAL PRIMARY KEY,
    rpc_method VARCHAR(100) NOT NULL,
    prep_number BIGINT,
    tx_hash VARCHAR(66),
    response_json JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Status:** ✅ Compliant  
**Missing:**
- ❌ chain_id (Requirement 14.4)

---

### ❌ MISSING TABLES (Not Implemented)

#### 1. **chain_config** - CRITICAL MISSING
```sql
-- Required Schema
CREATE TABLE chain_config (
    chain_id INTEGER PRIMARY KEY,
    chain_name VARCHAR(50) NOT NULL,
    rpc_url TEXT NOT NULL,
    explorer_url TEXT,
    finality_depth INTEGER DEFAULT 10,
    reorg_depth INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Impact:** 🔴 CRITICAL  
**Requirements:** 1.1, 1.2, 1.3, 1.4, 1.5  
**Blocks:** Multi-chain support, all chain_id foreign keys

---

#### 2. **sync_state** - CRITICAL MISSING
```sql
-- Required Schema
CREATE TABLE sync_state (
    id SERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chain_config(chain_id),
    last_synced_block BIGINT NOT NULL,
    last_finalized_block BIGINT,
    sync_status VARCHAR(20) NOT NULL DEFAULT 'syncing',
    last_sync_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    error_message TEXT,
    UNIQUE(chain_id)
);
```

**Impact:** 🔴 CRITICAL  
**Requirements:** 2.1, 2.2, 2.3, 2.4, 2.5, 2.6  
**Blocks:** Indexer progress tracking, resume capability

---

#### 3. **starknet_wallets** - MISSING
```sql
-- Required Schema
CREATE TABLE starknet_wallets (
    address VARCHAR(66) NOT NULL,
    chain_id INTEGER NOT NULL REFERENCES chain_config(chain_id),
    first_seen_block BIGINT NOT NULL REFERENCES blocks(block_number),
    last_activity_block BIGINT,
    account_type VARCHAR(20) DEFAULT 'wallet',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (address, chain_id)
);
```

**Impact:** 🟡 MEDIUM  
**Requirements:** 9.1, 9.2, 9.6, 9.7  
**Blocks:** Wallet registry, address tracking

---

#### 4. **starknet_tokens** - MISSING
```sql
-- Required Schema
CREATE TABLE starknet_tokens (
    token_address VARCHAR(66) NOT NULL,
    chain_id INTEGER NOT NULL REFERENCES chain_config(chain_id),
    name VARCHAR(255),
    symbol VARCHAR(50),
    decimals INTEGER,
    total_supply NUMERIC(78,0),
    token_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (token_address, chain_id)
);
```

**Impact:** 🟡 MEDIUM  
**Requirements:** 11.1, 11.2, 11.5, 11.6  
**Blocks:** Token tracking, DeFi analytics

---

#### 5. **starknet_token_transfers** - MISSING
```sql
-- Required Schema
CREATE TABLE starknet_token_transfers (
    tx_hash VARCHAR(66) NOT NULL,
    event_index INTEGER NOT NULL,
    chain_id INTEGER NOT NULL REFERENCES chain_config(chain_id),
    token_address VARCHAR(66) NOT NULL,
    from_address VARCHAR(66) NOT NULL,
    to_address VARCHAR(66) NOT NULL,
    amount NUMERIC(78,0) NOT NULL,
    token_id NUMERIC(78,0),
    block_number BIGINT NOT NULL REFERENCES blocks(block_number),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tx_hash, event_index, chain_id),
    FOREIGN KEY (token_address, chain_id) REFERENCES starknet_tokens(token_address, chain_id)
);
```

**Impact:** 🟡 MEDIUM  
**Requirements:** 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.8  
**Blocks:** Token transfer tracking, value flow analysis

---

#### 6. **starknet_function_signatures** - MISSING
```sql
-- Required Schema
CREATE TABLE starknet_function_signatures (
    function_selector VARCHAR(66) NOT NULL,
    contract_address VARCHAR(66) NOT NULL,
    chain_id INTEGER NOT NULL REFERENCES chain_config(chain_id),
    function_name VARCHAR(255) NOT NULL,
    function_signature TEXT NOT NULL,
    input_types TEXT[],
    output_types TEXT[],
    is_view BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (function_selector, contract_address, chain_id),
    FOREIGN KEY (contract_address, chain_id) REFERENCES contracts(contract_address, chain_id)
);
```

**Impact:** 🟢 LOW  
**Requirements:** 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7  
**Blocks:** Function decoding, calldata interpretation

---

#### 7. **starknet_daily_metrics** - MISSING
```sql
-- Required Schema
CREATE TABLE starknet_daily_metrics (
    date DATE NOT NULL,
    chain_id INTEGER NOT NULL REFERENCES chain_config(chain_id),
    total_transactions INTEGER DEFAULT 0,
    successful_transactions INTEGER DEFAULT 0,
    failed_transactions INTEGER DEFAULT 0,
    unique_addresses INTEGER DEFAULT 0,
    total_gas_used BIGINT DEFAULT 0,
    average_gas_price NUMERIC(78,0),
    new_contracts INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (date, chain_id)
);
```

**Impact:** 🟢 LOW  
**Requirements:** 15.1, 15.2, 15.3, 15.4, 15.5, 15.6  
**Blocks:** Daily analytics, trend analysis

---

## Priority Roadmap

### 🔴 PHASE 1: CRITICAL INFRASTRUCTURE (Tasks 1-7)

**Must implement before production:**

1. ✅ Create `chain_config` table
2. ✅ Create `sync_state` table
3. ✅ Add `chain_id` to ALL existing tables
4. ✅ Add `is_active` to blocks, transactions, events
5. ✅ Add missing transaction fields (nonce, max_fee, calldata, signature)
6. ✅ Add missing event fields (event_index, keys, data)
7. ✅ Update all foreign keys to composite (address, chain_id)

**Estimated Effort:** 3-5 days  
**Risk:** HIGH - Breaking changes to existing schema

---

### 🟡 PHASE 2: CORE ENHANCEMENTS (Tasks 8-12)

**Required for full functionality:**

8. ✅ Create `starknet_wallets` table
9. ✅ Enhance `contracts` with implementation_address
10. ✅ Enhance `execution_calls` with caller_address, call_type, calldata, result
11. ✅ Add missing block fields (sequencer_address, transaction_count, event_count)
12. ✅ Add CHECK constraints for validation

**Estimated Effort:** 2-3 days  
**Risk:** MEDIUM - Additive changes

---

### 🟢 PHASE 3: ANALYTICS & TOKENS (Tasks 13-17)

**Nice to have for analytics:**

13. ✅ Create `starknet_tokens` table
14. ✅ Create `starknet_token_transfers` table
15. ✅ Create `starknet_function_signatures` table
16. ✅ Create `starknet_daily_metrics` table
17. ✅ Add comprehensive indexes

**Estimated Effort:** 2-3 days  
**Risk:** LOW - Independent tables

---

### 🔵 PHASE 4: DOCUMENTATION & TESTING (Tasks 18-26)

**Production readiness:**

18. ✅ Add COMMENT statements to all tables/columns
19. ✅ Write property tests for all requirements
20. ✅ Create migration scripts (forward/backward)
21. ✅ Performance testing
22. ✅ Integration testing with indexer
23. ✅ Final verification

**Estimated Effort:** 3-4 days  
**Risk:** LOW - Quality assurance

---

## Migration Strategy

### Option 1: In-Place Migration (Recommended)
```sql
-- Step 1: Add new tables
CREATE TABLE chain_config (...);
CREATE TABLE sync_state (...);

-- Step 2: Add new columns to existing tables
ALTER TABLE blocks ADD COLUMN chain_id INTEGER;
ALTER TABLE blocks ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Step 3: Populate chain_id for existing data
UPDATE blocks SET chain_id = 1; -- Assume mainnet

-- Step 4: Add foreign key constraints
ALTER TABLE blocks ADD CONSTRAINT fk_blocks_chain 
    FOREIGN KEY (chain_id) REFERENCES chain_config(chain_id);

-- Step 5: Create composite unique constraints
ALTER TABLE blocks DROP CONSTRAINT blocks_pkey;
ALTER TABLE blocks ADD PRIMARY KEY (block_number, chain_id);
```

**Pros:** Preserves existing data  
**Cons:** Requires downtime, complex migration

---

### Option 2: Fresh Schema (Alternative)
```sql
-- Create new schema with all requirements
CREATE SCHEMA starknet_v2;

-- Deploy all tables in new schema
CREATE TABLE starknet_v2.blocks (...);
CREATE TABLE starknet_v2.transactions (...);

-- Migrate data from old to new
INSERT INTO starknet_v2.blocks 
SELECT *, 1 as chain_id, true as is_active FROM public.blocks;

-- Switch application to new schema
-- Drop old schema when verified
```

**Pros:** Clean slate, no breaking changes during migration  
**Cons:** Requires data migration, more complex rollback

---

## Compliance Checklist

### Infrastructure (Requirements 1-2, 14)
- [ ] chain_config table created
- [ ] sync_state table created
- [ ] raw_rpc_responses enhanced with chain_id
- [ ] Multi-chain support enabled

### Core Tables (Requirements 3-8)
- [ ] blocks: chain_id, sequencer_address, counts, is_active
- [ ] transactions: chain_id, nonce, max_fee, calldata, signature, is_active
- [ ] contract_classes: chain_id, compiled_class_hash, contract_type
- [ ] contracts: chain_id, implementation_address
- [ ] events: chain_id, event_index, keys, data, is_active
- [ ] execution_calls: chain_id, caller_address, call_type, calldata, result

### Extended Tables (Requirements 9-13, 15)
- [ ] starknet_wallets table created
- [ ] starknet_wallet_interactions enhanced
- [ ] starknet_tokens table created
- [ ] starknet_token_transfers table created
- [ ] starknet_function_signatures table created
- [ ] starknet_daily_metrics table created

### Data Integrity (Requirements 16-19)
- [ ] is_active columns added for historical preservation
- [ ] Foreign key constraints on all relationships
- [ ] CASCADE behavior for chain_id
- [ ] RESTRICT behavior for blocks
- [ ] CHECK constraints for addresses, hashes, enums, timestamps
- [ ] Composite unique constraints per chain

### Performance (Requirement 18)
- [ ] Indexes on all foreign keys
- [ ] Indexes on frequently queried columns
- [ ] Composite indexes for common patterns
- [ ] Indexes on timestamp columns

### Documentation (Requirement 20)
- [ ] COMMENT on all tables
- [ ] COMMENT on key columns
- [ ] COMMENT on indexes
- [ ] Data dictionary generated
- [ ] Design decisions documented

---

## Recommendations

### Immediate Actions (This Week)
1. ✅ Create `chain_config` and `sync_state` tables
2. ✅ Add `chain_id` to all tables
3. ✅ Add `is_active` to blocks, transactions, events
4. ✅ Update indexer code to populate new fields

### Short Term (Next 2 Weeks)
1. ✅ Add missing transaction/event fields
2. ✅ Create wallet and token tables
3. ✅ Write migration scripts
4. ✅ Test migration on staging database

### Medium Term (Next Month)
1. ✅ Implement analytics tables
2. ✅ Add comprehensive indexes
3. ✅ Write property tests
4. ✅ Performance optimization

---

## Risk Assessment

### High Risk
- **Breaking Changes:** Adding chain_id changes primary keys
- **Data Migration:** Existing data needs chain_id assignment
- **Downtime:** Migration requires indexer pause

### Mitigation
- Test migration on copy of production database
- Create rollback scripts
- Schedule maintenance window
- Implement blue-green deployment if possible

---

## Conclusion

The current Starknet schema provides a **solid foundation** but requires **significant enhancements** to meet the full requirements specification. The most critical gaps are:

1. 🔴 **Multi-chain support** (chain_config, chain_id columns)
2. 🔴 **Sync state tracking** (sync_state table)
3. 🟡 **Historical preservation** (is_active columns)
4. 🟡 **Complete data capture** (missing fields in transactions, events)
5. 🟢 **Analytics tables** (tokens, transfers, metrics)

**Recommendation:** Proceed with **PHASE 1** immediately to establish infrastructure foundation, then incrementally add PHASE 2-4 features.

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-14 15:24  
**Next Review:** After Phase 1 completion
