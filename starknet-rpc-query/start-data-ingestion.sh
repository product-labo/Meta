#!/bin/bash
cd /mnt/c/pr0/meta/starknet-rpc-query

echo "🚀 Starting Starknet Data Ingestion (Bypassing TypeScript errors)"
echo "================================================================="

# Create logs directory
mkdir -p logs

echo "🔧 Setting up database..."
# Run database migrations
npx ts-node --transpile-only -e "
const { Database } = require('./src/database/Database');
const { loadConfig } = require('./src/utils/config');

async function setupDB() {
  try {
    const config = loadConfig();
    const db = new Database(config.database);
    await db.connect();
    console.log('✅ Database connected');
    await db.runMigrations();
    console.log('✅ Database migrations completed');
    await db.disconnect();
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
  }
}
setupDB();
"

echo ""
echo "🌟 Starting data ingestion..."
echo "📊 This will:"
echo "   - Connect to Starknet RPC"
echo "   - Fetch recent blocks and transactions"
echo "   - Store data in PostgreSQL"
echo "   - Show real-time progress"
echo ""

# Start the ingestion with bypassed TypeScript
npx ts-node --transpile-only src/app.ts
