# Payment System - Smart Contract Integration

## Quick Start

The MetaGauge platform now uses **smart contract-based subscription management** for all payments. This provides a secure, transparent, and decentralized payment system.

## 🚀 Key Features

- ✅ **On-Chain Subscriptions** - All subscription logic managed by smart contracts
- ✅ **Multiple Payment Methods** - ETH, LSK, and MGT token support
- ✅ **Automatic Refunds** - Pro-rata refunds on cancellation
- ✅ **Transparent Pricing** - All prices visible on blockchain
- ✅ **Event-Driven** - Real-time subscription updates

## 📁 File Structure

```
boardling/backend/
├── src/
│   ├── services/
│   │   ├── liskPaymentService.js          # DEPRECATED - Legacy backend payments
│   │   └── smartContractPaymentService.js # NEW - Smart contract payments
│   └── routes/
│       ├── payment.js                      # DEPRECATED - Legacy payment routes
│       └── smartContractPayment.js         # NEW - Smart contract routes
├── metasmart/
│   └── abi/
│       ├── MetaGaugeSubscription.json      # Subscription contract ABI
│       ├── MetaGaugeToken.json             # Token contract ABI
│       ├── addresses.json                  # Contract addresses
│       └── README.md                       # ABI documentation
├── SMART_CONTRACT_PAYMENT_GUIDE.md         # Complete integration guide
├── PAYMENT_REFACTOR_SUMMARY.md             # What changed and why
└── PAYMENT_SYSTEM_README.md                # This file
```

## 🔧 Setup

### 1. Install Dependencies

```bash
npm install
```

This will install `ethers@^6.13.0` which is required for smart contract interaction.

### 2. Configure Environment

Add to `.env`:

```bash
# Smart Contract Configuration
LISK_NETWORK=lisk-sepolia
LISK_SEPOLIA_RPC=https://rpc.sepolia-api.lisk.com
METAGAUGE_TOKEN_ADDRESS=0xB51623F59fF9f2AA7d3bC1Afa99AE0fA8049ed3D
METAGAUGE_SUBSCRIPTION_ADDRESS=0x577d9A43D0fa564886379bdD9A56285769683C38
```

### 3. Start Server

```bash
npm start
```

The smart contract payment service will initialize automatically.

## 📡 API Endpoints

### Base URL
```
/api/sc-payments
```

### Quick Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/subscribe` | POST | Create subscription transaction |
| `/subscription/:address` | GET | Get subscription status |
| `/cancel` | POST | Cancel subscription |
| `/renew` | POST | Renew subscription |
| `/change` | POST | Change subscription tier |
| `/plans` | GET | Get available plans |
| `/sync` | POST | Sync blockchain to database |
| `/contracts` | GET | Get contract addresses |
| `/health` | GET | Service health check |

## 💡 Usage Examples

### 1. Subscribe to a Plan

```bash
curl -X POST http://localhost:3002/api/sc-payments/subscribe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "plan_type": "starter",
    "billing_cycle": "monthly",
    "currency": "eth"
  }'
```

**Response:**
```json
{
  "success": true,
  "transaction": {
    "to": "0x577d9A43D0fa564886379bdD9A56285769683C38",
    "data": "0x...",
    "value": "10000000000000000"
  },
  "planInfo": {
    "tier": "starter",
    "cycle": "monthly",
    "price": "0.01"
  }
}
```

### 2. Check Subscription Status

```bash
curl http://localhost:3002/api/sc-payments/subscription/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Get Available Plans

```bash
curl http://localhost:3002/api/sc-payments/plans
```

### 4. Sync Subscription to Database

```bash
curl -X POST http://localhost:3002/api/sc-payments/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }'
```

## 🎯 Integration Flow

### Frontend Integration

```javascript
import { ethers } from 'ethers';

// 1. Connect wallet
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const address = await signer.getAddress();

// 2. Get transaction data from backend
const response = await fetch('/api/sc-payments/subscribe', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwtToken}`
  },
  body: JSON.stringify({
    wallet_address: address,
    plan_type: 'starter',
    billing_cycle: 'monthly',
    currency: 'eth'
  })
});

const { transaction } = await response.json();

// 3. Sign and send transaction
const tx = await signer.sendTransaction(transaction.transaction);
await tx.wait();

// 4. Sync subscription status
await fetch('/api/sc-payments/sync', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwtToken}`
  },
  body: JSON.stringify({
    wallet_address: address
  })
});
```

## 📊 Subscription Plans

| Tier | Monthly | Yearly | Features |
|------|---------|--------|----------|
| Free | 0 ETH | 0 ETH | Basic features |
| Starter | 0.01 ETH | 0.1 ETH | 10K API calls, 5 projects |
| Pro | 0.034 ETH | 0.3 ETH | 100K API calls, unlimited projects |
| Enterprise | 0.103 ETH | 1.0 ETH | Unlimited, priority support |

## 🔐 Smart Contracts

### Lisk Sepolia Testnet

- **Chain ID:** 4202
- **RPC:** https://rpc.sepolia-api.lisk.com
- **Explorer:** https://sepolia-blockscout.lisk.com

**Contracts:**
- **MetaGaugeSubscription:** `0x577d9A43D0fa564886379bdD9A56285769683C38`
- **MetaGaugeToken:** `0xB51623F59fF9f2AA7d3bC1Afa99AE0fA8049ed3D`

### Get Testnet Tokens

Get free testnet LSK: https://sepolia-faucet.lisk.com

## 🧪 Testing

### Health Check

```bash
curl http://localhost:3002/api/sc-payments/health
```

### Get Contract Info

```bash
curl http://localhost:3002/api/sc-payments/contracts
```

### Test Subscription Flow

1. Get testnet LSK from faucet
2. Create subscription transaction
3. Sign with MetaMask/wallet
4. Wait for confirmation
5. Sync to database
6. Verify subscription status

## 📚 Documentation

- **Complete Guide:** [SMART_CONTRACT_PAYMENT_GUIDE.md](./SMART_CONTRACT_PAYMENT_GUIDE.md)
- **Refactor Summary:** [PAYMENT_REFACTOR_SUMMARY.md](./PAYMENT_REFACTOR_SUMMARY.md)
- **Smart Contract ABIs:** [metasmart/abi/](./metasmart/abi/)
- **API Documentation:** `GET /api`

## 🔄 Migration from Legacy System

### For Existing Users

1. Link wallet address to user account
2. Create on-chain subscription matching current tier
3. Sync status to database
4. Deprecate old invoices

### For New Users

New users automatically use the smart contract system.

## ⚠️ Deprecated Endpoints

The following endpoints are deprecated:
- `POST /api/payments/invoice` → Use `/api/sc-payments/subscribe`
- `GET /api/payments/invoice/:id` → Use `/api/sc-payments/subscription/:address`
- `POST /api/payments/check/:id` → Use `/api/sc-payments/sync`

## 🐛 Troubleshooting

### Service Not Initialized

**Error:** "Smart Contract Payment Service not initialized"

**Solution:** Check `.env` configuration and ensure RPC endpoint is accessible.

### Transaction Fails

**Common Causes:**
- Insufficient gas (ETH/LSK)
- Wrong network (use Lisk Sepolia)
- Contract paused
- Invalid parameters

### Subscription Not Syncing

**Solution:** Call `/api/sc-payments/sync` manually or check event listener is running.

## 📞 Support

- **Issues:** GitHub Issues
- **Documentation:** `/docs`
- **Explorer:** https://sepolia-blockscout.lisk.com
- **Faucet:** https://sepolia-faucet.lisk.com

## 📝 License

MIT License - See LICENSE file for details

---

**Ready to integrate?** Start with the [Complete Integration Guide](./SMART_CONTRACT_PAYMENT_GUIDE.md)
