# Multi-Chain Blockchain Database - Structure & Relationships Analysis

## 🏗️ Architecture Overview

The database uses a **hybrid multi-chain architecture** with:
1. **Core Application Schema** - User management, projects, payments
2. **Chain-Specific Namespaces** - Separate tables per blockchain (lisk_*, starknet_*, ba_*)
3. **Universal Multi-Chain Schema** - Cross-chain analytics (mc_*, ba_*)

---

## 📊 Relationship Types & Cardinality

### **1. USER-CENTRIC RELATIONSHIPS**

#### **users** (Central Hub)
**1:N Relationships** (One user has many):
- ✅ `users` → `projects` (1:N) - User creates multiple projects
- ✅ `users` → `wallets` (via projects) (1:N) - User has multiple wallets
- ✅ `users` → `invoices` (1:N) - User has multiple invoices
- ✅ `users` → `api_keys` (1:N) - User has multiple API keys
- ✅ `users` → `watchlist` (1:N) - User watches multiple projects
- ✅ `users` → `alerts` (1:N) - User has multiple alerts
- ✅ `users` → `unified_addresses` (1:N) - User has multiple addresses
- ✅ `users` → `webzjs_wallets` (1:N) - User has multiple web wallets
- ✅ `users` → `devtool_wallets` (1:N) - User has multiple dev wallets
- ✅ `users` → `withdrawals` (1:N) - User has multiple withdrawals

**1:1 Relationships**:
- ✅ `users` → `profiles` (1:1) - One user, one profile
- ✅ `users` → `startup_details` (1:1) - One user, one startup detail

---

### **2. PROJECT-CENTRIC RELATIONSHIPS**

#### **projects**
**1:N Relationships**:
- ✅ `projects` → `wallets` (1:N) - Project has multiple wallets (multi-chain)
- ✅ `projects` → `project_metrics` (1:N) - Project has multiple metric snapshots
- ✅ `projects` → `watchlist` (1:N) - Project watched by multiple users
- ✅ `projects` → `alerts` (1:N) - Project has multiple alerts

**N:1 Relationships**:
- ✅ `projects` → `users` (N:1) - Many projects belong to one user

**Key Insight**: Projects are **chain-agnostic** with a `chain` column (VARCHAR) allowing flexible multi-chain support.

---

### **3. WALLET & ADDRESS RELATIONSHIPS**

#### **wallets** (Multi-Chain Support)
```
wallets
├── address (TEXT) - Blockchain address
├── network (VARCHAR) - 'mainnet', 'testnet', etc.
├── type (wallet_type ENUM) - 't', 'z', 'u' (transparent, shielded, unified)
└── project_id (FK) → projects
```

**Cardinality**:
- ✅ `wallets` → `projects` (N:1) - Many wallets per project
- ✅ **UNIQUE CONSTRAINT**: (address, network) - Same address can exist on different networks

#### **unified_addresses** (Privacy-Focused)
```
unified_addresses
├── user_id (FK) → users (N:1)
├── webzjs_wallet_id (FK) → webzjs_wallets (N:1, nullable)
├── devtool_wallet_id (FK) → devtool_wallets (N:1, nullable)
├── network (VARCHAR)
└── diversifier (VARCHAR) - Privacy feature
```

**Cardinality**:
- ✅ `unified_addresses` → `users` (N:1) - Many addresses per user
- ✅ `unified_addresses` → `webzjs_wallets` (N:1, optional)
- ✅ `unified_addresses` → `devtool_wallets` (N:1, optional)
- ✅ `unified_addresses` → `unified_address_usage` (1:N) - Track usage patterns

---

### **4. PAYMENT & INVOICE RELATIONSHIPS**

#### **Legacy Zcash System**
```
invoices (1:N with users)
├── user_id (FK) → users
├── z_address (VARCHAR) - Zcash shielded address
└── status ('pending', 'paid', 'expired', 'cancelled')
```

#### **Unified Invoice System**
```
unified_invoices
├── user_id (FK) → users (N:1)
├── unified_address_id (FK) → unified_addresses (N:1)
└── unified_payments (1:N)
    └── unified_invoice_id (FK) → unified_invoices
```

**Cardinality**:
- ✅ `unified_invoices` → `users` (N:1)
- ✅ `unified_invoices` → `unified_addresses` (N:1)
- ✅ `unified_invoices` → `unified_payments` (1:N) - One invoice, multiple payments

#### **Smart Contract Subscriptions** (MetaGauge)
```
sc_subscriptions (NOT IN CURRENT SCHEMA - Migration 018)
├── user_id (FK) → users (1:1) - UNIQUE constraint
├── wallet_address (VARCHAR) - EVM wallet (1:1) - UNIQUE constraint
├── contract_address (VARCHAR)
└── chain_id (INTEGER)
```

**Cardinality**:
- ✅ `sc_subscriptions` → `users` (1:1) - One subscription per user
- ✅ `sc_subscriptions` → wallet_address (1:1) - One subscription per wallet

---

### **5. BLOCKCHAIN DATA RELATIONSHIPS**

#### **Zcash/Bitcoin-style UTXO Model**
```
blocks (1:N with transactions)
└── transactions (1:N with inputs/outputs)
    ├── inputs (N:1)
    │   └── prev_txid (FK) → transactions
    └── outputs (N:1)
        └── address → addresses
```

**Cardinality**:
- ✅ `blocks` → `transactions` (1:N)
- ✅ `transactions` → `inputs` (1:N)
- ✅ `transactions` → `outputs` (1:N)
- ✅ `inputs` → `transactions` (N:1) - References previous transaction
- ✅ `addresses` → `address_tx` (1:N) - Track all transactions per address

---

### **6. MULTI-CHAIN INDEXER RELATIONSHIPS** (mc_* tables)

#### **mc_registry** (Contract Registry)
```
mc_registry
├── chain_id (INTEGER) - Which blockchain
├── address (VARCHAR) - Contract address
├── abi (JSONB) - Contract ABI
└── UNIQUE (chain_id, address)
```

**Cardinality**:
- ✅ `mc_registry` → `mc_entity_snapshots` (1:N) - One contract, many snapshots
- ✅ `mc_registry` → `mc_event_logs` (1:N) - One contract, many events
- ✅ `mc_registry` → `mc_decoded_events` (1:N) - One contract, many decoded events

#### **mc_transaction_details**
```
mc_transaction_details
├── chain_id (INTEGER)
├── tx_hash (VARCHAR) - UNIQUE
├── from_address (VARCHAR)
└── to_address (VARCHAR)
```

**Cardinality**:
- ✅ Independent table with UNIQUE tx_hash
- ✅ No foreign keys - designed for high-volume ingestion

---

### **7. UNIVERSAL BLOCKCHAIN ANALYTICS** (ba_* tables)

#### **ba_chains** (Blockchain Registry)
```
ba_chains (Central registry)
├── id (UUID)
├── name (TEXT)
└── chain_id (BIGINT)
```

**Cardinality**:
- ✅ `ba_chains` → `ba_smart_contracts` (1:N)
- ✅ `ba_chains` → `ba_transactions` (1:N)
- ✅ `ba_chains` → `ba_indexer_state` (1:N)

#### **ba_smart_contracts**
```
ba_smart_contracts
├── chain_id (FK) → ba_chains (N:1)
├── category_id (FK) → ba_categories (N:1)
└── address (TEXT)
```

**Cardinality**:
- ✅ `ba_smart_contracts` → `ba_chains` (N:1)
- ✅ `ba_smart_contracts` → `ba_categories` (N:1)
- ✅ `ba_smart_contracts` → `ba_function_signatures` (1:N)
- ✅ `ba_smart_contracts` → `ba_transactions` (1:N)
- ✅ `ba_smart_contracts` → `ba_events` (1:N)

#### **ba_transactions** (Universal Transaction Format)
```
ba_transactions
├── chain_id (FK) → ba_chains (N:1)
├── contract_id (FK) → ba_smart_contracts (N:1)
├── function_sig_id (FK) → ba_function_signatures (N:1)
├── from_wallet_id (FK) → ba_wallets (N:1)
├── to_wallet_id (FK) → ba_wallets (N:1)
└── hash (TEXT)
```

**Cardinality**:
- ✅ `ba_transactions` → `ba_chains` (N:1)
- ✅ `ba_transactions` → `ba_smart_contracts` (N:1, optional)
- ✅ `ba_transactions` → `ba_wallets` (N:1 for from, N:1 for to)
- ✅ `ba_transactions` → `ba_events` (1:N)
- ✅ `ba_transactions` → `ba_receipts` (1:1)
- ✅ `ba_transactions` → `ba_starknet_messages` (1:N, Starknet only)

#### **ba_wallets** (Cross-Chain Wallet Registry)
```
ba_wallets
├── address (TEXT)
├── label (TEXT)
└── total_transactions (BIGINT)
```

**Cardinality**:
- ✅ `ba_wallets` → `ba_transactions` (1:N as from_wallet)
- ✅ `ba_wallets` → `ba_transactions` (1:N as to_wallet)
- ✅ **No foreign keys** - Independent registry

---

## 🔗 Key Relationship Patterns

### **Pattern 1: User Ownership Cascade**
```
users (1)
  ├── projects (N) → CASCADE DELETE
  │   ├── wallets (N) → CASCADE DELETE
  │   ├── project_metrics (N) → CASCADE DELETE
  │   └── alerts (N) → CASCADE DELETE
  ├── invoices (N) → CASCADE DELETE
  ├── api_keys (N) → CASCADE DELETE
  └── unified_addresses (N) → CASCADE DELETE
```
**All user data deleted when user is deleted**

### **Pattern 2: Multi-Chain Wallet Support**
```
wallets
  ├── address (TEXT) - Any blockchain address format
  ├── network (VARCHAR) - 'mainnet', 'testnet', 'sepolia', etc.
  └── UNIQUE (address, network) - Same address on different networks
```
**Supports multiple chains without separate tables**

### **Pattern 3: Chain-Specific Namespaces**
```
lisk_*     - Lisk blockchain (11 tables)
starknet_* - Starknet blockchain (separate schema)
ba_*       - Universal analytics (11 tables)
mc_*       - Multi-chain indexer (6 tables)
```
**Prevents conflicts, allows independent scaling**

### **Pattern 4: Nullable Foreign Keys for Flexibility**
```
unified_addresses
  ├── webzjs_wallet_id (FK, nullable) → SET NULL on delete
  └── devtool_wallet_id (FK, nullable) → SET NULL on delete
```
**Allows optional relationships without breaking constraints**

---

## 📈 Cardinality Summary

| Relationship Type | Count | Examples |
|------------------|-------|----------|
| **1:1** | 3 | users→profiles, users→startup_details, sc_subscriptions→users |
| **1:N** | 45+ | users→projects, projects→wallets, ba_chains→ba_transactions |
| **N:1** | 30+ | projects→users, wallets→projects, ba_transactions→ba_chains |
| **N:M** | 2 | users↔projects (via watchlist), addresses↔transactions (via address_tx) |

---

## ⚠️ Critical Issues & Recommendations

### **Issue 1: Missing Chain Normalization**
❌ **Problem**: `wallets.network` and `projects.chain` are VARCHAR (free text)
✅ **Solution**: Create `chains` table with proper foreign keys

```sql
CREATE TABLE chains (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    chain_id BIGINT UNIQUE,
    network_type VARCHAR(20), -- 'mainnet', 'testnet'
    is_active BOOLEAN DEFAULT true
);

ALTER TABLE wallets ADD COLUMN chain_id INTEGER REFERENCES chains(id);
ALTER TABLE projects ADD COLUMN chain_id INTEGER REFERENCES chains(id);
```

### **Issue 2: Inconsistent Multi-Chain Approach**
❌ **Problem**: Three different multi-chain patterns:
1. `wallets` - Single table with network column
2. `lisk_*` - Separate namespace
3. `ba_*` - Universal schema with chain_id FK

✅ **Recommendation**: Standardize on **ba_* pattern** for new chains

### **Issue 3: No Direct User→Wallet Relationship**
❌ **Problem**: Users access wallets only through projects
✅ **Solution**: Add optional `user_id` to wallets for personal wallets

```sql
ALTER TABLE wallets ADD COLUMN user_id UUID REFERENCES users(id);
-- Allow either user_id OR project_id
ALTER TABLE wallets DROP CONSTRAINT wallets_project_id_fkey;
ALTER TABLE wallets ADD CONSTRAINT wallets_owner_check 
    CHECK ((user_id IS NOT NULL) OR (project_id IS NOT NULL));
```

### **Issue 4: ba_wallets vs wallets Duplication**
❌ **Problem**: Two separate wallet registries
✅ **Solution**: Merge or create clear separation of concerns

---

## ✅ Strengths

1. ✅ **Proper CASCADE deletes** - Clean data removal
2. ✅ **UUID primary keys** - Distributed system ready
3. ✅ **Comprehensive indexing** - Fast queries
4. ✅ **Flexible multi-chain** - Multiple approaches available
5. ✅ **Privacy support** - Shielded addresses, unified addresses
6. ✅ **Audit trail** - created_at, updated_at everywhere
7. ✅ **JSONB metadata** - Flexible data storage

---

## 🎯 Multi-Chain Strategy Recommendation

### **Proposed Unified Architecture**

```
Core Application Layer (users, projects, api_keys)
    ↓
Chain Registry Layer (chains table)
    ↓
Universal Analytics Layer (ba_* tables)
    ↓
Chain-Specific Indexers (lisk_*, starknet_*, etc.)
```

**Benefits**:
- Single source of truth for chains
- Consistent foreign key relationships
- Easy to add new chains
- Clear separation of concerns
- Cross-chain analytics enabled

---

## 📊 Current State: Multi-Chain Support

| Feature | Status | Implementation |
|---------|--------|----------------|
| Multiple chains per user | ✅ | Via projects + wallets |
| Chain-specific data | ✅ | lisk_*, starknet_* namespaces |
| Cross-chain analytics | ✅ | ba_* tables |
| Chain registry | ⚠️ | VARCHAR, not normalized |
| Unified wallet view | ❌ | Separate registries |
| Chain-agnostic queries | ⚠️ | Possible but complex |

**Overall**: **70% complete** - Functional but needs normalization and standardization.
