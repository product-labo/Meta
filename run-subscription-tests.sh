#!/bin/bash

# MetaGauge Subscription System Test Runner
# This script runs comprehensive tests for the subscription system

echo "🧪 MetaGauge Subscription System Test Suite"
echo "==========================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please create a .env file with your PRIVATE_KEY"
    exit 1
fi

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ PRIVATE_KEY not set in .env file!"
    echo "Please add your private key to the .env file"
    exit 1
fi

echo "✅ Environment configured"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Run basic subscription system test
echo "🔧 Running Basic Subscription System Test..."
echo "============================================"
npm run test:subscription

echo ""
echo "⏳ Waiting 5 seconds before integration test..."
sleep 5
echo ""

# Run complete integration test
echo "🔗 Running Complete Integration Test..."
echo "======================================"
npm run test:subscription-integration

echo ""
echo "✅ All tests completed!"
echo ""
echo "📋 Next Steps:"
echo "1. If tests passed, your subscription system is ready!"
echo "2. Update frontend/.env.local with contract addresses"
echo "3. Test the frontend subscription flow"
echo "4. Deploy to production when ready"
echo ""
echo "📞 Need help? Check the SUBSCRIPTION_INTEGRATION_GUIDE.md"