#!/bin/bash

echo "🔍 Validating Starknet RPC Query setup..."

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found"
    echo "📝 Create .env with your database credentials"
    exit 1
fi

echo "✅ .env file exists"

# Check TypeScript compilation
echo "🔧 Checking TypeScript..."
if npx tsc --noEmit 2>/dev/null; then
    echo "✅ TypeScript OK"
else
    echo "❌ TypeScript errors found"
fi

echo "🎉 Basic validation complete!"
