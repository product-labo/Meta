-- Migration: Create Starknet-specific tables
-- This separates Starknet data from general/mixed blockchain data

-- =============================================================================
-- STARKNET BLOCKCHAIN DATA TABLES
-- =============================================================================

-- Starknet blocks (mirrors blocks table structure)
CREATE TABLE IF NOT EXISTS starknet_blocks (
    block_number bigint NOT NULL PRIMARY KEY,
    block_hash character varying(66) NOT NULL UNIQUE,
    parent_block_hash character varying(66),
    timestamp bigint NOT NULL,
    finality_status character varying(20) NOT NULL DEFAULT 'PENDING',
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Starknet transactions (mirrors transactions table structure)  
CREATE TABLE IF NOT EXISTS starknet_transactions (
    tx_hash character varying(66) NOT NULL PRIMARY KEY,
    block_number bigint NOT NULL,
    tx_type character varying(20) NOT NULL,
    sender_address character varying(66),
    entry_point_selector character varying(66),
    status character varying(20) NOT NULL DEFAULT 'PENDING',
    actual_fee bigint,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (block_number) REFERENCES starknet_blocks(block_number)
);

-- Starknet contracts (mirrors contracts table structure)
CREATE TABLE IF NOT EXISTS starknet_contracts (
    contract_address character varying(66) NOT NULL PRIMARY KEY,
    class_hash character varying(66),
    deployer_address character varying(66),
    deployment_tx_hash character varying(66),
    deployment_block bigint,
    is_proxy boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deployment_block) REFERENCES starknet_blocks(block_number),
    FOREIGN KEY (deployment_tx_hash) REFERENCES starknet_transactions(tx_hash)
);

-- Starknet events (mirrors events table structure)
CREATE TABLE IF NOT EXISTS starknet_events (
    event_id bigserial PRIMARY KEY,
    tx_hash character varying(66) NOT NULL,
    contract_address character varying(66),
    block_number bigint NOT NULL,
    event_index integer,
    keys text[],
    data text[],
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tx_hash) REFERENCES starknet_transactions(tx_hash),
    FOREIGN KEY (block_number) REFERENCES starknet_blocks(block_number)
);

-- Starknet wallets (mirrors wallets table structure)
CREATE TABLE IF NOT EXISTS starknet_wallets (
    address character varying(66) NOT NULL PRIMARY KEY,
    first_seen_block bigint,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (first_seen_block) REFERENCES starknet_blocks(block_number)
);

-- Starknet wallet interactions (mirrors wallet_interactions table structure)
CREATE TABLE IF NOT EXISTS starknet_wallet_interactions (
    interaction_id bigserial PRIMARY KEY,
    wallet_address character varying(66) NOT NULL,
    contract_address character varying(66),
    tx_hash character varying(66) NOT NULL,
    block_number bigint NOT NULL,
    interaction_type character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wallet_address) REFERENCES starknet_wallets(address),
    FOREIGN KEY (contract_address) REFERENCES starknet_contracts(contract_address),
    FOREIGN KEY (tx_hash) REFERENCES starknet_transactions(tx_hash),
    FOREIGN KEY (block_number) REFERENCES starknet_blocks(block_number)
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Starknet blocks indexes
CREATE INDEX IF NOT EXISTS idx_starknet_blocks_hash ON starknet_blocks(block_hash);
CREATE INDEX IF NOT EXISTS idx_starknet_blocks_timestamp ON starknet_blocks(timestamp);
CREATE INDEX IF NOT EXISTS idx_starknet_blocks_finality ON starknet_blocks(finality_status);

-- Starknet transactions indexes  
CREATE INDEX IF NOT EXISTS idx_starknet_transactions_block ON starknet_transactions(block_number);
CREATE INDEX IF NOT EXISTS idx_starknet_transactions_sender ON starknet_transactions(sender_address);
CREATE INDEX IF NOT EXISTS idx_starknet_transactions_type ON starknet_transactions(tx_type);

-- Starknet events indexes
CREATE INDEX IF NOT EXISTS idx_starknet_events_contract ON starknet_events(contract_address);
CREATE INDEX IF NOT EXISTS idx_starknet_events_block ON starknet_events(block_number);
CREATE INDEX IF NOT EXISTS idx_starknet_events_tx ON starknet_events(tx_hash);

-- Starknet wallet interactions indexes
CREATE INDEX IF NOT EXISTS idx_starknet_wallet_interactions_wallet ON starknet_wallet_interactions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_starknet_wallet_interactions_contract ON starknet_wallet_interactions(contract_address);

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE starknet_blocks IS 'Starknet blockchain blocks - isolated from other chains';
COMMENT ON TABLE starknet_transactions IS 'Starknet transactions - isolated from other chains';
COMMENT ON TABLE starknet_contracts IS 'Starknet smart contracts - isolated from other chains';
COMMENT ON TABLE starknet_events IS 'Starknet contract events - isolated from other chains';
COMMENT ON TABLE starknet_wallets IS 'Starknet wallet addresses - isolated from other chains';
COMMENT ON TABLE starknet_wallet_interactions IS 'Starknet wallet-contract interactions - isolated from other chains';
