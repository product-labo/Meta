# Environment Variables Setup Guide

Complete guide for configuring environment variables for MetaGauge contract deployment.

## Table of Contents
- [Overview](#overview)
- [Quick Setup](#quick-setup)
- [Environment Variables Reference](#environment-variables-reference)
- [Configuration Examples](#configuration-examples)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

MetaGauge uses environment variables to configure deployment settings. All configuration is stored in a `.env` file that should **never** be committed to version control.

### Why Environment Variables?

✅ **Security**: Keep private keys out of source code
✅ **Flexibility**: Easy to switch between networks
✅ **Portability**: Same code works across environments
✅ **Safety**: Prevents accidental exposure of secrets

## Quick Setup

### 1. Copy Example File

```bash
cp .env.example .env
```

### 2. Edit Configuration

```bash
# Linux/Mac
nano .env

# Or use your preferred editor
code .env
vim .env
```

### 3. Add Required Values

Minimum required configuration:
```bash
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
LISK_SEPOLIA_RPC_URL=https://rpc.sepolia-api.lisk.com
LISK_MAINNET_RPC_URL=https://rpc.api.lisk.com
PAYMENT_MODE=token
```

### 4. Verify Configuration

```bash
# Check file exists
ls -la .env

# Verify it's in .gitignore
cat .gitignore | grep .env
```

## Environment Variables Reference

### Required Variables

#### PRIVATE_KEY

**Description**: Private key of the wallet that will deploy contracts

**Format**: Hexadecimal string starting with `0x`

**Example**:
```bash
PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

**How to Get**:
1. Open MetaMask
2. Click account menu → Account details
3. Click "Export Private Key"
4. Enter password
5. Copy private key

**Security**:
- ⚠️ **NEVER** commit this to git
- ⚠️ **NEVER** share this with anyone
- ⚠️ Use a dedicated deployment wallet
- ⚠️ Consider using hardware wallet for mainnet

#### LISK_SEPOLIA_RPC_URL

**Description**: RPC endpoint for Lisk Sepolia testnet

**Default**: `https://rpc.sepolia-api.lisk.com`

**Example**:
```bash
LISK_SEPOLIA_RPC_URL=https://rpc.sepolia-api.lisk.com
```

**Alternative Endpoints**:
- Public Lisk RPC (no API key needed)
- Custom RPC if you have one

#### LISK_MAINNET_RPC_URL

**Description**: RPC endpoint for Lisk mainnet

**Default**: `https://rpc.api.lisk.com`

**Example**:
```bash
LISK_MAINNET_RPC_URL=https://rpc.api.lisk.com
```

**Alternative Endpoints**:
- Public Lisk RPC (no API key needed)
- Custom RPC if you have one

#### PAYMENT_MODE

**Description**: Determines how users pay for subscriptions

**Options**:
- `token` - Users pay with MGT tokens (deploys token + subscription)
- `eth` - Users pay with native ETH (deploys subscription only)

**Example**:
```bash
PAYMENT_MODE=token
```

**Choosing Payment Mode**:

**Token Mode** (`token`):
- ✅ Deploy custom ERC20 token (MGT)
- ✅ Users pay with MGT tokens
- ✅ More control over token economics
- ✅ Can implement token utilities
- ❌ Users need to acquire tokens first
- ❌ Extra step (approve + subscribe)

**ETH Mode** (`eth`):
- ✅ Users pay with native ETH
- ✅ Simpler user experience
- ✅ No token approval needed
- ✅ One-step subscription
- ❌ No custom token
- ❌ Less flexibility

### Optional Variables

#### EXISTING_TOKEN_ADDRESS

**Description**: Address of previously deployed MetaGaugeToken to reuse

**Format**: Ethereum address (0x...)

**Default**: Empty (deploy new token)

**Example**:
```bash
EXISTING_TOKEN_ADDRESS=0x8a21CF9Ba08Ae709D64Cb25AfAA951183EC9FF6D
```

**When to Use**:
- Reusing token from previous deployment
- Testing subscription with existing token
- Recovering from failed deployment
- Multiple subscription contracts with same token

**When to Leave Empty**:
- First deployment
- Want fresh token deployment
- ETH mode (not used)

#### BLOCKSCOUT_API_KEY

**Description**: API key for Blockscout verification (usually not required for Lisk)

**Format**: String

**Default**: Empty

**Example**:
```bash
BLOCKSCOUT_API_KEY=your_api_key_here
```

**Note**: Lisk Blockscout typically doesn't require API key for verification.

## Configuration Examples

### Example 1: First Deployment (Token Mode)

**Scenario**: First time deploying, want token-based payments

```bash
# Required
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
LISK_SEPOLIA_RPC_URL=https://rpc.sepolia-api.lisk.com
LISK_MAINNET_RPC_URL=https://rpc.api.lisk.com
PAYMENT_MODE=token

# Optional (leave empty for new deployment)
EXISTING_TOKEN_ADDRESS=
BLOCKSCOUT_API_KEY=
```

**Result**:
- Deploys MetaGaugeToken
- Deploys MetaGaugeSubscription (token mode)
- Users pay with MGT tokens

### Example 2: First Deployment (ETH Mode)

**Scenario**: First time deploying, want ETH-based payments

```bash
# Required
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
LISK_SEPOLIA_RPC_URL=https://rpc.sepolia-api.lisk.com
LISK_MAINNET_RPC_URL=https://rpc.api.lisk.com
PAYMENT_MODE=eth

# Optional (not used in ETH mode)
EXISTING_TOKEN_ADDRESS=
BLOCKSCOUT_API_KEY=
```

**Result**:
- Deploys MetaGaugeSubscription only (ETH mode)
- Users pay with native ETH
- No token deployed

### Example 3: Reusing Existing Token

**Scenario**: Already have token deployed, want new subscription contract

```bash
# Required
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
LISK_SEPOLIA_RPC_URL=https://rpc.sepolia-api.lisk.com
LISK_MAINNET_RPC_URL=https://rpc.api.lisk.com
PAYMENT_MODE=token

# Optional - specify existing token
EXISTING_TOKEN_ADDRESS=0x8a21CF9Ba08Ae709D64Cb25AfAA951183EC9FF6D
BLOCKSCOUT_API_KEY=
```

**Result**:
- Skips token deployment
- Uses existing token at specified address
- Deploys MetaGaugeSubscription (token mode)
- Links subscription to existing token

### Example 4: Testnet Configuration

**Scenario**: Testing on Lisk Sepolia

```bash
# Use test wallet private key
PRIVATE_KEY=0xTEST_WALLET_PRIVATE_KEY

# Sepolia RPC
LISK_SEPOLIA_RPC_URL=https://rpc.sepolia-api.lisk.com

# Mainnet RPC (not used for testnet, but required)
LISK_MAINNET_RPC_URL=https://rpc.api.lisk.com

# Test with token mode
PAYMENT_MODE=token

# No existing token
EXISTING_TOKEN_ADDRESS=

# No API key needed
BLOCKSCOUT_API_KEY=
```

**Deployment Command**:
```bash
./deploy-sepolia.sh
```

### Example 5: Mainnet Configuration

**Scenario**: Production deployment on Lisk mainnet

```bash
# Use secure mainnet wallet private key
PRIVATE_KEY=0xMAINNET_WALLET_PRIVATE_KEY

# Sepolia RPC (not used for mainnet, but required)
LISK_SEPOLIA_RPC_URL=https://rpc.sepolia-api.lisk.com

# Mainnet RPC
LISK_MAINNET_RPC_URL=https://rpc.api.lisk.com

# Production payment mode
PAYMENT_MODE=token

# No existing token (fresh deployment)
EXISTING_TOKEN_ADDRESS=

# No API key needed
BLOCKSCOUT_API_KEY=
```

**Deployment Command**:
```bash
./deploy-mainnet.sh
```

### Example 6: Recovery from Failed Deployment

**Scenario**: Token deployed successfully, subscription failed

```bash
# Same private key
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Same RPC URLs
LISK_SEPOLIA_RPC_URL=https://rpc.sepolia-api.lisk.com
LISK_MAINNET_RPC_URL=https://rpc.api.lisk.com

# Same payment mode
PAYMENT_MODE=token

# Use token from failed deployment
EXISTING_TOKEN_ADDRESS=0xTOKEN_FROM_FAILED_DEPLOYMENT

# No API key needed
BLOCKSCOUT_API_KEY=
```

**Result**: Script reuses existing token, only deploys subscription

## Security Best Practices

### 1. Never Commit .env File

**Verify .gitignore**:
```bash
cat .gitignore | grep .env
```

Should contain:
```
.env
.env.local
.env.*.local
```

**Check git status**:
```bash
git status
```

`.env` should NOT appear in untracked or staged files.

### 2. Use Dedicated Deployment Wallet

**Testnet**:
- Create separate wallet for testnet
- Use different private key than mainnet
- OK to use less secure wallet (test funds only)

**Mainnet**:
- Use hardware wallet if possible
- Or create dedicated deployment wallet
- Transfer ownership to multisig after deployment

### 3. Limit Wallet Funds

**Testnet**:
- Keep minimal test ETH
- Request from faucet as needed

**Mainnet**:
- Only keep enough for deployment
- ~0.01-0.02 ETH should be sufficient
- Transfer excess after deployment

### 4. Rotate Keys After Deployment

**After mainnet deployment**:
1. Transfer contract ownership to secure wallet/multisig
2. Remove private key from `.env`
3. Consider rotating deployment wallet key

### 5. Secure .env File Permissions

**Linux/Mac**:
```bash
# Make .env readable only by you
chmod 600 .env

# Verify permissions
ls -la .env
# Should show: -rw------- (600)
```

**Windows**:
- Right-click `.env` → Properties → Security
- Remove all users except yourself
- Set to Read-only

### 6. Use Environment-Specific Files

**Development**:
```bash
.env.development  # Development settings
.env.test         # Test settings
.env.production   # Production settings
```

**Load specific environment**:
```bash
# Copy appropriate file
cp .env.production .env
```

### 7. Backup Configuration Securely

**DO**:
- ✅ Store backup in password manager
- ✅ Use encrypted storage
- ✅ Keep offline backup

**DON'T**:
- ❌ Email to yourself
- ❌ Store in cloud without encryption
- ❌ Share via messaging apps
- ❌ Commit to git

## Troubleshooting

### Issue: "Environment variable not found"

**Error**:
```
Error: environment variable "PRIVATE_KEY" not found
```

**Solutions**:

1. **Check .env exists**:
```bash
ls -la .env
```

2. **Check variable is set**:
```bash
cat .env | grep PRIVATE_KEY
```

3. **Check for typos**:
```bash
# Correct
PRIVATE_KEY=0x123...

# Wrong
PRIVATEKEY=0x123...  # Missing underscore
PRIVATE_KEY =0x123...  # Space before =
PRIVATE_KEY= 0x123...  # Space after =
```

4. **Load environment**:
```bash
source .env
```

### Issue: "Invalid private key"

**Error**:
```
Error: invalid private key
```

**Solutions**:

1. **Check 0x prefix**:
```bash
# Correct
PRIVATE_KEY=0x1234...

# Wrong
PRIVATE_KEY=1234...  # Missing 0x
```

2. **Check key length**:
```bash
# Should be 66 characters (including 0x)
echo $PRIVATE_KEY | wc -c
```

3. **Check for extra characters**:
```bash
# Remove quotes if present
PRIVATE_KEY=0x123...  # ✅ Correct
PRIVATE_KEY="0x123..."  # ❌ Wrong (quotes)
PRIVATE_KEY='0x123...'  # ❌ Wrong (quotes)
```

4. **Verify key format**:
```bash
cast wallet address --private-key $PRIVATE_KEY
```

### Issue: "RPC connection failed"

**Error**:
```
Error: server returned an error response
```

**Solutions**:

1. **Check RPC URL**:
```bash
echo $LISK_SEPOLIA_RPC_URL
# Should be: https://rpc.sepolia-api.lisk.com
```

2. **Test RPC connection**:
```bash
curl -X POST $LISK_SEPOLIA_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

3. **Check for typos**:
```bash
# Correct
LISK_SEPOLIA_RPC_URL=https://rpc.sepolia-api.lisk.com

# Wrong
LISK_SEPOLIA_RPC_URL=http://rpc.sepolia-api.lisk.com  # http instead of https
LISK_SEPOLIA_RPC_URL=https://rpc.sepolia-api.lisk.com/  # trailing slash
```

### Issue: "Payment mode not recognized"

**Error**:
```
Error: invalid payment mode
```

**Solutions**:

1. **Check value**:
```bash
echo $PAYMENT_MODE
# Should be: token or eth
```

2. **Check for typos**:
```bash
# Correct
PAYMENT_MODE=token
PAYMENT_MODE=eth

# Wrong
PAYMENT_MODE=Token  # Capital T
PAYMENT_MODE=TOKEN  # All caps
PAYMENT_MODE=tokens  # Plural
```

3. **Check for extra spaces**:
```bash
# Correct
PAYMENT_MODE=token

# Wrong
PAYMENT_MODE= token  # Space after =
PAYMENT_MODE=token   # Extra space at end
```

### Issue: ".env file not loaded"

**Symptoms**: Variables not available in script

**Solutions**:

1. **Load manually**:
```bash
source .env
```

2. **Check file location**:
```bash
# Should be in project root
ls -la .env
```

3. **Check script loads .env**:
```bash
# Deployment scripts should have:
source .env
```

## Validation Checklist

Before deploying, verify:

- [ ] `.env` file exists in project root
- [ ] `PRIVATE_KEY` is set with `0x` prefix
- [ ] `PRIVATE_KEY` is 66 characters long
- [ ] `LISK_SEPOLIA_RPC_URL` is correct
- [ ] `LISK_MAINNET_RPC_URL` is correct
- [ ] `PAYMENT_MODE` is either `token` or `eth`
- [ ] `EXISTING_TOKEN_ADDRESS` is valid address or empty
- [ ] `.env` is in `.gitignore`
- [ ] `.env` has correct permissions (600)
- [ ] Wallet has sufficient funds

**Validation Command**:
```bash
# Test configuration
forge script script/DeployMetaGauge.s.sol:DeployMetaGauge \
  --rpc-url $LISK_SEPOLIA_RPC_URL
# Should show pre-deployment checks without broadcasting
```

## Resources

- **Foundry Environment Variables**: https://book.getfoundry.sh/reference/config/
- **Lisk RPC Endpoints**: https://docs.lisk.com/
- **MetaMask Private Key Export**: https://support.metamask.io/

## Related Documentation

- **[Network Configuration](network-configuration.md)** - Network details and RPC endpoints
- **[Testnet Deployment](testnet.md)** - Deploy and test on Lisk Sepolia
- **[Mainnet Deployment](mainnet.md)** - Production deployment guide
- **[Contract Verification](verification.md)** - Verify contracts on block explorer
- **[Troubleshooting Guide](troubleshooting.md)** - Common issues and solutions
- **[Quick Start Guide](quick-start.md)** - Comprehensive deployment guide

## Support

Need help with environment setup?
- Check troubleshooting section above
- Review `.env.example` file
- Join Lisk Discord: https://lisk.chat

---

**Remember**: Never commit `.env` file to version control!
