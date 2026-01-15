-- Migration 002: Add Infrastructure Tables (Tasks 1-7)
-- Phase 1: Critical Infrastructure

-- Task 1: Create chain_config table
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

COMMENT ON TABLE chain_config IS 'Multi-chain configuration for Starknet networks (mainnet, testnet, etc.)';
COMMENT ON COLUMN chain_config.chain_id IS 'Unique chain identifier (1=mainnet, 2=testnet)';
COMMENT ON COLUMN chain_config.rpc_url IS 'RPC endpoint URL for blockchain queries';

-- Insert default Starknet mainnet config
INSERT INTO chain_config (chain_id, chain_name, rpc_url, explorer_url) 
VALUES (1, 'Starknet Mainnet', 'https://starknet-rpc.publicnode.com', 'https://voyager.online')
ON CONFLICT (chain_id) DO NOTHING;

-- Task 2: Create sync_state table
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

COMMENT ON TABLE sync_state IS 'Indexer synchronization progress per chain';
COMMENT ON COLUMN sync_state.last_synced_block IS 'Last successfully indexed block number';
COMMENT ON COLUMN sync_state.sync_status IS 'Status: syncing, synced, error, paused';

-- Insert default sync state for mainnet
INSERT INTO sync_state (chain_id, last_synced_block) 
VALUES (1, 0)
ON CONFLICT (chain_id) DO NOTHING;

-- Task 3: Add chain_id to blocks
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS chain_id INTEGER DEFAULT 1;
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS sequencer_address VARCHAR(66);
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS transaction_count INTEGER DEFAULT 0;
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS event_count INTEGER DEFAULT 0;
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing blocks to have chain_id = 1 (mainnet)
UPDATE blocks SET chain_id = 1 WHERE chain_id IS NULL;

-- Make chain_id NOT NULL after populating
ALTER TABLE blocks ALTER COLUMN chain_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE blocks ADD CONSTRAINT fk_blocks_chain 
    FOREIGN KEY (chain_id) REFERENCES chain_config(chain_id) ON DELETE CASCADE;

-- Create composite unique constraint
ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_pkey;
ALTER TABLE blocks ADD CONSTRAINT blocks_pkey PRIMARY KEY (block_number, chain_id);

CREATE INDEX IF NOT EXISTS idx_blocks_chain_id ON blocks(chain_id);
CREATE INDEX IF NOT EXISTS idx_blocks_is_active ON blocks(is_active);
CREATE INDEX IF NOT EXISTS idx_blocks_sequencer ON blocks(sequencer_address);

-- Task 4: Add chain_id to transactions
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

-- Update foreign key to blocks
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_block_number_fkey;
ALTER TABLE transactions ADD CONSTRAINT fk_transactions_block 
    FOREIGN KEY (block_number, chain_id) REFERENCES blocks(block_number, chain_id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_transactions_chain_id ON transactions(chain_id);
CREATE INDEX IF NOT EXISTS idx_transactions_is_active ON transactions(is_active);
CREATE INDEX IF NOT EXISTS idx_transactions_nonce ON transactions(sender_address, nonce);

-- Task 5: Add chain_id to contract_classes
ALTER TABLE contract_classes ADD COLUMN IF NOT EXISTS chain_id INTEGER DEFAULT 1;
ALTER TABLE contract_classes ADD COLUMN IF NOT EXISTS compiled_class_hash VARCHAR(66);
ALTER TABLE contract_classes ADD COLUMN IF NOT EXISTS contract_type VARCHAR(50);

UPDATE contract_classes SET chain_id = 1 WHERE chain_id IS NULL;
ALTER TABLE contract_classes ALTER COLUMN chain_id SET NOT NULL;

ALTER TABLE contract_classes ADD CONSTRAINT fk_contract_classes_chain 
    FOREIGN KEY (chain_id) REFERENCES chain_config(chain_id) ON DELETE CASCADE;

ALTER TABLE contract_classes DROP CONSTRAINT IF EXISTS contract_classes_pkey;
ALTER TABLE contract_classes ADD CONSTRAINT contract_classes_pkey PRIMARY KEY (class_hash, chain_id);

CREATE INDEX IF NOT EXISTS idx_contract_classes_chain_id ON contract_classes(chain_id);

-- Task 6: Add chain_id to contracts
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS chain_id INTEGER DEFAULT 1;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS implementation_address VARCHAR(66);

UPDATE contracts SET chain_id = 1 WHERE chain_id IS NULL;
ALTER TABLE contracts ALTER COLUMN chain_id SET NOT NULL;

ALTER TABLE contracts ADD CONSTRAINT fk_contracts_chain 
    FOREIGN KEY (chain_id) REFERENCES chain_config(chain_id) ON DELETE CASCADE;

-- Update foreign key to contract_classes
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_class_hash_fkey;
ALTER TABLE contracts ADD CONSTRAINT fk_contracts_class 
    FOREIGN KEY (class_hash, chain_id) REFERENCES contract_classes(class_hash, chain_id) ON DELETE RESTRICT;

ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_pkey;
ALTER TABLE contracts ADD CONSTRAINT contracts_pkey PRIMARY KEY (contract_address, chain_id);

CREATE INDEX IF NOT EXISTS idx_contracts_chain_id ON contracts(chain_id);
CREATE INDEX IF NOT EXISTS idx_contracts_implementation ON contracts(implementation_address);

-- Task 7: Add chain_id to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS chain_id INTEGER DEFAULT 1;
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_index INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS keys TEXT[];
ALTER TABLE events ADD COLUMN IF NOT EXISTS data TEXT[];
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

UPDATE events SET chain_id = 1 WHERE chain_id IS NULL;
ALTER TABLE events ALTER COLUMN chain_id SET NOT NULL;

ALTER TABLE events ADD CONSTRAINT fk_events_chain 
    FOREIGN KEY (chain_id) REFERENCES chain_config(chain_id) ON DELETE CASCADE;

-- Update foreign keys
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_tx_hash_fkey;
ALTER TABLE events ADD CONSTRAINT fk_events_tx 
    FOREIGN KEY (tx_hash, chain_id) REFERENCES transactions(tx_hash, chain_id) ON DELETE CASCADE;

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_contract_address_fkey;
ALTER TABLE events ADD CONSTRAINT fk_events_contract 
    FOREIGN KEY (contract_address, chain_id) REFERENCES contracts(contract_address, chain_id) ON DELETE CASCADE;

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_block_number_fkey;
ALTER TABLE events ADD CONSTRAINT fk_events_block 
    FOREIGN KEY (block_number, chain_id) REFERENCES blocks(block_number, chain_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_events_chain_id ON events(chain_id);
CREATE INDEX IF NOT EXISTS idx_events_is_active ON events(is_active);
CREATE INDEX IF NOT EXISTS idx_events_keys ON events USING GIN(keys);

-- Add chain_id to execution_calls
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

-- Add chain_id to wallet_interactions
ALTER TABLE wallet_interactions ADD COLUMN IF NOT EXISTS chain_id INTEGER DEFAULT 1;
ALTER TABLE wallet_interactions ADD COLUMN IF NOT EXISTS interaction_type VARCHAR(20) DEFAULT 'INVOKE';

UPDATE wallet_interactions SET chain_id = 1 WHERE chain_id IS NULL;
ALTER TABLE wallet_interactions ALTER COLUMN chain_id SET NOT NULL;

ALTER TABLE wallet_interactions ADD CONSTRAINT fk_wallet_interactions_chain 
    FOREIGN KEY (chain_id) REFERENCES chain_config(chain_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_wallet_interactions_chain_id ON wallet_interactions(chain_id);

-- Add chain_id to raw_rpc_responses
ALTER TABLE raw_rpc_responses ADD COLUMN IF NOT EXISTS chain_id INTEGER DEFAULT 1;

UPDATE raw_rpc_responses SET chain_id = 1 WHERE chain_id IS NULL;
ALTER TABLE raw_rpc_responses ALTER COLUMN chain_id SET NOT NULL;

ALTER TABLE raw_rpc_responses ADD CONSTRAINT fk_raw_rpc_responses_chain 
    FOREIGN KEY (chain_id) REFERENCES chain_config(chain_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_raw_rpc_responses_chain_id ON raw_rpc_responses(chain_id);

-- Add CHECK constraints for validation
ALTER TABLE blocks ADD CONSTRAINT chk_blocks_finality_status 
    CHECK (finality_status IN ('PENDING', 'ACCEPTED_ON_L2', 'ACCEPTED_ON_L1'));

ALTER TABLE transactions ADD CONSTRAINT chk_transactions_status 
    CHECK (status IN ('ACCEPTED_ON_L2', 'ACCEPTED_ON_L1', 'REJECTED', 'PENDING'));

ALTER TABLE transactions ADD CONSTRAINT chk_transactions_type 
    CHECK (tx_type IN ('INVOKE', 'DEPLOY_ACCOUNT', 'DECLARE', 'DEPLOY', 'L1_HANDLER'));

ALTER TABLE execution_calls ADD CONSTRAINT chk_execution_calls_type 
    CHECK (call_type IN ('CALL', 'DELEGATE_CALL', 'LIBRARY_CALL'));
