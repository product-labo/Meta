#!/bin/bash

echo "🧪 Running Starknet RPC Query Property Tests"
echo "==========================================="

# Check if database is accessible
echo "🔍 Checking database connection..."
if PGPASSWORD="Davidsoyaya@1015" psql -h localhost -U david_user -d david -c "SELECT 1;" &> /dev/null; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed. Make sure PostgreSQL is running."
    exit 1
fi

# Check if tables exist
echo "🗄️ Checking database schema..."
TABLE_COUNT=$(PGPASSWORD="Davidsoyaya@1015" psql -h localhost -U david_user -d david -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

if [ "$TABLE_COUNT" -lt 10 ]; then
    echo "⚠️ Database schema incomplete. Running migrations..."
    PGPASSWORD="Davidsoyaya@1015" psql -h localhost -U david_user -d david -f src/database/migrations/001_initial_schema.sql > /dev/null
    echo "✅ Schema updated"
else
    echo "✅ Database schema ready"
fi

# Build TypeScript
echo "🔨 Building TypeScript..."
if npx tsc --noEmit; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed"
    exit 1
fi

# Run property tests
echo "🚀 Running property tests..."
echo ""

if command -v npm &> /dev/null; then
    npm test
else
    echo "❌ npm not found. Please install Node.js and npm."
    exit 1
fi

echo ""
echo "🎉 Property tests completed!"
