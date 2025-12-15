
-- 1. Configuration Tables

CREATE TABLE IF NOT EXISTS mc_chains (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    rpc_urls TEXT[], 
    block_time_sec INTEGER DEFAULT 12,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS mc_registry (
    id SERIAL PRIMARY KEY,
    chain_id INTEGER REFERENCES mc_chains(id),
    address VARCHAR(66) NOT NULL,
    category VARCHAR(50), 
    name VARCHAR(100),
    target_functions JSONB,
    abi_definitions JSONB,
    monitor_events BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1,
    UNIQUE(chain_id, address)
);

-- 2. Lifecycle Management

CREATE TABLE IF NOT EXISTS mc_rotation_cycles (
    id SERIAL PRIMARY KEY,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'ACTIVE'
);

-- 3. Volatile Data (Wiped every rotation)

CREATE TABLE IF NOT EXISTS mc_chain_snapshots (
    id BIGSERIAL PRIMARY KEY,
    cycle_id INTEGER REFERENCES mc_rotation_cycles(id) ON DELETE CASCADE,
    chain_id INTEGER REFERENCES mc_chains(id),
    block_number BIGINT,
    block_timestamp TIMESTAMP WITH TIME ZONE,
    gas_price NUMERIC, 
    base_fee NUMERIC,
    blob_base_fee NUMERIC,
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mc_entity_snapshots (
    id BIGSERIAL PRIMARY KEY,
    cycle_id INTEGER REFERENCES mc_rotation_cycles(id) ON DELETE CASCADE,
    registry_id INTEGER REFERENCES mc_registry(id),
    balance NUMERIC,
    nonce BIGINT,
    is_contract BOOLEAN,
    code_hash VARCHAR(66),
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mc_contract_state (
    id BIGSERIAL PRIMARY KEY,
    cycle_id INTEGER REFERENCES mc_rotation_cycles(id) ON DELETE CASCADE,
    registry_id INTEGER REFERENCES mc_registry(id),
    function_signature VARCHAR(255),
    result_raw TEXT,
    result_decoded JSONB,
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mc_event_logs (
    id BIGSERIAL PRIMARY KEY,
    cycle_id INTEGER REFERENCES mc_rotation_cycles(id) ON DELETE CASCADE,
    registry_id INTEGER REFERENCES mc_registry(id),
    block_number BIGINT,
    tx_hash VARCHAR(66),
    log_index INTEGER,
    topic0 VARCHAR(66),
    topics JSONB,
    data TEXT,
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mc_transactions (
    id BIGSERIAL PRIMARY KEY,
    cycle_id INTEGER REFERENCES mc_rotation_cycles(id) ON DELETE CASCADE,
    chain_id INTEGER REFERENCES mc_chains(id),
    tx_hash VARCHAR(66) NOT NULL,
    from_address VARCHAR(66),
    to_address VARCHAR(66),
    value NUMERIC,
    gas_price NUMERIC,
    gas_used BIGINT,
    status INTEGER,
    input_data TEXT,
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_mc_entity_snapshots_cycle ON mc_entity_snapshots(cycle_id);
CREATE INDEX idx_mc_contract_state_cycle ON mc_contract_state(cycle_id);
CREATE INDEX idx_mc_event_logs_cycle_topic ON mc_event_logs(cycle_id, topic0);
CREATE INDEX idx_mc_transactions_hash ON mc_transactions(tx_hash);
