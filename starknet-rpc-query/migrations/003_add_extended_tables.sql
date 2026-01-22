-- Migration 003: Add Extended Tables (Tasks 8-17)
-- Phase 2 & 3: Core Enhancements and Analytics

-- Task 8: Create starknet_wallets table
CREATE TABLE IF NOT EXISTS starknet_wallets (
    address VARCHAR(66) NOT NULL,
    chain_id INTEGER NOT NULL REFERENCES chain_config(chain_id) ON DELETE CASCADE,
    first_seen_block BIGINT NOT NULL,
    last_activity_block BIGINT,
    account_type VARCHAR(20) DEFAULT 'wallet',
    total_transactions INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (address, chain_id)
);

COMMENT ON TABLE starknet_wallets IS 'Registry of wallet addresses on Starknet - sourced from transactions and events';
COMMENT ON COLUMN starknet_wallets.account_type IS 'Type: wallet, contract, or unknown';

CREATE INDEX IF NOT EXISTS idx_wallets_chain_id ON starknet_wallets(chain_id);
CREATE INDEX IF NOT EXISTS idx_wallets_first_seen ON starknet_wallets(first_seen_block);
CREATE INDEX IF NOT EXISTS idx_wallets_account_type ON starknet_wallets(account_type);

-- Task 9: Create starknet_tokens table
CREATE TABLE IF NOT EXISTS starknet_tokens (
    token_address VARCHAR(66) NOT NULL,
    chain_id INTEGER NOT NULL REFERENCES chain_config(chain_id) ON DELETE CASCADE,
    name VARCHAR(255),
    symbol VARCHAR(50),
    decimals INTEGER,
    total_supply NUMERIC(78,0),
    token_type VARCHAR(20) NOT NULL DEFAULT 'ERC20',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (token_address, chain_id),
    FOREIGN KEY (token_address, chain_id) REFERENCES contracts(contract_address, chain_id)
);

COMMENT ON TABLE starknet_tokens IS 'Token contracts on Starknet (ERC20, ERC721, ERC1155)';
COMMENT ON COLUMN starknet_tokens.token_type IS 'Type: ERC20, ERC721, ERC1155, OTHER';

CREATE INDEX IF NOT EXISTS idx_tokens_chain_id ON starknet_tokens(chain_id);
CREATE INDEX IF NOT EXISTS idx_tokens_type ON starknet_tokens(token_type);
CREATE INDEX IF NOT EXISTS idx_tokens_symbol ON starknet_tokens(symbol);

ALTER TABLE starknet_tokens ADD CONSTRAINT chk_tokens_type 
    CHECK (token_type IN ('ERC20', 'ERC721', 'ERC1155', 'OTHER'));

-- Task 10: Create starknet_token_transfers table
CREATE TABLE IF NOT EXISTS starknet_token_transfers (
    tx_hash VARCHAR(66) NOT NULL,
    event_index INTEGER NOT NULL,
    chain_id INTEGER NOT NULL REFERENCES chain_config(chain_id) ON DELETE CASCADE,
    token_address VARCHAR(66) NOT NULL,
    from_address VARCHAR(66) NOT NULL,
    to_address VARCHAR(66) NOT NULL,
    amount NUMERIC(78,0) NOT NULL,
    token_id NUMERIC(78,0),
    block_number BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tx_hash, event_index, chain_id),
    FOREIGN KEY (token_address, chain_id) REFERENCES starknet_tokens(token_address, chain_id),
    FOREIGN KEY (block_number, chain_id) REFERENCES blocks(block_number, chain_id)
);

COMMENT ON TABLE starknet_token_transfers IS 'Token transfer events from Starknet - parsed from Transfer events';
COMMENT ON COLUMN starknet_token_transfers.token_id IS 'Token ID for NFTs (ERC721/ERC1155), NULL for ERC20';

CREATE INDEX IF NOT EXISTS idx_token_transfers_chain_id ON starknet_token_transfers(chain_id);
CREATE INDEX IF NOT EXISTS idx_token_transfers_token ON starknet_token_transfers(token_address, chain_id);
CREATE INDEX IF NOT EXISTS idx_token_transfers_from ON starknet_token_transfers(from_address);
CREATE INDEX IF NOT EXISTS idx_token_transfers_to ON starknet_token_transfers(to_address);
CREATE INDEX IF NOT EXISTS idx_token_transfers_block ON starknet_token_transfers(block_number, chain_id);

-- Task 11: Create starknet_function_signatures table
CREATE TABLE IF NOT EXISTS starknet_function_signatures (
    function_selector VARCHAR(66) NOT NULL,
    contract_address VARCHAR(66) NOT NULL,
    chain_id INTEGER NOT NULL REFERENCES chain_config(chain_id) ON DELETE CASCADE,
    function_name VARCHAR(255) NOT NULL,
    function_signature TEXT NOT NULL,
    input_types TEXT[],
    output_types TEXT[],
    is_view BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (function_selector, contract_address, chain_id),
    FOREIGN KEY (contract_address, chain_id) REFERENCES contracts(contract_address, chain_id)
);

COMMENT ON TABLE starknet_function_signatures IS 'Function signatures extracted from contract ABIs for calldata decoding';
COMMENT ON COLUMN starknet_function_signatures.is_view IS 'Whether function is view-only (no state changes)';

CREATE INDEX IF NOT EXISTS idx_function_signatures_chain_id ON starknet_function_signatures(chain_id);
CREATE INDEX IF NOT EXISTS idx_function_signatures_selector ON starknet_function_signatures(function_selector);
CREATE INDEX IF NOT EXISTS idx_function_signatures_contract ON starknet_function_signatures(contract_address, chain_id);

-- Task 12: Create starknet_daily_metrics table
CREATE TABLE IF NOT EXISTS starknet_daily_metrics (
    date DATE NOT NULL,
    chain_id INTEGER NOT NULL REFERENCES chain_config(chain_id) ON DELETE CASCADE,
    total_transactions INTEGER DEFAULT 0,
    successful_transactions INTEGER DEFAULT 0,
    failed_transactions INTEGER DEFAULT 0,
    unique_addresses INTEGER DEFAULT 0,
    total_gas_used BIGINT DEFAULT 0,
    average_gas_price NUMERIC(78,0),
    new_contracts INTEGER DEFAULT 0,
    total_volume_eth NUMERIC(78,0) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (date, chain_id)
);

COMMENT ON TABLE starknet_daily_metrics IS 'Daily aggregated metrics for Starknet blockchain - computed from blocks and transactions';
COMMENT ON COLUMN starknet_daily_metrics.unique_addresses IS 'Count of unique wallet addresses active on this day';

CREATE INDEX IF NOT EXISTS idx_daily_metrics_chain_id ON starknet_daily_metrics(chain_id);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON starknet_daily_metrics(date);

-- Update functions table to support chain_id
ALTER TABLE functions ADD COLUMN IF NOT EXISTS chain_id INTEGER DEFAULT 1;
UPDATE functions SET chain_id = 1 WHERE chain_id IS NULL;
ALTER TABLE functions ALTER COLUMN chain_id SET NOT NULL;

ALTER TABLE functions ADD CONSTRAINT fk_functions_chain 
    FOREIGN KEY (chain_id) REFERENCES chain_config(chain_id) ON DELETE CASCADE;

-- Update foreign keys
ALTER TABLE functions DROP CONSTRAINT IF EXISTS functions_class_hash_fkey;
ALTER TABLE functions ADD CONSTRAINT fk_functions_class 
    FOREIGN KEY (class_hash, chain_id) REFERENCES contract_classes(class_hash, chain_id);

ALTER TABLE functions DROP CONSTRAINT IF EXISTS functions_contract_address_fkey;
ALTER TABLE functions ADD CONSTRAINT fk_functions_contract 
    FOREIGN KEY (contract_address, chain_id) REFERENCES contracts(contract_address, chain_id);

CREATE INDEX IF NOT EXISTS idx_functions_chain_id ON functions(chain_id);

-- Update transaction_failures table
ALTER TABLE transaction_failures ADD COLUMN IF NOT EXISTS chain_id INTEGER DEFAULT 1;
UPDATE transaction_failures SET chain_id = 1 WHERE chain_id IS NULL;
ALTER TABLE transaction_failures ALTER COLUMN chain_id SET NOT NULL;

ALTER TABLE transaction_failures ADD CONSTRAINT fk_transaction_failures_chain 
    FOREIGN KEY (chain_id) REFERENCES chain_config(chain_id) ON DELETE CASCADE;

ALTER TABLE transaction_failures DROP CONSTRAINT IF EXISTS transaction_failures_pkey;
ALTER TABLE transaction_failures ADD CONSTRAINT transaction_failures_pkey PRIMARY KEY (tx_hash, chain_id);

-- Update execution_failures table
ALTER TABLE execution_failures ADD COLUMN IF NOT EXISTS chain_id INTEGER DEFAULT 1;
UPDATE execution_failures SET chain_id = 1 WHERE chain_id IS NULL;
ALTER TABLE execution_failures ALTER COLUMN chain_id SET NOT NULL;

ALTER TABLE execution_failures ADD CONSTRAINT fk_execution_failures_chain 
    FOREIGN KEY (chain_id) REFERENCES chain_config(chain_id) ON DELETE CASCADE;

-- Update contract_versions table
ALTER TABLE contract_versions ADD COLUMN IF NOT EXISTS chain_id INTEGER DEFAULT 1;
UPDATE contract_versions SET chain_id = 1 WHERE chain_id IS NULL;
ALTER TABLE contract_versions ALTER COLUMN chain_id SET NOT NULL;

ALTER TABLE contract_versions ADD CONSTRAINT fk_contract_versions_chain 
    FOREIGN KEY (chain_id) REFERENCES chain_config(chain_id) ON DELETE CASCADE;

ALTER TABLE contract_versions DROP CONSTRAINT IF EXISTS contract_versions_pkey;
ALTER TABLE contract_versions ADD CONSTRAINT contract_versions_pkey 
    PRIMARY KEY (implementation_address, class_hash, chain_id);

-- Update proxy_links table
ALTER TABLE proxy_links ADD COLUMN IF NOT EXISTS chain_id INTEGER DEFAULT 1;
UPDATE proxy_links SET chain_id = 1 WHERE chain_id IS NULL;
ALTER TABLE proxy_links ALTER COLUMN chain_id SET NOT NULL;

ALTER TABLE proxy_links ADD CONSTRAINT fk_proxy_links_chain 
    FOREIGN KEY (chain_id) REFERENCES chain_config(chain_id) ON DELETE CASCADE;

ALTER TABLE proxy_links DROP CONSTRAINT IF EXISTS proxy_links_pkey;
ALTER TABLE proxy_links ADD CONSTRAINT proxy_links_pkey 
    PRIMARY KEY (proxy_address, implementation_address, chain_id);
