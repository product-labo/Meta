#!/bin/bash

echo "🚀 Starting Starknet Indexer Test"
echo "================================"
echo ""

# Get current sync state
LAST_BLOCK=$(sudo -u postgres psql -d david -t -c "SELECT last_synced_block FROM sync_state WHERE chain_id = 1" | tr -d ' ')
echo "📊 Last synced block: $LAST_BLOCK"

# Fetch and insert 3 blocks
for i in {1..3}; do
  BLOCK_NUM=$((LAST_BLOCK + i))
  echo ""
  echo "📦 Processing block $BLOCK_NUM..."
  
  # Fetch block data using curl
  BLOCK_DATA=$(curl -s -X POST https://starknet-rpc.publicnode.com \
    -H "Content-Type: application/json" \
    -d "{\"jsonrpc\":\"2.0\",\"method\":\"starknet_getBlockWithTxs\",\"params\":[{\"block_number\":$BLOCK_NUM}],\"id\":1}")
  
  # Extract block info
  BLOCK_HASH=$(echo $BLOCK_DATA | jq -r '.result.block_hash')
  PARENT_HASH=$(echo $BLOCK_DATA | jq -r '.result.parent_hash')
  TIMESTAMP=$(echo $BLOCK_DATA | jq -r '.result.timestamp')
  TX_COUNT=$(echo $BLOCK_DATA | jq -r '.result.transactions | length')
  
  if [ "$BLOCK_HASH" = "null" ]; then
    echo "  ❌ Failed to fetch block"
    continue
  fi
  
  echo "  Block hash: $BLOCK_HASH"
  echo "  Transactions: $TX_COUNT"
  
  # Insert block
  sudo -u postgres psql -d david << EOF
INSERT INTO blocks (
  block_number, block_hash, parent_block_hash, timestamp,
  finality_status, chain_id, transaction_count, event_count, is_active
) VALUES (
  $BLOCK_NUM, '$BLOCK_HASH', '$PARENT_HASH', $TIMESTAMP,
  'ACCEPTED_ON_L2', 1, $TX_COUNT, 0, true
) ON CONFLICT (block_number) DO NOTHING;

UPDATE sync_state 
SET last_synced_block = $BLOCK_NUM, 
    last_sync_timestamp = NOW(),
    sync_status = 'syncing'
WHERE chain_id = 1;
EOF
  
  echo "  ✅ Block inserted"
done

echo ""
echo "================================"
echo "📊 Database Stats:"
sudo -u postgres psql -d david -c "
SELECT 
  (SELECT COUNT(*) FROM blocks WHERE chain_id = 1) as blocks,
  (SELECT COUNT(*) FROM transactions WHERE chain_id = 1) as transactions,
  (SELECT COUNT(*) FROM events WHERE chain_id = 1) as events;
"
echo "================================"
