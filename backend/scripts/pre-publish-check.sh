#!/bin/bash

# Zcash Paywall SDK - Pre-publish Check Script
# This script runs all necessary checks before publishing to NPM

set -e  # Exit on any error

echo "🚀 Zcash Paywall SDK - Pre-publish Check"
echo "========================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this script from the backend directory."
    exit 1
fi

# Check Node.js version
echo "📋 Checking Node.js version..."
NODE_VERSION=$(node --version)
echo "✅ Node.js version: $NODE_VERSION"

# Check NPM version
echo "📋 Checking NPM version..."
NPM_VERSION=$(npm --version)
echo "✅ NPM version: $NPM_VERSION"

# Check if logged into NPM
echo "📋 Checking NPM authentication..."
if npm whoami > /dev/null 2>&1; then
    NPM_USER=$(npm whoami)
    echo "✅ Logged in as: $NPM_USER"
else
    echo "❌ Not logged into NPM. Run 'npm login' first."
    exit 1
fi

# Install dependencies
echo "📋 Installing dependencies..."
npm install
echo "✅ Dependencies installed"

# Run tests
echo "📋 Running tests..."
npm test
echo "✅ All tests passed"

# Run linting (if available)
if npm run lint > /dev/null 2>&1; then
    echo "📋 Running linter..."
    npm run lint
    echo "✅ Linting passed"
else
    echo "⚠️  No linting script found, skipping..."
fi

# Build the package
echo "📋 Building package..."
npm run build
echo "✅ Build completed"

# Check package name availability
echo "📋 Checking package name availability..."
PACKAGE_NAME=$(node -p "require('./package.json').name")
if npm view "$PACKAGE_NAME" > /dev/null 2>&1; then
    echo "⚠️  Package name '$PACKAGE_NAME' already exists on NPM"
    echo "   Consider using a scoped package: @your-username/$PACKAGE_NAME"
    echo "   Or choose a different name in package.json"
else
    echo "✅ Package name '$PACKAGE_NAME' is available"
fi

# Create test package
echo "📋 Creating test package..."
npm pack > /dev/null
TARBALL=$(ls *.tgz | head -1)
echo "✅ Created: $TARBALL"

# Test package structure
echo "📋 Checking package contents..."
echo "Package includes:"
tar -tzf "$TARBALL" | head -10
echo "... (showing first 10 files)"

# Test imports
echo "📋 Testing package imports..."

# Test CommonJS import
if node -e "const sdk = require('./dist/ZcashPaywall.cjs'); console.log('CJS import works');" 2>/dev/null; then
    echo "✅ CommonJS import works"
else
    echo "❌ CommonJS import failed"
    exit 1
fi

# Test ES module import
if node -e "import('./src/ZcashPaywall.js').then(() => console.log('ESM import works'));" 2>/dev/null; then
    echo "✅ ES module import works"
else
    echo "❌ ES module import failed"
    exit 1
fi

# Check file sizes
echo "📋 Checking package size..."
PACKAGE_SIZE=$(du -h "$TARBALL" | cut -f1)
echo "✅ Package size: $PACKAGE_SIZE"

# Final summary
echo ""
echo "🎉 Pre-publish checks completed successfully!"
echo "========================================"
echo "Package: $PACKAGE_NAME"
echo "Version: $(node -p "require('./package.json').version")"
echo "Size: $PACKAGE_SIZE"
echo "Tarball: $TARBALL"
echo ""
echo "Ready to publish! Run:"
echo "  npm publish"
echo ""
echo "Or for scoped packages:"
echo "  npm publish --access public"

# Clean up
rm -f "$TARBALL"