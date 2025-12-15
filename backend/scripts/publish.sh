#!/bin/bash

# Zcash Paywall SDK - Publish Script
# This script publishes the package to NPM with safety checks

set -e  # Exit on any error

echo "📦 Zcash Paywall SDK - NPM Publish"
echo "=================================="

# Run pre-publish checks
echo "🔍 Running pre-publish checks..."
./scripts/pre-publish-check.sh

# Confirm publication
PACKAGE_NAME=$(node -p "require('./package.json').name")
PACKAGE_VERSION=$(node -p "require('./package.json').version")

echo ""
echo "About to publish:"
echo "  Package: $PACKAGE_NAME"
echo "  Version: $PACKAGE_VERSION"
echo ""

# Check if it's a scoped package
if [[ $PACKAGE_NAME == @* ]]; then
    PUBLISH_CMD="npm publish --access public"
    echo "Detected scoped package, will use: $PUBLISH_CMD"
else
    PUBLISH_CMD="npm publish"
    echo "Will use: $PUBLISH_CMD"
fi

echo ""
read -p "Continue with publication? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Publishing to NPM..."
    $PUBLISH_CMD
    
    echo ""
    echo "🎉 Successfully published!"
    echo "=================================="
    echo "Your package is now available at:"
    echo "  https://www.npmjs.com/package/$PACKAGE_NAME"
    echo ""
    echo "Install with:"
    echo "  npm install $PACKAGE_NAME"
    echo ""
    echo "Import with:"
    echo "  import { ZcashPaywall } from '$PACKAGE_NAME';"
    
else
    echo "❌ Publication cancelled."
    exit 1
fi