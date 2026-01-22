# Lisk RPC Query Indexer

A high-performance blockchain data indexer for Lisk with RPC fallback support and PostgreSQL storage.

## Features

- ✅ **RPC Fallback**: Automatic failover between multiple Lisk RPC endpoints
- ✅ **Real-time Indexing**: Live blockchain data ingestion
- ✅ **Historical Data**: Fetch weeks/months of historical blockchain data
- ✅ **Database Isolation**: Separate `lisk_*` tables (coexists with Starknet data)
- ✅ **Progress Monitoring**: Real-time stats and progress tracking
- ✅ **Error Recovery**: Robust error handling and retry mechanisms

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Ensure your `.env` file contains:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=david
DB_USER=david_user
DB_PASSWORD=your_password

# Lisk RPC Endpoints
LISK_MAINNET_RPC=https://rpc.api.lisk.com
LISK_SEPOLIA_RPC=https://rpc.sepolia-api.lisk.com
```

### 3. Setup Database Schema
```bash
psql -h localhost -U david_user -d david -f database/lisk-schema.sql
```

## Usage

### Real-time Indexing
```bash
# Start live indexer (processes new blocks as they appear)
npx ts-node src/lisk-indexer.ts

# Process specific number of recent blocks
npx ts-node src/process-latest.ts
```

### Historical Data Fetching
```bash
# Fetch last 6 hours (~10,800 blocks)
npx ts-node src/fetch-6hours.ts

# Fetch last 1 week (~302,400 blocks) 
npx ts-node src/fetch-1week.ts

# Fetch last 2 days (~86,400 blocks)
npx ts-node src/run-2day-fetch.ts
```

### Testing & Monitoring
```bash
# Test RPC connectivity
npx ts-node src/test-rpc.ts

# Test indexer with sample data
npx ts-node src/test-indexer.ts

# Monitor database in real-time
npx ts-node src/live-monitor.ts

# Run with monitoring
npx ts-node src/run-with-monitoring.ts
```

## Database Schema

The indexer creates 11 Lisk-specific tables:

- `lisk_chain_config` - Chain configuration
- `lisk_sync_state` - Sync progress tracking
- `lisk_blocks` - Block data
- `lisk_transactions` - Transaction data
- `lisk_transaction_receipts` - Transaction receipts
- `lisk_contracts` - Smart contract deployments
- `lisk_logs` - Event logs
- `lisk_execution_calls` - Internal calls
- `lisk_wallets` - Wallet addresses
- `lisk_wallet_interactions` - Wallet activity
- `lisk_raw_rpc_responses` - Raw RPC data

## Monitoring Progress

### Check Database Stats
```sql
-- Block count and range
SELECT COUNT(*) as blocks, MIN(block_number) as earliest, MAX(block_number) as latest 
FROM lisk_blocks;

-- Transaction count
SELECT COUNT(*) as transactions FROM lisk_transactions;

-- Daily breakdown
SELECT DATE(to_timestamp(timestamp)) as date, COUNT(*) as blocks, SUM(transaction_count) as txs 
FROM lisk_blocks 
GROUP BY DATE(to_timestamp(timestamp)) 
ORDER BY date DESC;
```

### Live Monitoring
```bash
# Real-time dashboard
npx ts-node src/live-monitor.ts

# Database stats every 10 seconds
npx ts-node src/monitor.ts
```

## Performance

- **Rate**: ~2,000-3,000 blocks/hour
- **RPC Endpoints**: 2 active with automatic failover
- **Batch Processing**: 50-200 blocks per batch
- **Rate Limiting**: Built-in delays to avoid overwhelming RPC

## Architecture

```
Lisk Blockchain → RPC Client → Indexer → PostgreSQL
     ↓              ↓           ↓          ↓
  Block Data → JSON-RPC → Processing → lisk_blocks
  Transactions → Fallback → Extraction → lisk_transactions  
  Receipts → Auto-retry → Storage → lisk_transaction_receipts
```

## Troubleshooting

### RPC Issues
```bash
# Test RPC connectivity
npx ts-node src/debug-rpc.ts
```

### Database Issues
```bash
# Check connection
psql -h localhost -U david_user -d david -c "SELECT version();"

# Reset sync state
UPDATE lisk_sync_state SET last_synced_block = 0 WHERE chain_id = 1135;
```

### Performance Issues
- Reduce batch size in indexer files
- Increase delays between requests
- Check RPC endpoint health

## Files Overview

### Core Indexer
- `src/lisk-indexer.ts` - Main real-time indexer
- `src/historical-indexer.ts` - Historical data fetcher base class
- `src/rpc/client.ts` - RPC client with fallback support

### Database
- `src/database/manager.ts` - PostgreSQL connection manager
- `src/pipeline/sync-state.ts` - Sync progress tracking
- `database/lisk-schema.sql` - Database schema

### Utilities
- `src/utils/logger.ts` - Winston logging
- `src/monitor.ts` - Database monitoring
- `src/live-monitor.ts` - Real-time dashboard

### Scripts
- `src/fetch-*.ts` - Historical data fetchers
- `src/test-*.ts` - Testing utilities
- `src/process-*.ts` - Block processors

## Current Status

The indexer is production-ready and actively processing Lisk blockchain data with:
- ✅ RPC fallback working
- ✅ Database schema deployed  
- ✅ Real-time indexing functional
- ✅ Historical fetching operational
- ✅ Monitoring dashboards available
