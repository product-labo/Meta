#!/bin/bash

echo "📊 REAL-TIME INDEXER PROGRESS MONITOR"
echo "====================================="
echo ""

# Function to get database stats
get_db_stats() {
    PGPASSWORD='Davidsoyaya@1015' psql -h localhost -p 5432 -U david_user -d david -c "
    SELECT 
      (SELECT COUNT(*) FROM blocks) as blocks,
      (SELECT COUNT(*) FROM transactions) as transactions,
      (SELECT COUNT(*) FROM events) as events,
      (SELECT COUNT(*) FROM contracts) as contracts,
      (SELECT COUNT(*) FROM wallets) as wallets,
      (SELECT COUNT(*) FROM wallet_interactions) as interactions,
      (SELECT MAX(block_number) FROM blocks) as latest_block,
      (SELECT COUNT(*) FROM transactions WHERE actual_fee IS NOT NULL AND actual_fee != '0') as txs_with_fees
    " -t
}

# Function to verify data accuracy
verify_accuracy() {
    PGPASSWORD='Davidsoyaya@1015' psql -h localhost -p 5432 -U david_user -d david -c "
    SELECT 
      'ACCURACY CHECK' as check_type,
      CASE WHEN COUNT(*) = COUNT(CASE WHEN tx_hash LIKE '0x%' AND LENGTH(tx_hash) >= 60 THEN 1 END)
           THEN 'ACCURATE ✅' ELSE 'INVALID ❌' END as tx_hashes,
      CASE WHEN COUNT(*) = COUNT(CASE WHEN block_hash LIKE '0x%' AND LENGTH(block_hash) >= 60 THEN 1 END)
           THEN 'ACCURATE ✅' ELSE 'INVALID ❌' END as block_hashes
    FROM transactions t
    JOIN blocks b ON t.block_number = b.block_number
    WHERE t.block_number > (SELECT MAX(block_number) - 10 FROM blocks);
    " -t
}

# Monitor loop
COUNTER=1
while true; do
    clear
    echo "📊 INDEXER PROGRESS MONITOR - Check #$COUNTER"
    echo "Time: $(date)"
    echo "=============================================="
    echo ""
    
    # Check if indexer is running
    if ./indexer-service.sh status | grep -q "running"; then
        echo "🟢 Indexer Status: RUNNING"
    else
        echo "🔴 Indexer Status: NOT RUNNING"
        echo ""
        echo "To restart: ./indexer-service.sh start"
        break
    fi
    
    echo ""
    echo "📊 DATABASE POPULATION:"
    get_db_stats
    
    echo ""
    echo "🔍 DATA ACCURACY VERIFICATION:"
    verify_accuracy
    
    echo ""
    echo "📋 RECENT INDEXER ACTIVITY:"
    tail -3 logs/indexer.log 2>/dev/null || echo "No recent logs"
    
    echo ""
    echo "Press Ctrl+C to stop monitoring"
    echo "Next update in 10 seconds..."
    
    sleep 10
    COUNTER=$((COUNTER + 1))
done
