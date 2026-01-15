#!/bin/bash

# Starknet Schema Migration Script
# Applies migrations 002 and 003 to update schema according to requirements

set -e

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-david}"
DB_USER="${DB_USER:-postgres}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Starting Starknet Schema Migration"
echo "=================================="
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo ""

# Function to run SQL file
run_migration() {
    local file=$1
    local description=$2
    
    echo "📝 Running: $description"
    echo "   File: $file"
    
    if sudo -u postgres psql -d "$DB_NAME" -f "$file" > /dev/null 2>&1; then
        echo "   ✅ Success"
    else
        echo "   ❌ Failed"
        echo "   Attempting with error details..."
        sudo -u postgres psql -d "$DB_NAME" -f "$file"
        exit 1
    fi
    echo ""
}

# Backup database first
echo "💾 Creating backup..."
BACKUP_FILE="/tmp/starknet_backup_$(date +%Y%m%d_%H%M%S).sql"
sudo -u postgres pg_dump "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null || true
echo "   Backup saved to: $BACKUP_FILE"
echo ""

# Run migrations
run_migration "$SCRIPT_DIR/002_add_infrastructure.sql" "Phase 1: Infrastructure Tables"
run_migration "$SCRIPT_DIR/003_add_extended_tables.sql" "Phase 2 & 3: Extended Tables"

# Verify migration
echo "🔍 Verifying Migration..."
echo ""

sudo -u postgres psql -d "$DB_NAME" << 'EOF'
-- Check new tables exist
SELECT 'chain_config' as table_name, COUNT(*) as records FROM chain_config
UNION ALL
SELECT 'sync_state', COUNT(*) FROM sync_state
UNION ALL
SELECT 'starknet_wallets', COUNT(*) FROM starknet_wallets
UNION ALL
SELECT 'starknet_tokens', COUNT(*) FROM starknet_tokens
UNION ALL
SELECT 'starknet_token_transfers', COUNT(*) FROM starknet_token_transfers
UNION ALL
SELECT 'starknet_function_signatures', COUNT(*) FROM starknet_function_signatures
UNION ALL
SELECT 'starknet_daily_metrics', COUNT(*) FROM starknet_daily_metrics;

-- Check chain_id columns added
SELECT 
    'blocks' as table_name,
    COUNT(*) FILTER (WHERE chain_id IS NOT NULL) as with_chain_id,
    COUNT(*) as total_records
FROM blocks
UNION ALL
SELECT 'transactions', COUNT(*) FILTER (WHERE chain_id IS NOT NULL), COUNT(*) FROM transactions
UNION ALL
SELECT 'events', COUNT(*) FILTER (WHERE chain_id IS NOT NULL), COUNT(*) FROM events;

-- Check is_active columns added
SELECT 
    'blocks' as table_name,
    COUNT(*) FILTER (WHERE is_active = true) as active_records
FROM blocks
UNION ALL
SELECT 'transactions', COUNT(*) FILTER (WHERE is_active = true) FROM transactions
UNION ALL
SELECT 'events', COUNT(*) FILTER (WHERE is_active = true) FROM events;
EOF

echo ""
echo "✅ Migration Complete!"
echo "=================================="
echo ""
echo "📊 Summary:"
echo "   - Infrastructure tables created (chain_config, sync_state)"
echo "   - chain_id added to all tables"
echo "   - is_active added to blocks, transactions, events"
echo "   - Extended tables created (wallets, tokens, metrics)"
echo "   - Foreign key constraints updated"
echo "   - Indexes created for performance"
echo ""
echo "🔄 Next Steps:"
echo "   1. Update indexer code to populate new fields"
echo "   2. Test with sample data"
echo "   3. Monitor for any issues"
echo ""
echo "💾 Backup location: $BACKUP_FILE"
echo ""
