# MetaGauge Smart Contract Database Schema

## Overview

This document describes the database schema for the MetaGauge smart contract payment system. The schema is designed to mirror on-chain subscription data while providing fast queries and comprehensive tracking.

## Schema Design Philosophy

1. **Blockchain as Source of Truth** - Smart contracts store authoritative subscription data
2. **Database as Cache** - Database mirrors blockchain state for fast queries
3. **Event-Driven Sync** - Blockchain events trigger database updates
4. **Comprehensive Tracking** - Full history of all subscription changes

## Tables

### 1. `users` (Extended)

Extended existing users table with wallet address fields.

**New Columns:**
```sql
wallet_address VARCHAR(42)        -- EVM wallet address (0x...)
wallet_connected_at TIMESTAMP     -- When wallet was first connected
wallet_type VARCHAR(50)           -- Wallet type (metamask, walletconnect, etc.)
```

**Indexes:**
- `idx_users_wallet_address` - Fast wallet lookups
- `unique_wallet_address` - Prevent duplicate wallets

**Purpose:** Links user accounts to EVM wallet addresses for subscription management.

---

### 2. `sc_subscriptions`

Mirrors on-chain subscription data from MetaGauge smart contract.

**Columns:**
```sql
id UUID PRIMARY KEY
user_id UUID                      -- Links to users table
wallet_address VARCHAR(42)        -- Wallet that owns subscription
tier VARCHAR(20)                  -- free, starter, pro, enterprise
role VARCHAR(20)                  -- startup, researcher, admin
billing_cycle VARCHAR(20)         -- monthly, yearly
payment_currency VARCHAR(20)      -- eth, lsk, token
start_time TIMESTAMP              -- Subscription start
end_time TIMESTAMP                -- Subscription end
period_start TIMESTAMP            -- Current period start
period_end TIMESTAMP              -- Current period end
grace_period_end TIMESTAMP        -- Grace period expiration
is_active BOOLEAN                 -- Currently active
cancel_at_period_end BOOLEAN      -- Scheduled cancellation
amount_paid DECIMAL(20, 8)        -- Amount paid
amount_paid_currency VARCHAR(10)  -- Currency used
contract_address VARCHAR(42)      -- Smart contract address
chain_id INTEGER                  -- Blockchain chain ID
last_synced_at TIMESTAMP          -- Last sync from blockchain
sync_block_number BIGINT          -- Block number of last sync
```

**Constraints:**
- `unique_user_subscription` - One subscription per user
- `unique_wallet_subscription` - One subscription per wallet

**Indexes:**
- `idx_sc_subscriptions_user_id` - User lookups
- `idx_sc_subscriptions_wallet` - Wallet lookups
- `idx_sc_subscriptions_tier` - Filter by tier
- `idx_sc_subscriptions_active` - Active subscriptions
- `idx_sc_subscriptions_end_time` - Expiration queries

**Purpose:** Fast queries for subscription status without blockchain calls.

---

### 3. `sc_events`

Logs all subscription-related events from blockchain.

**Columns:**
```sql
id UUID PRIMARY KEY
event_type VARCHAR(50)            -- SubscriptionCreated, SubscriptionCancelled, etc.
transaction_hash VARCHAR(66)      -- Blockchain transaction hash
block_number BIGINT               -- Block number
block_timestamp TIMESTAMP         -- Block timestamp
log_index INTEGER                 -- Event index in transaction
contract_address VARCHAR(42)      -- Contract that emitted event
chain_id INTEGER                  -- Blockchain chain ID
wallet_address VARCHAR(42)        -- Wallet involved in event
user_id UUID                      -- User involved (if known)
event_data JSONB                  -- Full event data
processed BOOLEAN                 -- Whether event was processed
processed_at TIMESTAMP            -- When event was processed
processing_error TEXT             -- Error if processing failed
```

**Constraints:**
- `unique_event` - Prevent duplicate events

**Indexes:**
- `idx_sc_events_type` - Filter by event type
- `idx_sc_events_wallet` - Events for wallet
- `idx_sc_events_user` - Events for user
- `idx_sc_events_block` - Block number queries
- `idx_sc_events_processed` - Unprocessed events
- `idx_sc_events_timestamp` - Time-based queries

**Purpose:** Complete audit trail of all blockchain events.

**Event Types:**
- `SubscriptionCreated` - New subscription
- `SubscriptionCancelled` - Subscription cancelled
- `SubscriptionRenewed` - Subscription renewed
- `SubscriptionChanged` - Tier/cycle changed
- `SubscriptionUpdated` - Subscription modified

---

### 4. `sc_subscription_history`

Tracks all subscription changes over time.

**Columns:**
```sql
id UUID PRIMARY KEY
user_id UUID                      -- User who made change
wallet_address VARCHAR(42)        -- Wallet address
action VARCHAR(50)                -- created, renewed, cancelled, changed, expired
tier VARCHAR(20)                  -- Subscription tier at time of action
billing_cycle VARCHAR(20)         -- Billing cycle at time of action
amount_paid DECIMAL(20, 8)        -- Amount paid (if applicable)
payment_currency VARCHAR(20)      -- Currency used
action_timestamp TIMESTAMP        -- When action occurred
subscription_start TIMESTAMP      -- Subscription start time
subscription_end TIMESTAMP        -- Subscription end time
transaction_hash VARCHAR(66)      -- Blockchain transaction
block_number BIGINT               -- Block number
notes TEXT                        -- Additional notes
```

**Indexes:**
- `idx_sc_history_user` - User history
- `idx_sc_history_wallet` - Wallet history
- `idx_sc_history_action` - Filter by action
- `idx_sc_history_timestamp` - Time-based queries

**Purpose:** Complete history of subscription lifecycle for analytics and auditing.

---

### 5. `sc_token_balances`

Tracks MGT token balances for users.

**Columns:**
```sql
id UUID PRIMARY KEY
user_id UUID                      -- User ID
wallet_address VARCHAR(42)        -- Wallet address
token_address VARCHAR(42)         -- MGT token contract address
token_symbol VARCHAR(10)          -- Token symbol (MGT)
balance DECIMAL(30, 18)           -- Token balance
subscription_allowance DECIMAL    -- Allowance for subscription contract
last_synced_at TIMESTAMP          -- Last sync from blockchain
sync_block_number BIGINT          -- Block number of last sync
```

**Constraints:**
- `unique_user_token` - One balance per user per token
- `unique_wallet_token` - One balance per wallet per token

**Indexes:**
- `idx_sc_token_user` - User lookups
- `idx_sc_token_wallet` - Wallet lookups

**Purpose:** Track token balances for token-based subscriptions.

---

### 6. `sc_subscription_plans`

Caches plan information from smart contract.

**Columns:**
```sql
id UUID PRIMARY KEY
tier VARCHAR(20) UNIQUE           -- Plan tier
tier_number INTEGER UNIQUE        -- Tier number (0-3)
name VARCHAR(100)                 -- Plan name
monthly_price DECIMAL(20, 8)      -- Monthly price in ETH
yearly_price DECIMAL(20, 8)       -- Yearly price in ETH
features JSONB                    -- Plan features
limits JSONB                      -- Plan limits
active BOOLEAN                    -- Plan is active
contract_address VARCHAR(42)      -- Contract address
chain_id INTEGER                  -- Chain ID
last_synced_at TIMESTAMP          -- Last sync from contract
```

**Purpose:** Cache plan information for fast queries without blockchain calls.

**Default Plans:**
- **Free** - 0 ETH/month, basic features
- **Starter** - 0.01 ETH/month, 10K API calls
- **Pro** - 0.034 ETH/month, 100K API calls
- **Enterprise** - 0.103 ETH/month, unlimited

---

### 7. `sc_wallet_connections`

Logs wallet connection/disconnection events.

**Columns:**
```sql
id UUID PRIMARY KEY
user_id UUID                      -- User ID
wallet_address VARCHAR(42)        -- Wallet address
action VARCHAR(20)                -- connected, disconnected, changed
wallet_type VARCHAR(50)           -- metamask, walletconnect, etc.
chain_id INTEGER                  -- Network chain ID
network_name VARCHAR(50)          -- Network name
ip_address INET                   -- User IP address
user_agent TEXT                   -- Browser user agent
```

**Indexes:**
- `idx_sc_connections_user` - User connections
- `idx_sc_connections_wallet` - Wallet connections
- `idx_sc_connections_action` - Filter by action
- `idx_sc_connections_timestamp` - Time-based queries

**Purpose:** Security and analytics tracking of wallet connections.

---

### 8. `sc_sync_status`

Tracks blockchain sync status for event listener.

**Columns:**
```sql
id UUID PRIMARY KEY
contract_address VARCHAR(42)      -- Contract being synced
contract_name VARCHAR(100)        -- Contract name
chain_id INTEGER                  -- Chain ID
last_synced_block BIGINT          -- Last synced block number
last_synced_at TIMESTAMP          -- Last sync time
is_syncing BOOLEAN                -- Currently syncing
sync_error TEXT                   -- Error if sync failed
```

**Purpose:** Track event listener progress and detect sync issues.

---

## Views

### 1. `v_active_subscriptions`

Shows all currently active subscriptions with user details.

```sql
SELECT 
    s.id,
    s.user_id,
    u.email,
    s.wallet_address,
    s.tier,
    s.billing_cycle,
    s.start_time,
    s.end_time,
    s.amount_paid,
    s.is_active,
    CASE 
        WHEN s.end_time > NOW() THEN 'active'
        WHEN s.grace_period_end > NOW() THEN 'grace_period'
        ELSE 'expired'
    END as status
FROM sc_subscriptions s
JOIN users u ON s.user_id = u.id
WHERE s.is_active = true;
```

---

### 2. `v_subscription_revenue`

Monthly revenue breakdown by tier and billing cycle.

```sql
SELECT 
    DATE_TRUNC('month', action_timestamp) as month,
    tier,
    billing_cycle,
    payment_currency,
    COUNT(*) as subscription_count,
    SUM(amount_paid) as total_revenue
FROM sc_subscription_history
WHERE action IN ('created', 'renewed')
GROUP BY month, tier, billing_cycle, payment_currency
ORDER BY month DESC;
```

---

### 3. `v_user_subscription_summary`

Complete user subscription summary with token balance.

```sql
SELECT 
    u.id as user_id,
    u.email,
    u.wallet_address,
    s.tier,
    s.billing_cycle,
    s.is_active,
    s.end_time,
    EXTRACT(EPOCH FROM (s.end_time - NOW())) / 86400 as days_remaining,
    tb.balance as token_balance,
    COUNT(sh.*) as total_subscriptions
FROM users u
LEFT JOIN sc_subscriptions s ON u.id = s.user_id
LEFT JOIN sc_token_balances tb ON u.id = tb.user_id
LEFT JOIN sc_subscription_history sh ON u.id = sh.user_id
GROUP BY u.id, s.id, tb.id;
```

---

## Functions

### 1. `update_subscription_from_contract()`

Updates subscription from smart contract data.

**Parameters:**
- `p_user_id` - User UUID
- `p_wallet_address` - Wallet address
- `p_tier` - Subscription tier
- `p_role` - User role
- `p_billing_cycle` - Billing cycle
- `p_payment_currency` - Payment currency
- `p_start_time` - Start timestamp
- `p_end_time` - End timestamp
- `p_period_start` - Period start
- `p_period_end` - Period end
- `p_grace_period_end` - Grace period end
- `p_is_active` - Is active
- `p_cancel_at_period_end` - Cancel at period end
- `p_amount_paid` - Amount paid
- `p_contract_address` - Contract address
- `p_chain_id` - Chain ID
- `p_block_number` - Block number

**Returns:** Subscription ID (UUID)

**Usage:**
```sql
SELECT update_subscription_from_contract(
    'user-uuid',
    '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    'starter',
    'startup',
    'monthly',
    'eth',
    NOW(),
    NOW() + INTERVAL '1 month',
    NOW(),
    NOW() + INTERVAL '1 month',
    NOW() + INTERVAL '1 month 3 days',
    true,
    false,
    0.01,
    '0x577d9A43D0fa564886379bdD9A56285769683C38',
    4202,
    12345678
);
```

---

### 2. `log_subscription_event()`

Logs a subscription event to history.

**Parameters:**
- `p_user_id` - User UUID
- `p_wallet_address` - Wallet address
- `p_action` - Action type
- `p_tier` - Subscription tier
- `p_billing_cycle` - Billing cycle
- `p_amount_paid` - Amount paid
- `p_payment_currency` - Payment currency
- `p_transaction_hash` - Transaction hash
- `p_block_number` - Block number
- `p_notes` - Optional notes

**Returns:** History ID (UUID)

**Usage:**
```sql
SELECT log_subscription_event(
    'user-uuid',
    '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    'created',
    'starter',
    'monthly',
    0.01,
    'eth',
    '0x123...',
    12345678,
    'Initial subscription'
);
```

---

## Triggers

### `update_updated_at_column()`

Automatically updates `updated_at` timestamp on row updates.

**Applied to:**
- `sc_subscriptions`
- `sc_token_balances`
- `sc_subscription_plans`

---

## Migration

### Run Migration

```bash
# Run the migration
node run-metagauge-migration.js
```

### Verify Migration

```sql
-- Check tables created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'sc_%';

-- Check views created
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name LIKE 'v_%';

-- Check subscription plans loaded
SELECT * FROM sc_subscription_plans ORDER BY tier_number;
```

---

## Usage Examples

### 1. Get User's Active Subscription

```sql
SELECT * FROM v_active_subscriptions 
WHERE user_id = 'user-uuid';
```

### 2. Get Subscription History for User

```sql
SELECT * FROM sc_subscription_history 
WHERE user_id = 'user-uuid' 
ORDER BY action_timestamp DESC;
```

### 3. Get Monthly Revenue

```sql
SELECT * FROM v_subscription_revenue 
WHERE month >= DATE_TRUNC('month', NOW() - INTERVAL '6 months');
```

### 4. Get All Active Subscriptions Expiring Soon

```sql
SELECT * FROM v_active_subscriptions 
WHERE end_time < NOW() + INTERVAL '7 days'
AND end_time > NOW()
ORDER BY end_time;
```

### 5. Get Unprocessed Events

```sql
SELECT * FROM sc_events 
WHERE processed = false 
ORDER BY block_number, log_index;
```

### 6. Get User Token Balance

```sql
SELECT * FROM sc_token_balances 
WHERE user_id = 'user-uuid';
```

---

## Maintenance

### Sync Subscription from Blockchain

```javascript
// Backend service automatically syncs
await smartContractPaymentService.syncSubscriptionToDatabase(
    userId,
    walletAddress
);
```

### Process Pending Events

```sql
-- Mark event as processed
UPDATE sc_events 
SET processed = true, processed_at = NOW() 
WHERE id = 'event-uuid';
```

### Update Sync Status

```sql
UPDATE sc_sync_status 
SET last_synced_block = 12345678,
    last_synced_at = NOW(),
    is_syncing = false
WHERE contract_address = '0x577d9A43D0fa564886379bdD9A56285769683C38';
```

---

## Performance Considerations

1. **Indexes** - All foreign keys and frequently queried columns are indexed
2. **JSONB** - Features and limits stored as JSONB for flexibility
3. **Views** - Pre-computed views for common queries
4. **Partitioning** - Consider partitioning `sc_events` by date for large datasets
5. **Archiving** - Archive old `sc_subscription_history` records periodically

---

## Security

1. **Wallet Uniqueness** - Each wallet can only be linked to one user
2. **Subscription Uniqueness** - Each user/wallet can only have one active subscription
3. **Event Deduplication** - Transaction hash + log index prevents duplicate events
4. **Audit Trail** - Complete history of all changes

---

## Backup and Recovery

```bash
# Backup smart contract tables
pg_dump -U postgres -d boardling_lisk \
  -t sc_subscriptions \
  -t sc_events \
  -t sc_subscription_history \
  -t sc_token_balances \
  -t sc_subscription_plans \
  -t sc_wallet_connections \
  -t sc_sync_status \
  > metagauge_backup.sql

# Restore
psql -U postgres -d boardling_lisk < metagauge_backup.sql
```

---

## Monitoring

### Key Metrics to Monitor

1. **Sync Lag** - Difference between current block and last synced block
2. **Unprocessed Events** - Count of events with `processed = false`
3. **Active Subscriptions** - Count from `v_active_subscriptions`
4. **Expiring Soon** - Subscriptions expiring in next 7 days
5. **Failed Syncs** - Events with `processing_error` not null

### Monitoring Queries

```sql
-- Sync lag
SELECT 
    contract_name,
    last_synced_block,
    NOW() - last_synced_at as time_since_sync
FROM sc_sync_status;

-- Unprocessed events
SELECT COUNT(*) FROM sc_events WHERE processed = false;

-- Active subscriptions by tier
SELECT tier, COUNT(*) 
FROM v_active_subscriptions 
GROUP BY tier;

-- Revenue this month
SELECT SUM(total_revenue) 
FROM v_subscription_revenue 
WHERE month = DATE_TRUNC('month', NOW());
```

---

## Support

For issues or questions:
- Check migration logs
- Verify blockchain sync status
- Review event processing errors
- Contact support with error details

---

## License

MIT License - See LICENSE file for details
