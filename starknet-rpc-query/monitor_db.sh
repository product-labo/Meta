#!/bin/bash

export PGPASSWORD="Davidsoyaya@1015"

echo "Starting database monitoring..."
echo "Press Ctrl+C to stop monitoring"
echo "================================"

while true; do
    clear
    echo "Database Population Monitor - $(date)"
    echo "================================"
    
    psql -h localhost -p 5432 -U david_user -d david -c "
    SELECT 
        'Blocks' as table_name, 
        COUNT(*) as count,
        MAX(block_number) as latest_block
    FROM blocks
    UNION ALL
    SELECT 
        'Transactions' as table_name, 
        COUNT(*) as count,
        NULL as latest_block
    FROM transactions
    UNION ALL
    SELECT 
        'Contracts' as table_name, 
        COUNT(*) as count,
        NULL as latest_block
    FROM contracts
    UNION ALL
    SELECT 
        'Events' as table_name, 
        COUNT(*) as count,
        NULL as latest_block
    FROM events;
    "
    
    echo ""
    echo "Latest 3 blocks:"
    psql -h localhost -p 5432 -U david_user -d david -c "
    SELECT block_number, block_hash, timestamp 
    FROM blocks 
    ORDER BY block_number DESC 
    LIMIT 3;
    "
    
    sleep 5
done
