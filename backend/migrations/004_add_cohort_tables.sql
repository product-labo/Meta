-- Add cohort analysis tables
CREATE TABLE IF NOT EXISTS wallet_cohorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort_type TEXT NOT NULL CHECK (cohort_type IN ('weekly', 'monthly')),
    cohort_period DATE NOT NULL,
    wallet_count INTEGER DEFAULT 0,
    
    -- Pre-calculated retention rates
    retention_week_1 DECIMAL(5,2),
    retention_week_2 DECIMAL(5,2),
    retention_week_3 DECIMAL(5,2),
    retention_week_4 DECIMAL(5,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(cohort_type, cohort_period)
);

CREATE TABLE IF NOT EXISTS wallet_cohort_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    cohort_id UUID NOT NULL REFERENCES wallet_cohorts(id) ON DELETE CASCADE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(wallet_id, cohort_id)
);

-- Create indexes for cohort tables
CREATE INDEX IF NOT EXISTS idx_wallet_cohorts_type ON wallet_cohorts(cohort_type);
CREATE INDEX IF NOT EXISTS idx_wallet_cohorts_period ON wallet_cohorts(cohort_period);
CREATE INDEX IF NOT EXISTS idx_cohort_assignments_wallet ON wallet_cohort_assignments(wallet_id);
CREATE INDEX IF NOT EXISTS idx_cohort_assignments_cohort ON wallet_cohort_assignments(cohort_id);

-- Add update trigger for cohorts
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_wallet_cohorts_updated_at') THEN
        CREATE TRIGGER update_wallet_cohorts_updated_at
            BEFORE UPDATE ON wallet_cohorts
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Add comments
COMMENT ON TABLE wallet_cohorts IS 'Time-based cohorts for retention analysis and user lifecycle tracking';
COMMENT ON TABLE wallet_cohort_assignments IS 'Assignment of wallets to their respective cohorts';

SELECT 'Cohort tables created successfully' as status;