-- =====================================================
-- WALLET ANALYTICS PLATFORM MIGRATION
-- Version: 005 - Adoption Funnel Tracking
-- Description: Add adoption stages table for funnel analysis
-- =====================================================

-- Create adoption stages table
CREATE TABLE IF NOT EXISTS wallet_adoption_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    stage_name TEXT NOT NULL CHECK (stage_name IN ('created', 'first_tx', 'feature_usage', 'recurring', 'high_value')),
    achieved_at TIMESTAMP WITH TIME ZONE,
    time_to_achieve_hours INTEGER,
    conversion_probability DECIMAL(5,4) CHECK (conversion_probability >= 0 AND conversion_probability <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint per wallet per stage
    UNIQUE(wallet_id, stage_name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_adoption_stages_wallet ON wallet_adoption_stages(wallet_id);
CREATE INDEX IF NOT EXISTS idx_adoption_stages_stage ON wallet_adoption_stages(stage_name);
CREATE INDEX IF NOT EXISTS idx_adoption_stages_achieved ON wallet_adoption_stages(achieved_at) WHERE achieved_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_adoption_stages_conversion ON wallet_adoption_stages(conversion_probability) WHERE conversion_probability IS NOT NULL;

-- Add comments
COMMENT ON TABLE wallet_adoption_stages IS 'Tracks wallet progression through adoption funnel stages';
COMMENT ON COLUMN wallet_adoption_stages.stage_name IS 'Adoption stage: created, first_tx, feature_usage, recurring, high_value';
COMMENT ON COLUMN wallet_adoption_stages.achieved_at IS 'Timestamp when stage was achieved (NULL if not achieved)';
COMMENT ON COLUMN wallet_adoption_stages.time_to_achieve_hours IS 'Hours from wallet creation to stage achievement';
COMMENT ON COLUMN wallet_adoption_stages.conversion_probability IS 'Probability score (0-1) for stage achievement';

SELECT 'Adoption Stages Migration 005 completed successfully' as status;