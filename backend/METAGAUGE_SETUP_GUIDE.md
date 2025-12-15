# MetaGauge Smart Contract Payment System - Setup Guide

## Quick Start

This guide will help you set up the MetaGauge smart contract payment system database and start accepting on-chain subscriptions.

## Prerequisites

- ✅ PostgreSQL installed and running
- ✅ Node.js 18+ installed
- ✅ Existing database (e.g., `boardling_lisk` or `zcash_indexer`)
- ✅ Database credentials configured in `.env`

## Step-by-Step Setup

### 1. Configure Environment

Ensure your `.env` file has the correct database settings:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=yourpassword
DB_NAME=boardling_lisk

# Smart Contract Configuration
LISK_NETWORK=lisk-sepolia
LISK_SEPOLIA_RPC=https://rpc.sepolia-api.lisk.com
METAGAUGE_TOKEN_ADDRESS=0xB51623F59fF9f2AA7d3bC1Afa99AE0fA8049ed3D
METAGAUGE_SUBSCRIPTION_ADDRESS=0x577d9A43D0fa564886379bdD9A56285769683C38
```

### 2. Install Dependencies

```bash
cd boardling/backend
npm install
```

This will install `ethers@^6.13.0` and other required dependencies.

### 3. Run Database Migration

```bash
npm run setup:metagauge
```

This will:
- ✅ Connect to your PostgreSQL database
- ✅ Create 7 new tables for smart contract data
- ✅ Create 3 views for easy querying
- ✅ Create helper functions for subscription management
- ✅ Load default subscription plans
- ✅ Set up indexes and constraints

**Expected Output:**
```
═══════════════════════════════════════════════════════
     METAGAUGE SMART CONTRACT SCHEMA MIGRATION
═══════════════════════════════════════════════════════

Connecting to database...
Host: localhost:5432
Database: boardling_lisk

✓ Connected to PostgreSQL

Reading migration file...
Path: /path/to/migrations/018_metagauge_smart_contract_schema.sql

Executing migration...

✓ Migration executed successfully!

Verifying tables...
✓ Created 7 tables:
  ✓ sc_events
  ✓ sc_subscription_history
  ✓ sc_subscription_plans
  ✓ sc_subscriptions
  ✓ sc_sync_status
  ✓ sc_token_balances
  ✓ sc_wallet_connections

✓ Created 3 views:
  ✓ v_active_subscriptions
  ✓ v_subscription_revenue
  ✓ v_user_subscription_summary

✓ Created 3 functions:
  ✓ log_subscription_event
  ✓ update_subscription_from_contract
  ✓ update_updated_at_column

✓ Loaded 4 subscription plans:
  ✓ free         - Free            (0 ETH/month, 0 ETH/year)
  ✓ starter      - Starter         (0.01 ETH/month, 0.1 ETH/year)
  ✓ pro          - Pro             (0.034 ETH/month, 0.3 ETH/year)
  ✓ enterprise   - Enterprise      (0.103 ETH/month, 1.0 ETH/year)

═══════════════════════════════════════════════════════
✓ Migration completed successfully!
═══════════════════════════════════════════════════════
```

### 4. Verify Database Setup

```bash
# Test database connection
npm run test:db
```

Connect to your database and verify tables:

```sql
-- Check tables created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'sc_%'
ORDER BY table_name;

-- Check subscription plans
SELECT tier, name, monthly_price, yearly_price 
FROM sc_subscription_plans 
ORDER BY tier_number;

-- Check views
SELECT * FROM v_active_subscriptions LIMIT 5;
```

### 5. Start Backend Server

```bash
npm start
```

The smart contract payment service will initialize automatically.

### 6. Test API Endpoints

```bash
# Health check
curl http://localhost:3002/api/sc-payments/health

# Get contract addresses
curl http://localhost:3002/api/sc-payments/contracts

# Get subscription plans
curl http://localhost:3002/api/sc-payments/plans
```

**Expected Response:**
```json
{
  "success": true,
  "status": "healthy",
  "service": "Smart Contract Payment Service",
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

## Database Schema Overview

### Tables Created

1. **`sc_subscriptions`** - Active subscriptions (mirrors smart contract)
2. **`sc_events`** - Blockchain event logs
3. **`sc_subscription_history`** - Complete subscription history
4. **`sc_token_balances`** - MGT token balances
5. **`sc_subscription_plans`** - Cached plan information
6. **`sc_wallet_connections`** - Wallet connection logs
7. **`sc_sync_status`** - Blockchain sync progress

### Views Created

1. **`v_active_subscriptions`** - All active subscriptions with user details
2. **`v_subscription_revenue`** - Monthly revenue breakdown
3. **`v_user_subscription_summary`** - User subscription summary

### Functions Created

1. **`update_subscription_from_contract()`** - Sync subscription from blockchain
2. **`log_subscription_event()`** - Log subscription events
3. **`update_updated_at_column()`** - Auto-update timestamps

## Testing the System

### 1. Get Testnet Tokens

Visit: https://sepolia-faucet.lisk.com

Get free testnet LSK for testing.

### 2. Test Subscription Flow

```bash
# 1. Create subscription transaction
curl -X POST http://localhost:3002/api/sc-payments/subscribe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "plan_type": "starter",
    "billing_cycle": "monthly",
    "currency": "eth"
  }'

# 2. User signs transaction with wallet (frontend)

# 3. Sync subscription to database
curl -X POST http://localhost:3002/api/sc-payments/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }'

# 4. Check subscription status
curl http://localhost:3002/api/sc-payments/subscription/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Query Database

```sql
-- Check active subscriptions
SELECT * FROM v_active_subscriptions;

-- Check subscription history
SELECT * FROM sc_subscription_history ORDER BY action_timestamp DESC LIMIT 10;

-- Check events
SELECT * FROM sc_events ORDER BY block_timestamp DESC LIMIT 10;

-- Check revenue
SELECT * FROM v_subscription_revenue;
```

## Troubleshooting

### Migration Fails

**Error:** "relation already exists"

**Solution:** Tables already exist. Either:
1. Drop existing tables: `DROP TABLE sc_subscriptions CASCADE;`
2. Or skip migration if already run

**Error:** "database does not exist"

**Solution:** Create database first:
```bash
createdb -U postgres boardling_lisk
```

### Connection Fails

**Error:** "connection refused"

**Solution:** 
1. Check PostgreSQL is running: `pg_isready`
2. Verify credentials in `.env`
3. Check firewall settings

### Service Not Initializing

**Error:** "Smart Contract Payment Service not initialized"

**Solution:**
1. Check `.env` has correct RPC endpoint
2. Verify network connectivity
3. Check contract addresses are correct

## Next Steps

1. **Frontend Integration** - Add wallet connection to your frontend
2. **Event Listener** - Set up event listener for automatic sync
3. **Monitoring** - Set up monitoring for sync status
4. **Backup** - Configure regular database backups
5. **Production** - Deploy contracts to Lisk mainnet

## Documentation

- **Complete Guide:** [SMART_CONTRACT_PAYMENT_GUIDE.md](./SMART_CONTRACT_PAYMENT_GUIDE.md)
- **Database Schema:** [METAGAUGE_DATABASE_SCHEMA.md](./METAGAUGE_DATABASE_SCHEMA.md)
- **Refactor Summary:** [PAYMENT_REFACTOR_SUMMARY.md](./PAYMENT_REFACTOR_SUMMARY.md)
- **Quick Start:** [PAYMENT_SYSTEM_README.md](./PAYMENT_SYSTEM_README.md)

## Support

For issues:
1. Check migration logs
2. Verify database connection
3. Test RPC endpoints: `npm run test:rpc`
4. Review error messages
5. Check documentation

## Success Checklist

- [ ] PostgreSQL installed and running
- [ ] Database created
- [ ] `.env` configured
- [ ] Dependencies installed (`npm install`)
- [ ] Migration run successfully (`npm run setup:metagauge`)
- [ ] Backend started (`npm start`)
- [ ] API endpoints responding
- [ ] Subscription plans loaded
- [ ] Ready to accept subscriptions!

---

**Congratulations!** Your MetaGauge smart contract payment system is now set up and ready to accept on-chain subscriptions! 🎉
