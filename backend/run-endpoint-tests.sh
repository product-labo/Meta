#!/bin/bash

# Endpoint Test Runner
# Starts the server and runs comprehensive endpoint tests

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

log() {
    echo -e "${2:-$NC}$1${NC}"
}

# Configuration
SERVER_PORT=3000
SERVER_PID=""
TEST_TYPE="${1:-node}"  # node or curl

cleanup() {
    if [ ! -z "$SERVER_PID" ]; then
        log "🛑 Stopping server (PID: $SERVER_PID)..." "$YELLOW"
        kill $SERVER_PID 2>/dev/null || true
        wait $SERVER_PID 2>/dev/null || true
    fi
}

# Set up cleanup on exit
trap cleanup EXIT

log "🚀 Zcash Paywall Endpoint Test Runner" "$BOLD"
log "📊 Test Type: $TEST_TYPE" "$BLUE"

# Check if server is already running
if curl -s http://localhost:$SERVER_PORT/health > /dev/null 2>&1; then
    log "✅ Server is already running on port $SERVER_PORT" "$GREEN"
    EXTERNAL_SERVER=true
else
    log "🔧 Starting server..." "$BLUE"
    
    # Check if we have the necessary files
    if [ ! -f "package.json" ]; then
        log "❌ package.json not found. Please run from the backend directory." "$RED"
        exit 1
    fi
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log "📦 Installing dependencies..." "$BLUE"
        npm install
    fi
    
    # Build the project
    log "🔨 Building project..." "$BLUE"
    npm run build
    
    # Start server in background
    log "🚀 Starting server on port $SERVER_PORT..." "$BLUE"
    npm start > server.log 2>&1 &
    SERVER_PID=$!
    
    # Wait for server to start
    log "⏳ Waiting for server to start..." "$YELLOW"
    for i in {1..30}; do
        if curl -s http://localhost:$SERVER_PORT/health > /dev/null 2>&1; then
            log "✅ Server started successfully!" "$GREEN"
            break
        fi
        if [ $i -eq 30 ]; then
            log "❌ Server failed to start within 30 seconds" "$RED"
            log "📋 Server log:" "$YELLOW"
            cat server.log
            exit 1
        fi
        sleep 1
    done
fi

# Run the appropriate test suite
log "\n🧪 Running endpoint tests..." "$BLUE"

case $TEST_TYPE in
    "node")
        log "🟢 Running Node.js test suite..." "$GREEN"
        if node test-all-endpoints.js; then
            log "🎉 Node.js tests completed successfully!" "$GREEN"
        else
            log "❌ Node.js tests failed!" "$RED"
            exit 1
        fi
        ;;
    "curl")
        log "🌐 Running curl test suite..." "$GREEN"
        if ./test-endpoints-curl.sh; then
            log "🎉 Curl tests completed successfully!" "$GREEN"
        else
            log "❌ Curl tests failed!" "$RED"
            exit 1
        fi
        ;;
    "both")
        log "🔄 Running both test suites..." "$GREEN"
        
        log "\n1️⃣ Running Node.js tests..." "$BLUE"
        if node test-all-endpoints.js; then
            log "✅ Node.js tests passed!" "$GREEN"
        else
            log "❌ Node.js tests failed!" "$RED"
            exit 1
        fi
        
        log "\n2️⃣ Running curl tests..." "$BLUE"
        if ./test-endpoints-curl.sh; then
            log "✅ Curl tests passed!" "$GREEN"
        else
            log "❌ Curl tests failed!" "$RED"
            exit 1
        fi
        
        log "🎉 All test suites completed successfully!" "$GREEN"
        ;;
    *)
        log "❌ Invalid test type: $TEST_TYPE" "$RED"
        log "Usage: $0 [node|curl|both]" "$YELLOW"
        exit 1
        ;;
esac

log "\n📊 Test Summary:" "$BOLD"
log "✅ All endpoint tests completed successfully!" "$GREEN"
log "🔧 Server logs available in: server.log" "$BLUE"

if [ -z "$EXTERNAL_SERVER" ]; then
    log "🛑 Server will be stopped automatically on exit" "$YELLOW"
fi