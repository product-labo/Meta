# MetaGauge Deployment Guide

Complete guide for deploying MetaGauge contracts to Lisk blockchain networks.

## Prerequisites

1. **Foundry installed** - If not installed, run:
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Wallet with funds**:
   - **Sepolia Testnet**: Get test ETH from [Lisk Sepolia Faucet](https://sepolia-faucet.lisk.com)
   - **Mainnet**: Ensure your wallet has sufficient ETH for gas fees (~0.01-0.02 ETH)

3. **Environment Setup**: Copy `.env.example` to `.env` and fill in your private key

## Quick Start

### 1. Setup Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env and add your PRIVATE_KEY
nano .env
```

### 2. Build Contracts

```bash
forge build
```

### 3. Deploy to Lisk Sepolia (Testnet)

**Option A: Deploy New Token + Subscription (Token Mode)**
```bash
forge script script/DeployMetaGauge.s.sol:DeployMetaGauge \
  --rpc-url $LISK_SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --verifier blockscout \
  --verifier-url https://sepolia-blockscout.lisk.com/api \
  -vvvv
```

**Option B: Use Existing Token (Your deployed token at 0x8a21CF9Ba08Ae709D64Cb25AfAA951183EC9FF6D)**
```bash
# First, set EXISTING_TOKEN_ADDRESS in .env
# EXISTING_TOKEN_ADDRESS=0x8a21CF9Ba08Ae709D64Cb25AfAA951183EC9FF6D

forge script script/DeployMetaGauge.s.sol:DeployMetaGauge \
  --rpc-url $LISK_SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --verifier blockscout \
  --verifier-url https://sepolia-blockscout.lisk.com/api \
  -vvvv
```

**Option C: ETH-Only Mode (No Token)**
```bash
# First, set PAYMENT_MODE=eth in .env

forge script script/DeployMetaGauge.s.sol:DeployMetaGauge \
  --rpc-url $LISK_SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --verifier blockscout \
  --verifier-url https://sepolia-blockscout.lisk.com/api \
  -vvvv
```

### 4. Deploy to Lisk Mainnet (Production)

⚠️ **WARNING: This deploys to MAINNET and costs real money!**

```bash
forge script script/DeployMetaGauge.s.sol:DeployMetaGauge \
  --rpc-url $LISK_MAINNET_RPC_URL \
  --broadcast \
  --verify \
  --verifier blockscout \
  --verifier-url https://blockscout.lisk.com/api \
  -vvvv
```

## Deployment Modes

### Token Mode (Default)
- Deploys MetaGaugeToken (MGT) ERC20 token
- Deploys MetaGaugeSubscription configured for token payments
- Users pay subscription fees with MGT tokens
- Set `PAYMENT_MODE=token` in `.env`

### ETH Mode
- Deploys only MetaGaugeSubscription
- Users pay subscription fees with native ETH
- Set `PAYMENT_MODE=eth` in `.env`

## Network Information

### Lisk Sepolia Testnet
- **Chain ID**: 4202
- **RPC URL**: https://rpc.sepolia-api.lisk.com
- **Explorer**: https://sepolia-blockscout.lisk.com
- **Faucet**: https://sepolia-faucet.lisk.com

### Lisk Mainnet
- **Chain ID**: 1135
- **RPC URL**: https://rpc.api.lisk.com
- **Explorer**: https://blockscout.lisk.com

## Verification

Contracts are automatically verified during deployment using the `--verify` flag. If verification fails, you can manually verify:

```bash
forge verify-contract \
  --chain-id 4202 \
  --verifier blockscout \
  --verifier-url https://sepolia-blockscout.lisk.com/api \
  <CONTRACT_ADDRESS> \
  src/MetaGaugeSubscription.sol:MetaGaugeSubscription \
  --constructor-args $(cast abi-encode "constructor(address,bool)" <TOKEN_ADDRESS> true)
```

## Gas Estimation

Before deploying to mainnet, estimate gas costs:

```bash
forge script script/DeployMetaGauge.s.sol:DeployMetaGauge \
  --rpc-url $LISK_MAINNET_RPC_URL \
  --gas-estimate
```

## Troubleshooting

### "Insufficient funds for gas"
- Ensure your wallet has enough ETH
- For Sepolia: Get test ETH from faucet
- For Mainnet: Add more ETH to your wallet

### "Invalid private key"
- Ensure PRIVATE_KEY in `.env` starts with `0x`
- Check that the private key is correct

### "RPC connection failed"
- Check your internet connection
- Verify RPC URLs in `.env` are correct
- Try again (sometimes RPC endpoints are temporarily down)

### "Contract verification failed"
- Verification can be done manually later
- Check Blockscout explorer for your contract
- Use the manual verification command above

## Post-Deployment

After successful deployment:

1. **Save contract addresses** - They're printed in the console
2. **Verify on explorer** - Visit the explorer URL and check your contracts
3. **Test functionality** - Try subscribing to a plan
4. **Update frontend** - Use the deployed addresses in your dApp

## Security Checklist

- [ ] Never commit `.env` file with real private key
- [ ] Test thoroughly on Sepolia before mainnet
- [ ] Verify contract source code on explorer
- [ ] Check contract ownership is correct
- [ ] Test subscription functionality
- [ ] Consider using a multisig wallet for mainnet ownership

## Example Output

```
===========================================
MetaGauge Deployment Script
===========================================
Deployer: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
Chain ID: 4202
Payment Mode: token
===========================================
Deploying MetaGaugeToken...
MetaGaugeToken deployed at: 0x1234...
Deploying MetaGaugeSubscription (Token Mode)...
MetaGaugeSubscription deployed at: 0x5678...
===========================================
Deployment Complete!
===========================================
MetaGaugeToken: 0x1234...
MetaGaugeSubscription: 0x5678...
Owner: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
===========================================
```

## Support

- **Lisk Documentation**: https://docs.lisk.com
- **Foundry Book**: https://book.getfoundry.sh
- **Lisk Discord**: https://lisk.chat
