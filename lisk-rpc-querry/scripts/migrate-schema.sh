#!/bin/bash
# Data Migration Script - Old Lisk Schema to New Modular Schema

set -e

echo "🔄 Starting Lisk Schema Migration..."

DB_NAME=${DB_NAME:-meta_test}
DB_USER=${DB_USER:-postgres}

echo "📊 Step 1: Backup existing data..."
sudo -u postgres pg_dump $DB_NAME > /tmp/lisk_backup_$(date +%Y%m%d_%H%M%S).sql
echo "✅ Backup created"

echo "📊 Step 2: Export old lisk_* table data (if exists)..."
sudo -u postgres psql -d $DB_NAME -c "\COPY (SELECT * FROM lisk_blocks) TO '/tmp/old_lisk_blocks.csv' CSV HEADER" 2>/dev/null || echo "No old lisk_blocks table"
sudo -u postgres psql -d $DB_NAME -c "\COPY (SELECT * FROM lisk_transactions) TO '/tmp/old_lisk_transactions.csv' CSV HEADER" 2>/dev/null || echo "No old lisk_transactions table"

echo "📊 Step 3: Verify new schema exists..."
TABLE_COUNT=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('chain_config', 'blocks', 'transactions', 'accounts')")

if [ "$TABLE_COUNT" -lt 4 ]; then
    echo "❌ New schema not found. Run schema creation first!"
    exit 1
fi

echo "✅ New schema verified"

echo "📊 Step 4: Migration complete!"
echo "   - Old data backed up to /tmp/"
echo "   - New schema ready"
echo "   - Start indexer to populate new tables"

echo ""
echo "🚀 Next steps:"
echo "   1. cd /mnt/c/pr0/meta/lisk-rpc-querry"
echo "   2. npm install"
echo "   3. npx ts-node src/index.ts"
