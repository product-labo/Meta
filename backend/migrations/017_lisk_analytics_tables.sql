-- Migration: Add Lisk Analytics Tables
-- This migration creates new tables for Lisk-specific analytics data
-- Replaces Zcash-specific analytics with Lisk blockchain data structures

-- =====================================================
-- LISK WALLET ACTIVITY METRICS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS lisk_wallet_activity_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    transaction_count INTEGER DEFAULT 0,
    unique_days_active INTEGER DEFAULT 0,
    total_volume_beddows BIGINT DEFAULT 0, -- LSK amounts in beddows (smallest unit)
    total_fees_paid_beddows BIGINT DEFAULT 0, -- Fees in beddows
    transfers_count INTEGER DEFAULT 0,
    delegate_votes_count INTEGER DEFAULT 0, -- Replaces swaps_count
    cross_chain_count INTEGER DEFAULT 0, -- Replaces bridges_count  
    delegate_registrations_count INTEGER DEFAULT 0, -- Replaces shielded_count
    is_active BOOLEAN DEFAULT false,
    is_returning BOOLEAN DEFAULT false,
    days_since_creation INTEGER DEFAULT 0,
    sequence_complexity_score DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(wallet_id, activity_date)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_lisk_wallet_activity_wallet_date 
ON lisk_wallet_activity_metrics(wallet_id, activity_date);

CREATE INDEX IF NOT EXISTS idx_lisk_wallet_activity_date 
ON lisk_wallet_activity_metrics(activity_date);

-- =====================================================
-- LISK PROCESSED TRANSACTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS lisk_processed_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    transaction_id VARCHAR(64) NOT NULL, -- Lisk transaction ID
    block_height BIGINT,
    block_timestamp TIMESTAMP WITH TIME ZONE,
    tx_type VARCHAR(50),
    tx_subtype VARCHAR(50),
    amount_beddows BIGINT DEFAULT 0, -- Amount in beddows
    fee_beddows BIGINT DEFAULT 0, -- Fee in beddows
    usd_value_at_time DECIMAL(20,8),
    counterparty_address VARCHAR(41), -- Lisk address format
    counterparty_type VARCHAR(50),
    module_command VARCHAR(100), -- Lisk-specific module:command format (e.g., token:transfer)
    sequence_position INTEGER,
    session_id VARCHAR(100),
    time_since_previous_tx_minutes INTEGER,
    is_delegate_transaction BOOLEAN DEFAULT false, -- Replaces is_shielded
    delegate_username VARCHAR(100), -- For delegate-related transactions
    cross_chain_info JSONB, -- For cross-chain transaction details
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(wallet_id, transaction_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lisk_processed_tx_wallet 
ON lisk_processed_transactions(wallet_id);

CREATE INDEX IF NOT EXISTS idx_lisk_processed_tx_timestamp 
ON lisk_processed_transactions(block_timestamp);

CREATE INDEX IF NOT EXISTS idx_lisk_processed_tx_type 
ON lisk_processed_transactions(tx_type);

CREATE INDEX IF NOT EXISTS idx_lisk_processed_tx_module_command 
ON lisk_processed_transactions(module_command);

-- =====================================================
-- LISK ANALYTICS SUMMARY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS lisk_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lisk_address VARCHAR(41) UNIQUE NOT NULL,
    total_transactions INTEGER DEFAULT 0,
    total_lsk_volume BIGINT DEFAULT 0, -- Total volume in beddows
    total_fees_lsk BIGINT DEFAULT 0, -- Total fees in beddows
    avg_transaction_amount BIGINT DEFAULT 0, -- Average amount in beddows
    transaction_types JSONB, -- JSON object with transaction type counts
    recurring_patterns JSONB, -- JSON array of detected patterns
    account_balance BIGINT DEFAULT 0, -- Current balance in beddows
    analysis_data JSONB, -- Full analysis data from Lisk service
    last_transaction_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for Lisk address lookups
CREATE INDEX IF NOT EXISTS idx_lisk_analytics_address 
ON lisk_analytics(lisk_address);

-- =====================================================
-- UPDATE EXISTING TABLES FOR LISK COMPATIBILITY
-- =====================================================

-- Add Lisk-specific columns to existing analytics tables if they don't exist
DO $$ 
BEGIN
    -- Add LSK volume tracking to existing analytics events
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'analytics_events' AND column_name = 'lsk_amount_beddows') THEN
        ALTER TABLE analytics_events 
        ADD COLUMN lsk_amount_beddows BIGINT DEFAULT 0,
        ADD COLUMN lisk_transaction_id VARCHAR(64);
    END IF;

    -- Update wallet cohorts to track LSK metrics
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'wallet_cohorts' AND column_name = 'avg_lsk_volume_beddows') THEN
        ALTER TABLE wallet_cohorts 
        ADD COLUMN avg_lsk_volume_beddows BIGINT DEFAULT 0,
        ADD COLUMN total_lsk_fees_beddows BIGINT DEFAULT 0,
        ADD COLUMN delegate_participation_rate DECIMAL(5,2) DEFAULT 0;
    END IF;
END $$;

-- =====================================================
-- LISK ANALYTICS FUNCTIONS
-- =====================================================

-- Function to initialize Lisk analytics for a wallet
CREATE OR REPLACE FUNCTION initialize_lisk_wallet_analytics(wallet_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Insert initial activity metric record
    INSERT INTO lisk_wallet_activity_metrics (
        wallet_id, 
        activity_date, 
        transaction_count, 
        is_active
    ) VALUES (
        wallet_uuid, 
        CURRENT_DATE, 
        0, 
        false
    ) ON CONFLICT (wallet_id, activity_date) DO NOTHING;
    
    -- Initialize productivity score if not exists
    INSERT INTO wallet_productivity_scores (
        wallet_id,
        total_score,
        retention_score,
        adoption_score,
        activity_score,
        diversity_score,
        status,
        risk_level
    ) VALUES (
        wallet_uuid,
        0,
        0,
        0,
        0,
        0,
        'new',
        'unknown'
    ) ON CONFLICT (wallet_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate LSK amounts from beddows
CREATE OR REPLACE FUNCTION beddows_to_lsk(beddows_amount BIGINT)
RETURNS DECIMAL(20,8) AS $$
BEGIN
    RETURN (beddows_amount::DECIMAL / 100000000);
END;
$$ LANGUAGE plpgsql;

-- Function to convert LSK to beddows
CREATE OR REPLACE FUNCTION lsk_to_beddows(lsk_amount DECIMAL)
RETURNS BIGINT AS $$
BEGIN
    RETURN (lsk_amount * 100000000)::BIGINT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS FOR LISK ANALYTICS REPORTING
-- =====================================================

-- View for Lisk wallet health dashboard
CREATE OR REPLACE VIEW lisk_wallet_health_dashboard AS
SELECT 
    w.id as wallet_id,
    w.lisk_address,
    w.network,
    w.wallet_type,
    lam.total_volume_beddows,
    lam.total_fees_paid_beddows,
    beddows_to_lsk(lam.total_volume_beddows) as total_volume_lsk,
    beddows_to_lsk(lam.total_fees_paid_beddows) as total_fees_lsk,
    lam.transaction_count,
    lam.transfers_count,
    lam.delegate_votes_count,
    lam.cross_chain_count,
    lam.delegate_registrations_count,
    lam.is_active,
    wps.total_score as productivity_score,
    wps.status as health_status,
    wps.risk_level,
    w.created_at as wallet_created_at,
    lam.updated_at as last_activity_update
FROM wallets w
LEFT JOIN lisk_wallet_activity_metrics lam ON w.id = lam.wallet_id
LEFT JOIN wallet_productivity_scores wps ON w.id = wps.wallet_id
WHERE w.wallet_type IN ('lisk_mainnet', 'lisk_testnet')
AND w.is_active = true;

-- View for Lisk cohort retention with LSK metrics
CREATE OR REPLACE VIEW lisk_cohort_retention AS
SELECT 
    wc.*,
    AVG(lam.total_volume_beddows) as avg_lsk_volume_beddows,
    AVG(lam.total_fees_paid_beddows) as avg_fees_lsk_beddows,
    beddows_to_lsk(AVG(lam.total_volume_beddows)) as avg_lsk_volume,
    beddows_to_lsk(AVG(lam.total_fees_paid_beddows)) as avg_fees_lsk,
    SUM(lam.delegate_votes_count) as total_delegate_votes,
    COUNT(CASE WHEN lam.delegate_registrations_count > 0 THEN 1 END) as delegates_in_cohort,
    ROUND(
        100.0 * COUNT(CASE WHEN lam.delegate_votes_count > 0 THEN 1 END) / 
        NULLIF(COUNT(*), 0), 2
    ) as delegate_participation_rate
FROM wallet_cohorts wc
LEFT JOIN wallet_cohort_assignments wca ON wc.id = wca.cohort_id
LEFT JOIN wallets w ON wca.wallet_id = w.id
LEFT JOIN lisk_wallet_activity_metrics lam ON w.id = lam.wallet_id
WHERE w.wallet_type IN ('lisk_mainnet', 'lisk_testnet')
GROUP BY wc.id, wc.cohort_type, wc.cohort_period, wc.wallet_count,
         wc.retention_week_1, wc.retention_week_2, wc.retention_week_3, wc.retention_week_4,
         wc.created_at, wc.updated_at;

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE lisk_wallet_activity_metrics IS 'Tracks daily activity metrics for Lisk wallets, replacing Zcash-specific zatoshi with beddows';
COMMENT ON TABLE lisk_processed_transactions IS 'Stores processed Lisk transactions with module:command format and delegate/cross-chain info';
COMMENT ON TABLE lisk_analytics IS 'Summary analytics for Lisk addresses with transaction patterns and account info';

COMMENT ON COLUMN lisk_wallet_activity_metrics.total_volume_beddows IS 'Total transaction volume in beddows (Lisk smallest unit, 1 LSK = 100,000,000 beddows)';
COMMENT ON COLUMN lisk_wallet_activity_metrics.delegate_votes_count IS 'Number of delegate voting transactions (replaces swaps_count from Zcash)';
COMMENT ON COLUMN lisk_wallet_activity_metrics.cross_chain_count IS 'Number of cross-chain transactions (replaces bridges_count)';
COMMENT ON COLUMN lisk_wallet_activity_metrics.delegate_registrations_count IS 'Number of delegate registration transactions (replaces shielded_count)';

COMMENT ON COLUMN lisk_processed_transactions.module_command IS 'Lisk transaction type in module:command format (e.g., token:transfer, dpos:voteDelegate)';
COMMENT ON COLUMN lisk_processed_transactions.is_delegate_transaction IS 'Whether transaction is delegate-related (replaces is_shielded from Zcash)';
COMMENT ON COLUMN lisk_processed_transactions.cross_chain_info IS 'JSON data for cross-chain transaction details';