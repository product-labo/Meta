# Local Database Status Report

**Generated:** 2026-01-14 14:07  
**PostgreSQL Version:** 16.10

---

## ✅ Database Status: RUNNING

PostgreSQL is running and accessible with 2 main databases:

### 1. **meta_test** (Main Application Database)
- **Owner:** postgres
- **Tables:** 40 tables
- **Status:** ✅ Schema created, empty (no data)
- **Purpose:** Main application backend

### 2. **zcash_indexer** (Legacy/Multi-Chain Database)
- **Owner:** zcash_user
- **Tables:** 96+ tables
- **Status:** ✅ Schema created, contains data
- **Purpose:** Multi-chain indexing and analytics

---

## 📊 Database: `meta_test` (40 Tables)

### **Core Application Tables**

#### **User Management**
```sql
users (0 records)
├── id (UUID, PK)
├── email (VARCHAR, UNIQUE)
├── password_hash (VARCHAR)
├── subscription_status (ENUM: free, premium, enterprise)
├── subscription_expires_at (TIMESTAMP)
├── is_admin (BOOLEAN)
├── onboarding_completed (BOOLEAN)
└── balance_zec (NUMERIC)

profiles
├── user_id (UUID, FK → users)
├── bio, avatar_url, social_links
└── preferences (JSONB)

startup_details
├── user_id (UUID, FK → users)
├── company_name, industry, stage
└── funding_amount, team_size
```

#### **Project Management**
```sql
projects (0 records)
├── id (UUID, PK)
├── user_id (UUID, FK → users)
├── name, description, category
├── chain (VARCHAR: 'lisk', 'starknet', 'ethereum')
├── status (ENUM: draft, active, paused, archived)
├── tags (TEXT[])
├── launched_at (TIMESTAMP)
├── features_count, user_count_7d, growth_score
└── audit_status, volume

project_metrics
├── project_id (FK → projects)
├── metric_type, value
└── timestamp

watchlist
├── user_id (FK → users)
└── project_id (FK → projects)

alerts
├── user_id (FK → users)
├── project_id (FK → projects)
├── alert_type, condition (JSONB)
└── is_active
```

#### **Multi-Chain Wallet System**
```sql
wallets (0 records)
├── id (UUID, PK)
├── project_id (UUID, FK → projects)
├── address (TEXT)
├── type (ENUM: hot, cold, multisig)
├── privacy_mode (ENUM: public, private, shielded)
├── network (VARCHAR: mainnet, testnet)
└── is_active (BOOLEAN)

Indexes:
- idx_wallets_address
- idx_wallets_network
- idx_wallets_project_id
- wallets_address_network_key (UNIQUE)
```

#### **Lisk Chain Tables**
```sql
lisk_chain_config
├── chain_id, chain_name, rpc_url
└── start_block, finality_depth

lisk_blocks
├── block_number (PK)
├── block_hash, parent_hash
├── timestamp, gas_used
└── transaction_count

lisk_transactions
├── tx_hash (PK)
├── block_number (FK → lisk_blocks)
├── from_address, to_address
├── value, gas_price
└── status

lisk_contracts
├── contract_address (PK)
├── deployer_address
├── deployment_tx_hash
└── abi (JSONB)

lisk_wallets
├── wallet_address (PK)
├── first_seen, last_seen
├── total_transactions
└── balance

lisk_wallet_interactions
├── wallet_address (FK → lisk_wallets)
├── contract_address (FK → lisk_contracts)
└── interaction_count
```

#### **Payment & Invoice System**
```sql
unified_addresses
├── id (UUID, PK)
├── user_id (FK → users)
├── unified_address (TEXT, UNIQUE)
├── network (VARCHAR)
└── diversifier (TEXT)

unified_invoices
├── id (UUID, PK)
├── user_id (FK → users)
├── unified_address_id (FK → unified_addresses)
├── amount, currency
├── status (pending, paid, expired)
└── expires_at

unified_payments
├── id (UUID, PK)
├── unified_invoice_id (FK → unified_invoices)
├── txid, amount, method
└── confirmed_at

withdrawals
├── id (UUID, PK)
├── user_id (FK → users)
├── to_address, amount
├── status (pending, processing, completed, failed)
└── processed_at
```

#### **Legacy Wallet Systems**
```sql
webzjs_wallets
├── user_id (FK → users)
├── address, network
└── balance

devtool_wallets
├── user_id (FK → users)
├── address, network
└── balance

webzjs_invoices, devtool_invoices
├── wallet_id, user_id
├── amount, status
└── expires_at
```

#### **API & Access Control**
```sql
api_keys
├── id (UUID, PK)
├── user_id (FK → users)
├── key_hash (VARCHAR)
├── name, permissions (JSONB)
└── expires_at
```

#### **Blockchain Data (Legacy Zcash)**
```sql
blocks
├── height (PK)
├── hash, prev_hash
├── timestamp, difficulty
└── tx_count

transactions
├── txid (PK)
├── block_height (FK → blocks)
├── version, locktime
└── size

addresses
├── address (PK)
├── balance, tx_count
└── first_seen, last_seen

address_tx
├── address (FK → addresses)
├── txid (FK → transactions)
└── value, type

inputs, outputs
├── txid (FK → transactions)
├── address, value
└── script
```

---

## 📊 Database: `zcash_indexer` (96+ Tables)

### **Multi-Chain Indexer Tables**

#### **Chain Configuration**
```sql
mc_chains
├── id (SERIAL, PK)
├── name (VARCHAR: ethereum, starknet, lisk)
├── rpc_urls (TEXT[])
├── chain_id (VARCHAR)
├── block_time_sec (INTEGER)
└── is_active (BOOLEAN)

mc_registry
├── chain_id (FK → mc_chains)
├── address (contract address)
├── category (dex, lending, nft)
├── name, target_functions (JSONB)
└── abi_definitions (JSONB)

mc_rotation_cycles
├── id (SERIAL, PK)
├── start_time, end_time
└── status (ACTIVE, COMPLETED)
```

#### **Blockchain Snapshots**
```sql
mc_chain_snapshots
├── cycle_id (FK → mc_rotation_cycles)
├── chain_id (FK → mc_chains)
├── block_number, block_timestamp
├── gas_price, base_fee
└── captured_at

mc_entity_snapshots
├── cycle_id (FK → mc_rotation_cycles)
├── chain_id (FK → mc_chains)
├── contract_address
├── function_signature
└── call_count, total_value
```

#### **Transaction & Event Data**
```sql
mc_transactions
├── chain_id (FK → mc_chains)
├── tx_hash, block_number
├── from_address, to_address
├── value, gas_used
└── status

mc_transaction_details
├── transaction_id (FK → mc_transactions)
├── input_data, decoded_input (JSONB)
└── error_message

mc_event_logs
├── transaction_id (FK → mc_transactions)
├── contract_address
├── event_signature, topics (JSONB)
└── decoded_data (JSONB)

mc_decoded_events
├── event_log_id (FK → mc_event_logs)
├── event_name
└── parameters (JSONB)
```

#### **Smart Contract Analytics**
```sql
mc_function_signatures
├── signature (0x12345678)
├── function_name
├── abi (JSONB)
└── usage_count

mc_event_signatures
├── signature (0x...)
├── event_name
└── abi (JSONB)

mc_contract_state
├── contract_address
├── chain_id (FK → mc_chains)
├── state_data (JSONB)
└── last_updated

function_metrics_daily
├── function_signature
├── date, call_count
└── total_gas_used

function_usage_analytics
├── function_signature
├── contract_address
└── usage_patterns (JSONB)
```

#### **DeFi & NFT Tracking**
```sql
mc_defi_interactions
├── chain_id (FK → mc_chains)
├── protocol_name
├── interaction_type (swap, lend, borrow)
├── token_in, token_out
└── amount_in, amount_out

mc_token_transfers
├── chain_id (FK → mc_chains)
├── token_address
├── from_address, to_address
└── amount

mc_nft_transfers
├── chain_id (FK → mc_chains)
├── collection_address
├── token_id, from_address, to_address
└── transaction_hash

mc_token_prices
├── chain_id (FK → mc_chains)
├── token_address
├── price_usd
└── timestamp
```

#### **Address Analytics**
```sql
mc_address_analytics
├── chain_id (FK → mc_chains)
├── address
├── transaction_count
├── total_value_sent, total_value_received
├── first_seen, last_seen
└── labels (TEXT[])
```

#### **Business Intelligence**
```sql
bi_contract_categories
├── category_name
└── description

bi_contract_index
├── contract_address
├── category_id (FK → bi_contract_categories)
├── chain_id (FK → mc_chains)
└── metadata (JSONB)

contract_functions
├── contract_address
├── function_signature
└── call_frequency

smart_contract_metadata
├── contract_address
├── name, symbol
├── total_supply
└── verified (BOOLEAN)
```

#### **User & Project Analytics**
```sql
users (zcash_indexer)
├── Similar to meta_test
└── Additional analytics fields

projects (zcash_indexer)
├── Similar to meta_test
└── Additional metrics

user_activity_metrics
├── user_id
├── daily_active_days
└── engagement_score

user_engagement_summary
├── user_id
├── total_transactions
└── last_active

wallet_activity_metrics
├── wallet_address
├── transaction_count
└── activity_score

wallet_adoption_stages
├── wallet_address
├── stage (new, active, power_user)
└── stage_entered_at

wallet_behavior_flows
├── wallet_address
├── behavior_pattern
└── frequency

wallet_cohorts
├── cohort_name
└── criteria (JSONB)

wallet_cohort_assignments
├── wallet_address
├── cohort_id
└── assigned_at
```

#### **AI & Insights**
```sql
user_ai_insights
├── user_id
├── insight_type
├── insight_data (JSONB)
└── generated_at

ai_competitive_analysis
├── project_id
├── competitor_data (JSONB)
└── analysis_date

market_insights
├── market_segment
├── trend_data (JSONB)
└── timestamp
```

#### **System & Monitoring**
```sql
sync_logs
├── chain_id
├── last_synced_block
├── sync_status
└── error_message

system_metrics
├── metric_name
├── value
└── timestamp

daily_indexing_stats
├── date, chain_id
├── blocks_indexed
└── transactions_indexed

daily_summary_reports
├── date
├── summary_data (JSONB)
└── generated_at
```

---

## 🔗 Key Relationships

### **meta_test Database**
```
users (0)
  └─→ projects (0)
       ├─→ wallets (0)
       ├─→ project_metrics
       └─→ watchlist, alerts
  └─→ unified_addresses
       └─→ unified_invoices
            └─→ unified_payments
  └─→ api_keys
  └─→ profiles, startup_details
```

### **zcash_indexer Database**
```
mc_chains
  └─→ mc_registry (contracts)
       └─→ mc_transactions
            ├─→ mc_event_logs
            └─→ mc_transaction_details
  └─→ mc_chain_snapshots
  └─→ mc_entity_snapshots
```

---

## 📈 Current Data Status

### **meta_test**
- ✅ Schema: Fully created
- ❌ Data: Empty (0 users, 0 projects, 0 wallets)
- 🎯 Ready for: Application testing and development

### **zcash_indexer**
- ✅ Schema: Fully created
- ✅ Data: Contains historical data
- 🎯 Purpose: Multi-chain indexing and analytics

---

## 🚀 Quick Start Commands

### **Connect to Databases**
```bash
# meta_test (main app)
sudo -u postgres psql -d meta_test

# zcash_indexer (multi-chain)
sudo -u postgres psql -d zcash_indexer
```

### **Useful Queries**

#### **List all tables**
```sql
\dt
```

#### **Describe table structure**
```sql
\d+ users
\d+ projects
\d+ wallets
```

#### **Check data counts**
```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM projects;
SELECT COUNT(*) FROM wallets;
```

#### **View table relationships**
```sql
\d+ projects  -- Shows foreign keys
```

#### **Check indexes**
```sql
SELECT tablename, indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

---

## 🛠️ Database Management

### **Backup Database**
```bash
sudo -u postgres pg_dump meta_test > meta_test_backup.sql
sudo -u postgres pg_dump zcash_indexer > zcash_indexer_backup.sql
```

### **Restore Database**
```bash
sudo -u postgres psql -d meta_test < meta_test_backup.sql
```

### **Create New Database**
```bash
sudo -u postgres createdb new_database_name
```

### **Drop Database**
```bash
sudo -u postgres dropdb database_name
```

---

## 📝 Notes

1. **Empty Database**: `meta_test` has schema but no data - perfect for testing
2. **Multi-Chain Support**: Both databases support Lisk, Starknet, Ethereum
3. **Indexing**: `zcash_indexer` contains comprehensive blockchain indexing tables
4. **Analytics**: Extensive analytics tables for user behavior, wallet activity, and market insights
5. **Payment System**: Unified invoice/payment system across multiple chains

---

## 🔐 Database Credentials

**From .env.book:**
- Host: localhost
- Port: 5432
- User: david_user
- Password: Davidsoyaya@1015
- Database: david (not found - use meta_test or zcash_indexer)

**Postgres Superuser:**
- User: postgres
- Access: `sudo -u postgres psql`

---

## 📚 Related Files

- [DATA_SCHEMA_OVERVIEW.md](./DATA_SCHEMA_OVERVIEW.md) - Complete schema documentation
- [DATABASE_RELATIONSHIPS.md](./DATABASE_RELATIONSHIPS.md) - Relationship mapping
- [backend/schema.sql](./backend/schema.sql) - Main schema SQL
- [backend/migrations/](./backend/migrations/) - Migration files

---

**Last Updated:** 2026-01-14 14:07  
**Status:** ✅ PostgreSQL Running, Schemas Created, Ready for Use
