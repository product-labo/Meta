-- Lisk Chain Configuration Table
CREATE TABLE lisk_chain_config (
    chain_id INTEGER PRIMARY KEY,
    chain_name VARCHAR(50) NOT NULL,
    rpc_url VARCHAR(255) NOT NULL,
    start_block BIGINT DEFAULT 0,
    finality_depth INTEGER DEFAULT 12,
    reorg_depth INTEGER DEFAULT 64,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lisk Sync State Management
CREATE TABLE lisk_sync_state (
    chain_id INTEGER PRIMARY KEY REFERENCES lisk_chain_config(chain_id),
    last_synced_block BIGINT DEFAULT 0,
    last_finalized_block BIGINT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lisk Blocks Table
CREATE TABLE lisk_blocks (
    block_number BIGINT PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES lisk_chain_config(chain_id),
    block_hash VARCHAR(66) NOT NULL UNIQUE,
    parent_hash VARCHAR(66) NOT NULL,
    timestamp BIGINT NOT NULL,
    gas_limit BIGINT NOT NULL,
    gas_used BIGINT NOT NULL,
    miner VARCHAR(42),
    difficulty NUMERIC,
    total_difficulty NUMERIC,
    size INTEGER,
    transaction_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lisk Transactions Table
CREATE TABLE lisk_transactions (
    tx_hash VARCHAR(66) PRIMARY KEY,
    block_number BIGINT NOT NULL REFERENCES lisk_blocks(block_number),
    transaction_index INTEGER NOT NULL,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42),
    value NUMERIC DEFAULT 0,
    gas_limit BIGINT NOT NULL,
    gas_price BIGINT,
    max_fee_per_gas BIGINT,
    max_priority_fee_per_gas BIGINT,
    nonce BIGINT NOT NULL,
    input_data TEXT,
    transaction_type INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lisk Transaction Receipts Table
CREATE TABLE lisk_transaction_receipts (
    tx_hash VARCHAR(66) PRIMARY KEY REFERENCES lisk_transactions(tx_hash),
    status INTEGER NOT NULL,
    gas_used BIGINT NOT NULL,
    cumulative_gas_used BIGINT NOT NULL,
    contract_address VARCHAR(42),
    logs_bloom TEXT,
    effective_gas_price BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lisk Contracts Table
CREATE TABLE lisk_contracts (
    contract_address VARCHAR(42) PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES lisk_chain_config(chain_id),
    deployer_address VARCHAR(42) NOT NULL,
    deployment_tx_hash VARCHAR(66) NOT NULL REFERENCES lisk_transactions(tx_hash),
    deployment_block_number BIGINT NOT NULL REFERENCES lisk_blocks(block_number),
    code_hash VARCHAR(66),
    bytecode_size INTEGER,
    is_proxy BOOLEAN DEFAULT FALSE,
    proxy_implementation VARCHAR(42),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lisk Logs Table
CREATE TABLE lisk_logs (
    log_id SERIAL PRIMARY KEY,
    tx_hash VARCHAR(66) NOT NULL REFERENCES lisk_transactions(tx_hash),
    block_number BIGINT NOT NULL REFERENCES lisk_blocks(block_number),
    log_index INTEGER NOT NULL,
    contract_address VARCHAR(42) NOT NULL,
    topic0 VARCHAR(66),
    topic1 VARCHAR(66),
    topic2 VARCHAR(66),
    topic3 VARCHAR(66),
    data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tx_hash, log_index)
);

-- Lisk Execution Calls Table
CREATE TABLE lisk_execution_calls (
    call_id SERIAL PRIMARY KEY,
    tx_hash VARCHAR(66) NOT NULL REFERENCES lisk_transactions(tx_hash),
    parent_call_id INTEGER REFERENCES lisk_execution_calls(call_id),
    call_depth INTEGER NOT NULL DEFAULT 0,
    call_type VARCHAR(20) NOT NULL,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    value NUMERIC DEFAULT 0,
    gas_limit BIGINT,
    gas_used BIGINT,
    input_data TEXT,
    output_data TEXT,
    error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lisk Wallets Table
CREATE TABLE lisk_wallets (
    address VARCHAR(42) PRIMARY KEY,
    first_seen_block BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lisk Wallet Interactions Table
CREATE TABLE lisk_wallet_interactions (
    interaction_id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL REFERENCES lisk_wallets(address),
    contract_address VARCHAR(42),
    function_selector VARCHAR(10),
    tx_hash VARCHAR(66) NOT NULL REFERENCES lisk_transactions(tx_hash),
    block_number BIGINT NOT NULL,
    interaction_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wallet_address, tx_hash, interaction_type)
);

-- Lisk Raw RPC Responses Table
CREATE TABLE lisk_raw_rpc_responses (
    id SERIAL PRIMARY KEY,
    rpc_method VARCHAR(50) NOT NULL,
    block_number BIGINT,
    tx_hash VARCHAR(66),
    response_json JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for Lisk tables
CREATE INDEX idx_lisk_blocks_chain_id ON lisk_blocks(chain_id);
CREATE INDEX idx_lisk_blocks_timestamp ON lisk_blocks(timestamp);
CREATE INDEX idx_lisk_transactions_block_number ON lisk_transactions(block_number);
CREATE INDEX idx_lisk_transactions_from_address ON lisk_transactions(from_address);
CREATE INDEX idx_lisk_transactions_to_address ON lisk_transactions(to_address);
CREATE INDEX idx_lisk_logs_contract_address ON lisk_logs(contract_address);
CREATE INDEX idx_lisk_logs_topic0 ON lisk_logs(topic0);
CREATE INDEX idx_lisk_execution_calls_contract_address ON lisk_execution_calls(to_address);
CREATE INDEX idx_lisk_wallet_interactions_wallet ON lisk_wallet_interactions(wallet_address);
CREATE INDEX idx_lisk_wallet_interactions_contract ON lisk_wallet_interactions(contract_address);
CREATE INDEX idx_lisk_wallet_interactions_block ON lisk_wallet_interactions(block_number);

-- Insert default chain config for Lisk
INSERT INTO lisk_chain_config (chain_id, chain_name, rpc_url, start_block, finality_depth, reorg_depth)
VALUES (1135, 'Lisk Mainnet', 'https://rpc.api.lisk.com', 0, 12, 64)
ON CONFLICT (chain_id) DO NOTHING;
