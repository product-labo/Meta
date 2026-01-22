-- =====================================================
-- Lisk Modular Architecture Database Schema
-- Full fidelity with Lisk's module system
-- =====================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS raw_rpc_responses CASCADE;
DROP TABLE IF EXISTS token_locks CASCADE;
DROP TABLE IF EXISTS token_balances CASCADE;
DROP TABLE IF EXISTS account_state_deltas CASCADE;
DROP TABLE IF EXISTS account_state_snapshots CASCADE;
DROP TABLE IF EXISTS transaction_accounts CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS blocks CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS sync_state CASCADE;
DROP TABLE IF EXISTS chain_config CASCADE;

-- =====================================================
-- 1. Chain Configuration
-- =====================================================
CREATE TABLE chain_config (
    chain_id INTEGER PRIMARY KEY,
    chain_name VARCHAR(50) NOT NULL,
    rpc_url VARCHAR(255) NOT NULL,
    start_block BIGINT NOT NULL DEFAULT 0,
    finality_depth INTEGER NOT NULL DEFAULT 12,
    reorg_depth INTEGER NOT NULL DEFAULT 64,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. Synchronization State
-- =====================================================
CREATE TABLE sync_state (
    chain_id INTEGER PRIMARY KEY REFERENCES chain_config(chain_id) ON DELETE CASCADE,
    last_synced_height BIGINT NOT NULL DEFAULT 0,
    last_finalized_height BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 3. Blocks
-- =====================================================
CREATE TABLE blocks (
    block_id VARCHAR(64) PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chain_config(chain_id) ON DELETE CASCADE,
    height BIGINT NOT NULL,
    timestamp BIGINT NOT NULL,
    previous_block_id VARCHAR(64) REFERENCES blocks(block_id) ON DELETE SET NULL,
    generator_address VARCHAR(41) NOT NULL,
    transaction_root VARCHAR(64) NOT NULL,
    state_root VARCHAR(64) NOT NULL,
    asset_root VARCHAR(64) NOT NULL,
    payload_length INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chain_id, height)
);

CREATE INDEX idx_blocks_height ON blocks(height);
CREATE INDEX idx_blocks_timestamp ON blocks(timestamp);
CREATE INDEX idx_blocks_generator ON blocks(generator_address);
CREATE INDEX idx_blocks_previous ON blocks(previous_block_id);
CREATE INDEX idx_blocks_chain_height ON blocks(chain_id, height);

-- =====================================================
-- 4. Accounts
-- =====================================================
CREATE TABLE accounts (
    address VARCHAR(41) PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chain_config(chain_id) ON DELETE CASCADE,
    first_seen_height BIGINT NOT NULL,
    last_seen_height BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_accounts_chain ON accounts(chain_id);
CREATE INDEX idx_accounts_first_seen ON accounts(first_seen_height);
CREATE INDEX idx_accounts_last_seen ON accounts(last_seen_height);

-- =====================================================
-- 5. Transactions
-- =====================================================
CREATE TABLE transactions (
    tx_id VARCHAR(64) PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chain_config(chain_id) ON DELETE CASCADE,
    block_id VARCHAR(64) NOT NULL REFERENCES blocks(block_id) ON DELETE CASCADE,
    block_height BIGINT NOT NULL,
    module VARCHAR(50) NOT NULL,
    command VARCHAR(50) NOT NULL,
    function_key VARCHAR(101) NOT NULL, -- module.command
    sender_address VARCHAR(41) NOT NULL REFERENCES accounts(address) ON DELETE CASCADE,
    nonce BIGINT NOT NULL,
    fee BIGINT NOT NULL,
    params JSONB NOT NULL,
    signatures JSONB NOT NULL,
    execution_status VARCHAR(20) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_block ON transactions(block_id);
CREATE INDEX idx_transactions_height ON transactions(block_height);
CREATE INDEX idx_transactions_sender ON transactions(sender_address);
CREATE INDEX idx_transactions_module ON transactions(module);
CREATE INDEX idx_transactions_command ON transactions(command);
CREATE INDEX idx_transactions_function_key ON transactions(function_key);
CREATE INDEX idx_transactions_status ON transactions(execution_status);
CREATE INDEX idx_transactions_chain_height ON transactions(chain_id, block_height);

-- =====================================================
-- 6. Events
-- =====================================================
CREATE TABLE events (
    event_id BIGSERIAL PRIMARY KEY,
    tx_id VARCHAR(64) NOT NULL REFERENCES transactions(tx_id) ON DELETE CASCADE,
    block_id VARCHAR(64) NOT NULL REFERENCES blocks(block_id) ON DELETE CASCADE,
    block_height BIGINT NOT NULL,
    event_index INTEGER NOT NULL,
    module VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    data JSONB NOT NULL,
    topics JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tx_id, event_index)
);

CREATE INDEX idx_events_tx ON events(tx_id);
CREATE INDEX idx_events_block ON events(block_id);
CREATE INDEX idx_events_height ON events(block_height);
CREATE INDEX idx_events_module ON events(module);
CREATE INDEX idx_events_name ON events(name);
CREATE INDEX idx_events_module_name ON events(module, name);
CREATE INDEX idx_events_topics ON events USING GIN(topics);

-- =====================================================
-- 7. Transaction Accounts (Many-to-Many)
-- =====================================================
CREATE TABLE transaction_accounts (
    tx_id VARCHAR(64) NOT NULL REFERENCES transactions(tx_id) ON DELETE CASCADE,
    address VARCHAR(41) NOT NULL REFERENCES accounts(address) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- 'sender', 'receiver', 'validator', 'delegator'
    PRIMARY KEY(tx_id, address, role)
);

CREATE INDEX idx_tx_accounts_address ON transaction_accounts(address);
CREATE INDEX idx_tx_accounts_role ON transaction_accounts(role);

-- =====================================================
-- 8. Account State Snapshots
-- =====================================================
CREATE TABLE account_state_snapshots (
    snapshot_id BIGSERIAL PRIMARY KEY,
    address VARCHAR(41) NOT NULL REFERENCES accounts(address) ON DELETE CASCADE,
    block_height BIGINT NOT NULL,
    module VARCHAR(50) NOT NULL,
    state_data JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(address, block_height, module)
);

CREATE INDEX idx_snapshots_address ON account_state_snapshots(address);
CREATE INDEX idx_snapshots_height ON account_state_snapshots(block_height);
CREATE INDEX idx_snapshots_module ON account_state_snapshots(module);
CREATE INDEX idx_snapshots_address_height ON account_state_snapshots(address, block_height);

-- =====================================================
-- 9. Account State Deltas
-- =====================================================
CREATE TABLE account_state_deltas (
    delta_id BIGSERIAL PRIMARY KEY,
    tx_id VARCHAR(64) NOT NULL REFERENCES transactions(tx_id) ON DELETE CASCADE,
    address VARCHAR(41) NOT NULL REFERENCES accounts(address) ON DELETE CASCADE,
    block_height BIGINT NOT NULL,
    module VARCHAR(50) NOT NULL,
    field_path VARCHAR(255) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deltas_tx ON account_state_deltas(tx_id);
CREATE INDEX idx_deltas_address ON account_state_deltas(address);
CREATE INDEX idx_deltas_height ON account_state_deltas(block_height);
CREATE INDEX idx_deltas_module ON account_state_deltas(module);
CREATE INDEX idx_deltas_address_module ON account_state_deltas(address, module);

-- =====================================================
-- 10. Token Balances
-- =====================================================
CREATE TABLE token_balances (
    address VARCHAR(41) NOT NULL REFERENCES accounts(address) ON DELETE CASCADE,
    token_id VARCHAR(16) NOT NULL,
    available_balance BIGINT NOT NULL DEFAULT 0,
    locked_balance BIGINT NOT NULL DEFAULT 0,
    last_updated_height BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(address, token_id)
);

CREATE INDEX idx_token_balances_address ON token_balances(address);
CREATE INDEX idx_token_balances_token ON token_balances(token_id);
CREATE INDEX idx_token_balances_available ON token_balances(available_balance) WHERE available_balance > 0;
CREATE INDEX idx_token_balances_locked ON token_balances(locked_balance) WHERE locked_balance > 0;

-- =====================================================
-- 11. Token Locks
-- =====================================================
CREATE TABLE token_locks (
    lock_id BIGSERIAL PRIMARY KEY,
    address VARCHAR(41) NOT NULL REFERENCES accounts(address) ON DELETE CASCADE,
    token_id VARCHAR(16) NOT NULL,
    module VARCHAR(50) NOT NULL,
    amount BIGINT NOT NULL,
    lock_height BIGINT NOT NULL,
    unlock_height BIGINT,
    related_tx_id VARCHAR(64) REFERENCES transactions(tx_id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (address, token_id) REFERENCES token_balances(address, token_id) ON DELETE CASCADE
);

CREATE INDEX idx_token_locks_address ON token_locks(address);
CREATE INDEX idx_token_locks_token ON token_locks(token_id);
CREATE INDEX idx_token_locks_module ON token_locks(module);
CREATE INDEX idx_token_locks_unlock ON token_locks(unlock_height) WHERE unlock_height IS NOT NULL;
CREATE INDEX idx_token_locks_address_token ON token_locks(address, token_id);

-- =====================================================
-- 12. Raw RPC Responses (Zero Data Loss)
-- =====================================================
CREATE TABLE raw_rpc_responses (
    response_id BIGSERIAL PRIMARY KEY,
    rpc_method VARCHAR(100) NOT NULL,
    block_height BIGINT,
    tx_id VARCHAR(64),
    response_json JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_raw_rpc_method ON raw_rpc_responses(rpc_method);
CREATE INDEX idx_raw_rpc_height ON raw_rpc_responses(block_height) WHERE block_height IS NOT NULL;
CREATE INDEX idx_raw_rpc_tx ON raw_rpc_responses(tx_id) WHERE tx_id IS NOT NULL;

-- =====================================================
-- Insert default chain configuration
-- =====================================================
INSERT INTO chain_config (chain_id, chain_name, rpc_url, start_block, finality_depth, reorg_depth)
VALUES (1, 'lisk-mainnet', 'https://rpc.api.lisk.com', 0, 12, 64)
ON CONFLICT (chain_id) DO NOTHING;

INSERT INTO sync_state (chain_id, last_synced_height, last_finalized_height)
VALUES (1, 0, 0)
ON CONFLICT (chain_id) DO NOTHING;

-- =====================================================
-- Comments for documentation
-- =====================================================
COMMENT ON TABLE chain_config IS 'Chain-level configuration and RPC endpoints';
COMMENT ON TABLE sync_state IS 'Synchronization progress tracking per chain';
COMMENT ON TABLE blocks IS 'Canonical block data with full Lisk fidelity';
COMMENT ON TABLE accounts IS 'Registry of all addresses that have interacted with the chain';
COMMENT ON TABLE transactions IS 'Command execution containers with module/command information';
COMMENT ON TABLE events IS 'Events emitted during transaction execution';
COMMENT ON TABLE transaction_accounts IS 'Many-to-many relationship between transactions and accounts';
COMMENT ON TABLE account_state_snapshots IS 'Complete account state per module at specific block heights';
COMMENT ON TABLE account_state_deltas IS 'Precise state changes caused by each transaction';
COMMENT ON TABLE token_balances IS 'Fast token balance queries with available and locked amounts';
COMMENT ON TABLE token_locks IS 'Token locks with unlock conditions and related transactions';
COMMENT ON TABLE raw_rpc_responses IS 'Raw RPC responses for debugging and zero data loss';
