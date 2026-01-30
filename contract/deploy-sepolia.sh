#!/bin/bash

# MetaGauge Deployment Script for Lisk Sepolia Testnet
# This script deploys MetaGauge contracts to Lisk Sepolia

set -e  # Exit on error

echo "=========================================="
echo "MetaGauge Lisk Sepolia Deployment"
echo "=========================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and configure it"
    exit 1
fi

# Load environment variables
source .env

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY not set in .env"
    exit 1
fi

echo "✅ Environment loaded"
echo "📍 Network: Lisk Sepolia (Chain ID: 4202)"
echo "🔧 Payment Mode: ${PAYMENT_MODE:-token}"
echo ""

# Build contracts
echo "🔨 Building contracts..."
forge build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful"
echo ""

# Deploy
echo "🚀 Deploying to Lisk Sepolia..."
echo ""

forge script script/DeployMetaGauge.s.sol:DeployMetaGauge \
  --rpc-url $LISK_SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --verifier blockscout \
  --verifier-url https://sepolia-blockscout.lisk.com/api \
  -vvvv

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ Deployment Successful!"
    echo "=========================================="
    echo "📝 Check the output above for contract addresses"
    echo "🔍 View on Explorer: https://sepolia-blockscout.lisk.com"
    echo "=========================================="
else
    echo ""
    echo "❌ Deployment failed! Check the error messages above"
    exit 1
fi
