-- =============================================================================
-- PHASE 1: FIXED MISSING TABLES WITH PROPER POSTGRESQL SYNTAX
-- =============================================================================

-- Lisk function signatures
CREATE TABLE IF NOT EXISTS lisk_function_signatures (
    signature_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL DEFAULT 1,
    contract_address VARCHAR(66) NOT NULL,
    function_selector VARCHAR(10) NOT NULL,
    function_name VARCHAR(100) NOT NULL,
    function_signature TEXT NOT NULL,
    input_types TEXT[],
    output_types TEXT[],
    is_payable BOOLEAN DEFAULT false,
    is_view BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lisk_func_sig_selector ON lisk_function_signatures(function_selector);
CREATE INDEX IF NOT EXISTS idx_lisk_func_sig_contract ON lisk_function_signatures(contract_address);

-- Lisk events
CREATE TABLE IF NOT EXISTS lisk_events (
    event_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL DEFAULT 1,
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    log_index INTEGER NOT NULL,
    contract_address VARCHAR(66) NOT NULL,
    topic0 VARCHAR(66),
    topic1 VARCHAR(66),
    topic2 VARCHAR(66),
    topic3 VARCHAR(66),
    data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lisk_events_tx ON lisk_events(tx_hash);
CREATE INDEX IF NOT EXISTS idx_lisk_events_contract ON lisk_events(contract_address);
CREATE INDEX IF NOT EXISTS idx_lisk_events_block ON lisk_events(block_number);

-- Lisk tokens
CREATE TABLE IF NOT EXISTS lisk_tokens (
    token_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL DEFAULT 1,
    token_address VARCHAR(66) UNIQUE NOT NULL,
    name VARCHAR(100),
    symbol VARCHAR(20),
    decimals INTEGER DEFAULT 18,
    total_supply NUMERIC(78,0),
    token_type VARCHAR(20) NOT NULL DEFAULT 'ERC20',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lisk_tokens_address ON lisk_tokens(token_address);
CREATE INDEX IF NOT EXISTS idx_lisk_tokens_symbol ON lisk_tokens(symbol);

-- Lisk token transfers
CREATE TABLE IF NOT EXISTS lisk_token_transfers (
    transfer_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL DEFAULT 1,
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    log_index INTEGER NOT NULL,
    token_address VARCHAR(66) NOT NULL,
    from_address VARCHAR(66),
    to_address VARCHAR(66),
    amount NUMERIC(78,0) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lisk_transfers_tx ON lisk_token_transfers(tx_hash);
CREATE INDEX IF NOT EXISTS idx_lisk_transfers_token ON lisk_token_transfers(token_address);
CREATE INDEX IF NOT EXISTS idx_lisk_transfers_from ON lisk_token_transfers(from_address);
CREATE INDEX IF NOT EXISTS idx_lisk_transfers_to ON lisk_token_transfers(to_address);

-- Starknet function signatures
CREATE TABLE IF NOT EXISTS starknet_function_signatures (
    signature_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL DEFAULT 2,
    contract_address VARCHAR(66) NOT NULL,
    function_selector VARCHAR(10) NOT NULL,
    function_name VARCHAR(100) NOT NULL,
    function_signature TEXT NOT NULL,
    input_types TEXT[],
    output_types TEXT[],
    is_payable BOOLEAN DEFAULT false,
    is_view BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_starknet_func_sig_selector ON starknet_function_signatures(function_selector);
CREATE INDEX IF NOT EXISTS idx_starknet_func_sig_contract ON starknet_function_signatures(contract_address);

-- Starknet tokens
CREATE TABLE IF NOT EXISTS starknet_tokens (
    token_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL DEFAULT 2,
    token_address VARCHAR(66) UNIQUE NOT NULL,
    name VARCHAR(100),
    symbol VARCHAR(20),
    decimals INTEGER DEFAULT 18,
    total_supply NUMERIC(78,0),
    token_type VARCHAR(20) NOT NULL DEFAULT 'ERC20',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_starknet_tokens_address ON starknet_tokens(token_address);
CREATE INDEX IF NOT EXISTS idx_starknet_tokens_symbol ON starknet_tokens(symbol);

-- Starknet token transfers
CREATE TABLE IF NOT EXISTS starknet_token_transfers (
    transfer_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL DEFAULT 2,
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    log_index INTEGER NOT NULL,
    token_address VARCHAR(66) NOT NULL,
    from_address VARCHAR(66),
    to_address VARCHAR(66),
    amount NUMERIC(78,0) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_starknet_transfers_tx ON starknet_token_transfers(tx_hash);
CREATE INDEX IF NOT EXISTS idx_starknet_transfers_token ON starknet_token_transfers(token_address);
CREATE INDEX IF NOT EXISTS idx_starknet_transfers_from ON starknet_token_transfers(from_address);
CREATE INDEX IF NOT EXISTS idx_starknet_transfers_to ON starknet_token_transfers(to_address);
