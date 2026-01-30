# Lisk Sepolia Testnet Deployment Guide

Complete guide for deploying and testing MetaGauge contracts on Lisk Sepolia testnet.

## Table of Contents
- [Why Test on Sepolia?](#why-test-on-sepolia)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Deployment Steps](#detailed-deployment-steps)
- [Testing Your Deployment](#testing-your-deployment)
- [Common Testnet Scenarios](#common-testnet-scenarios)
- [Troubleshooting](#troubleshooting)

## Why Test on Sepolia?

Lisk Sepolia testnet provides a safe environment to:
- ✅ Test contract deployment without risking real funds
- ✅ Validate subscription functionality
- ✅ Experiment with different configurations
- ✅ Practice deployment procedures
- ✅ Identify issues before mainnet deployment
- ✅ Test integration with your frontend

**Always deploy to Sepolia before mainnet!**

## Prerequisites

### 1. Install Foundry
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

Verify installation:
```bash
forge --version
cast --version
```

### 2. Get Test ETH

Visit the Lisk Sepolia Faucet:
- **URL**: https://sepolia-faucet.lisk.com
- **Amount**: Request test ETH (usually 0.1-1 ETH per request)
- **Frequency**: Can request multiple times if needed

Steps:
1. Go to https://sepolia-faucet.lisk.com
2. Enter your wallet address
3. Complete any verification (if required)
4. Wait for transaction to confirm (~10-30 seconds)
5. Verify balance: `cast balance <YOUR_ADDRESS> --rpc-url https://rpc.sepolia-api.lisk.com`

### 3. Prepare Your Wallet

Export your private key from MetaMask or your wallet:
1. Open MetaMask
2. Click account menu → Account details
3. Click "Export Private Key"
4. Enter password
5. Copy private key (starts with 0x)

⚠️ **Security Note**: Use a dedicated test wallet for testnet deployments!

## Quick Start

### 1. Clone and Setup
```bash
# Clone repository (if not already done)
git clone <your-repo-url>
cd metagauge-contracts

# Install dependencies
forge install

# Copy environment template
cp .env.example .env
```

### 2. Configure Environment
Edit `.env`:
```bash
# Your test wallet private key
PRIVATE_KEY=0xYOUR_TEST_WALLET_PRIVATE_KEY

# Lisk Sepolia RPC (public endpoint)
LISK_SEPOLIA_RPC_URL=https://rpc.sepolia-api.lisk.com

# Payment mode: "token" or "eth"
PAYMENT_MODE=token

# Optional: Use existing token (leave empty for new deployment)
EXISTING_TOKEN_ADDRESS=
```

### 3. Build Contracts
```bash
forge build
```

Expected output:
```
[⠊] Compiling...
[⠒] Compiling 45 files with 0.8.19
[⠢] Solc 0.8.19 finished in 3.21s
Compiler run successful!
```

### 4. Deploy to Sepolia
```bash
./deploy-sepolia.sh
```

Or use the full command:
```bash
forge script script/DeployMetaGauge.s.sol:DeployMetaGauge \
  --rpc-url $LISK_SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --verifier blockscout \
  --verifier-url https://sepolia-blockscout.lisk.com/api \
  -vvvv
```

### 5. Save Contract Addresses

The script will output:
```
===========================================
Deployment Complete!
===========================================
MetaGaugeToken: 0x1234...
MetaGaugeSubscription: 0x5678...
Owner: 0xYourAddress...
===========================================
```

**Save these addresses!** You'll need them for testing and frontend integration.

## Detailed Deployment Steps

### Step 1: Pre-Deployment Validation

The script automatically checks:

```
===========================================
PRE-DEPLOYMENT CHECKS
===========================================
Deployer: 0x64a5128Fd2a9B63c1052D1960C66c335A430D809
Deployer Balance: 100000000000000000 wei (0.1 ETH)
Chain ID: 4202
Payment Mode: token
===========================================
```

Verify:
- ✅ Deployer address is correct
- ✅ Balance is sufficient (>0.001 ETH recommended)
- ✅ Chain ID is 4202 (Lisk Sepolia)
- ✅ Payment mode matches your configuration

### Step 2: Gas Estimation

```
===========================================
GAS COST ESTIMATION
===========================================
Current Gas Price: 507 wei

MetaGaugeToken Deployment:
  Estimated Gas: 750,000
  Estimated Cost: 0.00038 ETH

MetaGaugeSubscription Deployment:
  Estimated Gas: 2,700,000
  Estimated Cost: 0.00137 ETH

TOTAL ESTIMATED COST: 0.00175 ETH
Recommended Balance (with 20% buffer): 0.0021 ETH

✅ SUFFICIENT BALANCE
===========================================
```

### Step 3: Contract Deployment

**Token Mode** (default):
1. Deploys MetaGaugeToken
2. Deploys MetaGaugeSubscription with token address

**ETH Mode**:
1. Deploys MetaGaugeSubscription only

Watch for:
```
Deploying MetaGaugeToken...
✅ SUCCESS: MetaGaugeToken deployed at: 0x1234...

Deploying MetaGaugeSubscription (Token Mode)...
✅ SUCCESS: MetaGaugeSubscription deployed at: 0x5678...
```

### Step 4: Validation

The script validates:

```
===========================================
DEPLOYMENT VALIDATION
===========================================

[Token Validation]
  Token Name: MetaGaugeToken
  Token Symbol: MGT
  Total Supply: 300000000 MGT
  Max Supply: 500000000 MGT
  Token Owner: 0xYourAddress...
  Deployer Balance: 300000000 MGT
  ✅ PASS: All token checks passed

[Subscription Validation]
  Subscription Owner: 0xYourAddress...
  Paused: false
  Token Payment Mode: true
  Configured Token: 0x1234...
  ✅ PASS: Payment mode matches configuration

  [Subscription Tier Validation]
    Tier 0: Free
      Monthly Price: 0
      Yearly Price: 0
      Active: true
      ✅ PASS: Tier initialized and active
    
    Tier 1: Starter
      Monthly Price: 10
      Yearly Price: 100
      Active: true
      ✅ PASS: Tier initialized and active
    
    Tier 2: Pro
      Monthly Price: 50
      Yearly Price: 500
      Active: true
      ✅ PASS: Tier initialized and active
    
    Tier 3: Enterprise
      Monthly Price: 200
      Yearly Price: 2000
      Active: true
      ✅ PASS: Tier initialized and active

✅ ALL VALIDATIONS PASSED
===========================================
```

### Step 5: Contract Verification

Contracts are automatically verified on Blockscout:

```
===========================================
CONTRACT VERIFICATION
===========================================

[MetaGaugeToken Verification]
  Address: 0x1234...
  Constructor Args: None
  Status: Verified ✅

[MetaGaugeSubscription Verification]
  Address: 0x5678...
  Constructor Args:
    _tokenAddress: 0x1234...
    _useToken: true
  Status: Verified ✅
===========================================
```

### Step 6: Artifact Generation

Generated files in `deployments/lisk-sepolia/`:

**addresses.json**:
```json
{
  "network": "lisk-sepolia",
  "chainId": 4202,
  "deployer": "0x64a5128Fd2a9B63c1052D1960C66c335A430D809",
  "timestamp": 1764432682,
  "blockNumber": 29559845,
  "MetaGaugeToken": "0xB51623F59fF9f2AA7d3bC1Afa99AE0fA8049ed3D",
  "MetaGaugeSubscription": "0x577d9A43D0fa564886379bdD9A56285769683C38",
  "paymentMode": "token"
}
```

**deployment-summary.md**: Human-readable summary with explorer links

## Testing Your Deployment

### 1. Verify on Block Explorer

Visit Lisk Sepolia Blockscout:
- **Explorer**: https://sepolia-blockscout.lisk.com
- Search for your contract addresses
- Verify contracts show as "Verified" ✅
- Check contract code is visible

### 2. Test Token Functionality (Token Mode)

```bash
# Check token balance
cast call <TOKEN_ADDRESS> "balanceOf(address)(uint256)" <YOUR_ADDRESS> \
  --rpc-url $LISK_SEPOLIA_RPC_URL

# Check token supply
cast call <TOKEN_ADDRESS> "totalSupply()(uint256)" \
  --rpc-url $LISK_SEPOLIA_RPC_URL

# Transfer tokens (for testing)
cast send <TOKEN_ADDRESS> "transfer(address,uint256)" <RECIPIENT> 1000000000000000000 \
  --rpc-url $LISK_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY
```

### 3. Test Subscription Functionality

```bash
# Get plan info
cast call <SUBSCRIPTION_ADDRESS> "getPlanInfo(uint8)" 1 \
  --rpc-url $LISK_SEPOLIA_RPC_URL

# Check if paused
cast call <SUBSCRIPTION_ADDRESS> "paused()(bool)" \
  --rpc-url $LISK_SEPOLIA_RPC_URL

# Get total subscribers
cast call <SUBSCRIPTION_ADDRESS> "totalSubscribers()(uint256)" \
  --rpc-url $LISK_SEPOLIA_RPC_URL
```

### 4. Test Subscription Purchase (Token Mode)

```bash
# Step 1: Approve tokens
cast send <TOKEN_ADDRESS> "approve(address,uint256)" <SUBSCRIPTION_ADDRESS> 10000000000000000000 \
  --rpc-url $LISK_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY

# Step 2: Subscribe to Starter plan (tier 1) for 1 month
cast send <SUBSCRIPTION_ADDRESS> "subscribe(uint8,uint8)" 1 1 \
  --rpc-url $LISK_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY

# Step 3: Check subscription status
cast call <SUBSCRIPTION_ADDRESS> "getSubscription(address)" <YOUR_ADDRESS> \
  --rpc-url $LISK_SEPOLIA_RPC_URL
```

### 5. Test Subscription Purchase (ETH Mode)

```bash
# Subscribe to Starter plan (tier 1) for 1 month with ETH
cast send <SUBSCRIPTION_ADDRESS> "subscribe(uint8,uint8)" 1 1 \
  --rpc-url $LISK_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --value 10000000000000000000  # 10 ETH (adjust based on plan price)
```

## Common Testnet Scenarios

### Scenario 1: Testing Token Mode

**Goal**: Deploy with MGT token payments

```bash
# .env configuration
PAYMENT_MODE=token
EXISTING_TOKEN_ADDRESS=

# Deploy
./deploy-sepolia.sh

# Test workflow:
# 1. Deploy contracts ✅
# 2. Approve tokens ✅
# 3. Subscribe to plan ✅
# 4. Check subscription status ✅
# 5. Test renewal ✅
# 6. Test cancellation ✅
```

### Scenario 2: Testing ETH Mode

**Goal**: Deploy with native ETH payments

```bash
# .env configuration
PAYMENT_MODE=eth

# Deploy
./deploy-sepolia.sh

# Test workflow:
# 1. Deploy subscription contract ✅
# 2. Subscribe with ETH ✅
# 3. Check subscription status ✅
# 4. Test renewal with ETH ✅
# 5. Test cancellation ✅
```

### Scenario 3: Reusing Existing Token

**Goal**: Deploy subscription with previously deployed token

```bash
# .env configuration
PAYMENT_MODE=token
EXISTING_TOKEN_ADDRESS=0x8a21CF9Ba08Ae709D64Cb25AfAA951183EC9FF6D

# Deploy
./deploy-sepolia.sh

# Script will:
# 1. Skip token deployment ✅
# 2. Use existing token ✅
# 3. Deploy subscription only ✅
```

### Scenario 4: Testing Subscription Lifecycle

```bash
# 1. Subscribe
cast send <SUBSCRIPTION_ADDRESS> "subscribe(uint8,uint8)" 1 1 \
  --rpc-url $LISK_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY

# 2. Check status
cast call <SUBSCRIPTION_ADDRESS> "getSubscription(address)" <YOUR_ADDRESS> \
  --rpc-url $LISK_SEPOLIA_RPC_URL

# 3. Change plan
cast send <SUBSCRIPTION_ADDRESS> "changeSubscription(uint8)" 2 \
  --rpc-url $LISK_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY

# 4. Renew subscription
cast send <SUBSCRIPTION_ADDRESS> "renewSubscription(uint8)" 1 \
  --rpc-url $LISK_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY

# 5. Cancel
cast send <SUBSCRIPTION_ADDRESS> "cancelSubscription()" \
  --rpc-url $LISK_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY
```

### Scenario 5: Testing Admin Functions

```bash
# Pause contract
cast send <SUBSCRIPTION_ADDRESS> "pause()" \
  --rpc-url $LISK_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY

# Unpause contract
cast send <SUBSCRIPTION_ADDRESS> "unpause()" \
  --rpc-url $LISK_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY

# Update plan pricing
cast send <SUBSCRIPTION_ADDRESS> "updatePlanPricing(uint8,uint256,uint256)" 1 15000000000000000000 150000000000000000000 \
  --rpc-url $LISK_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY

# Withdraw funds (owner only)
cast send <SUBSCRIPTION_ADDRESS> "withdraw()" \
  --rpc-url $LISK_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY
```

## Troubleshooting

### Issue: Insufficient Funds

**Error**: `insufficient funds for gas * price + value`

**Solution**:
1. Visit faucet: https://sepolia-faucet.lisk.com
2. Request more test ETH
3. Wait for confirmation
4. Retry deployment

### Issue: RPC Connection Failed

**Error**: `server returned an error response`

**Solutions**:
1. Check internet connection
2. Verify RPC URL: `https://rpc.sepolia-api.lisk.com`
3. Try again (RPC may be temporarily busy)
4. Check Lisk status page

### Issue: Contract Verification Failed

**Note**: Contracts work even without verification!

**Manual Verification**:
```bash
forge verify-contract \
  --chain-id 4202 \
  --verifier blockscout \
  --verifier-url https://sepolia-blockscout.lisk.com/api \
  <CONTRACT_ADDRESS> \
  src/MetaGaugeSubscription.sol:MetaGaugeSubscription \
  --constructor-args $(cast abi-encode "constructor(address,bool)" <TOKEN_ADDRESS> true)
```

### Issue: Transaction Reverted

**Check transaction on explorer**:
1. Copy transaction hash from error
2. Visit https://sepolia-blockscout.lisk.com
3. Search for transaction
4. Review revert reason

**Common causes**:
- Insufficient token approval
- Insufficient balance
- Contract paused
- Invalid parameters

### Issue: Subscription Purchase Fails

**Token Mode Checklist**:
- [ ] Token contract deployed
- [ ] You have MGT tokens
- [ ] Tokens approved for subscription contract
- [ ] Approval amount >= subscription price
- [ ] Subscription contract not paused

**ETH Mode Checklist**:
- [ ] Sent correct ETH amount with transaction
- [ ] ETH amount >= subscription price
- [ ] Subscription contract not paused

## Best Practices for Testnet

### 1. Test Everything
- ✅ Deploy contracts
- ✅ Subscribe to each tier
- ✅ Test monthly and yearly durations
- ✅ Test plan changes
- ✅ Test renewals
- ✅ Test cancellations
- ✅ Test admin functions
- ✅ Test edge cases

### 2. Document Your Tests
Keep a log of:
- Contract addresses
- Transaction hashes
- Test scenarios
- Issues encountered
- Solutions applied

### 3. Test Multiple Scenarios
- Different payment modes
- Different subscription tiers
- Different durations
- Edge cases (expired subscriptions, etc.)

### 4. Verify Integration
- Test with your frontend
- Test with your backend
- Test event listening
- Test error handling

### 5. Performance Testing
- Test with multiple users (multiple wallets)
- Test concurrent subscriptions
- Test gas costs
- Test transaction times

## Next Steps

After successful testnet deployment and testing:

1. **Review Results**
   - All tests passed? ✅
   - Any issues found? Document them
   - Performance acceptable? ✅

2. **Prepare for Mainnet**
   - Review security checklist
   - Prepare mainnet wallet with funds
   - Update configuration for mainnet
   - Plan deployment timing

3. **Deploy to Mainnet**
   - Follow mainnet deployment guide
   - Use lessons learned from testnet
   - Monitor deployment closely
   - Verify everything works

## Resources

- **Lisk Sepolia Faucet**: https://sepolia-faucet.lisk.com
- **Lisk Sepolia Explorer**: https://sepolia-blockscout.lisk.com
- **Lisk Documentation**: https://docs.lisk.com
- **Foundry Book**: https://book.getfoundry.sh

## Related Documentation

- **[Environment Setup Guide](environment-setup.md)** - Configure environment variables
- **[Network Configuration](network-configuration.md)** - Network details and RPC endpoints
- **[Contract Verification](verification.md)** - Verify contracts on block explorer
- **[Troubleshooting Guide](troubleshooting.md)** - Common issues and solutions
- **[Quick Start Guide](quick-start.md)** - Comprehensive deployment guide
- **[Mainnet Deployment](mainnet.md)** - Production deployment guide

## Support

Need help?
- Check troubleshooting guide: `docs/deployment/troubleshooting.md`
- Review deployment guide: `docs/deployment/quick-start.md`
- Join Lisk Discord: https://lisk.chat

---

**Ready to test?** Run `./deploy-sepolia.sh` to get started!
