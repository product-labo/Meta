-- Blockchain Analytics Database Schema
-- Run this SQL script on your PostgreSQL database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core blockchain networks
CREATE TABLE IF NOT EXISTS ba_chains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    chain_id BIGINT,
    rpc_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Contract categories
CREATE TABLE IF NOT EXISTS ba_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Smart contracts being tracked
CREATE TABLE IF NOT EXISTS ba_smart_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chain_id UUID NOT NULL REFERENCES ba_chains(id),
    category_id UUID REFERENCES ba_categories(id),
    address TEXT NOT NULL,
    name TEXT,
    symbol TEXT,
    deployment_block BIGINT,
    deployment_tx TEXT,
    abi JSONB,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Function signatures for contract interactions
CREATE TABLE IF NOT EXISTS ba_function_signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID NOT NULL REFERENCES ba_smart_contracts(id),
    signature TEXT NOT NULL,
    function_name TEXT NOT NULL,
    function_abi JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Wallet addresses
CREATE TABLE IF NOT EXISTS ba_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address TEXT NOT NULL,
    label TEXT,
    first_seen TIMESTAMP,
    last_seen TIMESTAMP,
    total_transactions BIGINT DEFAULT 0,
    total_value TEXT DEFAULT '0',
    created_at TIMESTAMP DEFAULT NOW()
);

-- All blockchain transactions
CREATE TABLE IF NOT EXISTS ba_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chain_id UUID NOT NULL REFERENCES ba_chains(id),
    contract_id UUID REFERENCES ba_smart_contracts(id),
    function_sig_id UUID REFERENCES ba_function_signatures(id),
    from_wallet_id UUID REFERENCES ba_wallets(id),
    to_wallet_id UUID REFERENCES ba_wallets(id),
    hash TEXT NOT NULL,
    block_number BIGINT NOT NULL,
    block_hash TEXT,
    transaction_index INTEGER,
    gas_used BIGINT,
    gas_price BIGINT,
    max_fee_per_gas BIGINT,
    value TEXT DEFAULT '0',
    status TEXT,
    timestamp TIMESTAMP NOT NULL,
    input_data TEXT,
    decoded_input JSONB,
    raw_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Smart contract events/logs
CREATE TABLE IF NOT EXISTS ba_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES ba_transactions(id),
    contract_id UUID NOT NULL REFERENCES ba_smart_contracts(id),
    event_name TEXT,
    event_signature TEXT,
    log_index INTEGER NOT NULL,
    topics JSONB,
    data TEXT,
    decoded_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Transaction receipts
CREATE TABLE IF NOT EXISTS ba_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES ba_transactions(id),
    cumulative_gas_used BIGINT,
    effective_gas_price BIGINT,
    contract_address TEXT,
    logs_bloom TEXT,
    transaction_type INTEGER,
    raw_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Starknet-specific data
CREATE TABLE IF NOT EXISTS ba_starknet_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES ba_transactions(id),
    from_address TEXT,
    to_address TEXT,
    payload JSONB,
    message_index INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Beacon chain validator data
CREATE TABLE IF NOT EXISTS ba_validators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    validator_index INTEGER NOT NULL,
    pubkey TEXT,
    withdrawal_credentials TEXT,
    balance BIGINT,
    effective_balance BIGINT,
    status TEXT,
    slashed BOOLEAN DEFAULT false,
    activation_epoch BIGINT,
    exit_epoch BIGINT,
    last_updated TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexer state tracking
CREATE TABLE IF NOT EXISTS ba_indexer_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chain_id UUID NOT NULL REFERENCES ba_chains(id),
    indexer_name TEXT NOT NULL,
    last_processed_block BIGINT,
    last_processed_hash TEXT,
    is_running BOOLEAN DEFAULT false,
    last_error TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ba_transactions_hash ON ba_transactions(hash);
CREATE INDEX IF NOT EXISTS idx_ba_transactions_block_number ON ba_transactions(block_number);
CREATE INDEX IF NOT EXISTS idx_ba_transactions_timestamp ON ba_transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_ba_transactions_contract_id ON ba_transactions(contract_id);
CREATE INDEX IF NOT EXISTS idx_ba_transactions_from_wallet ON ba_transactions(from_wallet_id);
CREATE INDEX IF NOT EXISTS idx_ba_transactions_to_wallet ON ba_transactions(to_wallet_id);

CREATE INDEX IF NOT EXISTS idx_ba_events_transaction_id ON ba_events(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ba_events_contract_id ON ba_events(contract_id);
CREATE INDEX IF NOT EXISTS idx_ba_events_event_name ON ba_events(event_name);

CREATE INDEX IF NOT EXISTS idx_ba_smart_contracts_address ON ba_smart_contracts(address);
CREATE INDEX IF NOT EXISTS idx_ba_smart_contracts_chain_id ON ba_smart_contracts(chain_id);

CREATE INDEX IF NOT EXISTS idx_ba_wallets_address ON ba_wallets(address);

CREATE INDEX IF NOT EXISTS idx_ba_function_signatures_signature ON ba_function_signatures(signature);
CREATE INDEX IF NOT EXISTS idx_ba_function_signatures_contract_id ON ba_function_signatures(contract_id);

-- Insert initial data
INSERT INTO ba_chains (name, chain_id, rpc_url) VALUES 
    ('ethereum', 1, 'https://mainnet.ethereum.a5a.ch'),
    ('starknet', 23448594291968334, 'https://mainnet.starknet.a5a.ch'),
    ('beacon', 1, 'https://mainnet.beacon.a5a.ch')
ON CONFLICT DO NOTHING;

INSERT INTO ba_categories (name, description) VALUES 
    ('dex', 'Decentralized Exchanges'),
    ('defi', 'Decentralized Finance Protocols'),
    ('nft', 'Non-Fungible Token Collections'),
    ('gaming', 'Blockchain Gaming Projects'),
    ('dao', 'Decentralized Autonomous Organizations'),
    ('bridge', 'Cross-chain Bridge Protocols'),
    ('lending', 'Lending and Borrowing Protocols'),
    ('staking', 'Staking and Liquid Staking'),
    ('oracle', 'Price Oracle Services'),
    ('infrastructure', 'Blockchain Infrastructure')
ON CONFLICT DO NOTHING;
