# Lisk RPC Query Indexer - Project Summary

## 📋 Overview
A high-performance blockchain data indexer for Lisk with modular architecture support, RPC fallback, and PostgreSQL storage.

---

## 🗄️ Database: PostgreSQL

**Database Name:** `meta_test`  
**User:** `lisk_indexer`  
**Password:** `lisk123`

### Schema Tables (12 total):
1. `chain_config` - Chain configuration
2. `sync_state` - Sync progress tracking
3. `blocks` - Block data
4. `transactions` - Transactions with module/command
5. `events` - Event logs
6. `accounts` - Address registry
7. `token_balances` - Available + locked balances
8. `token_locks` - Lock management
9. `account_state_snapshots` - State per module
10. `account_state_deltas` - State changes
11. `transaction_accounts` - Many-to-many tx ↔ accounts
12. `raw_rpc_responses` - Raw RPC JSON (zero data loss)

**Schema File:** `database/new-lisk-schema.sql`

---

## 🚀 How to Start

### Option 1: Quick Start (Recommended)
```bash
cd /mnt/c/pr0/meta/lisk-rpc-querry
npm install
npx ts-node src/index.ts
```

### Option 2: Continuous Indexer with Monitoring
```bash
./run-continuous.sh
```

### Option 3: Using the Service Script
```bash
./indexer.sh start    # Start indexer
./indexer.sh stop     # Stop indexer
./indexer.sh status   # Check status
./indexer.sh logs     # View logs
./indexer.sh restart  # Restart indexer
```

### Option 4: Development Mode
```bash
npm run dev           # Continuous sync
npm run indexer       # Main indexer
npm run monitor       # Dashboard
```

---

## 📁 Project Structure

```
lisk-rpc-querry/
├── src/
│   ├── index.ts                    # Main entry point
│   ├── services/
│   │   ├── LiskIndexer.ts         # Core indexer service
│   │   ├── ReorgHandler.ts        # Reorg detection/handling
│   │   └── StateComputer.ts       # State computation
│   ├── repositories/              # Database repositories (11 files)
│   ├── rpc/
│   │   └── LiskRPCClient.ts       # RPC client with fallback
│   ├── database/
│   │   └── db.ts                  # PostgreSQL connection
│   └── tests/
│       └── propertyTests.ts       # Property-based tests
├── database/
│   └── new-lisk-schema.sql        # Database schema
├── scripts/
│   └── migrate-schema.sh          # Migration script
├── .env                           # Configuration
├── package.json                   # Dependencies
├── run-continuous.sh              # Continuous indexer runner
└── indexer.sh                     # Service management script
```

---

## ⚙️ Configuration (.env)

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=meta_test
DB_USER=lisk_indexer
DB_PASSWORD=lisk123

# Lisk RPC
LISK_MAINNET_RPC=https://lisk.drpc.org
LISK_SEPOLIA_RPC=https://rpc.sepolia-api.lisk.com

# Chain
CHAIN_ID=1
CHAIN_NAME=lisk-mainnet
START_BLOCK=25543000

# Indexer
BATCH_SIZE=50
POLL_INTERVAL=3000
MAX_RETRIES=3
```

---

## 🔍 Key Features

✅ **Module/Command-based Transactions** - Full Lisk modular architecture support  
✅ **Token Balance Tracking** - Available + locked balances  
✅ **State Snapshots & Deltas** - Complete state management  
✅ **Reorg Handling** - Automatic detection and rollback  
✅ **Zero Data Loss** - Raw RPC responses stored  
✅ **RPC Fallback** - Automatic failover between endpoints  
✅ **Real-time Indexing** - Live blockchain data ingestion  
✅ **Historical Data** - Fetch weeks/months of historical data  
✅ **Progress Monitoring** - Real-time stats and tracking  
✅ **Error Recovery** - Robust error handling and retry  

---

## 🧪 Testing

```bash
# Run property tests
npx ts-node src/tests/propertyTests.ts

# Test RPC connectivity
npx ts-node src/testRPC.ts

# Quick test
npx ts-node src/quickTest.ts
```

---

## 📊 Monitoring Progress

### Check Database Stats:
```sql
-- Connect to database
sudo -u postgres psql -d meta_test

-- Check sync state
SELECT * FROM sync_state;

-- Block count and range
SELECT COUNT(*) as blocks, 
       MIN(height) as earliest, 
       MAX(height) as latest 
FROM blocks;

-- Transaction count
SELECT COUNT(*) as transactions FROM transactions;
```

### Live Monitoring:
```bash
# Real-time dashboard
npm run monitor

# Watch logs
tail -f indexer.log
```

---

## 🗑️ Files Safe to Delete

### Large Log Files (6+ MB total):
- `combined.log` (4.0 MB)
- `error.log` (2.0 MB)

### Backup Files:
- `.env.book` (1.2 KB)

### Images:
- `ChatGPT Image Dec 23, 2025, 03_53_43 PM.png` (1.9 MB)

**Delete Command:**
```bash
cd /mnt/c/pr0/meta/lisk-rpc-querry
rm -f combined.log error.log .env.book "ChatGPT Image Dec 23, 2025, 03_53_43 PM.png"
```

---

## 📦 Dependencies

```json
{
  "dependencies": {
    "axios": "^1.13.2",        // HTTP client
    "commander": "^11.0.0",    // CLI framework
    "dotenv": "^17.2.3",       // Environment variables
    "pg": "^8.16.3",           // PostgreSQL client
    "winston": "^3.11.0"       // Logging
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/pg": "^8.10.0",
    "ts-node": "^10.9.0",
    "typescript": "^5.0.0"
  }
}
```

---

## 🏗️ Architecture

```
Lisk Blockchain → RPC Client → Indexer → PostgreSQL
     ↓              ↓           ↓          ↓
  Block Data → JSON-RPC → Processing → blocks
  Transactions → Fallback → Extraction → transactions  
  Receipts → Auto-retry → Storage → events
  State → Computation → Storage → account_state_*
```

---

## 🔧 Troubleshooting

### Database Connection Issues:
```bash
# Check PostgreSQL is running
sudo service postgresql status

# Test connection
sudo -u postgres psql -d meta_test -c "SELECT version();"
```

### RPC Issues:
```bash
# Test RPC connectivity
npx ts-node src/testRPC.ts
```

### Reset Sync State:
```sql
UPDATE sync_state SET last_synced_height = 0 WHERE chain_id = 1;
```

---

## 📚 Documentation

- **README.md** - Quick start guide
- **DOCUMENTATION.md** - Complete documentation
- **CONTINUOUS_INDEXING.md** - Continuous indexing guide
- **FINAL_COMPLETION.md** - Project completion summary
- **ALL_TASKS_COMPLETE.md** - Task completion checklist

---

## 🎯 Current Status

✅ Production-ready  
✅ Database schema deployed  
✅ RPC fallback working  
✅ Real-time indexing functional  
✅ Historical fetching operational  
✅ Monitoring dashboards available  
✅ Property tests passing  

---

**Version:** 1.0.0  
**Last Updated:** 2026-01-15
