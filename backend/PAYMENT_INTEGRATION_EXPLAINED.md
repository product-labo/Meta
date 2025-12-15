# Current Payment Integration - Lisk Blockchain

## Overview

The Boardling platform uses **Lisk blockchain (LSK tokens)** for all payment processing. The system has been fully migrated from Zcash to Lisk and supports two main payment types:

1. **Subscription Payments** - For premium/enterprise plans
2. **Data Access Payments** - For purchasing analytics data

---

## Architecture

```
┌─────────────────┐
│   Frontend/SDK  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│         Payment Routes                  │
│    (src/routes/payment.js)              │
│  - POST /api/payments/invoice           │
│  - POST /api/payments/check/:id         │
│  - GET  /api/payments/balance           │
│  - POST /api/payments/data-access       │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│    Lisk Payment Service                 │
│  (src/services/liskPaymentService.js)  │
│  - createLiskInvoice()                  │
│  - processLiskPayment()                 │
│  - checkLiskPayment()                   │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│         Lisk Service                    │
│    (src/services/liskService.js)        │
│  - createTransaction()                  │
│  - getAccountBalance()                  │
│  - getTransaction()                     │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│      Lisk Blockchain Network            │
│  - Mainnet: rpc.api.lisk.com            │
│  - Testnet: rpc.sepolia-api.lisk.com    │
└─────────────────────────────────────────┘
```

---

## Payment Flow

### 1. Subscription Payment Flow

```
User → Create Invoice → Generate Lisk Address → User Sends LSK → 
Check Payment → Process Payment → Activate Subscription
```

**Step-by-Step:**

1. **User requests subscription**
   ```javascript
   POST /api/payments/invoice
   {
     "plan_type": "premium",  // or "enterprise"
     "duration_months": 1,
     "network": "testnet"
   }
   ```

2. **System creates invoice**
   - Generates unique Lisk address for payment
   - Calculates amount (0.01 LSK/month for premium, 0.05 LSK/month for enterprise)
   - Stores invoice in database with status "pending"

3. **User sends LSK tokens**
   - User sends exact amount to provided Lisk address
   - Transaction recorded on Lisk blockchain

4. **System checks payment**
   ```javascript
   POST /api/payments/check/:invoiceId
   {
     "payment_detected": true,
     "amount_lsk": 0.01,
     "transaction_id": "0x123...",
     "sender_address": "lsk...",
     "recipient_address": "lsk..."
   }
   ```

5. **System processes payment**
   - Verifies transaction on Lisk blockchain
   - Checks amount matches invoice
   - Updates invoice status to "paid"
   - Activates user subscription
   - Sets expiration date

### 2. Data Access Payment Flow

```
Buyer → Request Data Access → Create Invoice → Send LSK → 
Process Payment → Grant Access → Split Revenue (70/30)
```

**Step-by-Step:**

1. **Buyer requests data access**
   ```javascript
   POST /api/payments/data-access
   {
     "data_owner_id": "uuid",
     "data_package_id": "project-uuid",
     "amount_lsk": 0.05,
     "data_type": "project_analytics"
   }
   ```

2. **System validates**
   - Checks buyer has active subscription
   - Verifies data owner exists
   - Ensures buyer ≠ owner

3. **System creates invoice**
   - Generates Lisk payment address
   - Stores invoice with type "one_time"

4. **Buyer sends LSK**
   - Sends payment to provided address

5. **System processes payment**
   - Verifies transaction
   - Splits revenue:
     - **70% to data owner** (added to their balance)
     - **30% to platform**
   - Grants data access for 1 month
   - Records in `data_access_grants` table

---

## Smart Contract Integration

The platform also integrates with **MetaGauge smart contracts** deployed on Lisk Sepolia:

### Deployed Contracts

- **MetaGauge Token (MGT)**: `0xB51623F59fF9f2AA7d3bC1Afa99AE0fA8049ed3D`
- **MetaGauge Subscription**: `0x577d9A43D0fa564886379bdD9A56285769683C38`

### Smart Contract Features

1. **Token-based payments** - Use MGT tokens instead of LSK
2. **Subscription management** - On-chain subscription tracking
3. **Automated renewals** - Smart contract handles renewals
4. **Access control** - On-chain verification of subscription status

---

## Database Schema

### Key Tables

#### 1. `invoices`
```sql
- id (UUID)
- user_id (UUID)
- type ('subscription' | 'one_time')
- amount_lsk (DECIMAL)
- lisk_address (VARCHAR)
- status ('pending' | 'paid' | 'expired')
- paid_amount_lsk (DECIMAL)
- paid_txid (VARCHAR)
- paid_at (TIMESTAMP)
- expires_at (TIMESTAMP)
- item_id (VARCHAR)
- description (TEXT)
```

#### 2. `lisk_transactions`
```sql
- id (UUID)
- transaction_id (VARCHAR) - Lisk tx hash
- sender_address (VARCHAR)
- recipient_address (VARCHAR)
- amount_lsk (DECIMAL)
- fee_lsk (DECIMAL)
- block_height (BIGINT)
- status ('pending' | 'confirmed')
- timestamp (TIMESTAMP)
```

#### 3. `users`
```sql
- id (UUID)
- balance_lsk (DECIMAL) - User's platform balance
- lisk_address (VARCHAR) - User's Lisk address
- subscription_status ('free' | 'premium' | 'enterprise')
- subscription_expires_at (TIMESTAMP)
```

#### 4. `data_access_grants`
```sql
- id (UUID)
- buyer_user_id (UUID)
- data_owner_id (UUID)
- data_package_id (UUID)
- invoice_id (UUID)
- amount_paid_lsk (DECIMAL)
- granted_at (TIMESTAMP)
- expires_at (TIMESTAMP)
```

---

## Pricing

### Subscription Plans

| Plan | Monthly Price | Yearly Price |
|------|--------------|--------------|
| Free | 0 LSK | 0 LSK |
| Premium | 0.01 LSK | 0.12 LSK |
| Enterprise | 0.05 LSK | 0.60 LSK |

### Data Access

- **Variable pricing** - Set by data owner
- **Revenue split**: 70% owner / 30% platform
- **Access duration**: 1 month per purchase

---

## API Endpoints

### Payment Endpoints

```javascript
// Create subscription invoice
POST /api/payments/invoice
Body: { plan_type, duration_months, network }
Response: { invoice_id, lisk_address, amount_lsk, payment_instructions }

// Check payment status
POST /api/payments/check/:invoiceId
Body: { payment_detected, amount_lsk, transaction_id }
Response: { paid, invoice, result }

// Get user balance
GET /api/payments/balance
Response: { balance_lsk, lisk_address, network_balance_lsk }

// Get payment history
GET /api/payments/history
Query: { limit, offset, type }
Response: { history[], pagination }

// Create data access invoice
POST /api/payments/data-access
Body: { data_owner_id, data_package_id, amount_lsk }
Response: { invoice_id, lisk_address, payment_instructions }

// Get earnings (for data owners)
GET /api/payments/earnings
Query: { data_type, start_date, end_date }
Response: { earnings }
```

---

## Security Features

### 1. Address Validation
- Validates Lisk address format (38 characters, base32)
- Checks address belongs to correct network

### 2. Amount Verification
- Verifies payment amount matches invoice
- Prevents underpayment attacks

### 3. Transaction Verification
- Confirms transaction on Lisk blockchain
- Checks transaction status and confirmations
- Verifies recipient address matches invoice

### 4. Access Control
- JWT authentication required
- Users can only access their own invoices
- Data access requires active subscription

### 5. Error Handling
- Custom error classes for Lisk-specific errors:
  - `LiskNetworkError` - Network connectivity issues
  - `LiskTransactionError` - Transaction processing errors
  - `LiskAddressValidationError` - Invalid address format
  - `LiskInsufficientBalanceError` - Insufficient funds

---

## Testing

### Test Endpoints

```bash
# Test Lisk RPC connectivity
npm run test:rpc

# Test database connection
npm run test:db

# Run all tests
npm test

# Run property-based tests
npm test -- tests/property/
```

### Test Networks

- **Mainnet**: Production (real LSK)
- **Testnet (Sepolia)**: Development (test LSK)

Get test LSK from: https://faucet.lisk.com

---

## SDK Integration

### Using the Lisk Paywall SDK

```javascript
import { LiskPaywall } from 'lisk-paywall-sdk';

// Initialize
const paywall = new LiskPaywall({
  apiUrl: 'http://localhost:3002',
  apiKey: 'your-api-key'
});

// Create subscription invoice
const invoice = await paywall.createSubscriptionInvoice({
  planType: 'premium',
  durationMonths: 1
});

// Check payment status
const status = await paywall.checkPaymentStatus(invoice.invoice_id);

// Get user balance
const balance = await paywall.getUserBalance();
```

---

## Migration from Zcash

The system was fully migrated from Zcash to Lisk:

### What Changed

✅ **Blockchain**: Zcash → Lisk
✅ **Currency**: ZEC → LSK
✅ **Addresses**: z-addresses/t-addresses → Lisk addresses
✅ **RPC**: Zcash RPC → Lisk Service API
✅ **Transactions**: UTXO model → Account model
✅ **Smart Contracts**: None → MetaGauge contracts on Lisk

### What Stayed the Same

- API endpoints (same routes)
- Database structure (renamed columns)
- Business logic (subscription/data access)
- Revenue split (70/30)
- Access duration (1 month)

---

## Next Steps

1. **Set up PostgreSQL database** (in progress)
2. **Run migrations** to create tables
3. **Test payment flow** on testnet
4. **Deploy to production** with mainnet
5. **Monitor transactions** and analytics

---

## Support

- **Documentation**: See `README.md`
- **Smart Contracts**: See `metasmart/abi/README.md`
- **Database Setup**: See `DATABASE_SETUP.md`
- **RPC Testing**: Run `npm run test:rpc`

---

## Summary

The Lisk payment integration provides:
- ✅ Secure blockchain payments using LSK tokens
- ✅ Subscription management (premium/enterprise)
- ✅ Data monetization with revenue sharing
- ✅ Smart contract integration for advanced features
- ✅ Comprehensive error handling and validation
- ✅ Full API and SDK support

All payment processing is now on Lisk blockchain, providing fast, secure, and cost-effective transactions!
