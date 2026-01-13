-- =============================================================================
-- PHASE 1: IMPLEMENT MISSING CORE TABLES FOR PROPER DATA COLLECTION
-- =============================================================================

-- Global chain registry (missing)
CREATE TABLE IF NOT EXISTS chains (
    chain_id SERIAL PRIMARY KEY,
    chain_name VARCHAR(50) UNIQUE NOT NULL,
    chain_type VARCHAR(20) NOT NULL,
    native_token VARCHAR(10) NOT NULL,
    rpc_endpoint VARCHAR(255),
    explorer_url VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert our current chains
INSERT INTO chains (chain_name, chain_type, native_token, rpc_endpoint, status) VALUES
('lisk', 'L2', 'LSK', 'https://rpc.api.lisk.com', 'active'),
('starknet', 'L2', 'STRK', 'https://rpc.starknet.lava.build', 'active')
ON CONFLICT (chain_name) DO NOTHING;

-- =============================================================================
-- LISK MISSING TABLES
-- =============================================================================

-- Lisk function signatures (critical for analytics)
CREATE TABLE IF NOT EXISTS lisk_function_signatures (
    signature_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chains(chain_id),
    contract_address VARCHAR(66) NOT NULL,
    function_selector VARCHAR(10) NOT NULL,
    function_name VARCHAR(100) NOT NULL,
    function_signature TEXT NOT NULL,
    input_types TEXT[],
    output_types TEXT[],
    is_payable BOOLEAN DEFAULT false,
    is_view BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_lisk_func_sig_selector (function_selector),
    INDEX idx_lisk_func_sig_contract (contract_address)
);

-- Lisk events (missing from current setup)
CREATE TABLE IF NOT EXISTS lisk_events (
    event_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chains(chain_id),
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    log_index INTEGER NOT NULL,
    contract_address VARCHAR(66) NOT NULL,
    topic0 VARCHAR(66),
    topic1 VARCHAR(66),
    topic2 VARCHAR(66),
    topic3 VARCHAR(66),
    data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tx_hash) REFERENCES lisk_transactions(tx_hash),
    INDEX idx_lisk_events_tx (tx_hash),
    INDEX idx_lisk_events_contract (contract_address),
    INDEX idx_lisk_events_block (block_number)
);

-- Lisk tokens (for DeFi analytics)
CREATE TABLE IF NOT EXISTS lisk_tokens (
    token_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chains(chain_id),
    token_address VARCHAR(66) UNIQUE NOT NULL,
    name VARCHAR(100),
    symbol VARCHAR(20),
    decimals INTEGER DEFAULT 18,
    total_supply NUMERIC(78,0),
    token_type VARCHAR(20) NOT NULL DEFAULT 'ERC20',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_lisk_tokens_address (token_address),
    INDEX idx_lisk_tokens_symbol (symbol)
);

-- Lisk token transfers (critical for value flow analysis)
CREATE TABLE IF NOT EXISTS lisk_token_transfers (
    transfer_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chains(chain_id),
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    log_index INTEGER NOT NULL,
    token_address VARCHAR(66) NOT NULL,
    from_address VARCHAR(66),
    to_address VARCHAR(66),
    amount NUMERIC(78,0) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tx_hash) REFERENCES lisk_transactions(tx_hash),
    INDEX idx_lisk_transfers_tx (tx_hash),
    INDEX idx_lisk_transfers_token (token_address),
    INDEX idx_lisk_transfers_from (from_address),
    INDEX idx_lisk_transfers_to (to_address)
);

-- =============================================================================
-- STARKNET MISSING TABLES
-- =============================================================================

-- Starknet function signatures
CREATE TABLE IF NOT EXISTS starknet_function_signatures (
    signature_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chains(chain_id),
    contract_address VARCHAR(66) NOT NULL,
    function_selector VARCHAR(10) NOT NULL,
    function_name VARCHAR(100) NOT NULL,
    function_signature TEXT NOT NULL,
    input_types TEXT[],
    output_types TEXT[],
    is_payable BOOLEAN DEFAULT false,
    is_view BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_starknet_func_sig_selector (function_selector),
    INDEX idx_starknet_func_sig_contract (contract_address)
);

-- Starknet tokens
CREATE TABLE IF NOT EXISTS starknet_tokens (
    token_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chains(chain_id),
    token_address VARCHAR(66) UNIQUE NOT NULL,
    name VARCHAR(100),
    symbol VARCHAR(20),
    decimals INTEGER DEFAULT 18,
    total_supply NUMERIC(78,0),
    token_type VARCHAR(20) NOT NULL DEFAULT 'ERC20',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_starknet_tokens_address (token_address),
    INDEX idx_starknet_tokens_symbol (symbol)
);

-- Starknet token transfers
CREATE TABLE IF NOT EXISTS starknet_token_transfers (
    transfer_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chains(chain_id),
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    log_index INTEGER NOT NULL,
    token_address VARCHAR(66) NOT NULL,
    from_address VARCHAR(66),
    to_address VARCHAR(66),
    amount NUMERIC(78,0) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tx_hash) REFERENCES starknet_transactions(tx_hash),
    INDEX idx_starknet_transfers_tx (tx_hash),
    INDEX idx_starknet_transfers_token (token_address),
    INDEX idx_starknet_transfers_from (from_address),
    INDEX idx_starknet_transfers_to (to_address)
);

-- =============================================================================
-- ANALYTICS TABLES (Phase 1 - Essential)
-- =============================================================================

-- Daily metrics for both chains
CREATE TABLE IF NOT EXISTS lisk_daily_metrics (
    metric_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chains(chain_id),
    date DATE NOT NULL,
    total_transactions BIGINT DEFAULT 0,
    successful_transactions BIGINT DEFAULT 0,
    failed_transactions BIGINT DEFAULT 0,
    unique_addresses BIGINT DEFAULT 0,
    total_gas_used BIGINT DEFAULT 0,
    new_contracts BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(chain_id, date)
);

CREATE TABLE IF NOT EXISTS starknet_daily_metrics (
    metric_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chains(chain_id),
    date DATE NOT NULL,
    total_transactions BIGINT DEFAULT 0,
    successful_transactions BIGINT DEFAULT 0,
    failed_transactions BIGINT DEFAULT 0,
    unique_addresses BIGINT DEFAULT 0,
    total_gas_used BIGINT DEFAULT 0,
    new_contracts BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(chain_id, date)
);

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE chains IS 'Global registry of supported blockchain networks';
COMMENT ON TABLE lisk_function_signatures IS 'Lisk smart contract function definitions for analytics';
COMMENT ON TABLE lisk_events IS 'Lisk smart contract events for DeFi tracking';
COMMENT ON TABLE lisk_tokens IS 'Lisk token contracts for value flow analysis';
COMMENT ON TABLE starknet_function_signatures IS 'Starknet smart contract function definitions';
COMMENT ON TABLE starknet_tokens IS 'Starknet token contracts for value flow analysis';
