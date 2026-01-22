-- MetaGauge Metrics Database Schema Migration
-- Creates comprehensive metrics tables for project, wallet, chain, and category analytics

-- ============================================================================
-- 1. PROJECT METRICS REAL-TIME TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_metrics_realtime (
    contract_address VARCHAR(66) PRIMARY KEY,
    chain_id BIGINT NOT NULL,
    last_updated TIMESTAMP DEFAULT NOW(),
    
    -- Customer Metrics
    total_customers INTEGER DEFAULT 0,
    daily_active_customers INTEGER DEFAULT 0,
    weekly_active_customers INTEGER DEFAULT 0,
    monthly_active_customers INTEGER DEFAULT 0,
    customer_retention_rate DECIMAL(5,2) DEFAULT 0,
    customer_stickiness DECIMAL(5,2) DEFAULT 0,
    
    -- Transaction Metrics
    total_transactions INTEGER DEFAULT 0,
    successful_transactions INTEGER DEFAULT 0,
    failed_transactions INTEGER DEFAULT 0,
    success_rate_percent DECIMAL(5,2) DEFAULT 0,
    avg_transactions_per_day DECIMAL(10,2) DEFAULT 0,
    transaction_volume_trend DECIMAL(10,2) DEFAULT 0,
    
    -- Financial Metrics
    total_volume_eth DECIMAL(20,8) DEFAULT 0,
    total_volume_usd DECIMAL(20,2) DEFAULT 0,
    total_fees_generated_eth DECIMAL(20,8) DEFAULT 0,
    total_fees_generated_usd DECIMAL(20,2) DEFAULT 0,
    avg_transaction_value_eth DECIMAL(20,8) DEFAULT 0,
    avg_transaction_value_usd DECIMAL(20,2) DEFAULT 0,
    revenue_per_customer DECIMAL(20,2) DEFAULT 0,
    
    -- Growth Metrics
    customer_growth_rate DECIMAL(10,4) DEFAULT 0,
    transaction_growth_rate DECIMAL(10,4) DEFAULT 0,
    volume_growth_rate DECIMAL(10,4) DEFAULT 0,
    
    -- Composite Scores (0-100)
    growth_score INTEGER DEFAULT 50,
    health_score INTEGER DEFAULT 50,
    risk_score INTEGER DEFAULT 50,
    uptime_percentage DECIMAL(5,2) DEFAULT 100,
    error_rate DECIMAL(5,2) DEFAULT 0
);

-- ============================================================================
-- 2. WALLET METRICS REAL-TIME TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS wallet_metrics_realtime (
    wallet_address VARCHAR(66) PRIMARY KEY,
    chain_id BIGINT NOT NULL,
    last_updated TIMESTAMP DEFAULT NOW(),
    
    -- Interaction Metrics
    total_interactions INTEGER DEFAULT 0,
    unique_contracts_interacted INTEGER DEFAULT 0,
    first_interaction_date TIMESTAMP,
    last_interaction_date TIMESTAMP,
    interaction_frequency DECIMAL(10,2) DEFAULT 0,
    
    -- Financial Metrics
    total_spent_eth DECIMAL(20,8) DEFAULT 0,
    total_spent_usd DECIMAL(20,2) DEFAULT 0,
    avg_transaction_size_eth DECIMAL(20,8) DEFAULT 0,
    avg_transaction_size_usd DECIMAL(20,2) DEFAULT 0,
    total_gas_spent_eth DECIMAL(20,8) DEFAULT 0,
    total_gas_spent_usd DECIMAL(20,2) DEFAULT 0,
    
    -- Classifications
    wallet_type VARCHAR(20) DEFAULT 'small', -- whale, premium, regular, small
    activity_pattern VARCHAR(20) DEFAULT 'one_time', -- power_user, regular, occasional, one_time
    preferred_categories TEXT, -- JSON array of most interacted categories
    loyalty_score INTEGER DEFAULT 0
);

-- ============================================================================
-- 3. PROJECT METRICS DAILY HISTORICAL TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_metrics_daily (
    id SERIAL PRIMARY KEY,
    contract_address VARCHAR(66) NOT NULL,
    chain_id BIGINT NOT NULL,
    date DATE NOT NULL,
    
    -- Daily snapshots of key metrics
    daily_customers INTEGER DEFAULT 0,
    daily_transactions INTEGER DEFAULT 0,
    daily_successful_transactions INTEGER DEFAULT 0,
    daily_failed_transactions INTEGER DEFAULT 0,
    daily_volume_eth DECIMAL(20,8) DEFAULT 0,
    daily_volume_usd DECIMAL(20,2) DEFAULT 0,
    daily_fees_eth DECIMAL(20,8) DEFAULT 0,
    daily_fees_usd DECIMAL(20,2) DEFAULT 0,
    
    -- Growth calculations (compared to previous period)
    customer_growth_rate DECIMAL(10,4) DEFAULT 0,
    transaction_growth_rate DECIMAL(10,4) DEFAULT 0,
    volume_growth_rate DECIMAL(10,4) DEFAULT 0,
    
    -- Daily composite scores
    daily_growth_score INTEGER DEFAULT 50,
    daily_health_score INTEGER DEFAULT 50,
    daily_risk_score INTEGER DEFAULT 50,
    
    UNIQUE(contract_address, chain_id, date)
);

-- ============================================================================
-- 4. CHAIN METRICS DAILY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS chain_metrics_daily (
    id SERIAL PRIMARY KEY,
    chain_id BIGINT NOT NULL,
    date DATE NOT NULL,
    
    -- Chain-level daily metrics
    total_contracts INTEGER DEFAULT 0,
    active_contracts INTEGER DEFAULT 0,
    total_wallets INTEGER DEFAULT 0,
    active_wallets INTEGER DEFAULT 0,
    daily_transactions INTEGER DEFAULT 0,
    daily_successful_transactions INTEGER DEFAULT 0,
    daily_failed_transactions INTEGER DEFAULT 0,
    daily_volume_eth DECIMAL(20,8) DEFAULT 0,
    daily_volume_usd DECIMAL(20,2) DEFAULT 0,
    daily_fees_eth DECIMAL(20,8) DEFAULT 0,
    daily_fees_usd DECIMAL(20,2) DEFAULT 0,
    
    -- Network performance
    avg_block_time DECIMAL(10,2) DEFAULT 0,
    network_utilization DECIMAL(5,2) DEFAULT 0,
    total_value_locked_eth DECIMAL(20,8) DEFAULT 0,
    total_value_locked_usd DECIMAL(20,2) DEFAULT 0,
    
    UNIQUE(chain_id, date)
);

-- ============================================================================
-- 5. CATEGORY METRICS REAL-TIME TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS category_metrics_realtime (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL,
    chain_id BIGINT NOT NULL,
    last_updated TIMESTAMP DEFAULT NOW(),
    
    -- Category aggregations
    total_contracts INTEGER DEFAULT 0,
    active_contracts INTEGER DEFAULT 0,
    total_customers INTEGER DEFAULT 0,
    active_customers INTEGER DEFAULT 0,
    total_transactions INTEGER DEFAULT 0,
    successful_transactions INTEGER DEFAULT 0,
    failed_transactions INTEGER DEFAULT 0,
    total_volume_eth DECIMAL(20,8) DEFAULT 0,
    total_volume_usd DECIMAL(20,2) DEFAULT 0,
    avg_success_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Market share metrics
    market_share_volume DECIMAL(5,4) DEFAULT 0,
    market_share_customers DECIMAL(5,4) DEFAULT 0,
    market_share_transactions DECIMAL(5,4) DEFAULT 0,
    category_dominance_index DECIMAL(5,2) DEFAULT 0,
    
    -- Category composite scores
    category_growth_score INTEGER DEFAULT 50,
    category_health_score INTEGER DEFAULT 50,
    
    UNIQUE(category_name, chain_id)
);

-- ============================================================================
-- 6. MISSING TABLES FOR API COMPATIBILITY
-- ============================================================================

-- Business Intelligence Contract Index (for existing API compatibility)
CREATE TABLE IF NOT EXISTS bi_contract_index (
    id SERIAL PRIMARY KEY,
    contract_address VARCHAR(66) UNIQUE NOT NULL,
    chain_id BIGINT NOT NULL,
    contract_name VARCHAR(255),
    category VARCHAR(100),
    subcategory VARCHAR(100),
    description TEXT,
    website_url VARCHAR(500),
    twitter_url VARCHAR(500),
    github_url VARCHAR(500),
    logo_url VARCHAR(500),
    is_verified BOOLEAN DEFAULT FALSE,
    deployment_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Contract Categories Reference Table
CREATE TABLE IF NOT EXISTS bi_contract_categories (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL,
    parent_category VARCHAR(100),
    description TEXT,
    icon_name VARCHAR(50),
    color_hex VARCHAR(7),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Multi-Chain Transaction Details (normalized across chains)
CREATE TABLE IF NOT EXISTS mc_transaction_details (
    id SERIAL PRIMARY KEY,
    transaction_hash VARCHAR(66) NOT NULL,
    chain_id BIGINT NOT NULL,
    block_number BIGINT,
    block_timestamp TIMESTAMP,
    from_address VARCHAR(66),
    to_address VARCHAR(66),
    contract_address VARCHAR(66),
    transaction_value DECIMAL(30,18) DEFAULT 0,
    transaction_value_usd DECIMAL(20,2) DEFAULT 0,
    gas_used BIGINT DEFAULT 0,
    gas_price DECIMAL(30,18) DEFAULT 0,
    gas_fee_eth DECIMAL(20,8) DEFAULT 0,
    gas_fee_usd DECIMAL(20,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending', -- success, failed, pending
    function_name VARCHAR(100),
    input_data TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(transaction_hash, chain_id)
);

-- Multi-Chain Configuration
CREATE TABLE IF NOT EXISTS mc_chains (
    chain_id BIGINT PRIMARY KEY,
    chain_name VARCHAR(50) NOT NULL,
    network_name VARCHAR(50),
    rpc_url VARCHAR(500),
    explorer_url VARCHAR(500),
    native_currency_symbol VARCHAR(10),
    native_currency_decimals INTEGER DEFAULT 18,
    is_testnet BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    block_time_seconds INTEGER DEFAULT 12,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 7. PERFORMANCE INDEXES
-- ============================================================================

-- Project metrics indexes
CREATE INDEX IF NOT EXISTS idx_project_metrics_contract ON project_metrics_realtime(contract_address);
CREATE INDEX IF NOT EXISTS idx_project_metrics_chain ON project_metrics_realtime(chain_id);
CREATE INDEX IF NOT EXISTS idx_project_metrics_growth_score ON project_metrics_realtime(growth_score DESC);
CREATE INDEX IF NOT EXISTS idx_project_metrics_health_score ON project_metrics_realtime(health_score DESC);
CREATE INDEX IF NOT EXISTS idx_project_metrics_customers ON project_metrics_realtime(total_customers DESC);

-- Wallet metrics indexes
CREATE INDEX IF NOT EXISTS idx_wallet_metrics_wallet ON wallet_metrics_realtime(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_metrics_chain ON wallet_metrics_realtime(chain_id);
CREATE INDEX IF NOT EXISTS idx_wallet_metrics_type ON wallet_metrics_realtime(wallet_type);
CREATE INDEX IF NOT EXISTS idx_wallet_metrics_activity ON wallet_metrics_realtime(activity_pattern);

-- Daily metrics indexes
CREATE INDEX IF NOT EXISTS idx_project_daily_contract_date ON project_metrics_daily(contract_address, date DESC);
CREATE INDEX IF NOT EXISTS idx_project_daily_chain_date ON project_metrics_daily(chain_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_chain_daily_chain_date ON chain_metrics_daily(chain_id, date DESC);

-- Category metrics indexes
CREATE INDEX IF NOT EXISTS idx_category_metrics_category_chain ON category_metrics_realtime(category_name, chain_id);
CREATE INDEX IF NOT EXISTS idx_category_metrics_chain ON category_metrics_realtime(chain_id);

-- Business intelligence indexes
CREATE INDEX IF NOT EXISTS idx_bi_contract_address ON bi_contract_index(contract_address);
CREATE INDEX IF NOT EXISTS idx_bi_contract_chain ON bi_contract_index(chain_id);
CREATE INDEX IF NOT EXISTS idx_bi_contract_category ON bi_contract_index(category);
CREATE INDEX IF NOT EXISTS idx_bi_contract_verified ON bi_contract_index(is_verified);

-- Transaction details indexes
CREATE INDEX IF NOT EXISTS idx_mc_transaction_hash_chain ON mc_transaction_details(transaction_hash, chain_id);
CREATE INDEX IF NOT EXISTS idx_mc_transaction_contract ON mc_transaction_details(contract_address);
CREATE INDEX IF NOT EXISTS idx_mc_transaction_from ON mc_transaction_details(from_address);
CREATE INDEX IF NOT EXISTS idx_mc_transaction_timestamp ON mc_transaction_details(block_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mc_transaction_status ON mc_transaction_details(status);

-- ============================================================================
-- 8. INSERT DEFAULT DATA
-- ============================================================================

-- Insert default chain configurations
INSERT INTO mc_chains (chain_id, chain_name, network_name, native_currency_symbol, is_active) VALUES
(1, 'Ethereum', 'mainnet', 'ETH', true),
(4202, 'Lisk', 'sepolia', 'ETH', true),
(23448594291968334, 'Starknet', 'mainnet', 'ETH', true)
ON CONFLICT (chain_id) DO NOTHING;

-- Insert default contract categories
INSERT INTO bi_contract_categories (category_name, description, sort_order) VALUES
('DeFi', 'Decentralized Finance protocols and applications', 1),
('NFT', 'Non-Fungible Token marketplaces and collections', 2),
('Gaming', 'Blockchain gaming and metaverse applications', 3),
('Infrastructure', 'Blockchain infrastructure and tooling', 4),
('Social', 'Social networks and communication platforms', 5),
('Identity', 'Identity and authentication services', 6),
('Storage', 'Decentralized storage solutions', 7),
('Oracle', 'Data oracle and price feed services', 8),
('Bridge', 'Cross-chain bridges and interoperability', 9),
('DAO', 'Decentralized Autonomous Organizations', 10),
('Other', 'Miscellaneous and uncategorized contracts', 99)
ON CONFLICT (category_name) DO NOTHING;

-- ============================================================================
-- 9. TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Function to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_project_metrics_realtime_last_updated 
    BEFORE UPDATE ON project_metrics_realtime 
    FOR EACH ROW EXECUTE FUNCTION update_last_updated_column();

CREATE TRIGGER update_wallet_metrics_realtime_last_updated 
    BEFORE UPDATE ON wallet_metrics_realtime 
    FOR EACH ROW EXECUTE FUNCTION update_last_updated_column();

CREATE TRIGGER update_category_metrics_realtime_last_updated 
    BEFORE UPDATE ON category_metrics_realtime 
    FOR EACH ROW EXECUTE FUNCTION update_last_updated_column();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'MetaGauge Metrics Database Schema Migration Completed Successfully';
    RAISE NOTICE 'Created tables: project_metrics_realtime, wallet_metrics_realtime, project_metrics_daily, chain_metrics_daily, category_metrics_realtime';
    RAISE NOTICE 'Created tables: bi_contract_index, bi_contract_categories, mc_transaction_details, mc_chains';
    RAISE NOTICE 'Created indexes for performance optimization';
    RAISE NOTICE 'Created triggers for automatic timestamp updates';
END $$;