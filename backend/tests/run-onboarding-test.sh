#!/bin/bash

# Quick Start Script for Testing Onboarding Flow
# Tests with real Zcash address: t1at7nVNsv6taLRrNRvnQdtfLNRDfsGc3Ak

echo "🚀 Starting Onboarding Flow Test"
echo "=================================="
echo ""

# Check if backend is running
echo "📡 Checking if backend is running..."
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend is running"
else
    echo "❌ Backend is not running on http://localhost:3001"
    echo "   Please start the backend first:"
    echo "   cd backend && npm start"
    exit 1
fi

echo ""
echo "🧪 Running onboarding test..."
echo ""

# Run the test
cd "$(dirname "$0")"
node test-onboarding-with-address.js

# Capture exit code
EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Test completed successfully!"
else
    echo "❌ Test failed with exit code $EXIT_CODE"
fi

exit $EXIT_CODE
