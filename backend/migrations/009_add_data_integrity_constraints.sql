-- Migration: Add Data Integrity Constraints
-- Adds database-level constraints to enforce data integrity

-- Add check constraints for productivity scores (0-100 range)
ALTER TABLE wallet_productivity_scores 
ADD CONSTRAINT check_total_score_range 
CHECK (total_score >= 0 AND total_score <= 100);

ALTER TABLE wallet_productivity_scores 
ADD CONSTRAINT check_retention_score_range 
CHECK (retention_score >= 0 AND retention_score <= 100);

ALTER TABLE wallet_productivity_scores 
ADD CONSTRAINT check_adoption_score_range 
CHECK (adoption_score >= 0 AND adoption_score <= 100);

ALTER TABLE wallet_productivity_scores 
ADD CONSTRAINT check_activity_score_range 
CHECK (activity_score >= 0 AND activity_score <= 100);

ALTER TABLE wallet_productivity_scores 
ADD CONSTRAINT check_diversity_score_range 
CHECK (diversity_score >= 0 AND diversity_score <= 100);

-- Add check constraints for valid status values
ALTER TABLE wallet_productivity_scores 
ADD CONSTRAINT check_valid_status 
CHECK (status IN ('healthy', 'at_risk', 'churn'));

ALTER TABLE wallet_productivity_scores 
ADD CONSTRAINT check_valid_risk_level 
CHECK (risk_level IN ('low', 'medium', 'high'));

-- Add check constraints for transaction values (non-negative)
ALTER TABLE processed_transactions 
ADD CONSTRAINT check_non_negative_value 
CHECK (value_zatoshi >= 0);

ALTER TABLE processed_transactions 
ADD CONSTRAINT check_non_negative_fee 
CHECK (fee_zatoshi >= 0);

-- Add check constraints for valid transaction types
ALTER TABLE processed_transactions 
ADD CONSTRAINT check_valid_tx_type 
CHECK (tx_type IN ('transfer', 'swap', 'bridge', 'shielded', 'contract'));

ALTER TABLE processed_transactions 
ADD CONSTRAINT check_valid_tx_subtype 
CHECK (tx_subtype IN ('incoming', 'outgoing', 'self', 'multi_party') OR tx_subtype IS NULL);

-- Add check constraints for activity metrics (non-negative counts)
ALTER TABLE wallet_activity_metrics 
ADD CONSTRAINT check_non_negative_transaction_count 
CHECK (transaction_count >= 0);

ALTER TABLE wallet_activity_metrics 
ADD CONSTRAINT check_non_negative_unique_days 
CHECK (unique_days_active >= 0);

ALTER TABLE wallet_activity_metrics 
ADD CONSTRAINT check_non_negative_volume 
CHECK (total_volume_zatoshi >= 0);

ALTER TABLE wallet_activity_metrics 
ADD CONSTRAINT check_non_negative_fees 
CHECK (total_fees_paid >= 0);

ALTER TABLE wallet_activity_metrics 
ADD CONSTRAINT check_non_negative_transfers 
CHECK (transfers_count >= 0);

ALTER TABLE wallet_activity_metrics 
ADD CONSTRAINT check_non_negative_swaps 
CHECK (swaps_count >= 0);

ALTER TABLE wallet_activity_metrics 
ADD CONSTRAINT check_non_negative_bridges 
CHECK (bridges_count >= 0);

ALTER TABLE wallet_activity_metrics 
ADD CONSTRAINT check_non_negative_shielded 
CHECK (shielded_count >= 0);

-- Add check constraints for cohort types
ALTER TABLE wallet_cohorts 
ADD CONSTRAINT check_valid_cohort_type 
CHECK (cohort_type IN ('weekly', 'monthly'));

-- Add check constraints for retention percentages (0-100 range)
ALTER TABLE wallet_cohorts 
ADD CONSTRAINT check_retention_week_1_range 
CHECK (retention_week_1 IS NULL OR (retention_week_1 >= 0 AND retention_week_1 <= 100));

ALTER TABLE wallet_cohorts 
ADD CONSTRAINT check_retention_week_2_range 
CHECK (retention_week_2 IS NULL OR (retention_week_2 >= 0 AND retention_week_2 <= 100));

ALTER TABLE wallet_cohorts 
ADD CONSTRAINT check_retention_week_3_range 
CHECK (retention_week_3 IS NULL OR (retention_week_3 >= 0 AND retention_week_3 <= 100));

ALTER TABLE wallet_cohorts 
ADD CONSTRAINT check_retention_week_4_range 
CHECK (retention_week_4 IS NULL OR (retention_week_4 >= 0 AND retention_week_4 <= 100));

-- Add check constraints for adoption stages
ALTER TABLE wallet_adoption_stages 
ADD CONSTRAINT check_valid_stage_name 
CHECK (stage_name IN ('created', 'first_tx', 'feature_usage', 'recurring', 'high_value'));

ALTER TABLE wallet_adoption_stages 
ADD CONSTRAINT check_non_negative_time_to_achieve 
CHECK (time_to_achieve_hours IS NULL OR time_to_achieve_hours >= 0);

ALTER TABLE wallet_adoption_stages 
ADD CONSTRAINT check_conversion_probability_range 
CHECK (conversion_probability IS NULL OR (conversion_probability >= 0 AND conversion_probability <= 1));

-- Add check constraints for shielded pool metrics
ALTER TABLE shielded_pool_metrics 
ADD CONSTRAINT check_non_negative_shielded_tx_count 
CHECK (shielded_tx_count >= 0);

ALTER TABLE shielded_pool_metrics 
ADD CONSTRAINT check_non_negative_transparent_to_shielded 
CHECK (transparent_to_shielded_count >= 0);

ALTER TABLE shielded_pool_metrics 
ADD CONSTRAINT check_non_negative_shielded_to_transparent 
CHECK (shielded_to_transparent_count >= 0);

ALTER TABLE shielded_pool_metrics 
ADD CONSTRAINT check_non_negative_internal_shielded 
CHECK (internal_shielded_count >= 0);

ALTER TABLE shielded_pool_metrics 
ADD CONSTRAINT check_non_negative_shielded_volume 
CHECK (shielded_volume_zatoshi >= 0);

ALTER TABLE shielded_pool_metrics 
ADD CONSTRAINT check_privacy_score_range 
CHECK (privacy_score >= 0 AND privacy_score <= 100);

-- Add check constraints for AI recommendations
ALTER TABLE ai_recommendations 
ADD CONSTRAINT check_valid_recommendation_type 
CHECK (recommendation_type IN ('marketing', 'onboarding', 'feature_enhancement'));

ALTER TABLE ai_recommendations 
ADD CONSTRAINT check_valid_priority 
CHECK (priority >= 1 AND priority <= 10);

ALTER TABLE ai_recommendations 
ADD CONSTRAINT check_valid_status 
CHECK (status IN ('pending', 'in_progress', 'completed', 'dismissed'));

-- Add check constraints for privacy settings
ALTER TABLE wallet_privacy_settings 
ADD CONSTRAINT check_valid_data_sharing_level 
CHECK (data_sharing_level IN ('private', 'public', 'monetizable'));

ALTER TABLE wallet_privacy_settings 
ADD CONSTRAINT check_valid_anonymization_level 
CHECK (anonymization_level IN ('low', 'medium', 'high'));

ALTER TABLE wallet_privacy_settings 
ADD CONSTRAINT check_revenue_share_range 
CHECK (revenue_share_percentage IS NULL OR (revenue_share_percentage >= 0 AND revenue_share_percentage <= 100));

ALTER TABLE wallet_privacy_settings 
ADD CONSTRAINT check_positive_retention_days 
CHECK (data_retention_days > 0);

-- Add check constraints for competitive benchmarks
ALTER TABLE competitive_benchmarks 
ADD CONSTRAINT check_valid_benchmark_type 
CHECK (benchmark_type IN ('productivity', 'retention', 'adoption'));

ALTER TABLE competitive_benchmarks 
ADD CONSTRAINT check_positive_sample_size 
CHECK (sample_size > 0);

-- Add check constraints for behavior flows
ALTER TABLE wallet_behavior_flows 
ADD CONSTRAINT check_non_negative_duration 
CHECK (flow_duration_minutes IS NULL OR flow_duration_minutes >= 0);

ALTER TABLE wallet_behavior_flows 
ADD CONSTRAINT check_non_negative_complexity 
CHECK (flow_complexity_score IS NULL OR flow_complexity_score >= 0);

ALTER TABLE wallet_behavior_flows 
ADD CONSTRAINT check_valid_flow_type 
CHECK (flow_type IS NULL OR flow_type IN ('simple_transfer', 'complex_defi', 'privacy_focused'));

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_wallet_activity_metrics_wallet_date 
ON wallet_activity_metrics(wallet_id, activity_date);

CREATE INDEX IF NOT EXISTS idx_processed_transactions_wallet_timestamp 
ON processed_transactions(wallet_id, block_timestamp);

CREATE INDEX IF NOT EXISTS idx_wallet_productivity_scores_status 
ON wallet_productivity_scores(status, risk_level);

CREATE INDEX IF NOT EXISTS idx_wallet_cohorts_type_period 
ON wallet_cohorts(cohort_type, cohort_period);

CREATE INDEX IF NOT EXISTS idx_adoption_stages_wallet_stage 
ON wallet_adoption_stages(wallet_id, stage_name);

CREATE INDEX IF NOT EXISTS idx_shielded_metrics_wallet_date 
ON shielded_pool_metrics(wallet_id, analysis_date);

CREATE INDEX IF NOT EXISTS idx_ai_recommendations_status 
ON ai_recommendations(status, priority);

CREATE INDEX IF NOT EXISTS idx_behavior_flows_wallet_started 
ON wallet_behavior_flows(wallet_id, started_at);

-- Add triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to relevant tables
CREATE TRIGGER update_wallet_activity_metrics_updated_at 
    BEFORE UPDATE ON wallet_activity_metrics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallet_privacy_settings_updated_at 
    BEFORE UPDATE ON wallet_privacy_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add data consistency views for monitoring
CREATE OR REPLACE VIEW data_integrity_summary AS
SELECT 
    'wallet_activity_metrics' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE transaction_count < 0) as negative_counts,
    COUNT(*) FILTER (WHERE wallet_id NOT IN (SELECT id FROM wallets)) as orphaned_records
FROM wallet_activity_metrics
UNION ALL
SELECT 
    'processed_transactions' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE value_zatoshi < 0 OR fee_zatoshi < 0) as negative_values,
    COUNT(*) FILTER (WHERE wallet_id NOT IN (SELECT id FROM wallets)) as orphaned_records
FROM processed_transactions
UNION ALL
SELECT 
    'wallet_productivity_scores' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE total_score < 0 OR total_score > 100) as invalid_scores,
    COUNT(*) FILTER (WHERE wallet_id NOT IN (SELECT id FROM wallets)) as orphaned_records
FROM wallet_productivity_scores;