#!/bin/bash

echo "🚀 Starting Starknet RPC Query System"
echo "===================================="

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the project
echo "🔨 Building TypeScript..."
npm run build

# Start the application
echo "🌟 Starting historical data fetch and continuous sync..."
echo "This will:"
echo "  - Fetch 3 months of historical Starknet data"
echo "  - Keep the database continuously updated"
echo "  - Monitor in another terminal with: ./monitor-progress.sh"
echo ""

node dist/app.js
