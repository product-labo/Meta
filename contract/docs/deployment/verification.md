# Contract Verification Guide

Complete guide for verifying MetaGauge smart contracts on Lisk block explorers.

## Table of Contents
- [Why Verify Contracts?](#why-verify-contracts)
- [Automatic Verification](#automatic-verification)
- [Manual Verification](#manual-verification)
- [Verification for Each Contract](#verification-for-each-contract)
- [Troubleshooting Verification](#troubleshooting-verification)
- [Verification Status Check](#verification-status-check)

## Why Verify Contracts?

Contract verification provides:

✅ **Transparency**: Users can read your contract source code
✅ **Trust**: Proves deployed bytecode matches source code
✅ **Interaction**: Enables direct contract interaction on explorer
✅ **Debugging**: Easier to debug and understand contract behavior
✅ **Auditing**: Auditors can review verified source code

**Note**: Contracts work perfectly fine without verification. Verification is purely for transparency and user confidence.

## Automatic Verification

The deployment script automatically verifies contracts when using the `--verify` flag.

### Using Deployment Scripts

**Sepolia Testnet**:
```bash
./deploy-sepolia.sh
```

**Mainnet**:
```bash
./deploy-mainnet.sh
```

Both scripts include automatic verification with these flags:
```bash
--verify \
--verifier blockscout \
--verifier-url <EXPLORER_API_URL>
```

### Verification Process

When deployment runs:

1. **Contracts Deploy** → Transactions broadcast to network
2. **Transactions Confirm** → Contracts deployed on-chain
3. **Verification Starts** → Foundry submits source code to Blockscout
4. **Verification Completes** → Source code visible on explorer

Expected output:
```
===========================================
CONTRACT VERIFICATION
===========================================

[MetaGaugeToken Verification]
  Address: 0x1234...
  Constructor Args: None
  Status: Will be verified by Foundry --verify flag

[MetaGaugeSubscription Verification]
  Address: 0x5678...
  Constructor Args:
    _tokenAddress: 0x1234...
    _useToken: true
  Status: Will be verified by Foundry --verify flag
===========================================
```

### Verification Success

Check explorer to confirm:
- ✅ Green checkmark next to contract
- ✅ "Contract" tab shows source code
- ✅ "Read Contract" and "Write Contract" tabs available

## Manual Verification

If automatic verification fails, verify manually using Foundry.

### Prerequisites

1. **Contract Address**: Address of deployed contract
2. **Constructor Arguments**: Arguments used during deployment
3. **Compiler Version**: Must match deployment (0.8.19 or 0.8.30)
4. **Optimization Settings**: Must match foundry.toml

### Verification Commands

#### MetaGaugeToken (No Constructor Args)

**Sepolia**:
```bash
forge verify-contract \
  --chain-id 4202 \
  --verifier blockscout \
  --verifier-url https://sepolia-blockscout.lisk.com/api \
  <TOKEN_ADDRESS> \
  src/MetaGaugeToken.sol:MetaGaugeToken
```

**Mainnet**:
```bash
forge verify-contract \
  --chain-id 1135 \
  --verifier blockscout \
  --verifier-url https://blockscout.lisk.com/api \
  <TOKEN_ADDRESS> \
  src/MetaGaugeToken.sol:MetaGaugeToken
```

#### MetaGaugeSubscription (With Constructor Args)

**Token Mode - Sepolia**:
```bash
forge verify-contract \
  --chain-id 4202 \
  --verifier blockscout \
  --verifier-url https://sepolia-blockscout.lisk.com/api \
  <SUBSCRIPTION_ADDRESS> \
  src/MetaGaugeSubscription.sol:MetaGaugeSubscription \
  --constructor-args $(cast abi-encode "constructor(address,bool)" <TOKEN_ADDRESS> true)
```

**Token Mode - Mainnet**:
```bash
forge verify-contract \
  --chain-id 1135 \
  --verifier blockscout \
  --verifier-url https://blockscout.lisk.com/api \
  <SUBSCRIPTION_ADDRESS> \
  src/MetaGaugeSubscription.sol:MetaGaugeSubscription \
  --constructor-args $(cast abi-encode "constructor(address,bool)" <TOKEN_ADDRESS> true)
```

**ETH Mode - Sepolia**:
```bash
forge verify-contract \
  --chain-id 4202 \
  --verifier blockscout \
  --verifier-url https://sepolia-blockscout.lisk.com/api \
  <SUBSCRIPTION_ADDRESS> \
  src/MetaGaugeSubscription.sol:MetaGaugeSubscription \
  --constructor-args $(cast abi-encode "constructor(address,bool)" 0x0000000000000000000000000000000000000000 false)
```

**ETH Mode - Mainnet**:
```bash
forge verify-contract \
  --chain-id 1135 \
  --verifier blockscout \
  --verifier-url https://blockscout.lisk.com/api \
  <SUBSCRIPTION_ADDRESS> \
  src/MetaGaugeSubscription.sol:MetaGaugeSubscription \
  --constructor-args $(cast abi-encode "constructor(address,bool)" 0x0000000000000000000000000000000000000000 false)
```

### Constructor Arguments Encoding

The `cast abi-encode` command encodes constructor arguments.

**Format**:
```bash
cast abi-encode "constructor(<TYPE1>,<TYPE2>,...)" <VALUE1> <VALUE2> ...
```

**Examples**:

Token mode (address + bool):
```bash
cast abi-encode "constructor(address,bool)" 0x1234567890123456789012345678901234567890 true
```

ETH mode (zero address + bool):
```bash
cast abi-encode "constructor(address,bool)" 0x0000000000000000000000000000000000000000 false
```

## Verification for Each Contract

### MetaGaugeToken

**Contract**: `src/MetaGaugeToken.sol:MetaGaugeToken`

**Constructor**: No arguments

**Verification**:
```bash
# Sepolia
forge verify-contract \
  --chain-id 4202 \
  --verifier blockscout \
  --verifier-url https://sepolia-blockscout.lisk.com/api \
  0xYOUR_TOKEN_ADDRESS \
  src/MetaGaugeToken.sol:MetaGaugeToken

# Mainnet
forge verify-contract \
  --chain-id 1135 \
  --verifier blockscout \
  --verifier-url https://blockscout.lisk.com/api \
  0xYOUR_TOKEN_ADDRESS \
  src/MetaGaugeToken.sol:MetaGaugeToken
```

**Expected Output**:
```
Start verifying contract `0x1234...` deployed on lisk-sepolia

Submitting verification for [src/MetaGaugeToken.sol:MetaGaugeToken] "0x1234..."
Submitted contract for verification:
        Response: `OK`
        GUID: `1234567890abcdef`
        URL: https://sepolia-blockscout.lisk.com/address/0x1234...
Contract verification status:
Response: `OK`
Details: `Pass - Verified`
Contract successfully verified
```

### MetaGaugeSubscription

**Contract**: `src/MetaGaugeSubscription.sol:MetaGaugeSubscription`

**Constructor**: `(address _tokenAddress, bool _useToken)`

**Token Mode Verification**:
```bash
# Sepolia
forge verify-contract \
  --chain-id 4202 \
  --verifier blockscout \
  --verifier-url https://sepolia-blockscout.lisk.com/api \
  0xYOUR_SUBSCRIPTION_ADDRESS \
  src/MetaGaugeSubscription.sol:MetaGaugeSubscription \
  --constructor-args $(cast abi-encode "constructor(address,bool)" 0xYOUR_TOKEN_ADDRESS true)

# Mainnet
forge verify-contract \
  --chain-id 1135 \
  --verifier blockscout \
  --verifier-url https://blockscout.lisk.com/api \
  0xYOUR_SUBSCRIPTION_ADDRESS \
  src/MetaGaugeSubscription.sol:MetaGaugeSubscription \
  --constructor-args $(cast abi-encode "constructor(address,bool)" 0xYOUR_TOKEN_ADDRESS true)
```

**ETH Mode Verification**:
```bash
# Sepolia
forge verify-contract \
  --chain-id 4202 \
  --verifier blockscout \
  --verifier-url https://sepolia-blockscout.lisk.com/api \
  0xYOUR_SUBSCRIPTION_ADDRESS \
  src/MetaGaugeSubscription.sol:MetaGaugeSubscription \
  --constructor-args $(cast abi-encode "constructor(address,bool)" 0x0000000000000000000000000000000000000000 false)

# Mainnet
forge verify-contract \
  --chain-id 1135 \
  --verifier blockscout \
  --verifier-url https://blockscout.lisk.com/api \
  0xYOUR_SUBSCRIPTION_ADDRESS \
  src/MetaGaugeSubscription.sol:MetaGaugeSubscription \
  --constructor-args $(cast abi-encode "constructor(address,bool)" 0x0000000000000000000000000000000000000000 false)
```

### MetaGaugeAccessControl

**Contract**: `src/MetaGaugeAccessControl.sol:MetaGaugeAccessControl`

**Constructor**: No arguments

**Verification**:
```bash
# Sepolia
forge verify-contract \
  --chain-id 4202 \
  --verifier blockscout \
  --verifier-url https://sepolia-blockscout.lisk.com/api \
  0xYOUR_ACCESS_CONTROL_ADDRESS \
  src/MetaGaugeAccessControl.sol:MetaGaugeAccessControl

# Mainnet
forge verify-contract \
  --chain-id 1135 \
  --verifier blockscout \
  --verifier-url https://blockscout.lisk.com/api \
  0xYOUR_ACCESS_CONTROL_ADDRESS \
  src/MetaGaugeAccessControl.sol:MetaGaugeAccessControl
```

## Troubleshooting Verification

### Issue: "Contract already verified"

**Cause**: Contract was already verified (possibly automatically)

**Solution**: Check explorer - if source code is visible, verification succeeded!

### Issue: "Bytecode does not match"

**Causes**:
- Wrong compiler version
- Wrong optimization settings
- Wrong constructor arguments
- Source code doesn't match deployed contract

**Solutions**:

1. **Check Compiler Version**:
```bash
# In foundry.toml
[profile.default]
solc = '0.8.30'  # or '0.8.19'
```

2. **Check Optimization Settings**:
```bash
# In foundry.toml
[profile.default]
optimizer = true
optimizer_runs = 200
via_ir = true
```

3. **Verify Constructor Arguments**:
```bash
# Get deployed bytecode
cast code <CONTRACT_ADDRESS> --rpc-url <RPC_URL>

# Check constructor args encoding
cast abi-encode "constructor(address,bool)" <TOKEN_ADDRESS> true
```

4. **Rebuild Contracts**:
```bash
forge clean
forge build
```

### Issue: "Verification timeout"

**Cause**: Blockscout API is busy or slow

**Solutions**:
1. Wait 5-10 minutes
2. Try verification again
3. Check Blockscout status
4. Try during off-peak hours

### Issue: "Invalid API response"

**Causes**:
- Blockscout API temporarily down
- Network connectivity issues
- Invalid verifier URL

**Solutions**:

1. **Check Verifier URL**:
```bash
# Sepolia
https://sepolia-blockscout.lisk.com/api

# Mainnet
https://blockscout.lisk.com/api
```

2. **Test API Connection**:
```bash
curl https://sepolia-blockscout.lisk.com/api
```

3. **Wait and Retry**: API may be temporarily unavailable

### Issue: "Constructor arguments mismatch"

**Cause**: Encoded constructor arguments don't match deployment

**Solution**: Verify exact arguments used during deployment

**Check deployment artifacts**:
```bash
cat deployments/lisk-sepolia/addresses.json
```

**For Token Mode**:
- First argument: Token contract address
- Second argument: `true`

**For ETH Mode**:
- First argument: `0x0000000000000000000000000000000000000000`
- Second argument: `false`

### Issue: "Source not found"

**Cause**: Contract path incorrect

**Solution**: Use full path from project root

**Correct Format**:
```bash
src/MetaGaugeToken.sol:MetaGaugeToken
src/MetaGaugeSubscription.sol:MetaGaugeSubscription
```

**Not**:
```bash
MetaGaugeToken  # ❌ Wrong
./src/MetaGaugeToken.sol:MetaGaugeToken  # ❌ Wrong
```

## Verification Status Check

### Check on Block Explorer

**Sepolia**:
1. Visit https://sepolia-blockscout.lisk.com
2. Search for contract address
3. Look for green checkmark ✅
4. Click "Contract" tab
5. Source code should be visible

**Mainnet**:
1. Visit https://blockscout.lisk.com
2. Search for contract address
3. Look for green checkmark ✅
4. Click "Contract" tab
5. Source code should be visible

### Check via Command Line

```bash
# Get contract code (should return bytecode)
cast code <CONTRACT_ADDRESS> --rpc-url <RPC_URL>

# If returns "0x", contract not deployed
# If returns bytecode, contract deployed (verification separate)
```

### Verification Indicators

**Verified Contract**:
- ✅ Green checkmark on explorer
- ✅ "Contract" tab shows source code
- ✅ "Read Contract" tab available
- ✅ "Write Contract" tab available
- ✅ Constructor arguments visible
- ✅ Compiler version shown

**Unverified Contract**:
- ❌ No checkmark
- ❌ Only bytecode visible
- ❌ No source code tab
- ❌ Limited interaction options

## Batch Verification

Verify multiple contracts at once:

```bash
#!/bin/bash

# Set variables
TOKEN_ADDRESS="0x1234..."
SUBSCRIPTION_ADDRESS="0x5678..."
CHAIN_ID=4202
VERIFIER_URL="https://sepolia-blockscout.lisk.com/api"

# Verify Token
echo "Verifying MetaGaugeToken..."
forge verify-contract \
  --chain-id $CHAIN_ID \
  --verifier blockscout \
  --verifier-url $VERIFIER_URL \
  $TOKEN_ADDRESS \
  src/MetaGaugeToken.sol:MetaGaugeToken

# Verify Subscription
echo "Verifying MetaGaugeSubscription..."
forge verify-contract \
  --chain-id $CHAIN_ID \
  --verifier blockscout \
  --verifier-url $VERIFIER_URL \
  $SUBSCRIPTION_ADDRESS \
  src/MetaGaugeSubscription.sol:MetaGaugeSubscription \
  --constructor-args $(cast abi-encode "constructor(address,bool)" $TOKEN_ADDRESS true)

echo "Verification complete!"
```

## Verification Best Practices

### 1. Verify Immediately After Deployment
- Verify while deployment details are fresh
- Easier to remember constructor arguments
- Catch issues early

### 2. Save Verification Commands
- Document exact commands used
- Save constructor arguments
- Keep for future reference

### 3. Verify on All Networks
- Verify on testnet first
- Then verify on mainnet
- Maintain consistency

### 4. Check Verification Success
- Always verify on explorer
- Check source code is visible
- Test "Read Contract" functionality

### 5. Document Verification
- Save verification transaction hashes
- Document any issues encountered
- Keep verification logs

## Network-Specific Information

### Lisk Sepolia Testnet

- **Chain ID**: 4202
- **Explorer**: https://sepolia-blockscout.lisk.com
- **API URL**: https://sepolia-blockscout.lisk.com/api
- **Verification**: Usually instant (< 1 minute)

### Lisk Mainnet

- **Chain ID**: 1135
- **Explorer**: https://blockscout.lisk.com
- **API URL**: https://blockscout.lisk.com/api
- **Verification**: Usually instant (< 1 minute)

## Alternative: Blockscout Web Interface

If command-line verification fails, use Blockscout web interface:

1. **Visit Explorer**: Go to contract address on Blockscout
2. **Click "Verify & Publish"**: Usually in contract tab
3. **Select Compiler**: Choose Solidity version (0.8.19 or 0.8.30)
4. **Select Optimization**: Enable with 200 runs
5. **Paste Source Code**: Copy entire contract source
6. **Add Constructor Args**: Paste ABI-encoded arguments
7. **Submit**: Click verify button

**Note**: Command-line verification is recommended for consistency.

## Resources

- **Foundry Verification Docs**: https://book.getfoundry.sh/reference/forge/forge-verify-contract
- **Blockscout Docs**: https://docs.blockscout.com
- **Lisk Documentation**: https://docs.lisk.com

## Related Documentation

- **[Testnet Deployment](testnet.md)** - Deploy and test on Lisk Sepolia
- **[Mainnet Deployment](mainnet.md)** - Production deployment guide
- **[Environment Setup](environment-setup.md)** - Configure environment variables
- **[Network Configuration](network-configuration.md)** - Network details and RPC endpoints
- **[Troubleshooting Guide](troubleshooting.md)** - Common issues and solutions
- **[Quick Start Guide](quick-start.md)** - Comprehensive deployment guide

## Support

Need help with verification?
- Check troubleshooting section above
- Review deployment logs
- Join Lisk Discord: https://lisk.chat
- Check Foundry Discord: https://discord.gg/foundry

---

**Remember**: Contracts work without verification. Verification is for transparency and user confidence!
