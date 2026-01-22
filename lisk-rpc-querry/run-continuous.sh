#!/bin/bash
# Continuous Lisk Indexer Runner

echo "🚀 Starting Lisk Continuous Indexer"
echo "===================================="
echo ""

cd /mnt/c/pr0/meta/lisk-rpc-querry

# Function to check progress
check_progress() {
  sudo -u postgres psql -d meta_test -t -c "
    SELECT 
      'Blocks: ' || COUNT(*) || 
      ' | Txs: ' || (SELECT COUNT(*) FROM transactions) ||
      ' | Height: ' || (SELECT last_synced_height FROM sync_state WHERE chain_id = 1)
    FROM blocks;
  " 2>/dev/null | tr -d '\n'
}

# Show initial status
echo "📊 Initial Status:"
check_progress
echo ""
echo ""

# Start indexer in background
echo "▶️  Starting indexer..."
npx ts-node --transpile-only src/index.ts > indexer.log 2>&1 &
INDEXER_PID=$!

echo "   PID: $INDEXER_PID"
echo "   Log: indexer.log"
echo ""

# Monitor progress every 30 seconds
echo "📈 Progress Monitor (Ctrl+C to stop):"
echo "===================================="

while kill -0 $INDEXER_PID 2>/dev/null; do
  sleep 30
  echo "[$(date '+%H:%M:%S')] $(check_progress)"
done

echo ""
echo "❌ Indexer stopped"
