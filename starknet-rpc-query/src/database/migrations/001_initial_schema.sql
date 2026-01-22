-- Initial database schema for Starknet RPC Query system
-- Migration 001: Core tables and indexes

-- Blocks table
CREATE TABLE IF NOT EXISTS blocks (
    block_number BIGINT PRIMARY KEY,
    block_hash VARCHAR(66) NOT NULL UNIQUE,
    parent_block_hash VARCHAR(66),
    timestamp BIGINT NOT NULL,
    finality_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blocks_hash ON blocks(block_hash);
CREATE INDEX IF NOT EXISTS idx_blocks_timestamp ON blocks(timestamp);
CREATE INDEX IF NOT EXISTS idx_blocks_finality ON blocks(finality_status);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    tx_hash VARCHAR(66) PRIMARY KEY,
    block_number BIGINT NOT NULL REFERENCES blocks(block_number),
    tx_type VARCHAR(50) NOT NULL,
    sender_address VARCHAR(66),
    entry_point_selector VARCHAR(66),
    status VARCHAR(20) NOT NULL,
    actual_fee BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_block ON transactions(block_number);
CREATE INDEX IF NOT EXISTS idx_transactions_sender ON transactions(sender_address);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Contract classes table
CREATE TABLE IF NOT EXISTS contract_classes (
    class_hash VARCHAR(66) PRIMARY KEY,
    abi_json JSONB,
    declared_tx_hash VARCHAR(66),
    declared_block BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contract_classes_declared_block ON contract_classes(declared_block);

-- Contracts table
CREATE TABLE IF NOT EXISTS contracts (
    contract_address VARCHAR(66) PRIMARY KEY,
    class_hash VARCHAR(66) NOT NULL REFERENCES contract_classes(class_hash),
    deployer_address VARCHAR(66),
    deployment_tx_hash VARCHAR(66) REFERENCES transactions(tx_hash),
    deployment_block BIGINT REFERENCES blocks(block_number),
    is_proxy BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contracts_class_hash ON contracts(class_hash);
CREATE INDEX IF NOT EXISTS idx_contracts_deployer ON contracts(deployer_address);
CREATE INDEX IF NOT EXISTS idx_contracts_deployment_block ON contracts(deployment_block);

-- Functions table
CREATE TABLE IF NOT EXISTS functions (
    function_id SERIAL PRIMARY KEY,
    class_hash VARCHAR(66) NOT NULL REFERENCES contract_classes(class_hash),
    contract_address VARCHAR(66) REFERENCES contracts(contract_address),
    function_name VARCHAR(255) NOT NULL,
    state_mutability VARCHAR(20)
);

CREATE INDEX IF NOT EXISTS idx_functions_class_hash ON functions(class_hash);
CREATE INDEX IF NOT EXISTS idx_functions_contract ON functions(contract_address);

-- Execution calls table
CREATE TABLE IF NOT EXISTS execution_calls (
    call_id SERIAL PRIMARY KEY,
    tx_hash VARCHAR(66) NOT NULL REFERENCES transactions(tx_hash),
    parent_call_id INTEGER REFERENCES execution_calls(call_id),
    contract_address VARCHAR(66) REFERENCES contracts(contract_address),
    class_hash VARCHAR(66) REFERENCES contract_classes(class_hash),
    entry_point_selector VARCHAR(66),
    call_status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_execution_calls_tx ON execution_calls(tx_hash);
CREATE INDEX IF NOT EXISTS idx_execution_calls_contract ON execution_calls(contract_address);
CREATE INDEX IF NOT EXISTS idx_execution_calls_parent ON execution_calls(parent_call_id);

-- Transaction failures table
CREATE TABLE IF NOT EXISTS transaction_failures (
    tx_hash VARCHAR(66) PRIMARY KEY REFERENCES transactions(tx_hash),
    failure_type VARCHAR(50) NOT NULL,
    failure_reason TEXT,
    error_message TEXT,
    fee_charged BIGINT
);

-- Execution failures table
CREATE TABLE IF NOT EXISTS execution_failures (
    call_id INTEGER PRIMARY KEY REFERENCES execution_calls(call_id),
    failure_reason TEXT NOT NULL,
    error_message TEXT,
    fee_charged BIGINT
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    event_id SERIAL PRIMARY KEY,
    tx_hash VARCHAR(66) NOT NULL REFERENCES transactions(tx_hash),
    contract_address VARCHAR(66) REFERENCES contracts(contract_address),
    function_id INTEGER REFERENCES functions(function_id),
    block_number BIGINT NOT NULL REFERENCES blocks(block_number),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_tx ON events(tx_hash);
CREATE INDEX IF NOT EXISTS idx_events_contract ON events(contract_address);
CREATE INDEX IF NOT EXISTS idx_events_block ON events(block_number);

-- Wallet interactions table
CREATE TABLE IF NOT EXISTS wallet_interactions (
    interaction_id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(66) NOT NULL,
    contract_address VARCHAR(66) REFERENCES contracts(contract_address),
    function_id INTEGER REFERENCES functions(function_id),
    tx_hash VARCHAR(66) NOT NULL REFERENCES transactions(tx_hash),
    block_number BIGINT NOT NULL REFERENCES blocks(block_number),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallet_interactions_wallet ON wallet_interactions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_interactions_contract ON wallet_interactions(contract_address);
CREATE INDEX IF NOT EXISTS idx_wallet_interactions_block ON wallet_interactions(block_number);

-- Contract versions table
CREATE TABLE IF NOT EXISTS contract_versions (
    implementation_address VARCHAR(66) NOT NULL,
    class_hash VARCHAR(66) NOT NULL REFERENCES contract_classes(class_hash),
    upgrade_tx_hash VARCHAR(66) REFERENCES transactions(tx_hash),
    upgrade_block BIGINT REFERENCES blocks(block_number),
    PRIMARY KEY (implementation_address, class_hash)
);

-- Proxy links table
CREATE TABLE IF NOT EXISTS proxy_links (
    proxy_address VARCHAR(66) NOT NULL REFERENCES contracts(contract_address),
    implementation_address VARCHAR(66) NOT NULL,
    effective_class_hash VARCHAR(66) REFERENCES contract_classes(class_hash),
    PRIMARY KEY (proxy_address, implementation_address)
);

-- Raw RPC responses table (for debugging and data integrity)
CREATE TABLE IF NOT EXISTS raw_rpc_responses (
    id SERIAL PRIMARY KEY,
    rpc_method VARCHAR(100) NOT NULL,
    prep_number BIGINT,
    tx_hash VARCHAR(66),
    response_json JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_raw_rpc_method ON raw_rpc_responses(rpc_method);
CREATE INDEX IF NOT EXISTS idx_raw_rpc_tx ON raw_rpc_responses(tx_hash);
CREATE INDEX IF NOT EXISTS idx_raw_rpc_created ON raw_rpc_responses(created_at);
