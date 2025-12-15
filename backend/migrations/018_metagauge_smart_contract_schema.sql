-- =====================================================
-- MetaGauge Smart Contract Payment System Schema
-- Migration: 018_metagauge_smart_contract_schema
-- Description: Database schema for smart contract-based subscription management
-- =====================================================

-- Add wallet address field to users table if not exists
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(42),
ADD COLUMN IF NOT EXISTS wallet_connected_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS wallet_type VARCHAR(50) DEFAULT 'metamask';

-- Create index on wallet address for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);

-- Add unique constraint to prevent duplicate wallet addresses
ALTER TABLE users 
ADD CONSTRAINT unique_wallet_address UNIQUE (wallet_address);

-- =====================================================
-- Smart Contract Subscriptions Table
-- Mirrors on-chain subscription data for quick queries
-- =====================================================
CREATE TABLE IF NOT EXISTS sc_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_address VARCHAR(42) NOT NULL,
    
    -- Subscription details from smart contract
    tier VARCHAR(20) NOT NULL, -- 'free', 'starter', 'pro', 'enterprise'
    role VARCHAR(20), -- 'startup', 'researcher', 'admin'
    billing_cycle VARCHAR(20) NOT NULL, -- 'monthly', 'yearly'
    payment_currency VARCHAR(20) NOT NULL, -- 'eth', 'lsk', 'token'
    
    -- Timestamps from smart contract
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    grace_period_end TIMESTAMP,
    
    -- Status flags
    is_active BOOLEAN DEFAULT true,
    cancel_at_period_end BOOLEAN DEFAULT false,
    
    -- Payment information
    amount_paid DECIMAL(20, 8) NOT NULL,
    amount_paid_currency VARCHAR(10) NOT NULL,
    
    -- Smart contract reference
    contract_address VARCHAR(42) NOT NULL,
    chain_id INTEGER NOT NULL,
    
    -- Sync tracking
    last_synced_at TIMESTAMP DEFAULT NOW(),
    sync_block_number BIGINT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_user_subscription UNIQUE (user_id),
    CONSTRAINT unique_wallet_subscription UNIQUE (wallet_address)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_sc_subscriptions_user_id ON sc_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_sc_subscriptions_wallet ON sc_subscriptions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_sc_subscriptions_tier ON sc_subscriptions(tier);
CREATE INDEX IF NOT EXISTS idx_sc_subscriptions_active ON sc_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_sc_subscriptions_end_time ON sc_subscriptions(end_time);

-- =====================================================
-- Smart Contract Events Table
-- Logs all subscription-related events from blockchain
-- =====================================================
CREATE TABLE IF NOT EXISTS sc_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event identification
    event_type VARCHAR(50) NOT NULL, -- 'SubscriptionCreated', 'SubscriptionCancelled', etc.
    transaction_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    block_timestamp TIMESTAMP NOT NULL,
    log_index INTEGER NOT NULL,
    
    -- Contract information
    contract_address VARCHAR(42) NOT NULL,
    chain_id INTEGER NOT NULL,
    
    -- Event data
    wallet_address VARCHAR(42) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Event-specific data (JSON for flexibility)
    event_data JSONB NOT NULL,
    
    -- Processing status
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP,
    processing_error TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_event UNIQUE (transaction_hash, log_index)
);

-- Indexes for event queries
CREATE INDEX IF NOT EXISTS idx_sc_events_type ON sc_events(event_type);
CREATE INDEX IF NOT EXISTS idx_sc_events_wallet ON sc_events(wallet_address);
CREATE INDEX IF NOT EXISTS idx_sc_events_user ON sc_events(user_id);
CREATE INDEX IF NOT EXISTS idx_sc_events_block ON sc_events(block_number);
CREATE INDEX IF NOT EXISTS idx_sc_events_processed ON sc_events(processed);
CREATE INDEX IF NOT EXISTS idx_sc_events_timestamp ON sc_events(block_timestamp);

-- =====================================================
-- Subscription History Table
-- Tracks all subscription changes over time
-- =====================================================
CREATE TABLE IF NOT EXISTS sc_subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_address VARCHAR(42) NOT NULL,
    
    -- Action details
    action VARCHAR(50) NOT NULL, -- 'created', 'renewed', 'cancelled', 'changed', 'expired'
    
    -- Subscription state at time of action
    tier VARCHAR(20) NOT NULL,
    billing_cycle VARCHAR(20) NOT NULL,
    amount_paid DECIMAL(20, 8),
    payment_currency VARCHAR(20),
    
    -- Timestamps
    action_timestamp TIMESTAMP NOT NULL,
    subscription_start TIMESTAMP,
    subscription_end TIMESTAMP,
    
    -- Transaction reference
    transaction_hash VARCHAR(66),
    block_number BIGINT,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for history queries
CREATE INDEX IF NOT EXISTS idx_sc_history_user ON sc_subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_sc_history_wallet ON sc_subscription_history(wallet_address);
CREATE INDEX IF NOT EXISTS idx_sc_history_action ON sc_subscription_history(action);
CREATE INDEX IF NOT EXISTS idx_sc_history_timestamp ON sc_subscription_history(action_timestamp);

-- =====================================================
-- Token Balances Table
-- Tracks MGT token balances for users
-- =====================================================
CREATE TABLE IF NOT EXISTS sc_token_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_address VARCHAR(42) NOT NULL,
    
    -- Token information
    token_address VARCHAR(42) NOT NULL,
    token_symbol VARCHAR(10) NOT NULL DEFAULT 'MGT',
    balance DECIMAL(30, 18) NOT NULL DEFAULT 0,
    
    -- Allowance for subscription contract
    subscription_allowance DECIMAL(30, 18) NOT NULL DEFAULT 0,
    
    -- Sync tracking
    last_synced_at TIMESTAMP DEFAULT NOW(),
    sync_block_number BIGINT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_user_token UNIQUE (user_id, token_address),
    CONSTRAINT unique_wallet_token UNIQUE (wallet_address, token_address)
);

-- Indexes for token balance queries
CREATE INDEX IF NOT EXISTS idx_sc_token_user ON sc_token_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_sc_token_wallet ON sc_token_balances(wallet_address);

-- =====================================================
-- Subscription Plans Cache Table
-- Caches plan information from smart contract
-- =====================================================
CREATE TABLE IF NOT EXISTS sc_subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Plan identification
    tier VARCHAR(20) NOT NULL UNIQUE, -- 'free', 'starter', 'pro', 'enterprise'
    tier_number INTEGER NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    
    -- Pricing
    monthly_price DECIMAL(20, 8) NOT NULL,
    yearly_price DECIMAL(20, 8) NOT NULL,
    
    -- Features (JSONB for flexibility)
    features JSONB NOT NULL,
    limits JSONB NOT NULL,
    
    -- Status
    active BOOLEAN DEFAULT true,
    
    -- Contract reference
    contract_address VARCHAR(42) NOT NULL,
    chain_id INTEGER NOT NULL,
    
    -- Sync tracking
    last_synced_at TIMESTAMP DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- Wallet Connection Logs Table
-- Tracks wallet connection/disconnection events
-- =====================================================
CREATE TABLE IF NOT EXISTS sc_wallet_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_address VARCHAR(42) NOT NULL,
    
    -- Connection details
    action VARCHAR(20) NOT NULL, -- 'connected', 'disconnected', 'changed'
    wallet_type VARCHAR(50), -- 'metamask', 'walletconnect', 'coinbase', etc.
    
    -- Network information
    chain_id INTEGER,
    network_name VARCHAR(50),
    
    -- Session information
    ip_address INET,
    user_agent TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for connection logs
CREATE INDEX IF NOT EXISTS idx_sc_connections_user ON sc_wallet_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_sc_connections_wallet ON sc_wallet_connections(wallet_address);
CREATE INDEX IF NOT EXISTS idx_sc_connections_action ON sc_wallet_connections(action);
CREATE INDEX IF NOT EXISTS idx_sc_connections_timestamp ON sc_wallet_connections(created_at);

-- =====================================================
-- Sync Status Table
-- Tracks blockchain sync status for event listener
-- =====================================================
CREATE TABLE IF NOT EXISTS sc_sync_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Contract identification
    contract_address VARCHAR(42) NOT NULL UNIQUE,
    contract_name VARCHAR(100) NOT NULL,
    chain_id INTEGER NOT NULL,
    
    -- Sync progress
    last_synced_block BIGINT NOT NULL DEFAULT 0,
    last_synced_at TIMESTAMP DEFAULT NOW(),
    
    -- Status
    is_syncing BOOLEAN DEFAULT false,
    sync_error TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- Views for Easy Querying
-- =====================================================

-- Active subscriptions view
CREATE OR REPLACE VIEW v_active_subscriptions AS
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
    s.amount_paid_currency,
    s.is_active,
    s.cancel_at_period_end,
    CASE 
        WHEN s.end_time > NOW() THEN 'active'
        WHEN s.grace_period_end > NOW() THEN 'grace_period'
        ELSE 'expired'
    END as status,
    s.last_synced_at
FROM sc_subscriptions s
JOIN users u ON s.user_id = u.id
WHERE s.is_active = true;

-- Subscription revenue view
CREATE OR REPLACE VIEW v_subscription_revenue AS
SELECT 
    DATE_TRUNC('month', action_timestamp) as month,
    tier,
    billing_cycle,
    payment_currency,
    COUNT(*) as subscription_count,
    SUM(amount_paid) as total_revenue
FROM sc_subscription_history
WHERE action IN ('created', 'renewed')
GROUP BY DATE_TRUNC('month', action_timestamp), tier, billing_cycle, payment_currency
ORDER BY month DESC;

-- User subscription summary view
CREATE OR REPLACE VIEW v_user_subscription_summary AS
SELECT 
    u.id as user_id,
    u.email,
    u.wallet_address,
    s.tier,
    s.billing_cycle,
    s.is_active,
    s.end_time,
    CASE 
        WHEN s.end_time > NOW() THEN EXTRACT(EPOCH FROM (s.end_time - NOW())) / 86400
        ELSE 0
    END as days_remaining,
    tb.balance as token_balance,
    (SELECT COUNT(*) FROM sc_subscription_history WHERE user_id = u.id) as total_subscriptions
FROM users u
LEFT JOIN sc_subscriptions s ON u.id = s.user_id
LEFT JOIN sc_token_balances tb ON u.id = tb.user_id;

-- =====================================================
-- Functions
-- =====================================================

-- Function to update subscription from smart contract data
CREATE OR REPLACE FUNCTION update_subscription_from_contract(
    p_user_id UUID,
    p_wallet_address VARCHAR(42),
    p_tier VARCHAR(20),
    p_role VARCHAR(20),
    p_billing_cycle VARCHAR(20),
    p_payment_currency VARCHAR(20),
    p_start_time TIMESTAMP,
    p_end_time TIMESTAMP,
    p_period_start TIMESTAMP,
    p_period_end TIMESTAMP,
    p_grace_period_end TIMESTAMP,
    p_is_active BOOLEAN,
    p_cancel_at_period_end BOOLEAN,
    p_amount_paid DECIMAL(20, 8),
    p_contract_address VARCHAR(42),
    p_chain_id INTEGER,
    p_block_number BIGINT
) RETURNS UUID AS $$
DECLARE
    v_subscription_id UUID;
BEGIN
    -- Insert or update subscription
    INSERT INTO sc_subscriptions (
        user_id, wallet_address, tier, role, billing_cycle, payment_currency,
        start_time, end_time, period_start, period_end, grace_period_end,
        is_active, cancel_at_period_end, amount_paid, amount_paid_currency,
        contract_address, chain_id, last_synced_at, sync_block_number
    ) VALUES (
        p_user_id, p_wallet_address, p_tier, p_role, p_billing_cycle, p_payment_currency,
        p_start_time, p_end_time, p_period_start, p_period_end, p_grace_period_end,
        p_is_active, p_cancel_at_period_end, p_amount_paid, p_payment_currency,
        p_contract_address, p_chain_id, NOW(), p_block_number
    )
    ON CONFLICT (user_id) DO UPDATE SET
        wallet_address = EXCLUDED.wallet_address,
        tier = EXCLUDED.tier,
        role = EXCLUDED.role,
        billing_cycle = EXCLUDED.billing_cycle,
        payment_currency = EXCLUDED.payment_currency,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        period_start = EXCLUDED.period_start,
        period_end = EXCLUDED.period_end,
        grace_period_end = EXCLUDED.grace_period_end,
        is_active = EXCLUDED.is_active,
        cancel_at_period_end = EXCLUDED.cancel_at_period_end,
        amount_paid = EXCLUDED.amount_paid,
        last_synced_at = NOW(),
        sync_block_number = p_block_number,
        updated_at = NOW()
    RETURNING id INTO v_subscription_id;
    
    -- Update user table
    UPDATE users 
    SET 
        subscription_status = p_tier,
        subscription_expires_at = p_end_time,
        wallet_address = p_wallet_address,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN v_subscription_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log subscription event
CREATE OR REPLACE FUNCTION log_subscription_event(
    p_user_id UUID,
    p_wallet_address VARCHAR(42),
    p_action VARCHAR(50),
    p_tier VARCHAR(20),
    p_billing_cycle VARCHAR(20),
    p_amount_paid DECIMAL(20, 8),
    p_payment_currency VARCHAR(20),
    p_transaction_hash VARCHAR(66),
    p_block_number BIGINT,
    p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_history_id UUID;
    v_subscription RECORD;
BEGIN
    -- Get current subscription details
    SELECT * INTO v_subscription 
    FROM sc_subscriptions 
    WHERE user_id = p_user_id;
    
    -- Insert history record
    INSERT INTO sc_subscription_history (
        user_id, wallet_address, action, tier, billing_cycle,
        amount_paid, payment_currency, action_timestamp,
        subscription_start, subscription_end,
        transaction_hash, block_number, notes
    ) VALUES (
        p_user_id, p_wallet_address, p_action, p_tier, p_billing_cycle,
        p_amount_paid, p_payment_currency, NOW(),
        v_subscription.start_time, v_subscription.end_time,
        p_transaction_hash, p_block_number, p_notes
    )
    RETURNING id INTO v_history_id;
    
    RETURN v_history_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Triggers
-- =====================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sc_subscriptions_updated_at
    BEFORE UPDATE ON sc_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sc_token_balances_updated_at
    BEFORE UPDATE ON sc_token_balances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sc_subscription_plans_updated_at
    BEFORE UPDATE ON sc_subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Initial Data
-- =====================================================

-- Insert default subscription plans (will be synced from contract)
INSERT INTO sc_subscription_plans (tier, tier_number, name, monthly_price, yearly_price, features, limits, contract_address, chain_id, active)
VALUES 
    ('free', 0, 'Free', 0, 0, 
     '{"apiCallsPerMonth": 1000, "maxProjects": 1, "maxAlerts": 5, "exportAccess": false, "comparisonTool": false, "walletIntelligence": false, "apiAccess": false, "prioritySupport": false, "customInsights": false}'::jsonb,
     '{"historicalData": 30, "teamMembers": 1, "dataRefreshRate": 3600}'::jsonb,
     '0x577d9A43D0fa564886379bdD9A56285769683C38', 4202, true),
    ('starter', 1, 'Starter', 0.01, 0.1,
     '{"apiCallsPerMonth": 10000, "maxProjects": 5, "maxAlerts": 20, "exportAccess": true, "comparisonTool": true, "walletIntelligence": false, "apiAccess": true, "prioritySupport": false, "customInsights": false}'::jsonb,
     '{"historicalData": 90, "teamMembers": 3, "dataRefreshRate": 1800}'::jsonb,
     '0x577d9A43D0fa564886379bdD9A56285769683C38', 4202, true),
    ('pro', 2, 'Pro', 0.034, 0.3,
     '{"apiCallsPerMonth": 100000, "maxProjects": 20, "maxAlerts": 100, "exportAccess": true, "comparisonTool": true, "walletIntelligence": true, "apiAccess": true, "prioritySupport": true, "customInsights": false}'::jsonb,
     '{"historicalData": 365, "teamMembers": 10, "dataRefreshRate": 900}'::jsonb,
     '0x577d9A43D0fa564886379bdD9A56285769683C38', 4202, true),
    ('enterprise', 3, 'Enterprise', 0.103, 1.0,
     '{"apiCallsPerMonth": -1, "maxProjects": -1, "maxAlerts": -1, "exportAccess": true, "comparisonTool": true, "walletIntelligence": true, "apiAccess": true, "prioritySupport": true, "customInsights": true}'::jsonb,
     '{"historicalData": -1, "teamMembers": -1, "dataRefreshRate": 300}'::jsonb,
     '0x577d9A43D0fa564886379bdD9A56285769683C38', 4202, true)
ON CONFLICT (tier) DO NOTHING;

-- Insert sync status for subscription contract
INSERT INTO sc_sync_status (contract_address, contract_name, chain_id, last_synced_block)
VALUES ('0x577d9A43D0fa564886379bdD9A56285769683C38', 'MetaGaugeSubscription', 4202, 0)
ON CONFLICT (contract_address) DO NOTHING;

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE sc_subscriptions IS 'Mirrors on-chain subscription data from MetaGauge smart contract';
COMMENT ON TABLE sc_events IS 'Logs all subscription-related blockchain events';
COMMENT ON TABLE sc_subscription_history IS 'Tracks complete history of subscription changes';
COMMENT ON TABLE sc_token_balances IS 'Tracks MGT token balances and allowances';
COMMENT ON TABLE sc_subscription_plans IS 'Caches subscription plan information from smart contract';
COMMENT ON TABLE sc_wallet_connections IS 'Logs wallet connection/disconnection events';
COMMENT ON TABLE sc_sync_status IS 'Tracks blockchain sync progress for event listener';

COMMENT ON COLUMN users.wallet_address IS 'EVM wallet address (Ethereum/Lisk compatible)';
COMMENT ON COLUMN sc_subscriptions.wallet_address IS 'Wallet address that owns the subscription on-chain';
COMMENT ON COLUMN sc_subscriptions.tier IS 'Subscription tier: free, starter, pro, enterprise';
COMMENT ON COLUMN sc_subscriptions.is_active IS 'Whether subscription is currently active';
COMMENT ON COLUMN sc_events.event_type IS 'Type of blockchain event: SubscriptionCreated, SubscriptionCancelled, etc.';
COMMENT ON COLUMN sc_events.processed IS 'Whether event has been processed by backend';

-- =====================================================
-- Grant Permissions
-- =====================================================

-- Grant permissions to application user (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;

-- =====================================================
-- Migration Complete
-- =====================================================

-- Log migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 018_metagauge_smart_contract_schema completed successfully';
    RAISE NOTICE 'Created tables: sc_subscriptions, sc_events, sc_subscription_history, sc_token_balances, sc_subscription_plans, sc_wallet_connections, sc_sync_status';
    RAISE NOTICE 'Created views: v_active_subscriptions, v_subscription_revenue, v_user_subscription_summary';
    RAISE NOTICE 'Created functions: update_subscription_from_contract, log_subscription_event';
END $$;
