# Smart Contract Payment System Guide

## Overview

The MetaGauge platform now uses **on-chain smart contract management** for all subscription payments. This replaces the previous backend-managed payment flow with a fully decentralized, transparent, and auditable system.

## Key Benefits

✅ **Decentralized** - All subscription logic lives on-chain  
✅ **Transparent** - Anyone can verify subscription status  
✅ **Auditable** - All payments recorded on blockchain  
✅ **Secure** - No backend payment processing vulnerabilities  
✅ **Pro-rata Refunds** - Automatic refunds on cancellation  
✅ **Flexible** - Support for ETH, LSK, and MGT token payments  

## Architecture

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Frontend  │────────▶│  Backend API     │────────▶│  Smart Contract │
│   (Wallet)  │         │  (Transaction    │         │  (On-Chain)     │
│             │         │   Builder)       │         │                 │
└─────────────┘         └──────────────────┘         └─────────────────┘
      │                                                        │
      │                                                        │
      └────────────────────────────────────────────────────────┘
                    User signs transaction
```

### Flow

1. **Frontend** requests transaction data from backend
2. **Backend** builds transaction using smart contract ABI
3. **User** signs transaction with their wallet (MetaMask, WalletConnect, etc.)
4. **Transaction** is broadcast to Lisk network
5. **Smart Contract** processes payment and updates subscription
6. **Backend** syncs subscription status from smart contract

## Smart Contracts

### MetaGaugeSubscription
**Address (Lisk Sepolia):** `0x577d9A43D0fa564886379bdD9A56285769683C38`

Manages all subscription operations:
- Subscribe to plans (Starter, Pro, Enterprise)
- Cancel subscriptions (with pro-rata refunds)
- Renew subscriptions
- Change subscription tiers
- Query subscription status

### MetaGaugeToken (MGT)
**Address (Lisk Sepolia):** `0xB51623F59fF9f2AA7d3bC1Afa99AE0fA8049ed3D`

ERC20 token for subscription payments:
- Total Supply: 300M MGT (minted)
- Max Supply: 500M MGT
- Used for token-based subscription payments

## API Endpoints

### Base URL
```
https://your-api.com/api/sc-payments
```

### 1. Create Subscription

**POST** `/subscribe`

Creates a subscription transaction for the user to sign.

**Request:**
```json
{
  "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "plan_type": "starter",
  "billing_cycle": "monthly",
  "role": "startup",
  "currency": "eth"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription transaction created",
  "transaction": {
    "requiresApproval": false,
    "transaction": {
      "to": "0x577d9A43D0fa564886379bdD9A56285769683C38",
      "data": "0x...",
      "value": "10000000000000000",
      "from": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
    },
    "planInfo": {
      "tier": "starter",
      "cycle": "monthly",
      "price": "0.01",
      "currency": "eth"
    }
  },
  "instructions": {
    "step1": "Sign the transaction with your wallet",
    "step2": "Wait for transaction confirmation",
    "step3": "Call /api/sc-payments/sync to update your subscription status"
  }
}
```

**Plan Types:**
- `starter` - Basic features
- `pro` - Advanced features
- `enterprise` - Full features

**Billing Cycles:**
- `monthly` - Pay monthly
- `yearly` - Pay yearly (discounted)

**Currencies:**
- `eth` - Pay with ETH/LSK
- `token` - Pay with MGT tokens (requires approval)

### 2. Get Subscription Status

**GET** `/subscription/:address`

Get current subscription status from smart contract.

**Response:**
```json
{
  "success": true,
  "subscription": {
    "isActive": true,
    "tier": "starter",
    "role": 0,
    "billingCycle": "monthly",
    "startTime": "2024-01-15T10:30:00.000Z",
    "endTime": "2024-02-15T10:30:00.000Z",
    "periodStart": "2024-01-15T10:30:00.000Z",
    "periodEnd": "2024-02-15T10:30:00.000Z",
    "cancelAtPeriodEnd": false,
    "gracePeriodEnd": "2024-02-18T10:30:00.000Z",
    "amountPaid": "0.01",
    "currency": 0
  }
}
```

### 3. Cancel Subscription

**POST** `/cancel`

Creates a cancellation transaction with pro-rata refund.

**Request:**
```json
{
  "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cancellation transaction created",
  "transaction": {
    "to": "0x577d9A43D0fa564886379bdD9A56285769683C38",
    "data": "0x...",
    "value": "0",
    "from": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  },
  "instructions": {
    "step1": "Sign the transaction with your wallet",
    "step2": "You will receive a pro-rata refund",
    "step3": "Call /api/sc-payments/sync to update your subscription status"
  }
}
```

### 4. Renew Subscription

**POST** `/renew`

Creates a renewal transaction to extend subscription.

**Request:**
```json
{
  "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

### 5. Change Subscription

**POST** `/change`

Creates a transaction to upgrade/downgrade subscription.

**Request:**
```json
{
  "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "new_plan_type": "pro",
  "new_billing_cycle": "yearly"
}
```

### 6. Get Available Plans

**GET** `/plans`

Get all subscription plans from smart contract.

**Response:**
```json
{
  "success": true,
  "plans": [
    {
      "tier": "free",
      "tierNumber": 0,
      "name": "Free",
      "monthlyPrice": "0",
      "yearlyPrice": "0",
      "active": true,
      "features": {
        "apiCallsPerMonth": "1000",
        "maxProjects": "1",
        "maxAlerts": "5",
        "exportAccess": false,
        "comparisonTool": false,
        "walletIntelligence": false,
        "apiAccess": false,
        "prioritySupport": false,
        "customInsights": false
      },
      "limits": {
        "historicalData": "30",
        "teamMembers": "1",
        "dataRefreshRate": "3600"
      }
    },
    {
      "tier": "starter",
      "tierNumber": 1,
      "name": "Starter",
      "monthlyPrice": "0.01",
      "yearlyPrice": "0.1",
      "active": true,
      "features": {
        "apiCallsPerMonth": "10000",
        "maxProjects": "5",
        "maxAlerts": "20",
        "exportAccess": true,
        "comparisonTool": true,
        "walletIntelligence": false,
        "apiAccess": true,
        "prioritySupport": false,
        "customInsights": false
      }
    }
  ],
  "count": 4
}
```

### 7. Sync Subscription to Database

**POST** `/sync`

Sync subscription status from smart contract to backend database.

**Request:**
```json
{
  "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription synced successfully",
  "result": {
    "success": true,
    "userId": "user-uuid-123",
    "subscription": {
      "isActive": true,
      "tier": "starter",
      "endTime": "2024-02-15T10:30:00.000Z"
    }
  }
}
```

### 8. Get Token Balance

**GET** `/token/balance/:address`

Get MGT token balance for an address.

### 9. Get Token Allowance

**GET** `/token/allowance/:address`

Get token allowance for subscription contract.

### 10. Get Contract Info

**GET** `/contracts`

Get contract addresses and network information.

**Response:**
```json
{
  "success": true,
  "contracts": {
    "network": "lisk-sepolia",
    "chainId": 4202,
    "rpcUrl": "https://rpc.sepolia-api.lisk.com",
    "explorer": "https://sepolia-blockscout.lisk.com",
    "subscriptionContract": "0x577d9A43D0fa564886379bdD9A56285769683C38",
    "tokenContract": "0xB51623F59fF9f2AA7d3bC1Afa99AE0fA8049ed3D"
  }
}
```

## Frontend Integration

### Using Web3.js

```javascript
import Web3 from 'web3';

// 1. Get transaction data from backend
const response = await fetch('/api/sc-payments/subscribe', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwtToken}`
  },
  body: JSON.stringify({
    wallet_address: userAddress,
    plan_type: 'starter',
    billing_cycle: 'monthly',
    currency: 'eth'
  })
});

const { transaction } = await response.json();

// 2. Sign and send transaction with user's wallet
const web3 = new Web3(window.ethereum);
const txHash = await web3.eth.sendTransaction(transaction.transaction);

// 3. Wait for confirmation
await web3.eth.waitForTransactionReceipt(txHash);

// 4. Sync subscription status
await fetch('/api/sc-payments/sync', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwtToken}`
  },
  body: JSON.stringify({
    wallet_address: userAddress
  })
});
```

### Using Ethers.js

```javascript
import { ethers } from 'ethers';

// 1. Get transaction data from backend
const response = await fetch('/api/sc-payments/subscribe', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwtToken}`
  },
  body: JSON.stringify({
    wallet_address: userAddress,
    plan_type: 'pro',
    billing_cycle: 'yearly',
    currency: 'eth'
  })
});

const { transaction } = await response.json();

// 2. Sign and send transaction
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const tx = await signer.sendTransaction(transaction.transaction);

// 3. Wait for confirmation
await tx.wait();

// 4. Sync subscription status
await fetch('/api/sc-payments/sync', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwtToken}`
  },
  body: JSON.stringify({
    wallet_address: userAddress
  })
});
```

### Token Payment Flow

When using MGT tokens, you need to approve tokens first:

```javascript
// 1. Get subscription transaction (with approval)
const response = await fetch('/api/sc-payments/subscribe', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwtToken}`
  },
  body: JSON.stringify({
    wallet_address: userAddress,
    plan_type: 'starter',
    billing_cycle: 'monthly',
    currency: 'token'
  })
});

const { transaction } = await response.json();

if (transaction.requiresApproval) {
  // 2. First approve tokens
  const approveTx = await signer.sendTransaction(transaction.approvalTransaction);
  await approveTx.wait();
  
  // 3. Then subscribe
  const subscribeTx = await signer.sendTransaction(transaction.subscriptionTransaction);
  await subscribeTx.wait();
} else {
  // Direct subscription
  const tx = await signer.sendTransaction(transaction.transaction);
  await tx.wait();
}

// 4. Sync status
await fetch('/api/sc-payments/sync', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwtToken}`
  },
  body: JSON.stringify({
    wallet_address: userAddress
  })
});
```

## Pricing

### ETH/LSK Pricing

| Tier | Monthly | Yearly | Savings |
|------|---------|--------|---------|
| Free | 0 ETH | 0 ETH | - |
| Starter | 0.01 ETH | 0.1 ETH | 16.7% |
| Pro | 0.034 ETH | 0.3 ETH | 26.5% |
| Enterprise | 0.103 ETH | 1.0 ETH | 18.9% |

### MGT Token Pricing

Same pricing structure applies when using MGT tokens.

## Migration from Legacy System

### For Existing Users

1. **Check current subscription** in database
2. **Link wallet address** to user account
3. **Create on-chain subscription** matching current tier
4. **Sync status** to database
5. **Deprecate old invoices** (mark as migrated)

### Migration Script

```javascript
// Example migration for a user
async function migrateUserSubscription(userId, walletAddress) {
  // 1. Get current subscription from database
  const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  
  // 2. If user has active subscription, create on-chain version
  if (user.subscription_status !== 'free') {
    // Create subscription transaction
    const response = await fetch('/api/sc-payments/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        wallet_address: walletAddress,
        plan_type: user.subscription_status,
        billing_cycle: 'monthly',
        currency: 'eth'
      })
    });
    
    // User signs and sends transaction
    // ...
    
    // 3. Sync to database
    await fetch('/api/sc-payments/sync', {
      method: 'POST',
      body: JSON.stringify({
        wallet_address: walletAddress
      })
    });
  }
}
```

## Event Listening

The backend automatically listens for smart contract events and updates the database:

- `SubscriptionCreated` - New subscription created
- `SubscriptionCancelled` - Subscription cancelled
- `SubscriptionRenewed` - Subscription renewed
- `SubscriptionChanged` - Subscription tier/cycle changed

## Testing

### Lisk Sepolia Testnet

1. Get testnet LSK from faucet: https://sepolia-faucet.lisk.com
2. Use testnet contract addresses
3. Test all subscription flows

### Local Testing

```bash
# Start backend
npm start

# Test subscription creation
curl -X POST http://localhost:3002/api/sc-payments/subscribe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "plan_type": "starter",
    "billing_cycle": "monthly",
    "currency": "eth"
  }'

# Check subscription status
curl http://localhost:3002/api/sc-payments/subscription/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Security Considerations

1. **User Signs All Transactions** - Backend never has access to private keys
2. **Smart Contract Audited** - All payment logic is on-chain and auditable
3. **No Backend Payment Processing** - Eliminates backend payment vulnerabilities
4. **Transparent Pricing** - All prices visible on-chain
5. **Automatic Refunds** - Pro-rata refunds handled by smart contract

## Troubleshooting

### Transaction Fails

- Check user has sufficient ETH/LSK for gas
- Verify wallet is connected to correct network (Lisk Sepolia)
- Check subscription contract is not paused

### Subscription Not Syncing

- Call `/api/sc-payments/sync` manually
- Check wallet address matches user account
- Verify transaction was confirmed on-chain

### Token Approval Issues

- Check token balance is sufficient
- Verify approval transaction was confirmed
- Check allowance with `/api/sc-payments/token/allowance/:address`

## Support

For integration support:
- Documentation: `/docs`
- API Reference: `/api`
- Smart Contract ABIs: `/metasmart/abi/`
- Explorer: https://sepolia-blockscout.lisk.com

## License

MIT License - See LICENSE file for details
