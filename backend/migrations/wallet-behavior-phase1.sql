-- =============================================================================
-- WALLET BEHAVIOR ANALYTICS - IMPLEMENTATION PHASE 1
-- Start with Core Behavioral Tables and Basic Calculations
-- =============================================================================

-- 1. WALLET BEHAVIOR PROFILES TABLE
CREATE TABLE lisk_wallet_behavior_profiles (
    wallet_address VARCHAR(66) PRIMARY KEY,
    
    -- ACTIVITY METRICS
    total_transactions INTEGER DEFAULT 0,
    active_days INTEGER DEFAULT 0,
    dau_streak INTEGER DEFAULT 0,
    avg_daily_transactions DECIMAL(10,2) DEFAULT 0,
    max_daily_transactions INTEGER DEFAULT 0,
    first_activity_date DATE,
    last_activity_date DATE,
    dormancy_periods INTEGER DEFAULT 0,
    
    -- SPENDING METRICS
    total_volume_eth DECIMAL(30,18) DEFAULT 0,
    avg_transaction_value DECIMAL(30,18) DEFAULT 0,
    median_transaction_value DECIMAL(30,18) DEFAULT 0,
    largest_transaction DECIMAL(30,18) DEFAULT 0,
    smallest_transaction DECIMAL(30,18) DEFAULT 0,
    spending_consistency DECIMAL(5,2) DEFAULT 0, -- coefficient of variation
    
    -- INTERACTION METRICS
    unique_contracts_used INTEGER DEFAULT 0,
    unique_functions_called INTEGER DEFAULT 0,
    contract_loyalty_score DECIMAL(3,2) DEFAULT 0, -- 0-1 scale
    protocol_diversity_score DECIMAL(3,2) DEFAULT 0,
    
    -- TEMPORAL METRICS
    peak_activity_hour INTEGER, -- 0-23
    weekend_activity_ratio DECIMAL(3,2) DEFAULT 0, -- weekend vs weekday
    night_owl_score DECIMAL(3,2) DEFAULT 0, -- late night activity
    
    -- BEHAVIORAL FLAGS
    is_whale BOOLEAN DEFAULT FALSE,
    is_day_trader BOOLEAN DEFAULT FALSE,
    is_hodler BOOLEAN DEFAULT FALSE,
    is_yield_farmer BOOLEAN DEFAULT FALSE,
    is_arbitrageur BOOLEAN DEFAULT FALSE,
    is_bot BOOLEAN DEFAULT FALSE,
    
    -- RISK METRICS
    risk_score DECIMAL(3,2) DEFAULT 0.5, -- 0 = conservative, 1 = high risk
    failed_transaction_ratio DECIMAL(3,2) DEFAULT 0,
    gas_efficiency_score DECIMAL(3,2) DEFAULT 0,
    
    last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. DAILY BEHAVIOR SNAPSHOTS
CREATE TABLE lisk_wallet_daily_behavior (
    wallet_address VARCHAR(66),
    date DATE,
    
    -- Daily Activity
    transaction_count INTEGER DEFAULT 0,
    unique_contracts INTEGER DEFAULT 0,
    unique_functions INTEGER DEFAULT 0,
    total_volume_eth DECIMAL(30,18) DEFAULT 0,
    total_gas_used BIGINT DEFAULT 0,
    
    -- Daily Timing
    first_tx_hour INTEGER,
    last_tx_hour INTEGER,
    active_hours INTEGER DEFAULT 0,
    
    -- Daily Behavior Classification
    behavior_type VARCHAR(50), -- 'NORMAL', 'HIGH_ACTIVITY', 'WHALE_DAY', 'EXPERIMENTAL'
    activity_score DECIMAL(3,2) DEFAULT 0,
    
    -- Daily Flags
    is_weekend BOOLEAN DEFAULT FALSE,
    is_holiday BOOLEAN DEFAULT FALSE,
    has_large_transaction BOOLEAN DEFAULT FALSE,
    has_failed_transactions BOOLEAN DEFAULT FALSE,
    
    PRIMARY KEY (wallet_address, date),
    FOREIGN KEY (wallet_address) REFERENCES lisk_wallets(address)
);

-- 3. TRANSACTION BEHAVIOR CLASSIFICATION
CREATE TABLE lisk_transaction_behavior (
    tx_hash VARCHAR(66) PRIMARY KEY,
    wallet_address VARCHAR(66),
    
    -- Behavioral Classification
    primary_behavior VARCHAR(50), -- 'TRANSFER', 'SWAP', 'STAKE', 'ARBITRAGE', etc.
    secondary_behavior VARCHAR(50), -- Additional context
    confidence_score DECIMAL(3,2) DEFAULT 0,
    
    -- Transaction Context
    is_first_interaction BOOLEAN DEFAULT FALSE, -- First time using this contract
    is_large_transaction BOOLEAN DEFAULT FALSE, -- Above wallet's normal size
    is_small_transaction BOOLEAN DEFAULT FALSE, -- Below wallet's normal size
    is_rush_hour BOOLEAN DEFAULT FALSE, -- During high network activity
    is_weekend_tx BOOLEAN DEFAULT FALSE,
    
    -- Behavioral Indicators
    appears_automated BOOLEAN DEFAULT FALSE,
    appears_manual BOOLEAN DEFAULT FALSE,
    appears_reactive BOOLEAN DEFAULT FALSE, -- Response to market event
    appears_planned BOOLEAN DEFAULT FALSE, -- Part of regular pattern
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tx_hash) REFERENCES lisk_transactions(tx_hash),
    FOREIGN KEY (wallet_address) REFERENCES lisk_wallets(address)
);

-- 4. BEHAVIORAL EVENTS AND MILESTONES
CREATE TABLE lisk_behavior_events (
    event_id BIGSERIAL PRIMARY KEY,
    wallet_address VARCHAR(66),
    
    event_type VARCHAR(50), -- 'FIRST_TX', 'WHALE_UPGRADE', 'DORMANCY_START', 'REACTIVATION'
    event_date DATE,
    event_description TEXT,
    
    -- Event Context
    trigger_transaction VARCHAR(66), -- Transaction that triggered the event
    previous_value DECIMAL(30,18), -- Previous state value
    new_value DECIMAL(30,18), -- New state value
    
    -- Impact Assessment
    significance_score DECIMAL(3,2) DEFAULT 0, -- How significant this event is
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wallet_address) REFERENCES lisk_wallets(address)
);

-- 5. INDEXES FOR PERFORMANCE
CREATE INDEX idx_behavior_profiles_whale ON lisk_wallet_behavior_profiles(is_whale);
CREATE INDEX idx_behavior_profiles_risk ON lisk_wallet_behavior_profiles(risk_score);
CREATE INDEX idx_behavior_profiles_activity ON lisk_wallet_behavior_profiles(last_activity_date);

CREATE INDEX idx_daily_behavior_date ON lisk_wallet_daily_behavior(date);
CREATE INDEX idx_daily_behavior_type ON lisk_wallet_daily_behavior(behavior_type);
CREATE INDEX idx_daily_behavior_score ON lisk_wallet_daily_behavior(activity_score);

CREATE INDEX idx_tx_behavior_primary ON lisk_transaction_behavior(primary_behavior);
CREATE INDEX idx_tx_behavior_automated ON lisk_transaction_behavior(appears_automated);

CREATE INDEX idx_behavior_events_type ON lisk_behavior_events(event_type);
CREATE INDEX idx_behavior_events_date ON lisk_behavior_events(event_date);

-- =============================================================================
-- INITIAL DATA POPULATION - CALCULATE BASIC BEHAVIORS FROM EXISTING DATA
-- =============================================================================

-- Populate basic wallet behavior profiles
INSERT INTO lisk_wallet_behavior_profiles (
    wallet_address,
    total_transactions,
    active_days,
    first_activity_date,
    last_activity_date,
    total_volume_eth,
    avg_transaction_value,
    unique_contracts_used
)
SELECT 
    w.address,
    COUNT(DISTINCT t.tx_hash) as total_transactions,
    COUNT(DISTINCT DATE(t.created_at)) as active_days,
    MIN(DATE(t.created_at)) as first_activity_date,
    MAX(DATE(t.created_at)) as last_activity_date,
    COALESCE(SUM(t.value), 0) as total_volume_eth,
    COALESCE(AVG(t.value), 0) as avg_transaction_value,
    COUNT(DISTINCT wi.contract_address) as unique_contracts_used
FROM lisk_wallets w
LEFT JOIN lisk_transactions t ON w.address = t.from_address
LEFT JOIN lisk_wallet_interactions wi ON w.address = wi.wallet_address
GROUP BY w.address
ON CONFLICT (wallet_address) DO UPDATE SET
    total_transactions = EXCLUDED.total_transactions,
    active_days = EXCLUDED.active_days,
    last_activity_date = EXCLUDED.last_activity_date,
    total_volume_eth = EXCLUDED.total_volume_eth,
    avg_transaction_value = EXCLUDED.avg_transaction_value,
    unique_contracts_used = EXCLUDED.unique_contracts_used,
    last_calculated = CURRENT_TIMESTAMP;

-- Populate daily behavior snapshots
INSERT INTO lisk_wallet_daily_behavior (
    wallet_address,
    date,
    transaction_count,
    unique_contracts,
    total_volume_eth,
    first_tx_hour,
    last_tx_hour,
    is_weekend
)
SELECT 
    t.from_address,
    DATE(t.created_at) as date,
    COUNT(*) as transaction_count,
    COUNT(DISTINCT wi.contract_address) as unique_contracts,
    COALESCE(SUM(t.value), 0) as total_volume_eth,
    MIN(EXTRACT(HOUR FROM t.created_at))::INTEGER as first_tx_hour,
    MAX(EXTRACT(HOUR FROM t.created_at))::INTEGER as last_tx_hour,
    EXTRACT(DOW FROM t.created_at) IN (0, 6) as is_weekend
FROM lisk_transactions t
LEFT JOIN lisk_wallet_interactions wi ON t.tx_hash = wi.tx_hash
WHERE t.from_address IS NOT NULL
GROUP BY t.from_address, DATE(t.created_at)
ON CONFLICT (wallet_address, date) DO UPDATE SET
    transaction_count = EXCLUDED.transaction_count,
    unique_contracts = EXCLUDED.unique_contracts,
    total_volume_eth = EXCLUDED.total_volume_eth,
    first_tx_hour = EXCLUDED.first_tx_hour,
    last_tx_hour = EXCLUDED.last_tx_hour;

-- Update behavioral flags based on calculated data
UPDATE lisk_wallet_behavior_profiles SET
    is_whale = (total_volume_eth > 100), -- More than 100 ETH total volume
    is_day_trader = (avg_daily_transactions > 10 AND active_days > 7),
    is_hodler = (total_transactions < 10 AND active_days < 5),
    is_yield_farmer = (unique_contracts_used > 5),
    risk_score = LEAST(1.0, unique_contracts_used::DECIMAL / 10.0), -- More contracts = higher risk
    gas_efficiency_score = 0.5; -- Placeholder, will calculate from gas data

-- Create behavioral events for significant milestones
INSERT INTO lisk_behavior_events (wallet_address, event_type, event_date, event_description, significance_score)
SELECT 
    wallet_address,
    'FIRST_TRANSACTION',
    first_activity_date,
    'Wallet made first transaction',
    0.8
FROM lisk_wallet_behavior_profiles
WHERE first_activity_date IS NOT NULL;

-- Add whale upgrade events
INSERT INTO lisk_behavior_events (wallet_address, event_type, event_date, event_description, significance_score)
SELECT 
    wallet_address,
    'WHALE_UPGRADE',
    last_activity_date,
    'Wallet reached whale status',
    0.9
FROM lisk_wallet_behavior_profiles
WHERE is_whale = TRUE AND total_volume_eth > 100;
