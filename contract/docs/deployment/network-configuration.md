# Network Configuration Guide

Complete reference for all supported networks and their configuration for MetaGauge deployment.

## Table of Contents
- [Supported Networks](#supported-networks)
- [Network Details](#network-details)
- [RPC Endpoints](#rpc-endpoints)
- [Block Explorers](#block-explorers)
- [Network-Specific Configuration](#network-specific-configuration)
- [Adding Custom Networks](#adding-custom-networks)
- [Network Troubleshooting](#network-troubleshooting)

## Supported Networks

MetaGauge contracts can be deployed on the following Lisk networks:

| Network | Chain ID | Type | Status |
|---------|----------|------|--------|
| Lisk Mainnet | 1135 | Production | ✅ Supported |
| Lisk Sepolia | 4202 | Testnet | ✅ Supported |

## Network Details

### Lisk Mainnet

**Overview**: Production network for live deployments

**Network Information**:
- **Name**: Lisk Mainnet
- **Chain ID**: 1135
- **Currency**: ETH
- **Type**: Layer 2 (Optimism Superchain)
- **Status**: Production

**Key Features**:
- ✅ Production-ready
- ✅ Real value transactions
- ✅ Full security
- ✅ Permanent deployment
- ⚠️ Costs real ETH

**Use Cases**:
- Production deployments
- Live applications
- Real user interactions
- Revenue generation

**Deployment Considerations**:
- Test thoroughly on Sepolia first
- Ensure sufficient ETH for gas
- Use secure wallet (hardware wallet recommended)
- Consider multisig for contract ownership
- Have rollback plan ready

### Lisk Sepolia

**Overview**: Testnet for development and testing

**Network Information**:
- **Name**: Lisk Sepolia Testnet
- **Chain ID**: 4202
- **Currency**: Sepolia ETH (test ETH)
- **Type**: Layer 2 Testnet
- **Status**: Active

**Key Features**:
- ✅ Free test ETH from faucet
- ✅ Safe testing environment
- ✅ Identical to mainnet functionality
- ✅ Can deploy/redeploy freely
- ✅ No real value at risk

**Use Cases**:
- Development and testing
- Integration testing
- Frontend development
- User acceptance testing
- Deployment practice

**Deployment Considerations**:
- Always test here before mainnet
- Use dedicated test wallet
- Test all features thoroughly
- Verify contract interactions
- Practice deployment procedures

## RPC Endpoints

### Lisk Mainnet RPC

**Primary Endpoint**:
```
https://rpc.api.lisk.com
```

**Configuration**:
```bash
# In .env
LISK_MAINNET_RPC_URL=https://rpc.api.lisk.com
```

**Features**:
- ✅ Public endpoint (no API key required)
- ✅ High availability
- ✅ Rate limits apply
- ✅ Free to use

**Rate Limits**:
- Requests per second: Reasonable limits for deployment
- Burst capacity: Sufficient for contract deployment
- Note: Limits may vary, check Lisk documentation

**Alternative Endpoints**:
- Custom RPC if you have one
- Third-party providers (if available)

### Lisk Sepolia RPC

**Primary Endpoint**:
```
https://rpc.sepolia-api.lisk.com
```

**Configuration**:
```bash
# In .env
LISK_SEPOLIA_RPC_URL=https://rpc.sepolia-api.lisk.com
```

**Features**:
- ✅ Public endpoint (no API key required)
- ✅ High availability
- ✅ Rate limits apply
- ✅ Free to use

**Rate Limits**:
- Requests per second: Reasonable limits for testing
- Burst capacity: Sufficient for contract deployment
- Note: Limits may vary, check Lisk documentation

**Alternative Endpoints**:
- Custom RPC if you have one
- Third-party providers (if available)

### Testing RPC Connection

**Test Lisk Mainnet**:
```bash
curl -X POST https://rpc.api.lisk.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

**Test Lisk Sepolia**:
```bash
curl -X POST https://rpc.sepolia-api.lisk.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

**Expected Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": "0x1c3a5b7"
}
```

**Using Cast**:
```bash
# Get current block number
cast block-number --rpc-url https://rpc.sepolia-api.lisk.com

# Get chain ID
cast chain-id --rpc-url https://rpc.sepolia-api.lisk.com

# Get gas price
cast gas-price --rpc-url https://rpc.sepolia-api.lisk.com
```

## Block Explorers

### Lisk Mainnet Explorer

**Blockscout**:
- **URL**: https://blockscout.lisk.com
- **API**: https://blockscout.lisk.com/api
- **Features**:
  - Contract verification
  - Transaction tracking
  - Address monitoring
  - Token tracking
  - Contract interaction

**Usage**:
```bash
# View contract
https://blockscout.lisk.com/address/<CONTRACT_ADDRESS>

# View transaction
https://blockscout.lisk.com/tx/<TX_HASH>

# View token
https://blockscout.lisk.com/token/<TOKEN_ADDRESS>
```

**Verification**:
```bash
forge verify-contract \
  --chain-id 1135 \
  --verifier blockscout \
  --verifier-url https://blockscout.lisk.com/api \
  <CONTRACT_ADDRESS> \
  <CONTRACT_PATH>
```

### Lisk Sepolia Explorer

**Blockscout**:
- **URL**: https://sepolia-blockscout.lisk.com
- **API**: https://sepolia-blockscout.lisk.com/api
- **Features**:
  - Contract verification
  - Transaction tracking
  - Address monitoring
  - Token tracking
  - Contract interaction

**Usage**:
```bash
# View contract
https://sepolia-blockscout.lisk.com/address/<CONTRACT_ADDRESS>

# View transaction
https://sepolia-blockscout.lisk.com/tx/<TX_HASH>

# View token
https://sepolia-blockscout.lisk.com/token/<TOKEN_ADDRESS>
```

**Verification**:
```bash
forge verify-contract \
  --chain-id 4202 \
  --verifier blockscout \
  --verifier-url https://sepolia-blockscout.lisk.com/api \
  <CONTRACT_ADDRESS> \
  <CONTRACT_PATH>
```

## Network-Specific Configuration

### Foundry Configuration

**foundry.toml**:
```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = '0.8.30'

optimizer = true
optimizer_runs = 200
via_ir = true

# RPC endpoints
[rpc_endpoints]
lisk-mainnet = "${LISK_MAINNET_RPC_URL}"
lisk-sepolia = "${LISK_SEPOLIA_RPC_URL}"
```

### MetaMask Configuration

#### Add Lisk Mainnet

1. Open MetaMask
2. Click network dropdown
3. Click "Add Network"
4. Enter details:

```
Network Name: Lisk
RPC URL: https://rpc.api.lisk.com
Chain ID: 1135
Currency Symbol: ETH
Block Explorer: https://blockscout.lisk.com
```

#### Add Lisk Sepolia

1. Open MetaMask
2. Click network dropdown
3. Click "Add Network"
4. Enter details:

```
Network Name: Lisk Sepolia
RPC URL: https://rpc.sepolia-api.lisk.com
Chain ID: 4202
Currency Symbol: ETH
Block Explorer: https://sepolia-blockscout.lisk.com
```

### Hardhat Configuration

If using Hardhat:

```javascript
// hardhat.config.js
module.exports = {
  networks: {
    liskMainnet: {
      url: process.env.LISK_MAINNET_RPC_URL || "https://rpc.api.lisk.com",
      chainId: 1135,
      accounts: [process.env.PRIVATE_KEY]
    },
    liskSepolia: {
      url: process.env.LISK_SEPOLIA_RPC_URL || "https://rpc.sepolia-api.lisk.com",
      chainId: 4202,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
```

### Web3.js Configuration

```javascript
const Web3 = require('web3');

// Lisk Mainnet
const web3Mainnet = new Web3('https://rpc.api.lisk.com');

// Lisk Sepolia
const web3Sepolia = new Web3('https://rpc.sepolia-api.lisk.com');

// Verify connection
web3Mainnet.eth.getChainId().then(chainId => {
  console.log('Chain ID:', chainId); // Should be 1135
});
```

### Ethers.js Configuration

```javascript
const { ethers } = require('ethers');

// Lisk Mainnet
const providerMainnet = new ethers.JsonRpcProvider('https://rpc.api.lisk.com');

// Lisk Sepolia
const providerSepolia = new ethers.JsonRpcProvider('https://rpc.sepolia-api.lisk.com');

// Verify connection
providerMainnet.getNetwork().then(network => {
  console.log('Chain ID:', network.chainId); // Should be 1135n
});
```

## Adding Custom Networks

### Custom RPC Endpoint

If you have a custom RPC endpoint:

**1. Update .env**:
```bash
# Use custom RPC
LISK_MAINNET_RPC_URL=https://your-custom-rpc.com
```

**2. Test Connection**:
```bash
cast block-number --rpc-url $LISK_MAINNET_RPC_URL
```

**3. Deploy**:
```bash
./deploy-mainnet.sh
```

### Custom Network (Non-Lisk)

To deploy on a different EVM-compatible network:

**1. Update foundry.toml**:
```toml
[rpc_endpoints]
custom-network = "${CUSTOM_RPC_URL}"
```

**2. Update .env**:
```bash
CUSTOM_RPC_URL=https://rpc.custom-network.com
CUSTOM_CHAIN_ID=12345
```

**3. Deploy**:
```bash
forge script script/DeployMetaGauge.s.sol:DeployMetaGauge \
  --rpc-url $CUSTOM_RPC_URL \
  --broadcast \
  --verify \
  --verifier blockscout \
  --verifier-url https://explorer.custom-network.com/api \
  -vvvv
```

**Note**: Verification may not work if custom network doesn't use Blockscout.

## Network Troubleshooting

### Issue: Wrong Network

**Symptoms**:
- Deployment fails with "invalid chain id"
- Transactions not confirming
- Unexpected behavior

**Solutions**:

1. **Check Chain ID**:
```bash
cast chain-id --rpc-url $LISK_SEPOLIA_RPC_URL
# Should return: 4202

cast chain-id --rpc-url $LISK_MAINNET_RPC_URL
# Should return: 1135
```

2. **Verify RPC URL**:
```bash
echo $LISK_SEPOLIA_RPC_URL
# Should be: https://rpc.sepolia-api.lisk.com

echo $LISK_MAINNET_RPC_URL
# Should be: https://rpc.api.lisk.com
```

3. **Check MetaMask Network**:
- Ensure MetaMask is on correct network
- Chain ID should match deployment target

### Issue: RPC Connection Timeout

**Symptoms**:
- "connection timeout" error
- "server not responding" error
- Slow or hanging requests

**Solutions**:

1. **Test RPC Endpoint**:
```bash
curl -X POST $LISK_SEPOLIA_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

2. **Check Internet Connection**:
```bash
ping google.com
```

3. **Try Alternative RPC**:
- Use different RPC endpoint if available
- Check Lisk documentation for alternatives

4. **Wait and Retry**:
- RPC may be temporarily overloaded
- Wait 5-10 minutes and try again

### Issue: Rate Limiting

**Symptoms**:
- "rate limit exceeded" error
- "too many requests" error
- Intermittent failures

**Solutions**:

1. **Slow Down Requests**:
- Add delays between transactions
- Reduce concurrent requests

2. **Use Custom RPC**:
- Set up your own RPC node
- Use paid RPC service

3. **Batch Operations**:
- Combine multiple operations
- Reduce total request count

### Issue: Gas Price Too High

**Symptoms**:
- Deployment costs more than expected
- "gas price too high" warnings

**Solutions**:

1. **Check Current Gas Price**:
```bash
cast gas-price --rpc-url $LISK_SEPOLIA_RPC_URL
```

2. **Wait for Lower Gas**:
- Monitor gas prices
- Deploy during off-peak hours

3. **Set Custom Gas Price**:
```bash
forge script script/DeployMetaGauge.s.sol:DeployMetaGauge \
  --rpc-url $LISK_SEPOLIA_RPC_URL \
  --broadcast \
  --gas-price 1000000000  # 1 gwei
```

### Issue: Nonce Too Low/High

**Symptoms**:
- "nonce too low" error
- "nonce too high" error
- Transaction stuck

**Solutions**:

1. **Check Nonce**:
```bash
cast nonce <YOUR_ADDRESS> --rpc-url $LISK_SEPOLIA_RPC_URL
```

2. **Reset Nonce** (MetaMask):
- Settings → Advanced → Reset Account
- This clears transaction history

3. **Specify Nonce**:
```bash
forge script script/DeployMetaGauge.s.sol:DeployMetaGauge \
  --rpc-url $LISK_SEPOLIA_RPC_URL \
  --broadcast \
  --nonce <CORRECT_NONCE>
```

## Network Comparison

| Feature | Lisk Mainnet | Lisk Sepolia |
|---------|--------------|--------------|
| **Purpose** | Production | Testing |
| **Chain ID** | 1135 | 4202 |
| **Currency** | ETH (real) | ETH (test) |
| **Faucet** | ❌ No | ✅ Yes |
| **Cost** | Real money | Free |
| **Permanence** | Permanent | May reset |
| **Security** | Full | Test only |
| **Explorer** | blockscout.lisk.com | sepolia-blockscout.lisk.com |
| **RPC** | rpc.api.lisk.com | rpc.sepolia-api.lisk.com |

## Best Practices

### 1. Always Test on Sepolia First

- ✅ Deploy to Sepolia
- ✅ Test all functionality
- ✅ Verify contracts
- ✅ Test integrations
- ✅ Fix any issues
- ✅ Then deploy to mainnet

### 2. Use Correct Network

- ✅ Double-check chain ID
- ✅ Verify RPC URL
- ✅ Confirm in MetaMask
- ✅ Check deployment output

### 3. Monitor Network Status

- ✅ Check block explorer
- ✅ Monitor gas prices
- ✅ Watch for network issues
- ✅ Plan deployment timing

### 4. Keep Configuration Organized

- ✅ Use environment variables
- ✅ Document network settings
- ✅ Version control configuration (except .env)
- ✅ Maintain separate configs per network

### 5. Verify After Deployment

- ✅ Check contract on explorer
- ✅ Verify source code
- ✅ Test contract functions
- ✅ Monitor initial transactions

## Resources

### Official Documentation

- **Lisk Docs**: https://docs.lisk.com
- **Lisk Network Info**: https://docs.lisk.com/network
- **Foundry Book**: https://book.getfoundry.sh

### Network Tools

- **Lisk Sepolia Faucet**: https://sepolia-faucet.lisk.com
- **Lisk Mainnet Explorer**: https://blockscout.lisk.com
- **Lisk Sepolia Explorer**: https://sepolia-blockscout.lisk.com

### Community

- **Lisk Discord**: https://lisk.chat
- **Lisk Twitter**: https://twitter.com/LiskHQ
- **Lisk GitHub**: https://github.com/LiskHQ

## Related Documentation

- **[Environment Setup Guide](environment-setup.md)** - Configure environment variables
- **[Testnet Deployment](testnet.md)** - Deploy and test on Lisk Sepolia
- **[Mainnet Deployment](mainnet.md)** - Production deployment guide
- **[Contract Verification](verification.md)** - Verify contracts on block explorer
- **[Troubleshooting Guide](troubleshooting.md)** - Common issues and solutions
- **[Quick Start Guide](quick-start.md)** - Comprehensive deployment guide

## Quick Reference

### Environment Variables

```bash
# Lisk Mainnet
LISK_MAINNET_RPC_URL=https://rpc.api.lisk.com

# Lisk Sepolia
LISK_SEPOLIA_RPC_URL=https://rpc.sepolia-api.lisk.com
```

### Chain IDs

```bash
# Lisk Mainnet
1135

# Lisk Sepolia
4202
```

### Deployment Commands

```bash
# Sepolia
./deploy-sepolia.sh

# Mainnet
./deploy-mainnet.sh
```

### Verification URLs

```bash
# Sepolia
https://sepolia-blockscout.lisk.com/api

# Mainnet
https://blockscout.lisk.com/api
```

---

**Need help?** Check the troubleshooting section or join Lisk Discord: https://lisk.chat
