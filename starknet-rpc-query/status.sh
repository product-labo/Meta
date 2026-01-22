#!/bin/bash

echo "=== Starknet RPC Query System Status ==="
echo "Time: $(date)"
echo

# Database status
echo "📊 Database Status:"
PGPASSWORD="Davidsoyaya@1015" psql -h localhost -U david_user -d david -c "
SELECT 
  'blocks' as table_name, 
  COUNT(*) as count,
  MIN(block_number) as min_block,
  MAX(block_number) as max_block
FROM blocks
UNION ALL
SELECT 
  'transactions', 
  COUNT(*), 
  MIN(block_number),
  MAX(block_number)
FROM transactions
ORDER BY table_name;
" 2>/dev/null

echo
echo "🔗 Latest Blocks:"
PGPASSWORD="Davidsoyaya@1015" psql -h localhost -U david_user -d david -c "
SELECT 
  block_number,
  LEFT(block_hash, 20) || '...' as block_hash,
  timestamp,
  (SELECT COUNT(*) FROM transactions WHERE block_number = blocks.block_number) as tx_count
FROM blocks 
ORDER BY block_number DESC 
LIMIT 5;
" 2>/dev/null

echo
echo "🌐 Current Starknet Block:"
CURRENT_BLOCK=$(curl -s -X POST https://rpc.starknet.lava.build \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"starknet_blockNumber","params":[],"id":1}' | \
  grep -o '"result":[0-9]*' | cut -d':' -f2)

if [ ! -z "$CURRENT_BLOCK" ]; then
  echo "Current network block: $CURRENT_BLOCK"
  
  # Get our latest block
  OUR_LATEST=$(PGPASSWORD="Davidsoyaya@1015" psql -h localhost -U david_user -d david -t -c "SELECT MAX(block_number) FROM blocks;" 2>/dev/null | xargs)
  
  if [ ! -z "$OUR_LATEST" ]; then
    BEHIND=$((CURRENT_BLOCK - OUR_LATEST))
    echo "Our latest block: $OUR_LATEST"
    echo "Blocks behind: $BEHIND"
    
    if [ $BEHIND -lt 10 ]; then
      echo "✅ System is up to date!"
    elif [ $BEHIND -lt 100 ]; then
      echo "⚠️  System is slightly behind"
    else
      echo "🔄 System needs to catch up"
    fi
  fi
else
  echo "❌ Could not fetch current block from network"
fi

echo
echo "🔄 Process Status:"
if pgrep -f "incremental-ingestion" > /dev/null; then
  echo "✅ Ingestion process is running"
else
  echo "⏸️  No ingestion process detected"
fi

echo "=================================="
