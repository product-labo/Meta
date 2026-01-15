# Starknet Schema Analysis Summary

**Date:** 2026-01-14  
**Status:** ⚠️ Needs Updates

---

## Quick Overview

### Current State: 45% Compliant

**What Exists:**
- ✅ Core tables: blocks, transactions, contracts, events
- ✅ Execution tracking: execution_calls, wallet_interactions
- ✅ Contract classes and functions
- ✅ Raw RPC responses for debugging

**What's Missing:**
- ❌ Multi-chain support (no chain_id)
- ❌ Sync state tracking
- ❌ Historical data preservation (no is_active)
- ❌ Complete transaction data (no nonce, calldata, signature)
- ❌ Complete event data (no keys, data arrays)
- ❌ Token tracking tables
- ❌ Wallet registry table
- ❌ Daily metrics table

---

## Critical Gaps

### 🔴 Priority 1: Infrastructure (MUST FIX)

1. **Missing `chain_config` table**
   - Blocks multi-chain support
   - All tables need chain_id foreign key
   - Requirements: 1.1-1.5

2. **Missing `sync_state` table**
   - No indexer progress tracking
   - Can't resume after interruption
   - Requirements: 2.1-2.6

3. **No `chain_id` columns**
   - Can't support multiple networks
   - All tables need this added
   - Requirements: 3.6, 4.8, 5.6, 6.7, 7.7, etc.

4. **No `is_active` columns**
   - Can't preserve historical data during reorgs
   - Needed in: blocks, transactions, events
   - Requirements: 16.3, 16.4, 16.5

---

### 🟡 Priority 2: Data Completeness

5. **Incomplete `transactions` table**
   - Missing: nonce, max_fee, calldata[], signature[]
   - Requirements: 4.5, 4.6

6. **Incomplete `events` table**
   - Missing: event_index, keys[], data[]
   - Can't properly decode events
   - Requirements: 7.1, 7.2

7. **Missing `starknet_wallets` table**
   - No wallet registry
   - Requirements: 9.1-9.7

---

### 🟢 Priority 3: Analytics

8. **Missing token tables**
   - No `starknet_tokens`
   - No `starknet_token_transfers`
   - Requirements: 11.1-11.7, 12.1-12.8

9. **Missing `starknet_daily_metrics`**
   - No aggregated analytics
   - Requirements: 15.1-15.7

---

## Comparison to Spec

### Requirements Document
Location: `.kiro/specs/starknet-schema-restructure/requirements.md`

**Total Requirements:** 20 major requirements  
**Current Compliance:** ~45%

### Tasks Document
Location: `.kiro/specs/starknet-schema-restructure/tasks.md`

**Total Tasks:** 26 task groups (200+ subtasks)  
**Completed:** 0 tasks  
**Status:** Not started

---

## Recommended Action Plan

### Week 1: Critical Infrastructure
```sql
-- Day 1-2: Create foundation tables
CREATE TABLE chain_config (...);
CREATE TABLE sync_state (...);

-- Day 3-4: Add chain_id to all tables
ALTER TABLE blocks ADD COLUMN chain_id INTEGER;
ALTER TABLE transactions ADD COLUMN chain_id INTEGER;
-- ... repeat for all tables

-- Day 5: Add is_active columns
ALTER TABLE blocks ADD COLUMN is_active BOOLEAN DEFAULT true;
ALTER TABLE transactions ADD COLUMN is_active BOOLEAN DEFAULT true;
ALTER TABLE events ADD COLUMN is_active BOOLEAN DEFAULT true;
```

### Week 2: Data Completeness
```sql
-- Add missing transaction fields
ALTER TABLE transactions ADD COLUMN nonce BIGINT;
ALTER TABLE transactions ADD COLUMN max_fee BIGINT;
ALTER TABLE transactions ADD COLUMN calldata TEXT[];
ALTER TABLE transactions ADD COLUMN signature TEXT[];

-- Add missing event fields
ALTER TABLE events ADD COLUMN event_index INTEGER;
ALTER TABLE events ADD COLUMN keys TEXT[];
ALTER TABLE events ADD COLUMN data TEXT[];

-- Create wallet table
CREATE TABLE starknet_wallets (...);
```

### Week 3: Analytics Tables
```sql
-- Create token tracking
CREATE TABLE starknet_tokens (...);
CREATE TABLE starknet_token_transfers (...);

-- Create metrics
CREATE TABLE starknet_daily_metrics (...);
CREATE TABLE starknet_function_signatures (...);
```

### Week 4: Testing & Documentation
- Write migration scripts
- Test on staging database
- Add COMMENT statements
- Write property tests
- Performance optimization

---

## Files Created

1. **STARKNET_RPC_FLOW_ANALYSIS.md**
   - Complete flow and structure analysis
   - RPC connection details
   - Data processing pipeline
   - Architecture diagrams

2. **STARKNET_SCHEMA_GAP_ANALYSIS.md**
   - Detailed gap analysis
   - Table-by-table comparison
   - Missing fields documentation
   - Migration strategy
   - Priority roadmap

3. **This file (Summary)**
   - Quick reference
   - Action items
   - Status overview

---

## Next Steps

1. **Review the gap analysis document** - Understand all missing pieces
2. **Prioritize tasks** - Decide which phase to implement first
3. **Create migration plan** - Choose in-place vs fresh schema
4. **Test on staging** - Never migrate production directly
5. **Update indexer code** - Modify to populate new fields
6. **Deploy incrementally** - Phase by phase deployment

---

## Key Decisions Needed

### 1. Migration Strategy
- **Option A:** In-place migration (add columns to existing tables)
- **Option B:** Fresh schema (create new schema, migrate data)

**Recommendation:** Option A for minimal disruption

### 2. Chain ID Assignment
- What chain_id for existing data? (Suggest: 1 = Starknet Mainnet)
- Support testnet? (Suggest: 2 = Starknet Testnet)

### 3. Downtime Window
- Migration requires indexer pause
- Estimate: 2-4 hours for Phase 1
- Schedule maintenance window

### 4. Rollback Plan
- Create backup before migration
- Write rollback scripts
- Test rollback procedure

---

## Resources

- **Requirements:** `.kiro/specs/starknet-schema-restructure/requirements.md`
- **Tasks:** `.kiro/specs/starknet-schema-restructure/tasks.md`
- **Current Schema:** `starknet-rpc-query/src/database/migrations/001_initial_schema.sql`
- **Flow Analysis:** `STARKNET_RPC_FLOW_ANALYSIS.md`
- **Gap Analysis:** `STARKNET_SCHEMA_GAP_ANALYSIS.md`

---

**Status:** ⚠️ Schema needs significant updates to meet requirements  
**Compliance:** 45% (9/20 requirements partially met)  
**Recommendation:** Start Phase 1 implementation immediately
