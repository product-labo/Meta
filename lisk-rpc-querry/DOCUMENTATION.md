# Lisk Modular Indexer - Complete Documentation

## 📚 Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Usage](#usage)
6. [API Reference](#api-reference)
7. [Database Schema](#database-schema)
8. [Testing](#testing)
9. [Performance](#performance)
10. [Troubleshooting](#troubleshooting)

---

## Overview

Full-fidelity Lisk blockchain indexer with modular architecture support.

**Features:**
- ✅ Module/command-based transactions
- ✅ Token balance tracking (available + locked)
- ✅ State snapshots and deltas
- ✅ Reorg handling
- ✅ Zero data loss (raw RPC storage)

---

## Architecture

```
┌─────────────────┐
│  Lisk RPC Node  │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  LiskRPCClient  │ ← RPC communication
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  LiskIndexer    │ ← Main indexer service
└────────┬────────┘
         │
         ├→ BlockRepository
         ├→ TransactionRepository
         ├→ EventRepository
         ├→ AccountRepository
         ├→ TokenBalanceRepository
         ├→ StateSnapshotRepository
         └→ ... (11 repositories)
         │
         ↓
┌─────────────────┐
│  PostgreSQL DB  │ ← 12 tables
└─────────────────┘
```

---

## Installation

```bash
cd /mnt/c/pr0/meta/lisk-rpc-querry

# Install dependencies
npm install

# Setup database
sudo -u postgres psql -d meta_test -f database/new-lisk-schema.sql

# Configure environment
cp .env.example .env
# Edit .env with your settings
```

---

## Configuration

### `.env` File:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=meta_test
DB_USER=postgres
DB_PASSWORD=

# Lisk RPC
LISK_MAINNET_RPC=https://rpc.api.lisk.com

# Indexer
CHAIN_ID=1
BATCH_SIZE=100
POLL_INTERVAL=5000
```

---

## Usage

### Start Indexing:
```bash
npx ts-node src/index.ts
```

### Run Tests:
```bash
npx ts-node src/tests/propertyTests.ts
```

### Check Progress:
```sql
SELECT * FROM sync_state;
SELECT COUNT(*) FROM blocks;
SELECT COUNT(*) FROM transactions;
```

---

## API Reference

### Repositories

#### ChainConfigRepository
```typescript
insertChainConfig(config: ChainConfig): Promise<void>
getChainConfig(chain_id: number): Promise<ChainConfig | null>
updateSyncState(chain_id: number, height: number): Promise<void>
getSyncState(chain_id: number): Promise<SyncState | null>
```

#### BlockRepository
```typescript
insertBlock(block: Block): Promise<void>
getBlock(block_id: string): Promise<Block | null>
getBlockByHeight(chain_id: number, height: number): Promise<Block | null>
deleteBlocksAboveHeight(chain_id: number, height: number): Promise<void>
```

#### TransactionRepository
```typescript
insertTransaction(tx: Transaction): Promise<void>
getTransaction(tx_id: string): Promise<Transaction | null>
getTransactionsByBlock(block_id: string): Promise<Transaction[]>
```

#### TokenBalanceRepository
```typescript
upsertTokenBalance(balance: TokenBalance): Promise<void>
getTokenBalance(address: string, token_id: string): Promise<TokenBalance | null>
getAllBalances(address: string): Promise<TokenBalance[]>
```

---

## Database Schema

### Core Tables:
- `chain_config` - Chain configuration
- `sync_state` - Sync progress
- `blocks` - Block data
- `transactions` - Transactions with module/command
- `events` - Event logs
- `accounts` - Address registry

### Token System:
- `token_balances` - Available + locked balances
- `token_locks` - Lock management

### State Management:
- `account_state_snapshots` - State per module
- `account_state_deltas` - State changes

### Relationships:
- `transaction_accounts` - Many-to-many tx ↔ accounts

### Zero Data Loss:
- `raw_rpc_responses` - Raw RPC JSON

---

## Testing

### Property Tests:
```bash
npx ts-node src/tests/propertyTests.ts
```

**Tests:**
1. Chain config completeness
2. Block height uniqueness
3. Function key computation
4. Event ordering
5. Account height validation
6. Non-negative balances
7. Cascade delete behavior

---

## Performance

### Indexing Speed:
- ~100 blocks/minute (default batch size)
- Adjustable via `BATCH_SIZE` env var

### Database Size:
- ~1GB per 100K blocks (with full data)
- Indexes: ~40% of total size

### Optimization Tips:
1. Increase `BATCH_SIZE` for faster sync
2. Use connection pooling (default: 20 connections)
3. Regular VACUUM ANALYZE
4. Consider partitioning for large datasets

---

## Troubleshooting

### Issue: "Connection refused"
**Solution:** Check PostgreSQL is running
```bash
sudo service postgresql status
```

### Issue: "Table does not exist"
**Solution:** Run schema creation
```bash
sudo -u postgres psql -d meta_test -f database/new-lisk-schema.sql
```

### Issue: "RPC timeout"
**Solution:** Check RPC endpoint or increase timeout

### Issue: "Reorg detected"
**Solution:** Automatic - indexer will rollback and re-sync

---

## Advanced Features

### State Computation:
```typescript
import { stateComputer } from './services/StateComputer';

const state = await stateComputer.computeAccountState(
  'lsk123...', 
  'token', 
  1000000
);
```

### Reorg Handling:
```typescript
import { ReorgHandler } from './services/ReorgHandler';

const handler = new ReorgHandler(1);
const hasReorg = await handler.detectAndHandleReorg(currentHeight);
```

---

## Migration

### From Old Schema:
```bash
./scripts/migrate-schema.sh
```

This will:
1. Backup old data
2. Export to CSV
3. Verify new schema
4. Ready for indexing

---

## Support

- **Issues:** Report in project repository
- **Docs:** See `.kiro/specs/lisk-schema-restructure/`
- **Schema:** `database/new-lisk-schema.sql`

---

**Version:** 1.0.0  
**Last Updated:** 2026-01-14
