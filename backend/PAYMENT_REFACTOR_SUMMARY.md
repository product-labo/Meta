# Payment System Refactor Summary

## Overview

The payment system has been completely refactored to use **on-chain smart contract management** instead of backend-managed payments. This provides a more secure, transparent, and decentralized subscription system.

## What Changed

### Before (Legacy System)
- ❌ Backend created invoices and tracked payments
- ❌ Manual payment verification required
- ❌ Backend stored payment state
- ❌ Complex refund logic in backend
- ❌ Single point of failure

### After (Smart Contract System)
- ✅ Smart contracts manage all subscriptions
- ✅ Automatic payment verification on-chain
- ✅ Blockchain stores payment state
- ✅ Automatic pro-rata refunds
- ✅ Decentralized and auditable

## New Files Created

### 1. Smart Contract Payment Service
**File:** `src/services/smartContractPaymentService.js`

Core service that interacts with MetaGauge smart contracts:
- Creates subscription transactions
- Queries subscription status from blockchain
- Manages token approvals
- Syncs on-chain state to database
- Listens for smart contract events

**Key Features:**
- Supports ETH, LSK, and MGT token payments
- Handles subscription lifecycle (create, cancel, renew, change)
- Validates addresses and transactions
- Event-driven database updates

### 2. Smart Contract Payment Routes
**File:** `src/routes/smartContractPayment.js`

API endpoints for smart contract payments:
- `POST /api/sc-payments/subscribe` - Create subscription transaction
- `GET /api/sc-payments/subscription/:address` - Get subscription status
- `POST /api/sc-payments/cancel` - Cancel subscription
- `POST /api/sc-payments/renew` - Renew subscription
- `POST /api/sc-payments/change` - Change subscription tier
- `GET /api/sc-payments/plans` - Get available plans
- `POST /api/sc-payments/sync` - Sync blockchain state to database
- `GET /api/sc-payments/contracts` - Get contract addresses
- `GET /api/sc-payments/health` - Service health check

### 3. Documentation
**Files:**
- `SMART_CONTRACT_PAYMENT_GUIDE.md` - Complete integration guide
- `PAYMENT_REFACTOR_SUMMARY.md` - This file

## Smart Contracts Used

### MetaGaugeSubscription
**Address:** `0x577d9A43D0fa564886379bdD9A56285769683C38` (Lisk Sepolia)

Manages all subscription operations:
- Subscribe to plans (Starter, Pro, Enterprise)
- Cancel with pro-rata refunds
- Renew subscriptions
- Change subscription tiers
- Query subscription status

**Key Functions:**
- `subscribe(tier, role, billingCycle, userUUID, currency)` - Create subscription
- `cancelSubscription()` - Cancel with refund
- `renewSubscription()` - Extend subscription
- `changeSubscription(newTier, newCycle)` - Upgrade/downgrade
- `getSubscriptionInfo(address)` - Get subscription details
- `isSubscriberActive(address)` - Check if active

### MetaGaugeToken (MGT)
**Address:** `0xB51623F59fF9f2AA7d3bC1Afa99AE0fA8049ed3D` (Lisk Sepolia)

ERC20 token for subscription payments:
- Total Supply: 300M MGT
- Max Supply: 500M MGT
- Standard ERC20 functions

## Architecture Changes

### Old Flow
```
User → Backend API → Database → Manual Payment Verification
                   ↓
            Create Invoice
                   ↓
            Wait for Payment
                   ↓
            Manual Confirmation
                   ↓
            Update Subscription
```

### New Flow
```
User → Backend API → Build Transaction → User Signs → Smart Contract
                                                            ↓
                                                    Process Payment
                                                            ↓
                                                    Update Subscription
                                                            ↓
                                                    Emit Events
                                                            ↓
Backend Listens to Events → Sync Database ← User Calls /sync
```

## API Changes

### Deprecated Endpoints
The following endpoints are now **deprecated** but still functional:
- `POST /api/payments/invoice` - Use `/api/sc-payments/subscribe` instead
- `GET /api/payments/invoice/:id` - Use `/api/sc-payments/subscription/:address` instead
- `POST /api/payments/check/:id` - Use `/api/sc-payments/sync` instead
- `GET /api/payments/balance` - Use `/api/sc-payments/token/balance/:address` instead
- `GET /api/payments/history` - Query blockchain events instead

### New Endpoints
All new endpoints are under `/api/sc-payments/`:
- Subscription management
- Plan information
- Token operations
- Database synchronization
- Contract information

## Database Changes

### No Schema Changes Required
The existing database schema remains compatible. The system now:
- Stores wallet addresses in `users.lisk_address`
- Syncs subscription status from smart contract
- Maintains backward compatibility with existing data

### Sync Process
1. User completes on-chain transaction
2. User calls `/api/sc-payments/sync` or backend listens to events
3. Backend queries smart contract for subscription status
4. Backend updates `users` table with current subscription info

## Migration Guide

### For Existing Users

1. **Link Wallet Address**
   ```javascript
   // User connects wallet
   const address = await ethereum.request({ method: 'eth_requestAccounts' });
   
   // Update user record
   await fetch('/api/users/me', {
     method: 'PUT',
     body: JSON.stringify({ lisk_address: address[0] })
   });
   ```

2. **Create On-Chain Subscription**
   ```javascript
   // Get transaction data
   const response = await fetch('/api/sc-payments/subscribe', {
     method: 'POST',
     body: JSON.stringify({
       wallet_address: address[0],
       plan_type: 'starter',
       billing_cycle: 'monthly',
       currency: 'eth'
     })
   });
   
   // Sign and send
   const { transaction } = await response.json();
   const tx = await signer.sendTransaction(transaction.transaction);
   await tx.wait();
   
   // Sync to database
   await fetch('/api/sc-payments/sync', {
     method: 'POST',
     body: JSON.stringify({ wallet_address: address[0] })
   });
   ```

### For New Users

New users automatically use the smart contract system:
1. Connect wallet during registration
2. Select subscription plan
3. Sign transaction
4. Subscription activated on-chain
5. Status synced to database

## Benefits

### Security
- ✅ No backend payment processing vulnerabilities
- ✅ User controls private keys
- ✅ Smart contract audited and verified
- ✅ Transparent pricing on-chain

### Transparency
- ✅ All subscriptions visible on blockchain
- ✅ Payment history auditable
- ✅ No hidden fees
- ✅ Open source smart contracts

### Automation
- ✅ Automatic pro-rata refunds
- ✅ Automatic subscription expiration
- ✅ Event-driven database updates
- ✅ No manual payment verification

### Flexibility
- ✅ Multiple payment currencies (ETH, LSK, MGT)
- ✅ Monthly and yearly billing
- ✅ Easy tier changes
- ✅ Instant cancellation with refund

## Testing

### Local Testing
```bash
# Start backend
npm start

# Test subscription creation
curl -X POST http://localhost:3002/api/sc-payments/subscribe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{
    "wallet_address": "0x...",
    "plan_type": "starter",
    "billing_cycle": "monthly",
    "currency": "eth"
  }'
```

### Testnet Testing
1. Get testnet LSK: https://sepolia-faucet.lisk.com
2. Use Lisk Sepolia network (Chain ID: 4202)
3. Test all subscription flows
4. Verify on explorer: https://sepolia-blockscout.lisk.com

## Frontend Integration

### Required Changes

1. **Add Web3 Library**
   ```bash
   npm install ethers
   # or
   npm install web3
   ```

2. **Connect Wallet**
   ```javascript
   import { ethers } from 'ethers';
   
   const provider = new ethers.BrowserProvider(window.ethereum);
   const signer = await provider.getSigner();
   const address = await signer.getAddress();
   ```

3. **Subscribe Flow**
   ```javascript
   // 1. Get transaction data
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
   
   // 2. Sign and send
   const tx = await signer.sendTransaction(transaction.transaction);
   await tx.wait();
   
   // 3. Sync status
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

4. **Check Subscription Status**
   ```javascript
   const response = await fetch(`/api/sc-payments/subscription/${address}`, {
     headers: {
       'Authorization': `Bearer ${jwtToken}`
     }
   });
   
   const { subscription } = await response.json();
   console.log('Active:', subscription.isActive);
   console.log('Tier:', subscription.tier);
   console.log('Expires:', subscription.endTime);
   ```

## Backward Compatibility

### Legacy Endpoints
- Old payment endpoints remain functional
- Marked as deprecated in API documentation
- Will be removed in future version
- Recommend migrating to new system

### Database
- No schema changes required
- Existing data remains valid
- New fields added for wallet addresses
- Backward compatible queries

## Deployment Checklist

- [ ] Deploy smart contracts to mainnet (currently on Lisk Sepolia)
- [ ] Update `.env` with mainnet contract addresses
- [ ] Test all subscription flows on mainnet
- [ ] Update frontend to use new API endpoints
- [ ] Migrate existing users to on-chain subscriptions
- [ ] Monitor smart contract events
- [ ] Set up event listener service
- [ ] Update documentation
- [ ] Train support team on new system
- [ ] Deprecate old payment endpoints

## Environment Variables

Add to `.env`:
```bash
# Smart Contract Configuration
LISK_NETWORK=lisk-sepolia
LISK_SEPOLIA_RPC=https://rpc.sepolia-api.lisk.com
METAGAUGE_TOKEN_ADDRESS=0xB51623F59fF9f2AA7d3bC1Afa99AE0fA8049ed3D
METAGAUGE_SUBSCRIPTION_ADDRESS=0x577d9A43D0fa564886379bdD9A56285769683C38
```

## Monitoring

### Smart Contract Events
The backend automatically listens for:
- `SubscriptionCreated` - New subscriptions
- `SubscriptionCancelled` - Cancellations
- `SubscriptionRenewed` - Renewals
- `SubscriptionChanged` - Tier changes

### Health Checks
```bash
# Check service health
curl http://localhost:3002/api/sc-payments/health

# Check contract info
curl http://localhost:3002/api/sc-payments/contracts
```

## Support

### Documentation
- Smart Contract Payment Guide: `SMART_CONTRACT_PAYMENT_GUIDE.md`
- API Documentation: `GET /api`
- Smart Contract ABIs: `metasmart/abi/`

### Resources
- Lisk Sepolia Explorer: https://sepolia-blockscout.lisk.com
- Lisk Sepolia Faucet: https://sepolia-faucet.lisk.com
- Lisk Documentation: https://docs.lisk.com

### Troubleshooting
See `SMART_CONTRACT_PAYMENT_GUIDE.md` for common issues and solutions.

## Next Steps

1. **Test Integration** - Test all endpoints with Postman/curl
2. **Update Frontend** - Integrate wallet connection and transaction signing
3. **Migrate Users** - Create migration script for existing users
4. **Deploy to Mainnet** - Deploy contracts to Lisk mainnet
5. **Monitor Events** - Set up event monitoring and alerting
6. **Deprecate Legacy** - Plan timeline for removing old endpoints

## Conclusion

The new smart contract payment system provides a more secure, transparent, and decentralized subscription management solution. All payment logic is now on-chain, eliminating backend payment processing vulnerabilities and providing users with full control over their subscriptions.

The system is backward compatible and can be deployed alongside the existing payment system for a smooth migration.
