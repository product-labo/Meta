-- Business Intelligence & Analytics Schema
-- Migration 003: Comprehensive indexing for investor insights and traction analysis

-- ============================================================================
-- CORE CATEGORIZATION TABLES
-- ============================================================================

-- Smart Contract Categories (DeFi, NFT, DAO, Gaming, etc.)
CREATE TABLE IF NOT EXISTS bi_contract_categories (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(50) UNIQUE NOT NULL, -- 'defi', 'nft', 'dao', 'gaming', 'social', 'infrastructure'
    subcategory VARCHAR(100), -- 'dex', 'lending', 'yield-farming', 'marketplace', 'governance'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contract Classification & Indexing
CREATE TABLE IF NOT EXISTS bi_contract_index (
    id BIGSERIAL PRIMARY KEY,
    contract_address VARCHAR(66) NOT NULL,
    chain_id INTEGER REFERENCES mc_chains(id),
    category_id INTEGER REFERENCES bi_contract_categories(id),
    contract_name VARCHAR(255),
    protocol_name VARCHAR(255), -- 'Uniswap', 'OpenSea', 'Compound'
    tvl_usd DECIMAL(20,2), -- Total Value Locked
    market_cap_usd DECIMAL(20,2),
    is_verified BOOLEAN DEFAULT false,
    launch_date DATE,
    website_url TEXT,
    social_links JSONB,
    risk_score INTEGER, -- 0-100 (0 = safest, 100 = highest risk)
    audit_status VARCHAR(50), -- 'audited', 'unaudited', 'partially-audited'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(contract_address, chain_id)
);

-- ============================================================================
-- COHORT & USER ANALYTICS
-- ============================================================================

-- Weekly Cohort Analysis
CREATE TABLE IF NOT EXISTS bi_weekly_cohorts (
    id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER REFERENCES mc_chains(id),
    category_id INTEGER REFERENCES bi_contract_categories(id),
    contract_address VARCHAR(66),
    week_start DATE NOT NULL, -- Monday of the week
    
    -- User Metrics
    new_users INTEGER DEFAULT 0, -- First-time users this week
    returning_users INTEGER DEFAULT 0, -- Users who came back
    total_active_users INTEGER DEFAULT 0,
    churned_users INTEGER DEFAULT 0, -- Users who left
    
    -- Transaction Metrics
    total_transactions INTEGER DEFAULT 0,
    successful_transactions INTEGER DEFAULT 0,
    failed_transactions INTEGER DEFAULT 0,
    
    -- Financial Metrics
    total_volume_usd DECIMAL(20,2) DEFAULT 0,
    total_fees_usd DECIMAL(20,2) DEFAULT 0,
    avg_transaction_size_usd DECIMAL(20,2) DEFAULT 0,
    
    -- Gas Metrics
    total_gas_used BIGINT DEFAULT 0,
    avg_gas_price DECIMAL(20,8) DEFAULT 0,
    total_gas_fees_usd DECIMAL(20,2) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(chain_id, category_id, contract_address, week_start)
);

-- User Lifecycle Tracking
CREATE TABLE IF NOT EXISTS bi_user_lifecycle (
    id BIGSERIAL PRIMARY KEY,
    user_address VARCHAR(66) NOT NULL,
    chain_id INTEGER REFERENCES mc_chains(id),
    category_id INTEGER REFERENCES bi_contract_categories(id),
    
    -- Lifecycle Stages
    first_transaction_date DATE,
    last_transaction_date DATE,
    activation_date DATE, -- When user became "active" (>= 3 transactions)
    churn_date DATE, -- When user became inactive (30+ days no activity)
    
    -- User Behavior Metrics
    total_transactions INTEGER DEFAULT 0,
    total_volume_usd DECIMAL(20,2) DEFAULT 0,
    total_fees_paid_usd DECIMAL(20,2) DEFAULT 0,
    avg_days_between_transactions DECIMAL(10,2),
    
    -- User Classification
    user_type VARCHAR(50), -- 'whale', 'power_user', 'casual', 'one_time'
    risk_profile VARCHAR(50), -- 'conservative', 'moderate', 'aggressive'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_address, chain_id, category_id)
);

-- ============================================================================
-- BUSINESS METRICS & KPIs
-- ============================================================================

-- Daily Business Metrics
CREATE TABLE IF NOT EXISTS bi_daily_metrics (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    chain_id INTEGER REFERENCES mc_chains(id),
    category_id INTEGER REFERENCES bi_contract_categories(id),
    contract_address VARCHAR(66),
    
    -- Adoption Metrics
    daily_active_users INTEGER DEFAULT 0,
    new_user_signups INTEGER DEFAULT 0, -- First-time users
    user_retention_rate DECIMAL(5,2) DEFAULT 0, -- % of users who return
    
    -- Engagement Metrics
    total_transactions INTEGER DEFAULT 0,
    transactions_per_user DECIMAL(10,2) DEFAULT 0,
    session_duration_avg_minutes DECIMAL(10,2) DEFAULT 0,
    
    -- Financial Metrics
    daily_volume_usd DECIMAL(20,2) DEFAULT 0,
    daily_revenue_usd DECIMAL(20,2) DEFAULT 0, -- Fees collected
    daily_fees_paid_usd DECIMAL(20,2) DEFAULT 0, -- Gas fees paid by users
    
    -- Growth Metrics
    user_growth_rate DECIMAL(5,2) DEFAULT 0, -- % change from previous day
    volume_growth_rate DECIMAL(5,2) DEFAULT 0,
    transaction_growth_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Churn & Retention
    churn_rate DECIMAL(5,2) DEFAULT 0, -- % of users who stopped using
    activation_rate DECIMAL(5,2) DEFAULT 0, -- % of new users who become active
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date, chain_id, category_id, contract_address)
);

-- Function Signature Analytics
CREATE TABLE IF NOT EXISTS bi_function_analytics (
    id BIGSERIAL PRIMARY KEY,
    function_selector VARCHAR(10) NOT NULL,
    function_name VARCHAR(255),
    category_id INTEGER REFERENCES bi_contract_categories(id),
    
    -- Usage Metrics
    total_calls INTEGER DEFAULT 0,
    successful_calls INTEGER DEFAULT 0,
    failed_calls INTEGER DEFAULT 0,
    unique_callers INTEGER DEFAULT 0,
    
    -- Performance Metrics
    avg_gas_used DECIMAL(20,2) DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0,
    avg_execution_time_ms DECIMAL(10,2) DEFAULT 0,
    
    -- Financial Impact
    total_volume_usd DECIMAL(20,2) DEFAULT 0,
    total_fees_generated_usd DECIMAL(20,2) DEFAULT 0,
    
    -- Trend Analysis
    growth_rate_7d DECIMAL(5,2) DEFAULT 0,
    growth_rate_30d DECIMAL(5,2) DEFAULT 0,
    
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(function_selector, category_id)
);

-- ============================================================================
-- INVESTOR-FOCUSED ANALYTICS
-- ============================================================================

-- Protocol Traction Metrics
CREATE TABLE IF NOT EXISTS bi_protocol_traction (
    id BIGSERIAL PRIMARY KEY,
    protocol_name VARCHAR(255) NOT NULL,
    chain_id INTEGER REFERENCES mc_chains(id),
    category_id INTEGER REFERENCES bi_contract_categories(id),
    measurement_date DATE NOT NULL,
    
    -- Core Traction Metrics
    total_users INTEGER DEFAULT 0,
    monthly_active_users INTEGER DEFAULT 0,
    weekly_active_users INTEGER DEFAULT 0,
    daily_active_users INTEGER DEFAULT 0,
    
    -- Financial Traction
    total_value_locked_usd DECIMAL(20,2) DEFAULT 0,
    monthly_volume_usd DECIMAL(20,2) DEFAULT 0,
    monthly_revenue_usd DECIMAL(20,2) DEFAULT 0,
    revenue_per_user_usd DECIMAL(10,2) DEFAULT 0,
    
    -- Growth Indicators
    user_growth_mom DECIMAL(5,2) DEFAULT 0, -- Month-over-month growth
    volume_growth_mom DECIMAL(5,2) DEFAULT 0,
    revenue_growth_mom DECIMAL(5,2) DEFAULT 0,
    
    -- Engagement Quality
    avg_session_frequency DECIMAL(10,2) DEFAULT 0, -- Sessions per user per month
    user_stickiness DECIMAL(5,2) DEFAULT 0, -- DAU/MAU ratio
    power_user_ratio DECIMAL(5,2) DEFAULT 0, -- % of users doing >10 transactions/month
    
    -- Market Position
    market_share_by_volume DECIMAL(5,2) DEFAULT 0,
    market_share_by_users DECIMAL(5,2) DEFAULT 0,
    competitive_moat_score INTEGER DEFAULT 0, -- 0-100 proprietary score
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(protocol_name, chain_id, measurement_date)
);

-- Cross-Chain Analytics
CREATE TABLE IF NOT EXISTS bi_cross_chain_metrics (
    id BIGSERIAL PRIMARY KEY,
    measurement_date DATE NOT NULL,
    
    -- Multi-Chain User Behavior
    total_unique_users INTEGER DEFAULT 0,
    multi_chain_users INTEGER DEFAULT 0, -- Users active on >1 chain
    chain_switching_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Cross-Chain Volume
    total_cross_chain_volume_usd DECIMAL(20,2) DEFAULT 0,
    bridge_transaction_count INTEGER DEFAULT 0,
    avg_bridge_amount_usd DECIMAL(20,2) DEFAULT 0,
    
    -- Chain Dominance
    ethereum_dominance_volume DECIMAL(5,2) DEFAULT 0,
    ethereum_dominance_users DECIMAL(5,2) DEFAULT 0,
    l2_adoption_rate DECIMAL(5,2) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(measurement_date)
);

-- ============================================================================
-- RISK & COMPLIANCE ANALYTICS
-- ============================================================================

-- Address Risk Scoring
CREATE TABLE IF NOT EXISTS bi_address_risk_scores (
    id BIGSERIAL PRIMARY KEY,
    address VARCHAR(66) NOT NULL,
    chain_id INTEGER REFERENCES mc_chains(id),
    
    -- Risk Factors
    transaction_volume_score INTEGER DEFAULT 50, -- 0-100
    transaction_frequency_score INTEGER DEFAULT 50,
    counterparty_risk_score INTEGER DEFAULT 50,
    geographic_risk_score INTEGER DEFAULT 50,
    
    -- Behavioral Patterns
    is_whale BOOLEAN DEFAULT false, -- >$1M in transactions
    is_bot_likely BOOLEAN DEFAULT false,
    is_mixer_user BOOLEAN DEFAULT false,
    is_exchange_address BOOLEAN DEFAULT false,
    
    -- Compliance Flags
    sanctions_list_match BOOLEAN DEFAULT false,
    pep_list_match BOOLEAN DEFAULT false, -- Politically Exposed Person
    high_risk_jurisdiction BOOLEAN DEFAULT false,
    
    -- Overall Risk Assessment
    composite_risk_score INTEGER DEFAULT 50, -- 0-100 (100 = highest risk)
    risk_category VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(address, chain_id)
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Indexes for optimal query performance
CREATE INDEX idx_bi_contract_index_category ON bi_contract_index(category_id);
CREATE INDEX idx_bi_contract_index_chain ON bi_contract_index(chain_id);
CREATE INDEX idx_bi_contract_index_address ON bi_contract_index(contract_address);

CREATE INDEX idx_bi_weekly_cohorts_week ON bi_weekly_cohorts(week_start);
CREATE INDEX idx_bi_weekly_cohorts_category ON bi_weekly_cohorts(category_id);
CREATE INDEX idx_bi_weekly_cohorts_chain ON bi_weekly_cohorts(chain_id);

CREATE INDEX idx_bi_daily_metrics_date ON bi_daily_metrics(date);
CREATE INDEX idx_bi_daily_metrics_category ON bi_daily_metrics(category_id);
CREATE INDEX idx_bi_daily_metrics_chain ON bi_daily_metrics(chain_id);

CREATE INDEX idx_bi_user_lifecycle_address ON bi_user_lifecycle(user_address);
CREATE INDEX idx_bi_user_lifecycle_category ON bi_user_lifecycle(category_id);
CREATE INDEX idx_bi_user_lifecycle_first_tx ON bi_user_lifecycle(first_transaction_date);

CREATE INDEX idx_bi_protocol_traction_date ON bi_protocol_traction(measurement_date);
CREATE INDEX idx_bi_protocol_traction_protocol ON bi_protocol_traction(protocol_name);

CREATE INDEX idx_bi_address_risk_address ON bi_address_risk_scores(address);
CREATE INDEX idx_bi_address_risk_score ON bi_address_risk_scores(composite_risk_score);

-- ============================================================================
-- INITIAL CATEGORY DATA
-- ============================================================================

INSERT INTO bi_contract_categories (category_name, subcategory, description) VALUES
('defi', 'dex', 'Decentralized Exchanges - Token swapping protocols'),
('defi', 'lending', 'Lending & Borrowing protocols'),
('defi', 'yield-farming', 'Yield farming and liquidity mining'),
('defi', 'derivatives', 'Derivatives and synthetic assets'),
('defi', 'insurance', 'DeFi insurance protocols'),
('defi', 'staking', 'Staking and validator services'),

('nft', 'marketplace', 'NFT marketplaces and trading platforms'),
('nft', 'gaming', 'Gaming NFTs and play-to-earn'),
('nft', 'art', 'Digital art and collectibles'),
('nft', 'utility', 'Utility NFTs and membership tokens'),
('nft', 'metaverse', 'Metaverse and virtual world assets'),

('dao', 'governance', 'Governance and voting mechanisms'),
('dao', 'treasury', 'Treasury management and funding'),
('dao', 'social', 'Social DAOs and communities'),

('gaming', 'play-to-earn', 'Play-to-earn gaming protocols'),
('gaming', 'metaverse', 'Metaverse gaming platforms'),
('gaming', 'gambling', 'Gambling and prediction markets'),

('infrastructure', 'bridge', 'Cross-chain bridges and interoperability'),
('infrastructure', 'oracle', 'Price feeds and data oracles'),
('infrastructure', 'identity', 'Identity and reputation systems'),
('infrastructure', 'storage', 'Decentralized storage solutions'),

('social', 'media', 'Social media and content platforms'),
('social', 'messaging', 'Messaging and communication'),
('social', 'creator', 'Creator economy and monetization')

ON CONFLICT (category_name) DO NOTHING;