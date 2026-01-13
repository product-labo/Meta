#!/bin/bash

echo "📊 Starknet Data Ingestion Progress Monitor"
echo "=========================================="

# Database connection
export PGPASSWORD='Davidsoyaya@1015'
DB_CMD="psql -h localhost -U david_user -d david -t -c"

while true; do
    # Get current stats
    BLOCK_COUNT=$($DB_CMD "SELECT COUNT(*) FROM blocks;" 2>/dev/null || echo "0")
    TX_COUNT=$($DB_CMD "SELECT COUNT(*) FROM transactions;" 2>/dev/null || echo "0")
    LATEST_BLOCK=$($DB_CMD "SELECT MAX(block_number) FROM blocks;" 2>/dev/null || echo "0")
    EARLIEST_BLOCK=$($DB_CMD "SELECT MIN(block_number) FROM blocks;" 2>/dev/null || echo "0")
    
    # Get current Starknet block
    CURRENT_STARKNET=$(curl -s -X POST https://rpc.starknet.lava.build \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"starknet_blockNumber","params":[],"id":1}' | \
        grep -o '"result":[0-9]*' | cut -d: -f2)
    
    clear
    echo "📊 Starknet Data Ingestion Progress"
    echo "=================================="
    echo "🗄️  Database Stats:"
    echo "   Blocks stored: $BLOCK_COUNT"
    echo "   Transactions: $TX_COUNT"
    echo "   Block range: $EARLIEST_BLOCK → $LATEST_BLOCK"
    echo ""
    echo "🌐 Network Status:"
    echo "   Current Starknet block: $CURRENT_STARKNET"
    echo "   Blocks behind: $((CURRENT_STARKNET - LATEST_BLOCK))"
    echo ""
    echo "📈 Progress:"
    if [ ! -z "$LATEST_BLOCK" ] && [ ! -z "$CURRENT_STARKNET" ]; then
        PROGRESS=$(echo "scale=2; $LATEST_BLOCK * 100 / $CURRENT_STARKNET" | bc -l 2>/dev/null || echo "0")
        echo "   Sync progress: ${PROGRESS}%"
    fi
    echo ""
    echo "Press Ctrl+C to exit monitoring"
    
    sleep 10
done
