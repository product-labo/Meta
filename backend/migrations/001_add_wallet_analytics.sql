-- =====================================================
-- WALLET ANALYTICS PLATFORM MIGRATION
-- Version: 001 - Basic Analytics Tables
-- Description: Add core analytics tables for wallet behavior tracking
-- =====================================================

-- Create wallet activity metrics table
CREATE TABLE IF NOT EXISTS wallet_activity_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    
    -- Core transaction metrics
    transaction_count INTEGER DEFAULT 0,
    unique_days_active INTEGER DEFAULT 0,
    total_volume_zatoshi BIGINT DEFAULT 0,
    total_fees_paid BIGINT DEFAULT 0,
    
    -- Transaction type breakdown
    transfers_count INTEGER DEFAULT 0,
    swaps_count INTEGER DEFAULT 0,
    bridges_count INTEGER DEFAULT 0,
    shielded_count INTEGER DEFAULT 0,
    
    -- Behavioral metrics
    is_active BOOLEAN DEFAULT FALSE,
    is_returning BOOLEAN DEFAULT FALSE,
    days_since_creation INTEGER DEFAULT 0,
    sequence_complexity_score INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(wallet_id, activity_date)
);

-- Create productivity scores table
CREATE TABLE IF NOT EXISTS wallet_productivity_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    
    -- Overall score and components (0-100 scale)
    total_score INTEGER DEFAULT 0 CHECK (total_score >= 0 AND total_score <= 100),
    retention_score INTEGER DEFAULT 0 CHECK (retention_score >= 0 AND retention_score <= 100),
    adoption_score INTEGER DEFAULT 0 CHECK (adoption_score >= 0 AND adoption_score <= 100),
    activity_score INTEGER DEFAULT 0 CHECK (activity_score >= 0 AND activity_score <= 100),
    diversity_score INTEGER DEFAULT 0 CHECK (diversity_score >= 0 AND diversity_score <= 100),
    
    -- Status indicators
    status TEXT DEFAULT 'healthy' CHECK (status IN ('healthy', 'at_risk', 'churn')),
    risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
    
    -- Task tracking
    pending_tasks JSONB DEFAULT '[]'::jsonb,
    completed_tasks JSONB DEFAULT '[]'::jsonb,
    
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint per wallet
    UNIQUE(wallet_id)
);

-- Create privacy settings table
CREATE TABLE IF NOT EXISTS wallet_privacy_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    
    -- Privacy controls
    data_sharing_level TEXT DEFAULT 'private' CHECK (data_sharing_level IN ('private', 'public', 'monetizable')),
    anonymization_level TEXT DEFAULT 'high' CHECK (anonymization_level IN ('low', 'medium', 'high')),
    
    -- Monetization settings
    monetization_enabled BOOLEAN DEFAULT FALSE,
    earnings_address TEXT,
    revenue_share_percentage DECIMAL(5,2) DEFAULT 50.00 CHECK (revenue_share_percentage >= 0 AND revenue_share_percentage <= 100),
    
    -- Access controls
    allowed_analytics_types TEXT[] DEFAULT ARRAY['basic'],
    data_retention_days INTEGER DEFAULT 365 CHECK (data_retention_days > 0),
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint per wallet
    UNIQUE(wallet_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallet_activity_wallet_id ON wallet_activity_metrics(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_activity_date ON wallet_activity_metrics(activity_date);
CREATE INDEX IF NOT EXISTS idx_wallet_activity_active ON wallet_activity_metrics(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_productivity_scores_wallet ON wallet_productivity_scores(wallet_id);
CREATE INDEX IF NOT EXISTS idx_productivity_scores_total ON wallet_productivity_scores(total_score);
CREATE INDEX IF NOT EXISTS idx_privacy_settings_wallet ON wallet_privacy_settings(wallet_id);

-- Add update triggers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_wallet_activity_metrics_updated_at') THEN
        CREATE TRIGGER update_wallet_activity_metrics_updated_at
            BEFORE UPDATE ON wallet_activity_metrics
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_wallet_privacy_settings_updated_at') THEN
        CREATE TRIGGER update_wallet_privacy_settings_updated_at
            BEFORE UPDATE ON wallet_privacy_settings
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Create helper function for wallet analytics initialization
CREATE OR REPLACE FUNCTION initialize_wallet_analytics(p_wallet_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Initialize privacy settings with defaults
    INSERT INTO wallet_privacy_settings (wallet_id)
    VALUES (p_wallet_id)
    ON CONFLICT (wallet_id) DO NOTHING;
    
    -- Initialize productivity score
    INSERT INTO wallet_productivity_scores (wallet_id)
    VALUES (p_wallet_id)
    ON CONFLICT (wallet_id) DO NOTHING;
    
    -- Create initial activity metric record for today
    INSERT INTO wallet_activity_metrics (wallet_id, activity_date, days_since_creation)
    VALUES (
        p_wallet_id, 
        CURRENT_DATE, 
        EXTRACT(DAY FROM NOW() - (SELECT created_at FROM wallets WHERE id = p_wallet_id))
    )
    ON CONFLICT (wallet_id, activity_date) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Create retention score calculation function
CREATE OR REPLACE FUNCTION calculate_wallet_retention_score(p_wallet_id UUID)
RETURNS INTEGER AS $$
DECLARE
    frequency_score INTEGER := 0;
    recency_score INTEGER := 0;
    volume_score INTEGER := 0;
    diversity_score INTEGER := 0;
    total_score INTEGER := 0;
    
    last_activity_date DATE;
    activity_days INTEGER;
    total_volume BIGINT;
    tx_diversity INTEGER;
BEGIN
    -- Get wallet activity metrics for last 30 days
    SELECT 
        MAX(activity_date),
        COUNT(DISTINCT activity_date),
        SUM(total_volume_zatoshi),
        COUNT(DISTINCT CASE WHEN transfers_count > 0 THEN 'transfer' END) +
        COUNT(DISTINCT CASE WHEN swaps_count > 0 THEN 'swap' END) +
        COUNT(DISTINCT CASE WHEN bridges_count > 0 THEN 'bridge' END) +
        COUNT(DISTINCT CASE WHEN shielded_count > 0 THEN 'shielded' END)
    INTO last_activity_date, activity_days, total_volume, tx_diversity
    FROM wallet_activity_metrics
    WHERE wallet_id = p_wallet_id
    AND activity_date >= CURRENT_DATE - INTERVAL '30 days';
    
    -- Frequency Score (0-30 points)
    IF activity_days >= 15 THEN frequency_score := 30;
    ELSIF activity_days >= 8 THEN frequency_score := 20;
    ELSIF activity_days >= 4 THEN frequency_score := 10;
    ELSE frequency_score := 0;
    END IF;
    
    -- Recency Score (0-30 points)
    IF last_activity_date >= CURRENT_DATE - INTERVAL '1 day' THEN recency_score := 30;
    ELSIF last_activity_date >= CURRENT_DATE - INTERVAL '3 days' THEN recency_score := 20;
    ELSIF last_activity_date >= CURRENT_DATE - INTERVAL '7 days' THEN recency_score := 10;
    ELSE recency_score := 0;
    END IF;
    
    -- Volume Score (0-20 points)
    IF total_volume > 100000000 THEN volume_score := 20; -- > 1 ZEC
    ELSIF total_volume > 10000000 THEN volume_score := 15; -- > 0.1 ZEC
    ELSIF total_volume > 1000000 THEN volume_score := 10; -- > 0.01 ZEC
    ELSE volume_score := 5;
    END IF;
    
    -- Diversity Score (0-20 points)
    diversity_score := LEAST(tx_diversity * 5, 20);
    
    total_score := frequency_score + recency_score + volume_score + diversity_score;
    
    RETURN LEAST(total_score, 100);
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE wallet_activity_metrics IS 'Daily aggregated activity metrics per wallet for analytics processing';
COMMENT ON TABLE wallet_productivity_scores IS 'Comprehensive productivity scoring with AI task recommendations';
COMMENT ON TABLE wallet_privacy_settings IS 'Privacy controls and monetization preferences per wallet';
COMMENT ON FUNCTION initialize_wallet_analytics(UUID) IS 'Initialize analytics tracking for a new wallet';
COMMENT ON FUNCTION calculate_wallet_retention_score(UUID) IS 'Calculates 0-100 retention score based on frequency, recency, volume, and diversity';

SELECT 'Wallet Analytics Migration 001 completed successfully' as status;