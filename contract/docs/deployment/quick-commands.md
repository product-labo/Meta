# Quick Deployment Commands

## One-Command Deployments

### Setup (First Time Only)
```bash
# 1. Copy and configure environment
cp .env.example .env
nano .env  # Add your PRIVATE_KEY

# 2. Make scripts executable
chmod +x deploy-sepolia.sh deploy-mainnet.sh
```

---

## Lisk Sepolia (Testnet)

### Deploy with New Token
```bash
./deploy-sepolia.sh
```

### Deploy with Your Existing Token (0x8a21CF9Ba08Ae709D64Cb25AfAA951183EC9FF6D)
```bash
# Edit .env first:
# EXISTING_TOKEN_ADDRESS=0x8a21CF9Ba08Ae709D64Cb25AfAA951183EC9FF6D

./deploy-sepolia.sh
```

### Deploy ETH-Only Mode (No Token)
```bash
# Edit .env first:
# PAYMENT_MODE=eth

./deploy-sepolia.sh
```

---

## Lisk Mainnet (Production)

⚠️ **Test on Sepolia first!**

```bash
./deploy-mainnet.sh
```

---

## Manual Commands (If scripts don't work)

### Sepolia - Token Mode
```bash
source .env
forge script script/DeployMetaGauge.s.sol:DeployMetaGauge \
  --rpc-url $LISK_SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --verifier blockscout \
  --verifier-url https://sepolia-blockscout.lisk.com/api \
  -vvvv
```

### Mainnet - Token Mode
```bash
source .env
forge script script/DeployMetaGauge.s.sol:DeployMetaGauge \
  --rpc-url $LISK_MAINNET_RPC_URL \
  --broadcast \
  --verify \
  --verifier blockscout \
  --verifier-url https://blockscout.lisk.com/api \
  -vvvv
```

---

## What You Need

1. **Private Key** in `.env` file
2. **ETH for gas**:
   - Sepolia: Get free from https://sepolia-faucet.lisk.com
   - Mainnet: ~0.01-0.02 ETH
3. **Foundry installed**: `curl -L https://foundry.paradigm.xyz | bash && foundryup`

---

## After Deployment

1. ✅ Save contract addresses (printed in console)
2. ✅ Check on explorer:
   - Sepolia: https://sepolia-blockscout.lisk.com
   - Mainnet: https://blockscout.lisk.com
3. ✅ Test subscription functionality
4. ✅ Update your frontend with new addresses

---

## Troubleshooting

**"Insufficient funds"** → Get ETH from faucet (Sepolia) or add more ETH (Mainnet)

**"Invalid private key"** → Check `.env` file, ensure key starts with `0x`

**"RPC failed"** → Check internet connection, try again

**"Build failed"** → Run `forge build` to see detailed errors

---

## Need Help?

See full documentation in `DEPLOYMENT.md`
