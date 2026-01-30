#!/bin/bash

# MetaGauge Deployment Script for Lisk Mainnet
# ⚠️ WARNING: This deploys to MAINNET and costs real money!

set -e  # Exit on error

echo "=========================================="
echo "⚠️  MetaGauge Lisk MAINNET Deployment ⚠️"
echo "=========================================="
echo ""
echo "🚨 WARNING: You are about to deploy to MAINNET!"
echo "🚨 This will cost real ETH for gas fees"
echo "🚨 Make sure you have tested on Sepolia first"
echo ""

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
echo "📍 Network: Lisk Mainnet (Chain ID: 1135)"
echo "🔧 Payment Mode: ${PAYMENT_MODE:-token}"
echo ""

# Confirmation prompt
read -p "Are you sure you want to deploy to MAINNET? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 0
fi

echo ""
read -p "Have you tested on Sepolia? (yes/no): " tested

if [ "$tested" != "yes" ]; then
    echo "⚠️  Please test on Sepolia first!"
    echo "❌ Deployment cancelled"
    exit 0
fi

# Build contracts
echo ""
echo "🔨 Building contracts..."
forge build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful"
echo ""

# Final confirmation
echo "🚨 FINAL WARNING: Deploying to MAINNET in 5 seconds..."
echo "Press Ctrl+C to cancel"
sleep 5

# Deploy
echo "🚀 Deploying to Lisk Mainnet..."
echo ""

forge script script/DeployMetaGauge.s.sol:DeployMetaGauge \
  --rpc-url $LISK_MAINNET_RPC_URL \
  --broadcast \
  --verify \
  --verifier blockscout \
  --verifier-url https://blockscout.lisk.com/api \
  -vvvv

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ MAINNET Deployment Successful!"
    echo "=========================================="
    echo "📝 SAVE THESE CONTRACT ADDRESSES!"
    echo "🔍 View on Explorer: https://blockscout.lisk.com"
    echo "=========================================="
    echo ""
    echo "⚠️  IMPORTANT POST-DEPLOYMENT STEPS:"
    echo "1. Save all contract addresses"
    echo "2. Verify contracts on explorer"
    echo "3. Test subscription functionality"
    echo "4. Consider transferring ownership to multisig"
    echo "=========================================="
else
    echo ""
    echo "❌ Deployment failed! Check the error messages above"
    exit 1
fi
