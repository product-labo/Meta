#!/bin/bash

echo "🚀 Starting Complete Starknet RPC Query System"
echo "=============================================="

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Shutting down all processes..."
    jobs -p | xargs -r kill
    exit 0
}

# Set trap for cleanup
trap cleanup SIGINT SIGTERM

# Check dependencies
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

# Install and build if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🔨 Building TypeScript..."
npm run build

# Create log directory
mkdir -p logs

echo "🌟 Starting all services..."
echo ""

# Start main application in background
echo "📊 Starting Starknet data fetcher and continuous sync..."
node dist/app.js > logs/app.log 2>&1 &
APP_PID=$!

# Wait a moment for app to start
sleep 3

# Start progress monitor in background
echo "📈 Starting progress monitor..."
./monitor-progress.sh > logs/monitor.log 2>&1 &
MONITOR_PID=$!

echo ""
echo "✅ All services started successfully!"
echo ""
echo "📋 Running Services:"
echo "   🔄 Data Fetcher & Sync (PID: $APP_PID)"
echo "   📊 Progress Monitor (PID: $MONITOR_PID)"
echo ""
echo "📁 Logs:"
echo "   Application: tail -f logs/app.log"
echo "   Monitor: tail -f logs/monitor.log"
echo ""
echo "🎯 What's happening:"
echo "   - Fetching 3 months of Starknet historical data"
echo "   - Continuous sync with latest blocks"
echo "   - Real-time progress monitoring"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for all background processes
wait
