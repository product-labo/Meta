-- Advanced Multi-Chain Indexer Features
-- Migration 002: Transaction Details, Decoded Data, and DeFi Analytics

-- Enhanced transaction details with full decoding
CREATE TABLE IF NOT EXISTS mc_transaction_details (
    id BIGSERIAL PRIMARY KEY,
    cycle_id INTEGER REFERENCES mc_rotation_cycles(id) ON DELETE CASCADE,
    chain_id INTEGER REFERENCES mc_chains(id),
    tx_hash VARCHAR(66) NOT NULL UNIQUE,
    block_number BIGINT,
    tx_index INTEGER,
    from_address VARCHAR(66),
    to_address VARCHAR(66),
    value NUMERIC,
    gas_price NUMERIC,
    gas_limit BIGINT,
    gas_used BIGINT,
    status INTEGER, -- 1 = success, 0 = failed
    nonce BIGINT,
    input_data TEXT,
    function_selector VARCHAR(10), -- First 4 bytes
    function_name VARCHAR(255),
    decoded_input JSONB,
    error_reason TEXT, -- For failed transactions
    internal_calls JSONB, -- Array of internal contract calls
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Decoded event logs with human-readable data
CREATE TABLE IF NOT EXISTS mc_decoded_events (
    id BIGSERIAL PRIMARY KEY,
    cycle_id INTEGER REFERENCES mc_rotation_cycles(id) ON DELETE CASCADE,
    registry_id INTEGER REFERENCES mc_registry(id),
    tx_hash VARCHAR(66),
    block_number BIGINT,
    log_index INTEGER,
    event_name VARCHAR(255),
    event_signature VARCHAR(66), -- topic0
    decoded_data JSONB, -- Structured event parameters
    raw_topics JSONB,
    raw_data TEXT,
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Token transfers with decoded amounts and metadata
CREATE TABLE IF NOT EXISTS mc_token_transfers (
    id BIGSERIAL PRIMARY KEY,
    cycle_id INTEGER REFERENCES mc_rotation_cycles(id) ON DELETE CASCADE,
    chain_id INTEGER REFERENCES mc_chains(id),
    tx_hash VARCHAR(66),
    block_number BIGINT,
    log_index INTEGER,
    token_address VARCHAR(66),
    token_name VARCHAR(100),
    token_symbol VARCHAR(20),
    token_decimals INTEGER,
    from_address VARCHAR(66),
    to_address VARCHAR(66),
    amount_raw NUMERIC, -- Raw amount from event
    amount_formatted DECIMAL(36,18), -- Human-readable amount
    usd_value DECIMAL(18,2), -- USD value at time of transfer
    transfer_type VARCHAR(20), -- 'transfer', 'mint', 'burn'
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- DeFi protocol interactions
CREATE TABLE IF NOT EXISTS mc_defi_interactions (
    id BIGSERIAL PRIMARY KEY,
    cycle_id INTEGER REFERENCES mc_rotation_cycles(id) ON DELETE CASCADE,
    chain_id INTEGER REFERENCES mc_chains(id),
    tx_hash VARCHAR(66),
    block_number BIGINT,
    protocol_name VARCHAR(100), -- 'uniswap', 'compound', 'aave', etc.
    interaction_type VARCHAR(50), -- 'swap', 'lend', 'borrow', 'stake', etc.
    user_address VARCHAR(66),
    contract_address VARCHAR(66),
    token_in_address VARCHAR(66),
    token_in_amount DECIMAL(36,18),
    token_out_address VARCHAR(66),
    token_out_amount DECIMAL(36,18),
    price_impact DECIMAL(10,6), -- For swaps
    fee_amount DECIMAL(36,18),
    metadata JSONB, -- Protocol-specific data
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Address analytics and labels
CREATE TABLE IF NOT EXISTS mc_address_analytics (
    id BIGSERIAL PRIMARY KEY,
    cycle_id INTEGER REFERENCES mc_rotation_cycles(id) ON DELETE CASCADE,
    chain_id INTEGER REFERENCES mc_chains(id),
    address VARCHAR(66),
    address_type VARCHAR(50), -- 'eoa', 'contract', 'token', 'defi', 'exchange'
    label VARCHAR(255), -- Human-readable name
    is_verified BOOLEAN DEFAULT false,
    transaction_count BIGINT,
    total_value_in DECIMAL(36,18),
    total_value_out DECIMAL(36,18),
    first_seen_block BIGINT,
    last_activity_block BIGINT,
    risk_score INTEGER, -- 0-100 risk assessment
    tags JSONB, -- Array of tags like ['dex', 'high-volume', 'whale']
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(cycle_id, chain_id, address)
);

-- NFT transfers and metadata
CREATE TABLE IF NOT EXISTS mc_nft_transfers (
    id BIGSERIAL PRIMARY KEY,
    cycle_id INTEGER REFERENCES mc_rotation_cycles(id) ON DELETE CASCADE,
    chain_id INTEGER REFERENCES mc_chains(id),
    tx_hash VARCHAR(66),
    block_number BIGINT,
    log_index INTEGER,
    contract_address VARCHAR(66),
    token_id NUMERIC,
    from_address VARCHAR(66),
    to_address VARCHAR(66),
    transfer_type VARCHAR(20), -- 'transfer', 'mint', 'burn'
    collection_name VARCHAR(255),
    token_name VARCHAR(255),
    token_uri TEXT,
    metadata JSONB,
    estimated_value DECIMAL(18,2), -- USD estimate
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Price data for tokens
CREATE TABLE IF NOT EXISTS mc_token_prices (
    id BIGSERIAL PRIMARY KEY,
    cycle_id INTEGER REFERENCES mc_rotation_cycles(id) ON DELETE CASCADE,
    chain_id INTEGER REFERENCES mc_chains(id),
    token_address VARCHAR(66),
    token_symbol VARCHAR(20),
    price_usd DECIMAL(18,8),
    price_source VARCHAR(50), -- 'coingecko', 'dex', 'oracle'
    market_cap DECIMAL(20,2),
    volume_24h DECIMAL(20,2),
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(cycle_id, chain_id, token_address)
);

-- Function signature database for decoding
CREATE TABLE IF NOT EXISTS mc_function_signatures (
    id SERIAL PRIMARY KEY,
    selector VARCHAR(10) UNIQUE, -- 4-byte function selector
    signature TEXT, -- Full function signature
    function_name VARCHAR(255),
    inputs JSONB, -- Array of input parameter types
    source VARCHAR(50), -- 'manual', '4byte', 'etherscan'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event signature database for decoding
CREATE TABLE IF NOT EXISTS mc_event_signatures (
    id SERIAL PRIMARY KEY,
    topic0 VARCHAR(66) UNIQUE, -- Event signature hash
    signature TEXT, -- Full event signature
    event_name VARCHAR(255),
    inputs JSONB, -- Array of input parameter types
    source VARCHAR(50), -- 'manual', 'abi', 'etherscan'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_mc_transaction_details_hash ON mc_transaction_details(tx_hash);
CREATE INDEX idx_mc_transaction_details_block ON mc_transaction_details(block_number);
CREATE INDEX idx_mc_transaction_details_from ON mc_transaction_details(from_address);
CREATE INDEX idx_mc_transaction_details_to ON mc_transaction_details(to_address);
CREATE INDEX idx_mc_transaction_details_function ON mc_transaction_details(function_name);

CREATE INDEX idx_mc_decoded_events_name ON mc_decoded_events(event_name);
CREATE INDEX idx_mc_decoded_events_tx ON mc_decoded_events(tx_hash);
CREATE INDEX idx_mc_decoded_events_block ON mc_decoded_events(block_number);

CREATE INDEX idx_mc_token_transfers_token ON mc_token_transfers(token_address);
CREATE INDEX idx_mc_token_transfers_from ON mc_token_transfers(from_address);
CREATE INDEX idx_mc_token_transfers_to ON mc_token_transfers(to_address);
CREATE INDEX idx_mc_token_transfers_amount ON mc_token_transfers(amount_formatted);

CREATE INDEX idx_mc_defi_interactions_protocol ON mc_defi_interactions(protocol_name);
CREATE INDEX idx_mc_defi_interactions_type ON mc_defi_interactions(interaction_type);
CREATE INDEX idx_mc_defi_interactions_user ON mc_defi_interactions(user_address);

CREATE INDEX idx_mc_address_analytics_type ON mc_address_analytics(address_type);
CREATE INDEX idx_mc_address_analytics_risk ON mc_address_analytics(risk_score);

CREATE INDEX idx_mc_nft_transfers_contract ON mc_nft_transfers(contract_address);
CREATE INDEX idx_mc_nft_transfers_token_id ON mc_nft_transfers(token_id);

CREATE INDEX idx_mc_function_signatures_selector ON mc_function_signatures(selector);
CREATE INDEX idx_mc_event_signatures_topic0 ON mc_event_signatures(topic0);