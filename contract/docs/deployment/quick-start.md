# MetaGauge Deployment Guide

Complete guide for deploying MetaGauge contracts to Lisk blockchain networks with comprehensive validation, error handling, and recovery mechanisms.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Deployment Features](#deployment-features)
- [Step-by-Step Deployment](#step-by-step-deployment)
- [Deployment Modes](#deployment-modes)
- [Network Information](#network-information)
- [Gas Estimation](#gas-estimation)
- [Error Handling & Recovery](#error-handling--recovery)
- [Deployment Artifacts](#deployment-artifacts)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)

## Prerequisites

### 1. Install Foundry
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 2. Get Testnet Funds
- **Lisk Sepolia Faucet**: https://sepolia-faucet.lisk.com
- Request test ETH for your deployer wallet
- Minimum recommended: 0.001 ETH

### 3. Prepare Mainnet Funds (for production)
- Ensure wallet has sufficient ETH for gas
- Recommended: 0.01-0.02 ETH
- Script will estimate exact costs before deployment

## Quick Start

### 1. Configure Environment
```bash
# Copy example configuration
cp .env.example .env

# Edit .env and add your private key
nano .env
```

Required `.env` variables:
```bash
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
LISK_SEPOLIA_RPC_URL=https://rpc.sepolia-api.lisk.com
LISK_MAINNET_RPC_URL=https://rpc.api.lisk.com
PAYMENT_MODE=token  # or "eth"
```

### 2. Build Contracts
```bash
forge build
```

### 3. Deploy to Testnet
```bash
./deploy-sepolia.sh
```

### 4. Deploy to Mainnet (after testing)
```bash
./deploy-mainnet.sh
```

## Deployment Features

Our deployment script includes:

✅ **Pre-Deployment Checks**
- Deployer balance verification
- Gas cost estimation
- Configuration validation

✅ **Comprehensive Validation**
- Token supply and ownership verification
- Subscription tier initialization checks
- Payment mode consistency validation
- Contract state verification

✅ **Error Handling**
- Try-catch blocks for all deployments
- Detailed error messages
- Automatic recovery state saving

✅ **Recovery Mechanisms**
- Partial deployment recovery
- Resume from failed deployments
- Clear recovery instructions

✅ **Artifact Generation**
- JSON files with contract addresses
- Markdown deployment summaries
- Network-specific organization

✅ **Contract Verification**
- Automatic Blockscout verification
- Manual verification helpers
- Constructor argument encoding

## Step-by-Step Deployment

### Step 1: Pre-Deployment Checks

The script automatically performs:
- ✅ Checks deployer wallet balance
- ✅ Estimates gas costs
- ✅ Validates configuration
- ✅ Warns if balance is insufficient

Example output:
```
===========================================
PRE-DEPLOYMENT CHECKS
===========================================
Deployer: 0x64a5128Fd2a9B63c1052D1960C66c335A430D809
Deployer Balance: 1000000000000000 wei
Chain ID: 4202
Payment Mode: token
===========================================

===========================================
GAS COST ESTIMATION
===========================================
Current Gas Price: 507 wei
Current Gas Price: 0 gwei

MetaGaugeToken Deployment:
  Estimated Gas: 750000
  Estimated Cost: 0 ETH

MetaGaugeSubscription Deployment:
  Estimated Gas: 2700000
  Estimated Cost: 0 ETH

--- TOTAL ESTIMATED COST ---
Total Gas: 3450000
Total Cost: 1748850000 wei
Total Cost: 0 ETH

✅ SUFFICIENT BALANCE
===========================================
```

### Step 2: Contract Deployment

The script deploys contracts with error handling:

**Token Mode:**
1. Deploys MetaGaugeToken (or uses existing)
2. Deploys MetaGaugeSubscription with token address
3. Saves recovery state after each step

**ETH Mode:**
1. Deploys MetaGaugeSubscription only
2. Configures for native ETH payments

### Step 3: Validation

Automatic validation checks:
- ✅ Token name, symbol, supply (if token mode)
- ✅ Contract ownership
- ✅ Subscription tiers (Free, Starter, Pro, Enterprise)
- ✅ Payment mode configuration
- ✅ Contract not paused

### Step 4: Verification

Contracts are automatically verified on Blockscout when using `--verify` flag.

### Step 5: Artifact Generation

Generated files in `deployments/{network}/`:
- `addresses.json` - Contract addresses and metadata
- `deployment-summary.md` - Human-readable summary
- `recovery-state.json` - Recovery information

## Deployment Modes

### Token Mode (Default)
Users pay subscription fees with MGT tokens.

```bash
# In .env
PAYMENT_MODE=token
```

Deploys:
- MetaGaugeToken (MGT) - ERC20 token
- MetaGaugeSubscription - Configured for token payments

### ETH Mode
Users pay subscription fees with native ETH.

```bash
# In .env
PAYMENT_MODE=eth
```

Deploys:
- MetaGaugeSubscription only - Configured for ETH payments

### Using Existing Token
Reuse a previously deployed token.

```bash
# In .env
PAYMENT_MODE=token
EXISTING_TOKEN_ADDRESS=0x8a21CF9Ba08Ae709D64Cb25AfAA951183EC9FF6D
```

## Network Information

### Lisk Sepolia Testnet
- **Chain ID**: 4202
- **RPC URL**: https://rpc.sepolia-api.lisk.com
- **Explorer**: https://sepolia-blockscout.lisk.com
- **Faucet**: https://sepolia-faucet.lisk.com
- **Purpose**: Testing and validation

### Lisk Mainnet
- **Chain ID**: 1135
- **RPC URL**: https://rpc.api.lisk.com
- **Explorer**: https://blockscout.lisk.com
- **Purpose**: Production deployment

## Gas Estimation

The script automatically estimates gas costs before deployment:

```
===========================================
GAS COST ESTIMATION
===========================================

MetaGaugeToken Deployment:
  Estimated Gas: 750,000
  Estimated Cost: ~0.0004 ETH

MetaGaugeSubscription Deployment:
  Estimated Gas: 2,700,000
  Estimated Cost: ~0.0014 ETH

TOTAL ESTIMATED COST: ~0.0018 ETH
Recommended Balance (with 20% buffer): ~0.0022 ETH
===========================================
```

**Note**: Actual costs may vary based on:
- Network congestion
- Gas price fluctuations
- Contract complexity
- Current blockchain state

## Error Handling & Recovery

### Automatic Error Handling

The script catches and handles:
- ✅ Insufficient gas errors
- ✅ RPC connection failures
- ✅ Contract deployment failures
- ✅ Validation failures

### Recovery from Failed Deployments

If deployment fails, the script:
1. **Saves recovery state** to `deployments/{network}/recovery-state.json`
2. **Prints recovery instructions** specific to the failure point
3. **Preserves successful deployments** for reuse

### Example: Token Deployed, Subscription Failed

```
===========================================
DEPLOYMENT RECOVERY INSTRUCTIONS
===========================================

Deployment failed at stage: subscription

PARTIAL DEPLOYMENT DETECTED:
  Token deployed at: 0x1234...

TO CONTINUE:
  1. Set EXISTING_TOKEN_ADDRESS=0x1234... in .env
  2. Run deployment script again
  3. Script will reuse existing token

TROUBLESHOOTING:
  1. Check deployer wallet still has sufficient balance
  2. Verify token address is valid
  3. Review error message above
===========================================
```

### Manual Recovery Steps

1. Check `deployments/{network}/recovery-state.json`
2. Note any successfully deployed contracts
3. Set `EXISTING_TOKEN_ADDRESS` in `.env` if token deployed
4. Re-run deployment script
5. Script will skip already-deployed contracts

## Deployment Artifacts

After successful deployment, find artifacts in `deployments/{network}/`:

### addresses.json
```json
{
  "network": "lisk-sepolia",
  "chainId": 4202,
  "deployer": "0x64a5128Fd2a9B63c1052D1960C66c335A430D809",
  "timestamp": 1234567890,
  "blockNumber": 12345,
  "MetaGaugeToken": "0x1234...",
  "MetaGaugeSubscription": "0x5678...",
  "paymentMode": "token"
}
```

### deployment-summary.md
Human-readable summary with:
- Network information
- Contract addresses with explorer links
- Subscription tier details
- Next steps

### recovery-state.json
Recovery information for failed deployments.

## Troubleshooting

### Insufficient Funds Error

**Error**: `insufficient funds for gas * price + value`

**Solution**:
1. Check deployer balance: Script shows current balance
2. Get funds:
   - **Sepolia**: https://sepolia-faucet.lisk.com
   - **Mainnet**: Transfer ETH to deployer wallet
3. Script shows exact amount needed
4. Retry deployment

### RPC Connection Failed

**Error**: `server returned an error response` or timeout

**Solutions**:
1. Check internet connection
2. Verify RPC URL in `.env`
3. Try alternative RPC endpoint
4. Wait and retry (RPC may be temporarily down)

### Contract Deployment Failed

**Error**: Contract deployment reverts

**Solutions**:
1. Check error message in console
2. Verify contract compiles: `forge build`
3. Check constructor arguments are valid
4. Review recovery instructions printed by script

### Verification Failed

**Error**: Contract verification fails on Blockscout

**Solutions**:
1. Contracts still work even if verification fails
2. Try manual verification later
3. Use helper command printed by script
4. Check Blockscout status

### Validation Failed

**Error**: Post-deployment validation fails

**Solutions**:
1. Review specific validation failure in output
2. Check contract state on explorer
3. Verify deployment configuration
4. Contact support if persistent

## Security Best Practices

### Before Deployment

- [ ] Test thoroughly on Sepolia testnet
- [ ] Review all contract code
- [ ] Verify `.env` file is in `.gitignore`
- [ ] Use hardware wallet for mainnet (recommended)
- [ ] Have recovery plan ready

### During Deployment

- [ ] Double-check network (Sepolia vs Mainnet)
- [ ] Verify deployer address is correct
- [ ] Monitor gas prices
- [ ] Save all output and addresses
- [ ] Verify contracts on explorer

### After Deployment

- [ ] Verify contract source code on explorer
- [ ] Test all subscription functionality
- [ ] Transfer ownership to multisig (recommended)
- [ ] Document all addresses securely
- [ ] Update frontend configuration
- [ ] Monitor contract interactions

### Private Key Security

⚠️ **CRITICAL**: Never commit `.env` with real private key!

- Use `.gitignore` to exclude `.env`
- Use hardware wallet for mainnet
- Consider using a deployment-only wallet
- Rotate keys after deployment
- Use multisig for contract ownership

## Advanced Usage

### Dry Run (Simulation)

Test deployment without broadcasting:
```bash
forge script script/DeployMetaGauge.s.sol:DeployMetaGauge \
  --rpc-url $LISK_SEPOLIA_RPC_URL
```

### Manual Verification

If automatic verification fails:
```bash
forge verify-contract \
  --chain-id 4202 \
  --verifier blockscout \
  --verifier-url https://sepolia-blockscout.lisk.com/api \
  <CONTRACT_ADDRESS> \
  src/MetaGaugeSubscription.sol:MetaGaugeSubscription \
  --constructor-args $(cast abi-encode "constructor(address,bool)" <TOKEN_ADDRESS> true)
```

### Custom Gas Price

Override gas price:
```bash
forge script script/DeployMetaGauge.s.sol:DeployMetaGauge \
  --rpc-url $LISK_SEPOLIA_RPC_URL \
  --broadcast \
  --gas-price 1000000000  # 1 gwei
```

## Support & Resources

- **Lisk Documentation**: https://docs.lisk.com
- **Foundry Book**: https://book.getfoundry.sh
- **Lisk Discord**: https://lisk.chat
- **Blockscout**: https://sepolia-blockscout.lisk.com

## Deployment Checklist

### Pre-Deployment
- [ ] Foundry installed and updated
- [ ] `.env` configured with private key
- [ ] Contracts build successfully (`forge build`)
- [ ] Deployer wallet funded
- [ ] Tested on Sepolia testnet

### Deployment
- [ ] Run deployment script
- [ ] Monitor console output
- [ ] Save contract addresses
- [ ] Verify contracts on explorer
- [ ] Check validation passes

### Post-Deployment
- [ ] Test subscription functionality
- [ ] Update frontend with addresses
- [ ] Document deployment details
- [ ] Transfer ownership if needed
- [ ] Monitor contract activity

## Example Deployment Flow

```bash
# 1. Setup
cp .env.example .env
nano .env  # Add PRIVATE_KEY

# 2. Build
forge build

# 3. Deploy to Sepolia
./deploy-sepolia.sh

# 4. Verify on explorer
# Visit https://sepolia-blockscout.lisk.com

# 5. Test functionality
# Subscribe to a plan, test features

# 6. Deploy to Mainnet (when ready)
./deploy-mainnet.sh

# 7. Verify mainnet deployment
# Visit https://blockscout.lisk.com
```

---

**Ready to deploy?** Start with Sepolia testnet using `./deploy-sepolia.sh`!
