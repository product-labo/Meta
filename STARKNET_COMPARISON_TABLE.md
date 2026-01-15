# Starknet Schema: Current vs Required

## Table Comparison Matrix

| Table Name | Status | Compliance | Missing Fields | Priority |
|------------|--------|------------|----------------|----------|
| **chain_config** | ❌ Missing | 0% | Entire table | 🔴 Critical |
| **sync_state** | ❌ Missing | 0% | Entire table | 🔴 Critical |
| **blocks** | ⚠️ Partial | 60% | chain_id, sequencer_address, transaction_count, event_count, is_active | 🔴 Critical |
| **transactions** | ⚠️ Partial | 50% | chain_id, nonce, max_fee, calldata[], signature[], is_active | 🔴 Critical |
| **contract_classes** | ✅ Good | 80% | chain_id, compiled_class_hash, contract_type | 🟡 Medium |
| **contracts** | ✅ Good | 85% | chain_id, implementation_address | 🟡 Medium |
| **events** | ⚠️ Partial | 40% | chain_id, event_index, keys[], data[], is_active | 🔴 Critical |
| **execution_calls** | ⚠️ Partial | 70% | chain_id, caller_address, call_type, calldata[], result[] | 🟡 Medium |
| **wallet_interactions** | ⚠️ Partial | 75% | chain_id, interaction_type | 🟡 Medium |
| **raw_rpc_responses** | ✅ Good | 90% | chain_id | 🟢 Low |
| **starknet_wallets** | ❌ Missing | 0% | Entire table | 🟡 Medium |
| **starknet_tokens** | ❌ Missing | 0% | Entire table | 🟢 Low |
| **starknet_token_transfers** | ❌ Missing | 0% | Entire table | 🟢 Low |
| **starknet_function_signatures** | ❌ Missing | 0% | Entire table | 🟢 Low |
| **starknet_daily_metrics** | ❌ Missing | 0% | Entire table | 🟢 Low |

## Field-by-Field Comparison

### blocks Table

| Field | Current | Required | Status |
|-------|---------|----------|--------|
| block_number | ✅ BIGINT PK | ✅ BIGINT | ✅ Match |
| block_hash | ✅ VARCHAR(66) | ✅ VARCHAR(66) | ✅ Match |
| parent_block_hash | ✅ VARCHAR(66) | ✅ VARCHAR(66) | ✅ Match |
| timestamp | ✅ BIGINT | ✅ TIMESTAMP | ⚠️ Type diff |
| finality_status | ✅ VARCHAR(20) | ✅ VARCHAR(20) | ✅ Match |
| created_at | ✅ TIMESTAMP | ✅ TIMESTAMP | ✅ Match |
| chain_id | ❌ Missing | ✅ INTEGER FK | ❌ Missing |
| sequencer_address | ❌ Missing | ✅ VARCHAR(66) | ❌ Missing |
| transaction_count | ❌ Missing | ✅ INTEGER | ❌ Missing |
| event_count | ❌ Missing | ✅ INTEGER | ❌ Missing |
| is_active | ❌ Missing | ✅ BOOLEAN | ❌ Missing |

### transactions Table

| Field | Current | Required | Status |
|-------|---------|----------|--------|
| tx_hash | ✅ VARCHAR(66) PK | ✅ VARCHAR(66) | ✅ Match |
| block_number | ✅ BIGINT FK | ✅ BIGINT FK | ✅ Match |
| tx_type | ✅ VARCHAR(50) | ✅ VARCHAR(50) | ✅ Match |
| sender_address | ✅ VARCHAR(66) | ✅ VARCHAR(66) | ✅ Match |
| entry_point_selector | ✅ VARCHAR(66) | ✅ VARCHAR(66) | ✅ Match |
| status | ✅ VARCHAR(20) | ✅ VARCHAR(20) | ✅ Match |
| actual_fee | ✅ BIGINT | ✅ BIGINT | ✅ Match |
| created_at | ✅ TIMESTAMP | ✅ TIMESTAMP | ✅ Match |
| chain_id | ❌ Missing | ✅ INTEGER FK | ❌ Missing |
| nonce | ❌ Missing | ✅ BIGINT | ❌ Missing |
| max_fee | ❌ Missing | ✅ BIGINT | ❌ Missing |
| calldata | ❌ Missing | ✅ TEXT[] | ❌ Missing |
| signature | ❌ Missing | ✅ TEXT[] | ❌ Missing |
| is_active | ❌ Missing | ✅ BOOLEAN | ❌ Missing |

### events Table

| Field | Current | Required | Status |
|-------|---------|----------|--------|
| event_id | ✅ SERIAL PK | ⚠️ Not PK | ⚠️ Diff |
| tx_hash | ✅ VARCHAR(66) FK | ✅ VARCHAR(66) | ✅ Match |
| contract_address | ✅ VARCHAR(66) FK | ✅ VARCHAR(66) FK | ✅ Match |
| block_number | ✅ BIGINT FK | ✅ BIGINT FK | ✅ Match |
| created_at | ✅ TIMESTAMP | ✅ TIMESTAMP | ✅ Match |
| chain_id | ❌ Missing | ✅ INTEGER FK | ❌ Missing |
| event_index | ❌ Missing | ✅ INTEGER (PK) | ❌ Missing |
| keys | ❌ Missing | ✅ TEXT[] | ❌ Missing |
| data | ❌ Missing | ✅ TEXT[] | ❌ Missing |
| is_active | ❌ Missing | ✅ BOOLEAN | ❌ Missing |

## Requirements Coverage

### ✅ Fully Met (0/20)
None

### ⚠️ Partially Met (9/20)
- Requirement 3: Block Data Storage (60%)
- Requirement 4: Transaction Data Storage (50%)
- Requirement 5: Contract Class Storage (80%)
- Requirement 6: Contract Instance Storage (85%)
- Requirement 7: Event Emission Tracking (40%)
- Requirement 8: Execution Call Tracking (70%)
- Requirement 10: Wallet-Contract Interaction Tracking (75%)
- Requirement 14: Raw RPC Response Storage (90%)
- Requirement 18: Performance Optimization (50%)

### ❌ Not Met (11/20)
- Requirement 1: Chain Configuration Management
- Requirement 2: Synchronization State Tracking
- Requirement 9: Wallet Address Registry
- Requirement 11: Token Contract Registry
- Requirement 12: Token Transfer Tracking
- Requirement 13: Function Signature Registry
- Requirement 15: Daily Metrics Aggregation
- Requirement 16: Historical Data Preservation
- Requirement 17: Referential Integrity Enforcement
- Requirement 19: Data Validation and Constraints
- Requirement 20: Schema Documentation

## Migration Complexity

### Simple Additions (Low Risk)
- Add chain_id columns
- Add is_active columns
- Add missing scalar fields (nonce, max_fee, etc.)
- Create new independent tables (tokens, metrics)

### Complex Changes (Medium Risk)
- Change primary keys to composite (block_number, chain_id)
- Add array columns (calldata[], signature[], keys[], data[])
- Add foreign key constraints
- Migrate existing data

### Breaking Changes (High Risk)
- Composite primary keys affect all foreign keys
- Existing queries need chain_id in WHERE clauses
- Application code needs updates
- Indexes need recreation

## Estimated Migration Time

| Phase | Tasks | Effort | Risk |
|-------|-------|--------|------|
| Phase 1: Infrastructure | Create chain_config, sync_state, add chain_id | 3-5 days | High |
| Phase 2: Core Enhancements | Add missing fields, update constraints | 2-3 days | Medium |
| Phase 3: Analytics | Create token/metrics tables | 2-3 days | Low |
| Phase 4: Testing | Property tests, performance tests | 3-4 days | Low |
| **Total** | | **10-15 days** | |

## Rollout Strategy

### Step 1: Preparation (Day 1)
- Backup production database
- Test migration on staging
- Write rollback scripts
- Update application code

### Step 2: Infrastructure (Days 2-3)
- Create chain_config table
- Create sync_state table
- Add chain_id to all tables
- Populate chain_id = 1 for existing data

### Step 3: Data Fields (Days 4-5)
- Add is_active columns
- Add missing transaction fields
- Add missing event fields
- Update indexes

### Step 4: New Tables (Days 6-7)
- Create starknet_wallets
- Create starknet_tokens
- Create starknet_token_transfers
- Create starknet_daily_metrics

### Step 5: Constraints (Day 8)
- Add foreign key constraints
- Add CHECK constraints
- Add composite unique constraints
- Verify referential integrity

### Step 6: Testing (Days 9-10)
- Run property tests
- Performance benchmarks
- Integration tests
- Verify data integrity

### Step 7: Documentation (Days 11-12)
- Add COMMENT statements
- Generate data dictionary
- Update API documentation
- Create migration guide

### Step 8: Deployment (Days 13-15)
- Schedule maintenance window
- Deploy to production
- Monitor for issues
- Verify sync resumes correctly

## Success Criteria

- [ ] All 15 required tables exist
- [ ] All tables have chain_id column
- [ ] All tables have proper foreign keys
- [ ] Historical data preserved (is_active)
- [ ] Complete transaction data captured
- [ ] Complete event data captured
- [ ] Token tracking operational
- [ ] Daily metrics computed
- [ ] All property tests pass
- [ ] Performance benchmarks met
- [ ] Documentation complete
- [ ] Zero data loss during migration

## Conclusion

**Current Status:** 45% compliant with requirements

**Critical Gaps:**
1. No multi-chain support (chain_id)
2. No sync state tracking
3. Incomplete data capture
4. Missing analytics tables

**Recommendation:** Proceed with phased migration starting with Phase 1 (infrastructure) immediately.

**Timeline:** 10-15 days for full compliance

**Risk Level:** Medium (manageable with proper testing)
