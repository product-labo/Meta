#!/bin/bash
echo "📊 Starknet Database Data Monitor"
echo "================================="

DB_URL="postgresql://postgres:postgres@localhost:5432/starknet_rpc_query"

while true; do
    clear
    echo "📊 Starknet Database Data Monitor - $(date)"
    echo "================================="
    echo ""
    
    # Check table counts
    echo "📈 Data Counts:"
    psql "$DB_URL" -c "
    SELECT 
        'Blocks' as table_name, COUNT(*) as count FROM blocks
    UNION ALL
    SELECT 'Transactions', COUNT(*) FROM transactions
    UNION ALL  
    SELECT 'Contracts', COUNT(*) FROM contracts
    UNION ALL
    SELECT 'Events', COUNT(*) FROM events
    UNION ALL
    SELECT 'Wallet Interactions', COUNT(*) FROM wallet_interactions;
    " 2>/dev/null || echo "❌ Database not accessible"
    
    echo ""
    echo "🔄 Latest Blocks:"
    psql "$DB_URL" -c "
    SELECT block_number, block_hash, timestamp, finality_status 
    FROM blocks 
    ORDER BY block_number DESC 
    LIMIT 5;
    " 2>/dev/null
    
    echo ""
    echo "💳 Latest Transactions:"
    psql "$DB_URL" -c "
    SELECT tx_hash, block_number, tx_type, sender_address, status 
    FROM transactions 
    ORDER BY block_number DESC 
    LIMIT 5;
    " 2>/dev/null
    
    echo ""
    echo "Press Ctrl+C to exit | Refreshing in 10 seconds..."
    sleep 10
done
