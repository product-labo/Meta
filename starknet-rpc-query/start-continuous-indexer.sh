#!/bin/bash

echo "🚀 Starting Continuous Starknet Indexer"
echo "======================================="

# Build the project
echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

# Start the continuous indexer
echo "🔄 Starting continuous indexer..."
node dist/continuous-indexer.js
