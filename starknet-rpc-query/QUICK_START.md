# 🚀 Starknet RPC Query - Quick Start Guide

## Start Everything
```bash
# 1. Start main indexer (real-time sync)
npm run dev &

# 2. Start historical sync (3 months back)
npx ts-node --transpile-only historical-sync.ts &

# 3. Monitor database updates
./monitor_db.sh
```

## Stop Everything
```bash
pkill -f "ts-node"
```

## Check Status
```bash
PGPASSWORD="Davidsoyaya@1015" psql -h localhost -p 5432 -U david_user -d david -c "
SELECT COUNT(*) as blocks FROM blocks; 
SELECT COUNT(*) as transactions FROM transactions; 
SELECT MAX(block_number) as latest_block FROM blocks;"
```

## ✅ Current Status
- **464 blocks** indexed
- **2,867 transactions** stored  
- **Real-time sync** operational
- **Historical sync** ready (3 months)
- **Database**: `david` with user `david_user`

## What's Running
1. **Real-time Indexer** (`npm run dev`) - Continuously syncs new blocks every 10-30 seconds
2. **Historical Sync** (`historical-sync.ts`) - Fetches older blockchain data in chunks
3. **Database Monitor** (`monitor_db.sh`) - Shows live updates to your data

Everything is working perfectly! 🎉
