-- Migration: 023_add_mc_indexer_tables
-- Description: Adds missing tables required by ChainWorker and multi-chain-indexer services

CREATE TABLE IF NOT EXISTS mc_registry (
    id SERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL,
    address VARCHAR(42) NOT NULL,
    name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    abi JSONB,
    monitor_events BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_registry UNIQUE (chain_id, address)
);

CREATE TABLE IF NOT EXISTS mc_chain_snapshots (
    id SERIAL PRIMARY KEY,
    cycle_id INTEGER,
    chain_id INTEGER NOT NULL,
    block_number BIGINT NOT NULL,
    block_timestamp TIMESTAMP NOT NULL,
    gas_price VARCHAR(50),
    fee_history_json JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mc_entity_snapshots (
    id SERIAL PRIMARY KEY,
    cycle_id INTEGER,
    registry_id INTEGER REFERENCES mc_registry(id),
    balance VARCHAR(100),
    nonce BIGINT,
    is_contract BOOLEAN,
    code_hash VARCHAR(66),
    captured_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mc_event_logs (
    id SERIAL PRIMARY KEY,
    cycle_id INTEGER,
    registry_id INTEGER REFERENCES mc_registry(id),
    block_number BIGINT,
    tx_hash VARCHAR(66),
    topic0 VARCHAR(66),
    data TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mc_decoded_events (
    id SERIAL PRIMARY KEY,
    cycle_id INTEGER,
    registry_id INTEGER REFERENCES mc_registry(id),
    tx_hash VARCHAR(66),
    block_number BIGINT,
    log_index INTEGER,
    event_name VARCHAR(100),
    event_signature VARCHAR(66),
    decoded_data JSONB,
    raw_topics JSONB,
    raw_data TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_decoded_event UNIQUE (tx_hash, log_index)
);

CREATE TABLE IF NOT EXISTS mc_transaction_details (
    id SERIAL PRIMARY KEY,
    cycle_id INTEGER,
    chain_id INTEGER,
    tx_hash VARCHAR(66) UNIQUE,
    block_number BIGINT,
    tx_index INTEGER,
    from_address VARCHAR(42),
    to_address VARCHAR(42),
    value VARCHAR(100),
    gas_price VARCHAR(100),
    gas_limit VARCHAR(100),
    gas_used VARCHAR(100),
    status INTEGER,
    nonce INTEGER,
    input_data TEXT,
    captured_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mc_tx_hash ON mc_transaction_details(tx_hash);
CREATE INDEX IF NOT EXISTS idx_mc_registry_addr ON mc_registry(address);
