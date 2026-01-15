# Data Schema Overview - Meta Project

**Generated:** 2026-01-14  
**Project:** Multi-Chain Blockchain Analytics Platform

---

## 🏗️ Architecture Overview

This project uses a **multi-database, multi-chain architecture** with the following components:

### 1. **Main Backend Database** (`backend/schema.sql`)
- **Purpose:** Core application logic, user management, projects, payments
- **Database:** PostgreSQL
- **Key Features:**
  - User authentication & authorization
  - Project management
  - Multi-chain wallet support
  - Payment & invoice system
  - Subscription management

### 2. **Multi-Chain Indexer** (`backend/multi-chain-indexer/`)
- **Purpose:** Universal blockchain data indexer for multiple chains
- **Database:** PostgreSQL with chain-specific tables
- **Key Features:**
  - Chain configuration management
  - Block & transaction indexing
  - Smart contract monitoring
  - Cross-chain analytics

### 3. **Lisk Chain Indexer** (`lisk-rpc-querry/`)
- **Purpose:** Specialized Lisk blockchain indexer
- **Database:** PostgreSQL
- **Key Features:**
  - Lisk-specific block/transaction data
  - Real-time sync state management
  - Chain reorg handling

### 4. **Starknet Indexer** (`starknet-rpc-query/`)
- **Purpose:** Starknet L2 blockchain indexer
- **Database:** PostgreSQL
- **Key Features:**
  - Starknet blocks, transactions, events
  - Contract class management
  - Execution call tracking

### 5. **Universal ABI Parser** (`abipara/`)
- **Purpose:** Cross-chain smart contract ABI indexer
- **Database:** PostgreSQL with Drizzle ORM
- **Key Features:**
  - Multi-chain contract tracking (Ethereum, Starknet, Beacon)
  - Function signature indexing
  - Event/log parsing
  - Wallet analytics

---

## 📊 Core Database Schemas

### **Backend Schema** (`backend/schema.sql`)

#### **User Management**
```sql
users
├── id (UUID, PK)
├── email (VARCHAR, UNIQUE)
├── password_hash (VARCHAR)
├── subscription_status (VARCHAR) -- 'free', 'pro', 'enterprise'
├── subscription_expires (TIMESTAMP)
├── is_admin (BOOLEAN)
├── onboarding_completed (BOOLEAN)
├── default_wallet_address (VARCHAR)
└── created_at, updated_at (TIMESTAMP)

Relationships:
- 1:N → projects
- 1:N → wallets (via projects)
- 1:N → api_keys
- 1:N → invoices
- 1:N → unified_addresses
```

#### **Project Management**
```sql
projects
├── id (UUID, PK)
├── user_id (UUID, FK → users)
├── name (VARCHAR)
├── description (TEXT)
├── category (VARCHAR) -- 'defi', 'nft', 'gaming', etc.
├── chain (VARCHAR) -- 'lisk', 'starknet', 'ethereum', etc.
├── status (VARCHAR) -- 'active', 'paused', 'archived'
├── tags (TEXT[])
├── launch_date (TIMESTAMP)
├── funding_stage (VARCHAR) -- 'seed', 'series_a', etc.
├── team_size (INTEGER)
└── created_at, updated_at (TIMESTAMP)

Relationships:
- N:1 → users
- 1:N → wallets
- 1:N → project_metrics
```

#### **Multi-Chain Wallet System**
```sql
wallets
├── id (UUID, PK)
├── project_id (UUID, FK → projects)
├── address (VARCHAR)
├── network (VARCHAR) -- 'lisk', 'starknet', 'ethereum'
├── type (VARCHAR) -- 'hot', 'cold', 'multisig'
├── label (VARCHAR)
└── created_at (TIMESTAMP)

Indexes:
- idx_wallets_address
- idx_wallets_network
- idx_wallets_project_id
```

#### **Payment & Invoice System**
```sql
unified_invoices
├── id (UUID, PK)
├── user_id (UUID, FK → users)
├── unified_address_id (UUID, FK → unified_addresses)
├── amount (NUMERIC)
├── currency (VARCHAR) -- 'LSK', 'STRK', 'ETH'
├── status (VARCHAR) -- 'pending', 'paid', 'expired'
├── expires_at (TIMESTAMP)
└── created_at, updated_at (TIMESTAMP)

unified_payments
├── id (UUID, PK)
├── unified_invoice_id (UUID, FK → unified_invoices)
├── txid (VARCHAR)
├── amount (NUMERIC)
├── method (VARCHAR) -- 'transparent', 'shielded'
├── status (VARCHAR)
└── confirmed_at (TIMESTAMP)
```

---

### **Multi-Chain Indexer Schema** (`backend/multi-chain-indexer/`)

#### **Chain Configuration**
```sql
mc_chains
├── id (SERIAL, PK)
├── name (VARCHAR) -- 'ethereum', 'starknet', 'lisk'
├── rpc_urls (TEXT[])
├── block_time_sec (INTEGER)
└── is_active (BOOLEAN)

mc_registry
├── id (SERIAL, PK)
├── chain_id (INTEGER, FK → mc_chains)
├── address (VARCHAR) -- Contract address
├── category (VARCHAR) -- 'dex', 'lending', 'nft'
├── name (VARCHAR)
├── target_functions (JSONB)
├── abi_definitions (JSONB)
└── monitor_events (BOOLEAN)
```

#### **Blockchain Data**
```sql
mc_chain_snapshots
├── id (BIGSERIAL, PK)
├── cycle_id (INTEGER, FK → mc_rotation_cycles)
├── chain_id (INTEGER, FK → mc_chains)
├── block_number (BIGINT)
├── block_timestamp (TIMESTAMP)
├── gas_price (NUMERIC)
└── captured_at (TIMESTAMP)

mc_entity_snapshots
├── id (BIGSERIAL, PK)
├── cycle_id (INTEGER, FK → mc_rotation_cycles)
├── chain_id (INTEGER, FK → mc_chains)
├── contract_address (VARCHAR)
├── function_signature (VARCHAR)
├── call_count (BIGINT)
└── total_value (NUMERIC)
```

---

### **Universal Smart Contract Schema** (`backend/migrations/019_universal_smart_contract_indexer_schema.sql`)

#### **Function Signatures**
```sql
function_signatures
├── id (UUID, PK)
├── selector (VARCHAR) -- '0x12345678'
├── signature (TEXT) -- 'transfer(address,uint256)'
├── function_name (VARCHAR) -- 'transfer'
├── category (VARCHAR) -- 'erc20', 'erc721', 'dex'
├── subcategory (VARCHAR) -- 'transfer', 'approval', 'swap'
├── protocol (VARCHAR) -- 'uniswap', 'compound', 'aave'
├── abi_inputs (JSONB)
├── abi_outputs (JSONB)
├── is_payable (BOOLEAN)
├── is_view (BOOLEAN)
├── source (VARCHAR) -- '4byte', 'manual', 'contract_abi'
├── usage_count (BIGINT)
└── created_at, updated_at (TIMESTAMP)

Indexes:
- idx_function_signatures_selector
- idx_function_signatures_category
- idx_function_signatures_protocol
```

---

### **Lisk Chain Schema** (`lisk-rpc-querry/database/schema.sql`)

```sql
chain_config
├── chain_id (INTEGER, PK)
├── chain_name (VARCHAR)
├── rpc_url (VARCHAR)
├── start_block (BIGINT)
├── finality_depth (INTEGER)
└── reorg_depth (INTEGER)

blocks
├── block_number (BIGINT, PK)
├── chain_id (INTEGER, FK → chain_config)
├── block_hash (VARCHAR, UNIQUE)
├── parent_hash (VARCHAR)
├── timestamp (BIGINT)
├── gas_limit (BIGINT)
├── gas_used (BIGINT)
├── miner (VARCHAR)
└── transaction_count (INTEGER)

transactions
├── tx_hash (VARCHAR, PK)
├── block_number (BIGINT, FK → blocks)
├── from_address (VARCHAR)
├── to_address (VARCHAR)
├── value (NUMERIC)
├── gas_limit (BIGINT)
├── gas_price (BIGINT)
└── nonce (BIGINT)
```

---

### **Starknet Schema** (`starknet-rpc-query/database-documentation.sql`)

```sql
blocks
├── block_number (BIGINT, PK)
├── block_hash (VARCHAR, UNIQUE)
├── parent_block_hash (VARCHAR)
├── timestamp (BIGINT)
├── finality_status (VARCHAR) -- 'PENDING', 'ACCEPTED_ON_L2', 'ACCEPTED_ON_L1'
└── created_at (TIMESTAMP)

transactions
├── tx_hash (VARCHAR, PK)
├── block_number (BIGINT, FK → blocks)
├── tx_type (VARCHAR) -- 'INVOKE', 'DEPLOY_ACCOUNT', 'DECLARE'
├── sender_address (VARCHAR)
├── entry_point_selector (VARCHAR)
├── status (VARCHAR)
└── actual_fee (NUMERIC)

contracts
├── contract_address (VARCHAR, PK)
├── class_hash (VARCHAR)
├── deployer_address (VARCHAR)
├── deployment_tx_hash (VARCHAR)
├── deployment_block (BIGINT)
└── is_proxy (BOOLEAN)

events
├── event_id (SERIAL, PK)
├── tx_hash (VARCHAR, FK → transactions)
├── contract_address (VARCHAR, FK → contracts)
├── block_number (BIGINT)
├── event_name (VARCHAR)
└── event_data (JSONB)

contract_classes
├── class_hash (VARCHAR, PK)
├── abi_json (JSONB)
├── declared_tx_hash (VARCHAR)
└── declared_block (BIGINT)
```

---

### **Universal ABI Parser Schema** (`abipara/src/lib/schema.ts`)

Using **Drizzle ORM** with TypeScript:

```typescript
ba_chains
├── id (UUID, PK)
├── name (TEXT) -- 'ethereum', 'starknet', 'beacon'
├── chainId (BIGINT)
├── rpcUrl (TEXT)
└── isActive (BOOLEAN)

ba_smart_contracts
├── id (UUID, PK)
├── chainId (UUID, FK → ba_chains)
├── categoryId (UUID, FK → ba_categories)
├── address (TEXT)
├── name (TEXT)
├── symbol (TEXT)
├── deploymentBlock (BIGINT)
├── abi (JSONB)
└── isVerified (BOOLEAN)

ba_function_signatures
├── id (UUID, PK)
├── contractId (UUID, FK → ba_smart_contracts)
├── signature (TEXT) -- '0x12345678'
├── functionName (TEXT) -- 'transfer'
├── functionAbi (JSONB)
└── isActive (BOOLEAN)

ba_transactions
├── id (UUID, PK)
├── chainId (UUID, FK → ba_chains)
├── contractId (UUID, FK → ba_smart_contracts)
├── functionSigId (UUID, FK → ba_function_signatures)
├── fromWalletId (UUID, FK → ba_wallets)
├── toWalletId (UUID, FK → ba_wallets)
├── hash (TEXT)
├── blockNumber (BIGINT)
├── gasUsed (BIGINT)
├── value (TEXT)
├── status (TEXT)
├── inputData (TEXT)
├── decodedInput (JSONB)
└── timestamp (TIMESTAMP)

ba_events
├── id (UUID, PK)
├── transactionId (UUID, FK → ba_transactions)
├── contractId (UUID, FK → ba_smart_contracts)
├── eventName (TEXT)
├── eventSignature (TEXT)
├── logIndex (INTEGER)
├── topics (JSONB)
└── decodedData (JSONB)
```

---

## 🔗 Key Relationships

### **Cross-Database Relationships**

```
users (backend)
  └─→ projects (backend)
       └─→ wallets (backend)
            ├─→ lisk_transactions (lisk-rpc-querry)
            ├─→ starknet transactions (starknet-rpc-query)
            └─→ ba_transactions (abipara)

mc_chains (multi-chain-indexer)
  └─→ mc_registry (contracts)
       └─→ mc_entity_snapshots (analytics)

ba_chains (abipara)
  └─→ ba_smart_contracts
       ├─→ ba_function_signatures
       └─→ ba_transactions
            └─→ ba_events
```

### **Data Flow**

1. **User Registration** → `users` table
2. **Project Creation** → `projects` table (linked to user)
3. **Wallet Addition** → `wallets` table (linked to project)
4. **Blockchain Indexing**:
   - Lisk → `lisk-rpc-querry` database
   - Starknet → `starknet-rpc-query` database
   - Universal → `abipara` database
5. **Analytics** → `mc_entity_snapshots`, `project_metrics`
6. **Payments** → `unified_invoices` → `unified_payments`

---

## 📈 Analytics & Metrics

### **Project Metrics**
```sql
project_metrics
├── id (UUID, PK)
├── project_id (UUID, FK → projects)
├── metric_type (VARCHAR) -- 'tvl', 'users', 'transactions'
├── value (NUMERIC)
├── timestamp (TIMESTAMP)
└── metadata (JSONB)
```

### **Watchlist & Alerts**
```sql
watchlist
├── id (UUID, PK)
├── user_id (UUID, FK → users)
├── project_id (UUID, FK → projects)
└── created_at (TIMESTAMP)

alerts
├── id (UUID, PK)
├── user_id (UUID, FK → users)
├── project_id (UUID, FK → projects)
├── alert_type (VARCHAR) -- 'price', 'volume', 'event'
├── condition (JSONB)
├── is_active (BOOLEAN)
└── triggered_at (TIMESTAMP)
```

---

## 🔐 Security & Access Control

### **API Keys**
```sql
api_keys
├── id (UUID, PK)
├── user_id (UUID, FK → users)
├── key_hash (VARCHAR)
├── name (VARCHAR)
├── permissions (JSONB)
├── last_used_at (TIMESTAMP)
└── expires_at (TIMESTAMP)
```

### **Subscription Tiers**
- **Free**: Basic analytics, limited API calls
- **Pro**: Advanced analytics, higher API limits
- **Enterprise**: Full access, custom integrations

---

## 🛠️ Technology Stack

- **Database:** PostgreSQL 17.x
- **ORM:** 
  - Drizzle ORM (abipara)
  - Raw SQL (backend, indexers)
- **Languages:**
  - TypeScript (primary)
  - JavaScript (legacy)
- **Indexing:**
  - RPC polling
  - WebSocket subscriptions
  - Event-driven processing

---

## 📝 Key Design Patterns

1. **Multi-Tenancy**: Users → Projects → Wallets
2. **Chain Abstraction**: Unified wallet/transaction interface across chains
3. **Event Sourcing**: All blockchain events stored for replay
4. **CQRS**: Separate read/write models for analytics
5. **Time-Series Data**: Metrics stored with timestamps for trending
6. **Soft Deletes**: Records marked inactive rather than deleted

---

## 🚀 Future Enhancements

- [ ] Add more chain support (Polygon, Arbitrum, Optimism)
- [ ] Implement GraphQL API layer
- [ ] Add real-time WebSocket subscriptions
- [ ] Implement data archival strategy
- [ ] Add machine learning models for predictions
- [ ] Implement cross-chain bridge tracking

---

## 📚 Related Documentation

- [DATABASE_RELATIONSHIPS.md](./DATABASE_RELATIONSHIPS.md) - Detailed relationship mapping
- [backend/README.md](./backend/README.md) - Backend setup guide
- [abipara/README.md](./abipara/README.md) - ABI parser documentation
- [lisk-rpc-querry/README.md](./lisk-rpc-querry/README.md) - Lisk indexer guide
- [starknet-rpc-query/README.md](./starknet-rpc-query/README.md) - Starknet indexer guide

---

**Last Updated:** 2026-01-14  
**Maintainer:** Meta Project Team
