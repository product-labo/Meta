-- =============================================================================
-- GROUP C DATABASE TABLES
-- Tables needed for Group C functionality (Authentication & Onboarding)
-- =============================================================================

-- C1: OAuth Integration Tables
CREATE TABLE IF NOT EXISTS oauth_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'google', 'github', etc.
    provider_id VARCHAR(255) NOT NULL, -- Provider's user ID
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    scope TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, provider),
    UNIQUE(provider, provider_id)
);

-- C2: Onboarding Flow Tables
CREATE TABLE IF NOT EXISTS onboarding_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_step VARCHAR(50) DEFAULT 'role_selection',
    role_selected BOOLEAN DEFAULT false,
    role_type VARCHAR(50),
    company_details_completed BOOLEAN DEFAULT false,
    wallet_connected BOOLEAN DEFAULT false,
    project_created BOOLEAN DEFAULT false,
    onboarding_completed BOOLEAN DEFAULT false,
    additional_info JSONB,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS user_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_address VARCHAR(255) NOT NULL,
    wallet_type VARCHAR(50) NOT NULL, -- 'metamask', 'walletconnect', etc.
    chain VARCHAR(50) NOT NULL, -- 'ethereum', 'polygon', etc.
    is_primary BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    verification_signature TEXT,
    connected_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, wallet_address, chain)
);

-- C3: Advanced Insights Tables (for caching and historical data)
CREATE TABLE IF NOT EXISTS insight_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    insight_type VARCHAR(100) NOT NULL, -- 'retention_patterns', 'recommendations', etc.
    insight_data JSONB NOT NULL,
    parameters JSONB, -- Query parameters used to generate insight
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'dismissed', 'completed'
    actions JSONB, -- Array of recommended actions
    expected_impact TEXT,
    effort_level VARCHAR(20), -- 'low', 'medium', 'high'
    metadata JSONB,
    dismissed_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- C4: System Monitoring Tables
CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type VARCHAR(100) NOT NULL, -- 'health_check', 'performance', 'log_entry', etc.
    metric_value TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(100) NOT NULL, -- 'memory', 'database', 'cpu', etc.
    severity VARCHAR(20) NOT NULL, -- 'info', 'warning', 'critical'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    is_active BOOLEAN DEFAULT true,
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced startup_details table (if not exists)
CREATE TABLE IF NOT EXISTS startup_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    company_size VARCHAR(50), -- 'startup', 'small', 'medium', 'large'
    industry VARCHAR(100),
    website VARCHAR(500),
    description TEXT,
    founding_year INTEGER,
    location VARCHAR(255),
    funding_stage VARCHAR(50), -- 'pre-seed', 'seed', 'series-a', etc.
    contract_address VARCHAR(255),
    chain VARCHAR(50),
    category VARCHAR(100),
    utility_description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_oauth_providers_user_id ON oauth_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_providers_provider ON oauth_providers(provider);
CREATE INDEX IF NOT EXISTS idx_onboarding_status_user_id ON onboarding_status(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_status_step ON onboarding_status(current_step);
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_address ON user_wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_wallets_chain ON user_wallets(chain);
CREATE INDEX IF NOT EXISTS idx_insight_cache_project_id ON insight_cache(project_id);
CREATE INDEX IF NOT EXISTS idx_insight_cache_type ON insight_cache(insight_type);
CREATE INDEX IF NOT EXISTS idx_insight_cache_expires ON insight_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_recommendations_user_id ON user_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recommendations_status ON user_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_user_recommendations_priority ON user_recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_system_metrics_type ON system_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_system_metrics_created ON system_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_system_alerts_type ON system_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_active ON system_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_startup_details_user_id ON startup_details(user_id);

-- Add comments for documentation
COMMENT ON TABLE oauth_providers IS 'OAuth provider connections for social login';
COMMENT ON TABLE onboarding_status IS 'User onboarding progress tracking';
COMMENT ON TABLE user_wallets IS 'User connected crypto wallets';
COMMENT ON TABLE insight_cache IS 'Cached advanced analytics insights';
COMMENT ON TABLE user_recommendations IS 'AI-generated user recommendations';
COMMENT ON TABLE system_metrics IS 'System performance and health metrics';
COMMENT ON TABLE system_alerts IS 'System monitoring alerts and notifications';
COMMENT ON TABLE startup_details IS 'Extended startup company information';

-- Add some sample data for system monitoring
INSERT INTO system_metrics (metric_type, metric_value, metadata) VALUES 
('health_check', 'healthy', '{"timestamp": "' || NOW() || '", "services": 4, "healthy_services": 4}'),
('performance', 'baseline', '{"memory_usage": 45.2, "cpu_usage": 12.1, "db_response_time": 23}')
ON CONFLICT DO NOTHING;