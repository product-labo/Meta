-- =====================================================
-- WALLET BEHAVIOR FLOWS MIGRATION
-- =====================================================
-- Creates the wallet_behavior_flows table for tracking
-- sequential transaction patterns and user journey mapping

CREATE TABLE IF NOT EXISTS wallet_behavior_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    session_id UUID DEFAULT gen_random_uuid(),
    
    -- Flow metadata
    flow_sequence JSONB NOT NULL,
    flow_duration_minutes INTEGER,
    flow_complexity_score INTEGER DEFAULT 0,
    
    -- Classification
    flow_type TEXT CHECK (flow_type IN ('simple_transfer', 'complex_defi', 'privacy_focused', 'multi_step', 'privacy_mixing', 'privacy_holding', 'privacy_accumulation', 'privacy_spending', 'internal_shielded', 'transparent_only', 'single_transaction', 'unknown', 'privacy_accumulator', 'privacy_mixer', 'privacy_holder', 'privacy_cycler', 'shielded_native')),
    success_indicator BOOLEAN DEFAULT TRUE,
    
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for behavior flows
CREATE INDEX IF NOT EXISTS idx_behavior_flows_wallet ON wallet_behavior_flows(wallet_id);
CREATE INDEX IF NOT EXISTS idx_behavior_flows_session ON wallet_behavior_flows(session_id);
CREATE INDEX IF NOT EXISTS idx_behavior_flows_type ON wallet_behavior_flows(flow_type);
CREATE INDEX IF NOT EXISTS idx_behavior_flows_started ON wallet_behavior_flows(started_at);

-- Comments
COMMENT ON TABLE wallet_behavior_flows IS 'Sequential transaction pattern analysis for user journey mapping';
COMMENT ON COLUMN wallet_behavior_flows.flow_sequence IS 'JSON array of actions with timestamps and behavioral metadata';
COMMENT ON COLUMN wallet_behavior_flows.flow_complexity_score IS '0-100 score based on transaction complexity and privacy patterns';