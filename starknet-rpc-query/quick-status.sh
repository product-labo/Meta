#!/bin/bash

echo "📊 QUICK DATABASE STATUS"
echo "========================"

PGPASSWORD='Davidsoyaya@1015' psql -h localhost -p 5432 -U david_user -d david -c "
SELECT 
  'Blocks: ' || COUNT(*) || ' (Latest: ' || MAX(block_number) || ')' as blocks,
  (SELECT 'Transactions: ' || COUNT(*) || ' (With fees: ' || COUNT(CASE WHEN actual_fee IS NOT NULL AND actual_fee != '0' THEN 1 END) || ')' FROM transactions) as transactions,
  (SELECT 'Events: ' || COUNT(*) FROM events) as events,
  (SELECT 'Contracts: ' || COUNT(*) || ' (With class: ' || COUNT(CASE WHEN class_hash IS NOT NULL THEN 1 END) || ')' FROM contracts) as contracts
FROM blocks;
" -t

echo ""
echo "🔍 INDEXER STATUS:"
./indexer-service.sh status

echo ""
echo "📋 LAST 3 LOG ENTRIES:"
tail -3 logs/indexer.log 2>/dev/null || echo "No logs found"
