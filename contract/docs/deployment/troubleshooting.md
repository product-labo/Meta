# MetaGauge Deployment Troubleshooting Guide

Quick solutions to common deployment issues.

## Table of Contents
- [Insufficient Funds](#insufficient-funds)
- [RPC Connection Issues](#rpc-connection-issues)
- [Contract Deployment Failures](#contract-deployment-failures)
- [Verification Issues](#verification-issues)
- [Validation Failures](#validation-failures)
- [Recovery from Failed Deployments](#recovery-from-failed-deployments)
- [Build Errors](#build-errors)
- [Environment Configuration](#environment-configuration)

---

## Insufficient Funds

### Error Message
```
Error: insufficient funds for gas * price + value: balance 0, tx cost 551725290, overshot 551725290
```

### Cause
Deployer wallet doesn't have enough ETH to pay for gas.

### Solution

#### For Sepolia Testnet:
1. Visit Lisk Sepolia Faucet: https://sepolia-faucet.lisk.com
2. Enter your deployer address
3. Request test ETH
4. Wait for transaction to confirm
5. Retry deployment

#### For Mainnet:
1. Check required amount in script output
2. Transfer ETH to deployer wallet
3. Recommended: Add 20% buffer
4. Retry deployment

### Prevention
- Run script first - it estimates costs before deploying
- Keep extra ETH in wallet for gas price fluctuations
- Monitor gas prices before mainnet deployment

---

## RPC Connection Issues

### Error Messages
```
Error: server returned an error response
Error: connection timeout
Error: RPC endpoint not responding
```

### Causes
- Internet connection issues
- RPC endpoint temporarily down
- Incorrect RPC URL
- Rate limiting

### Solutions

#### 1. Check Internet Connection
```bash
ping google.com
```

#### 2. Verify RPC URL
Check `.env` file:
```bash
# Should be:
LISK_SEPOLIA_RPC_URL=https://rpc.sepolia-api.lisk.com
LISK_MAINNET_RPC_URL=https://rpc.api.lisk.com
```

#### 3. Test RPC Endpoint
```bash
curl -X POST $LISK_SEPOLIA_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

#### 4. Wait and Retry
RPC endpoints may be temporarily overloaded. Wait 5-10 minutes and retry.

#### 5. Use Alternative RPC (if available)
Check Lisk documentation for alternative RPC endpoints.

---

## Contract Deployment Failures

### Error: Contract Deployment Reverted

#### Possible Causes:
1. **Constructor argument error**
2. **Contract size too large**
3. **Insufficient gas limit**
4. **Network congestion**

#### Solutions:

**1. Check Constructor Arguments**
```solidity
// Token mode: MetaGaugeSubscription(tokenAddress, true)
// ETH mode: MetaGaugeSubscription(address(0), false)
```

Verify:
- Token address is valid (if token mode)
- Boolean flag matches payment mode

**2. Verify Contract Compiles**
```bash
forge build
```

Check for compilation errors or warnings.

**3. Increase Gas Limit**
```bash
forge script script/DeployMetaGauge.s.sol:DeployMetaGauge \
  --rpc-url $LISK_SEPOLIA_RPC_URL \
  --broadcast \
  --gas-limit 10000000
```

**4. Check Network Status**
Visit explorer to check if network is experiencing issues:
- Sepolia: https://sepolia-blockscout.lisk.com
- Mainnet: https://blockscout.lisk.com

### Error: Out of Gas

#### Solution:
```bash
# Increase gas limit
forge script script/DeployMetaGauge.s.sol:DeployMetaGauge \
  --rpc-url $LISK_SEPOLIA_RPC_URL \
  --broadcast \
  --gas-limit 15000000
```

---

## Verification Issues

### Error: Contract Verification Failed

#### Causes:
- Blockscout API temporarily unavailable
- Constructor arguments mismatch
- Compiler version mismatch
- Source code mismatch

#### Solutions:

**1. Contracts Work Without Verification**
Your contracts are deployed and functional even if verification fails. Verification is for transparency only.

**2. Manual Verification**

For MetaGaugeToken (no constructor args):
```bash
forge verify-contract \
  --chain-id 4202 \
  --verifier blockscout \
  --verifier-url https://sepolia-blockscout.lisk.com/api \
  <TOKEN_ADDRESS> \
  src/MetaGaugeToken.sol:MetaGaugeToken
```

For MetaGaugeSubscription (with constructor args):
```bash
forge verify-contract \
  --chain-id 4202 \
  --verifier blockscout \
  --verifier-url https://sepolia-blockscout.lisk.com/api \
  <SUBSCRIPTION_ADDRESS> \
  src/MetaGaugeSubscription.sol:MetaGaugeSubscription \
  --constructor-args $(cast abi-encode "constructor(address,bool)" <TOKEN_ADDRESS> true)
```

**3. Wait and Retry**
Blockscout may be processing other verifications. Wait 10-15 minutes and try again.

**4. Check Blockscout Status**
Visit explorer and check if verification service is operational.

---

## Validation Failures

### Error: Deployment Validation Failed

The script validates deployed contracts. If validation fails, check specific error.

#### Common Validation Failures:

**1. Token Supply Mismatch**
```
❌ FAIL: Incorrect initial supply
```

**Cause**: Token contract not deployed correctly

**Solution**:
- Redeploy contracts
- Check MetaGaugeToken.sol for correct supply values

**2. Owner Mismatch**
```
❌ FAIL: Owner is not deployer
```

**Cause**: Ownership not set correctly during deployment

**Solution**:
- Check deployer private key in `.env`
- Verify deployer address matches expected owner

**3. Subscription Tier Not Active**
```
❌ FAIL: Tier is not active
```

**Cause**: Subscription plans not initialized correctly

**Solution**:
- Check MetaGaugeSubscription constructor
- Verify `_initializePlans()` is called

**4. Payment Mode Mismatch**
```
❌ FAIL: Payment mode mismatch
```

**Cause**: Deployed contract payment mode doesn't match configuration

**Solution**:
- Check `PAYMENT_MODE` in `.env`
- Verify constructor arguments match payment mode

---

## Recovery from Failed Deployments

### Scenario: Token Deployed, Subscription Failed

#### Recovery Steps:

1. **Check Recovery State**
```bash
cat deployments/lisk-sepolia/recovery-state.json
```

2. **Note Token Address**
```json
{
  "stage": "subscription_failed",
  "tokenAddress": "0x1234...",
  "subscriptionAddress": "0x0000..."
}
```

3. **Update .env**
```bash
EXISTING_TOKEN_ADDRESS=0x1234...
```

4. **Retry Deployment**
```bash
./deploy-sepolia.sh
```

Script will reuse existing token and only deploy subscription.

### Scenario: Complete Deployment Failure

#### Recovery Steps:

1. **Check Error Message**
Review console output for specific error

2. **Fix Issue**
- Add funds if insufficient balance
- Fix RPC connection
- Correct configuration

3. **Retry Deployment**
```bash
./deploy-sepolia.sh
```

Script will start fresh deployment.

---

## Build Errors

### Error: Compilation Failed

#### Common Causes:

**1. Missing Dependencies**
```bash
forge install
```

**2. Solidity Version Mismatch**
Check `foundry.toml`:
```toml
[profile.default]
solc_version = "0.8.19"
```

**3. Import Path Issues**
Verify remappings in `remappings.txt`:
```
openzeppelin/=lib/openzeppelin-contracts/contracts/
forge-std/=lib/forge-std/src/
```

**4. Syntax Errors**
```bash
forge build --force
```

Review error messages and fix syntax issues.

### Error: Library Not Found

```bash
# Reinstall dependencies
forge install OpenZeppelin/openzeppelin-contracts
forge install foundry-rs/forge-std
```

---

## Environment Configuration

### Error: Environment Variable Not Set

```
Error: environment variable "PRIVATE_KEY" not found
```

#### Solution:

1. **Check .env Exists**
```bash
ls -la .env
```

2. **Create from Example**
```bash
cp .env.example .env
```

3. **Add Required Variables**
```bash
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
LISK_SEPOLIA_RPC_URL=https://rpc.sepolia-api.lisk.com
LISK_MAINNET_RPC_URL=https://rpc.api.lisk.com
PAYMENT_MODE=token
```

4. **Load Environment**
```bash
source .env
```

### Error: Invalid Private Key

```
Error: invalid private key
```

#### Solutions:

1. **Ensure 0x Prefix**
```bash
PRIVATE_KEY=0x1234...  # ✅ Correct
PRIVATE_KEY=1234...    # ❌ Wrong
```

2. **Check Key Length**
Private key should be 64 hex characters (66 with 0x prefix)

3. **Verify Key Format**
```bash
# Test key validity
cast wallet address --private-key $PRIVATE_KEY
```

---

## Quick Diagnostic Commands

### Check Deployer Balance
```bash
cast balance <DEPLOYER_ADDRESS> --rpc-url $LISK_SEPOLIA_RPC_URL
```

### Check Contract Code
```bash
cast code <CONTRACT_ADDRESS> --rpc-url $LISK_SEPOLIA_RPC_URL
```

### Check Transaction Status
```bash
cast receipt <TX_HASH> --rpc-url $LISK_SEPOLIA_RPC_URL
```

### Test RPC Connection
```bash
cast block-number --rpc-url $LISK_SEPOLIA_RPC_URL
```

### Verify Contract Deployed
```bash
cast code <CONTRACT_ADDRESS> --rpc-url $LISK_SEPOLIA_RPC_URL
# Should return bytecode, not "0x"
```

---

## Getting Help

If you're still stuck:

1. **Check Logs**
   - Review full console output
   - Check `deployments/{network}/recovery-state.json`

2. **Verify Setup**
   - Run `forge build`
   - Check `.env` configuration
   - Verify wallet has funds

3. **Test on Sepolia First**
   - Always test on testnet before mainnet
   - Testnet failures are free to fix

4. **Community Support**
   - Lisk Discord: https://lisk.chat
   - Foundry Discord: https://discord.gg/foundry

5. **Documentation**
   - Lisk Docs: https://docs.lisk.com
   - Foundry Book: https://book.getfoundry.sh

---

## Prevention Checklist

Before deploying:

- [ ] Test on Sepolia testnet first
- [ ] Verify `.env` configuration
- [ ] Check deployer wallet has sufficient funds
- [ ] Run `forge build` successfully
- [ ] Review gas estimation output
- [ ] Have recovery plan ready
- [ ] Save all deployment output

---

**Still having issues?** Check the full deployment guide in `DEPLOYMENT-GUIDE.md`
