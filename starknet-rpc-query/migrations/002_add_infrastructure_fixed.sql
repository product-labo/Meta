-- Migration 002 Fixed: Add Infrastructure Tables
-- Handles existing constraints properly

-- Create chain_config table
CREATE TABLE IF NOT EXISTS chain_config (
    chain_id INTEGER PRIMARY KEY,
    chain_name VARCHAR(50) NOT NULL,
    rpc_url TEXT NOT NULL,
    explorer_url TEXT,
    finality_depth INTEGER DEFAULT 10,
    reorg_depth INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO chain_config (chain_id, chain_name, rpc_url, explorer_url) 
VALUES (1, 'Starknet Mainnet', 'https://starknet-rpc.publicnode.com', 'https://voyager.online')
ON CONFLICT (chain_id) DO NOTHING;

-- Create sync_state table
CREATE TABLE IF NOT EXISTS sync_state (
    id SERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chain_config(chain_id) ON DELETE CASCADE,
    last_synced_block BIGINT NOT NULL DEFAULT 0,
    last_finalized_block BIGINT,
    sync_status VARCHAR(20) NOT NULL DEFAULT 'syncing',
    last_sync_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    error_message TEXT,
    UNIQUE(chain_id)
);

INSERT INTO sync_state (chain_id, last_synced_block) 
VALUES (1, 0)
ON CONFLICT (chain_id) DO NOTHING;

-- Add columns to blocks
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS chain_id INTEGER DEFAULT 1;
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS sequencer_address VARCHAR(66);
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS transaction_count INTEGER DEFAULT 0;
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS event_count INTEGER DEFAULT 0;
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

UPDATE blocks SET chain_id = 1 WHERE chain_id IS NULL;
ALTER TABLE blocks ALTER COLUMN chain_id SET NOT NULL;

ALTER TABLE blocks ADD CONSTRAINT fk_blocks_chain 
    FOREIGN KEY (chain_id) REFERENCES chain_config(chain_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_blocks_chain_id ON blocks(chain_id);
CREATE INDEX IF NOT EXISTS idx_blocks_is_active ON blocks(is_active);
CREATE INDEX IF NOT EXISTS idx_blocks_sequencer ON blocks(sequencer_address);
CREATE UNIQUE INDEX IF NOT EXISTS idx_blocks_number_chain ON blocks(block_number, chain_id);

-- Add columns to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS chain_id INTEGER DEFAULT 1;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS nonce BIGINT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS max_fee BIGINT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS calldata TEXT[];
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS signature TEXT[];
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

UPDATE transactions SET chain_id = 1 WHERE chain_id IS NULL;
ALTER TABLE transactions ALTER COLUMN chain_id SET NOT NULL;

ALTER TABLE transactions ADD CONSTRAINT fk_transactions_chain 
    FOREIGN KEY (chain_id) REFERENCES chain_config(chain_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_transactions_chain_id ON transactions(chain_id);
CREATE INDEX IF NOT EXISTS idx_transactions_is_active ON transactions(is_active);
CREATE INDEX IF NOT EXISTS idx_transactions_nonce ON transactions(sender_address, nonce);
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_hash_chain ON transactions(tx_hash, chain_id);

-- Add columns to contract_classes
ALTER TABLE contract_classes ADD COLUMN IF NOT EXISTS chain_id INTEGER DEFAULT 1;
ALTER TABLE contract_classes ADD COLUMN IF NOT EXISTS compiled_class_hash VARCHAR(66);
ALTER TABLE contract_classes ADD COLUMN IF NOT EXISTS contract_type VARCHAR(50);

UPDATE contract_classes SET chain_id = 1 WHERE chain_id IS NULL;
ALTER TABLE contract_classes ALTER COLUMN chain_id SET NOT NULL;

ALTER TABLE contract_classes ADD CONSTRAINT fk_contract_classes_chain 
    FOREIGN KEY (chain_id) REFERENCES chain_config(chain_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_contract_classes_chain_id ON contract_classes(chain_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_contract_classes_hash_chain ON contract_classes(class_hash, chain_id);

-- Add columns to contracts
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS chain_id INTEGER DEFAULT 1;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS implementation_address VARCHAR(66);

UPDATE contracts SET chain_id = 1 WHERE chain_id IS NULL;
ALTER TABLE contracts ALTER COLUMN chain_id SET NOT NULL;

ALTER TABLE contracts ADD CONSTRAINT fk_contracts_chain 
    FOREIGN KEY (chain_id) REFERENCES chain_config(chain_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_contracts_chain_id ON contracts(chain_id);
CREATE INDEX IF NOT EXISTS idx_contracts_implementation ON contracts(implementation_address);
CREATE UNIQUE INDEX IF NOT EXISTS idx_contracts_address_chain ON contracts(contract_address, chain_id);

-- Add columns to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS chain_id INTEGER DEFAULT 1;
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_index INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS keys TEXT[];
ALTER TABLE events ADD COLUMN IF NOT EXISTS data TEXT[];
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

UPDATE events SET chain_id = 1 WHERE chain_id IS NULL;
ALTER TABLE events ALTER COLUMN chain_id SET NOT NULL;

ALTER TABLE events ADD CONSTRAINT fk_events_chain 
    FOREIGN KEY (chain_id) REFERENCES chain_config(chain_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_events_chain_id ON events(chain_id);
CREATE INDEX IF NOT EXISTS idx_events_is_active ON events(is_active);
CREATE INDEX IF NOT EXISTS idx_events_keys ON events USING GIN(keys);

-- Add columns to execution_calls
ALTER TABLE execution_calls ADD COLUMN IF NOT EXISTS chain_id INTEGER DEFAULT 1;
ALTER TABLE execution_calls ADD COLUMN IF NOT EXISTS caller_address VARCHAR(66);
ALTER TABLE execution_calls ADD COLUMN IF NOT EXISTS call_type VARCHAR(20) DEFAULT 'CALL';
ALTER TABLE execution_calls ADD COLUMN IF NOT EXISTS calldata TEXT[];
ALTER TABLE execution_calls ADD COLUMN IF NOT EXISTS result TEXT[];

UPDATE execution_calls SET chain_id = 1 WHERE chain_id IS NULL;
ALTER TABLE execution_calls ALTER COLUMN chain_id SET NOT NULL;

ALTER TABLE execution_calls ADD CONSTRAINT fk_execution_calls_chain 
    FOREIGN KEY (chain_id) REFERENCES chain_config(chain_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_execution_calls_chain_id ON execution_calls(chain_id);

-- Add columns to wallet_interactions
ALTER TABLE wallet_interactions ADD COLUMN IF NOT EXISTS chain_id INTEGER DEFAULT 1;
ALTER TABLE wallet_interactions ADD COLUMN IF NOT EXISTS interaction_type VARCHAR(20) DEFAULT 'INVOKE';

UPDATE wallet_interactions SET chain_id = 1 WHERE chain_id IS NULL;
ALTER TABLE wallet_interactions ALTER COLUMN chain_id SET NOT NULL;

ALTER TABLE wallet_interactions ADD CONSTRAINT fk_wallet_interactions_chain 
    FOREIGN KEY (chain_id) REFERENCES chain_config(chain_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_wallet_interactions_chain_id ON wallet_interactions(chain_id);

-- Add columns to raw_rpc_responses
ALTER TABLE raw_rpc_responses ADD COLUMN IF NOT EXISTS chain_id INTEGER DEFAULT 1;

UPDATE raw_rpc_responses SET chain_id = 1 WHERE chain_id IS NULL;
ALTER TABLE raw_rpc_responses ALTER COLUMN chain_id SET NOT NULL;

ALTER TABLE raw_rpc_responses ADD CONSTRAINT fk_raw_rpc_responses_chain 
    FOREIGN KEY (chain_id) REFERENCES chain_config(chain_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_raw_rpc_responses_chain_id ON raw_rpc_responses(chain_id);

-- Add CHECK constraints
ALTER TABLE blocks DROP CONSTRAINT IF EXISTS chk_blocks_finality_status;
ALTER TABLE blocks ADD CONSTRAINT chk_blocks_finality_status 
    CHECK (finality_status IN ('PENDING', 'ACCEPTED_ON_L2', 'ACCEPTED_ON_L1'));

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS chk_transactions_status;
ALTER TABLE transactions ADD CONSTRAINT chk_transactions_status 
    CHECK (status IN ('ACCEPTED_ON_L2', 'ACCEPTED_ON_L1', 'REJECTED', 'PENDING'));

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS chk_transactions_type;
ALTER TABLE transactions ADD CONSTRAINT chk_transactions_type 
    CHECK (tx_type IN ('INVOKE', 'DEPLOY_ACCOUNT', 'DECLARE', 'DEPLOY', 'L1_HANDLER'));

ALTER TABLE execution_calls DROP CONSTRAINT IF EXISTS chk_execution_calls_type;
ALTER TABLE execution_calls ADD CONSTRAINT chk_execution_calls_type 
    CHECK (call_type IN ('CALL', 'DELEGATE_CALL', 'LIBRARY_CALL'));

-- Add comments
COMMENT ON TABLE chain_config IS 'Multi-chain configuration for Starknet networks';
COMMENT ON TABLE sync_state IS 'Indexer synchronization progress per chain';
COMMENT ON TABLE blocks IS 'Starknet blockchain blocks with multi-chain support';
COMMENT ON TABLE transactions IS 'Starknet transactions with complete data capture';
COMMENT ON TABLE events IS 'Contract events with keys and data arrays';
