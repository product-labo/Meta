# 🚀 Running Lisk Indexer Continuously

## Quick Start

### 1. Start Continuous Indexing (1 Month + Real-time)
```bash
cd /mnt/c/pr0/meta/lisk-rpc-querry
./run-continuous.sh
```

This will:
- ✅ Index from block 25,543,000 (~1 month ago)
- ✅ Continue to current block (~26,839,000)
- ✅ Keep running and index new blocks in real-time
- ✅ Show progress every 30 seconds

---

## Manual Control

### Start Indexer (Background)
```bash
cd /mnt/c/pr0/meta/lisk-rpc-querry
nohup npx ts-node --transpile-only src/index.ts > indexer.log 2>&1 &
echo $! > indexer.pid
```

### Check Progress
```bash
sudo -u postgres psql -d meta_test -c "
SELECT 
  (SELECT COUNT(*) FROM blocks) as blocks,
  (SELECT COUNT(*) FROM transactions) as transactions,
  (SELECT last_synced_height FROM sync_state WHERE chain_id = 1) as current_height,
  26839000 - (SELECT last_synced_height FROM sync_state WHERE chain_id = 1) as blocks_remaining;
"
```

### Stop Indexer
```bash
kill $(cat indexer.pid)
```

### View Logs
```bash
tail -f indexer.log
```

---

## Performance

**Settings:**
- Batch size: 50 blocks
- Poll interval: 3 seconds
- RPC: https://lisk.drpc.org

**Expected Speed:**
- ~50 blocks every 5-10 seconds
- ~300-600 blocks/minute
- ~18,000-36,000 blocks/hour
- **1 month of data: 36-72 hours**

---

## Monitor Progress

### Real-time Stats
```bash
watch -n 5 'sudo -u postgres psql -d meta_test -t -c "
SELECT 
  '\''Blocks: '\'' || COUNT(*) || 
  '\'' | Txs: '\'' || (SELECT COUNT(*) FROM transactions) ||
  '\'' | Height: '\'' || (SELECT last_synced_height FROM sync_state WHERE chain_id = 1)
FROM blocks;
"'
```

### Transaction Breakdown
```bash
sudo -u postgres psql -d meta_test -c "
SELECT module, command, COUNT(*) as count 
FROM transactions 
GROUP BY module, command 
ORDER BY count DESC 
LIMIT 10;
"
```

### Recent Blocks
```bash
sudo -u postgres psql -d meta_test -c "
SELECT height, TO_TIMESTAMP(timestamp) as time, 
       (SELECT COUNT(*) FROM transactions WHERE block_height = blocks.height) as txs
FROM blocks 
ORDER BY height DESC 
LIMIT 10;
"
```

---

## Adjust Speed

### Faster (if RPC allows)
```bash
# Edit .env
BATCH_SIZE=100
POLL_INTERVAL=2000
```

### Slower (if rate limited)
```bash
# Edit .env
BATCH_SIZE=25
POLL_INTERVAL=5000
```

---

## Run as Service (systemd)

Create `/etc/systemd/system/lisk-indexer.service`:
```ini
[Unit]
Description=Lisk Blockchain Indexer
After=network.target postgresql.service

[Service]
Type=simple
User=your_user
WorkingDirectory=/mnt/c/pr0/meta/lisk-rpc-querry
ExecStart=/usr/bin/npx ts-node --transpile-only src/index.ts
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable lisk-indexer
sudo systemctl start lisk-indexer
sudo systemctl status lisk-indexer
```

---

## Troubleshooting

### Indexer Stops
- Check `indexer.log` for errors
- Verify RPC is accessible: `curl https://lisk.drpc.org`
- Check database connection

### Slow Indexing
- Increase `BATCH_SIZE` in .env
- Check RPC rate limits
- Verify database performance

### Database Full
- Check disk space: `df -h`
- Consider archiving old blocks
- Use table partitioning for large datasets

---

## Data Size Estimates

**1 Month (~1.3M blocks):**
- Blocks: ~500 MB
- Transactions: ~2-5 GB
- Events: ~1-3 GB
- Raw RPC: ~5-10 GB
- **Total: ~10-20 GB**

---

**Ready to index!** 🚀
