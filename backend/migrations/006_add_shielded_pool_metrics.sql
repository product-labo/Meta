-- =====================================================
-- SHIELDED POOL ANALYTICS MIGRATION
-- =====================================================
-- Creates the shielded_pool_metrics table for privacy-focused analytics

CREATE TABLE IF NOT EXISTS shielded_pool_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    analysis_date DATE NOT NULL,
    
    -- Shielded activity metrics
    shielded_tx_count INTEGER DEFAULT 0,
    transparent_to_shielded_count INTEGER DEFAULT 0,
    shielded_to_transparent_count INTEGER DEFAULT 0,
    internal_shielded_count INTEGER DEFAULT 0,
    
    -- Privacy behavior analysis
    avg_shielded_duration_hours DECIMAL(10,2),
    shielded_volume_zatoshi BIGINT DEFAULT 0,
    privacy_score INTEGER DEFAULT 0 CHECK (privacy_score >= 0 AND privacy_score <= 100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(wallet_id, analysis_date)
);

-- Indexes for shielded pool metrics
CREATE INDEX IF NOT EXISTS idx_shielded_metrics_wallet ON shielded_pool_metrics(wallet_id);
CREATE INDEX IF NOT EXISTS idx_shielded_metrics_date ON shielded_pool_metrics(analysis_date);
CREATE INDEX IF NOT EXISTS idx_shielded_metrics_privacy_score ON shielded_pool_metrics(privacy_score);

-- Comments
COMMENT ON TABLE shielded_pool_metrics IS 'Privacy-focused analytics for shielded transaction behavior';
COMMENT ON COLUMN shielded_pool_metrics.privacy_score IS '0-100 score based on shielded transaction patterns and privacy behavior';
COMMENT ON COLUMN shielded_pool_metrics.avg_shielded_duration_hours IS 'Average time funds remain in shielded pool before deshielding';