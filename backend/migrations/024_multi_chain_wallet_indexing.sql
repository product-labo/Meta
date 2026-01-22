-- Migration: 024_multi_chain_wallet_indexing
-- Description: Adds tables and columns for multi-chain wallet indexing system
-- Requirements: 4.4, 8.2, 8.3

-- ============================================================================
-- 1. Extend wallets table with multi-chain indexing support
-- ============================================================================

-- Add new columns to existing wallets table
ALTER TABLE wallets 
ADD COLUMN IF NOT EXISTS chain VARCHAR(50) DEFAULT 'ethereum',
ADD COLUMN IF NOT EXISTS chain_type VARCHAR(20) DEFAULT 'evm',
ADD COLUMN IF NOT EXISTS last_indexed_block BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS total_transactions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_events INTEGER DEFAULT 0;

-- Add comments for new columns
COMMENT ON COLUMN wallets.chain IS 'Blockchain network name (ethereum, polygon, lisk, starknet-mainnet, etc.)';
COMMENT ON COLUMN wallets.chain_type IS 'Chain type: evm or starknet';
COMMENT ON COLUMN wallets.last_indexed_block IS 'Last block number that was indexed for this wallet';
COMMENT ON COLUMN wallets.last_synced_at IS 'Timestamp of last successful sync';
COMMENT ON COLUMN wallets.total_transactions IS 'Total number of transactions indexed';
COMMENT ON COLUMN wallets.total_events IS 'Total number of events indexed';

-- Update existing constraint to include chain (drop existing unique constraint first)
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS wallets_address_network_key;
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS wallets_project_id_address_chain_key;
ALTER TABLE wallets ADD CONSTRAINT wallets_project_id_address_chain_key UNIQUE (project_id, address, chain);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallets_chain ON wallets(chain);
CREATE INDEX IF NOT EXISTS idx_wallets_chain_type ON wallets(chain_type);
CREATE INDEX IF NOT EXISTS idx_wallets_last_synced ON wallets(last_synced_at);

-- ============================================================================
-- 2. Create indexing_jobs table for job tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS indexing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  start_block BIGINT NOT NULL,
  end_block BIGINT NOT NULL,
  current_block BIGINT DEFAULT 0,
  transactions_found INTEGER DEFAULT 0,
  events_found INTEGER DEFAULT 0,
  blocks_per_second DECIMAL(10,2) DEFAULT 0,
  error_message TEXT,
  priority INTEGER DEFAULT 0,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT indexing_jobs_status_check CHECK (status IN ('queued', 'running', 'completed', 'failed', 'paused'))
);

-- Add comments
COMMENT ON TABLE indexing_jobs IS 'Tracks indexing jobs for wallet data synchronization';
COMMENT ON COLUMN indexing_jobs.status IS 'Job status: queued, running, completed, failed, or paused';
COMMENT ON COLUMN indexing_jobs.priority IS 'Job priority for queue ordering (higher = more priority)';
COMMENT ON COLUMN indexing_jobs.blocks_per_second IS 'Processing speed metric';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_indexing_jobs_wallet ON indexing_jobs(wallet_id);
CREATE INDEX IF NOT EXISTS idx_indexing_jobs_project ON indexing_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_indexing_jobs_status ON indexing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_indexing_jobs_priority ON indexing_jobs(priority DESC);
CREATE INDEX IF NOT EXISTS idx_indexing_jobs_created ON indexing_jobs(created_at);

-- ============================================================================
-- 3. Create contract_abi_features table for ABI storage
-- ============================================================================

CREATE TABLE IF NOT EXISTS contract_abi_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_address VARCHAR(66) NOT NULL,
  chain VARCHAR(50) NOT NULL,
  feature_type VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  signature TEXT NOT NULL,
  selector VARCHAR(10),
  category VARCHAR(50),
  inputs JSONB,
  outputs JSONB,
  state_mutability VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT contract_abi_features_unique UNIQUE(contract_address, chain, selector),
  CONSTRAINT feature_type_check CHECK (feature_type IN ('function', 'event', 'custom')),
  CONSTRAINT category_check CHECK (category IN ('swap', 'bridge', 'transfer', 'custom', NULL))
);

-- Add comments
COMMENT ON TABLE contract_abi_features IS 'Stores parsed ABI features for contract interaction decoding';
COMMENT ON COLUMN contract_abi_features.feature_type IS 'Type of ABI feature: function, event, or custom';
COMMENT ON COLUMN contract_abi_features.selector IS 'Function selector (first 4 bytes of keccak256 hash) or event topic';
COMMENT ON COLUMN contract_abi_features.category IS 'Function category: swap, bridge, transfer, or custom';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_abi_features_contract ON contract_abi_features(contract_address);
CREATE INDEX IF NOT EXISTS idx_abi_features_chain ON contract_abi_features(chain);
CREATE INDEX IF NOT EXISTS idx_abi_features_selector ON contract_abi_features(selector);
CREATE INDEX IF NOT EXISTS idx_abi_features_category ON contract_abi_features(category);
CREATE INDEX IF NOT EXISTS idx_abi_features_type ON contract_abi_features(feature_type);

-- ============================================================================
-- 4. Create wallet_transactions unified table
-- ============================================================================

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  chain VARCHAR(50) NOT NULL,
  chain_type VARCHAR(20) NOT NULL DEFAULT 'evm',
  transaction_hash VARCHAR(66) NOT NULL,
  block_number BIGINT NOT NULL,
  block_timestamp TIMESTAMP NOT NULL,
  from_address VARCHAR(66) NOT NULL,
  to_address VARCHAR(66),
  value_eth DECIMAL(36,18) DEFAULT 0,
  gas_used BIGINT,
  gas_price BIGINT,
  function_selector VARCHAR(10),
  function_name VARCHAR(255),
  function_category VARCHAR(50),
  decoded_params JSONB,
  transaction_status INTEGER,
  is_contract_interaction BOOLEAN DEFAULT false,
  direction VARCHAR(10),
  raw_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT wallet_transactions_unique UNIQUE(wallet_id, chain, transaction_hash),
  CONSTRAINT chain_type_check CHECK (chain_type IN ('evm', 'starknet')),
  CONSTRAINT direction_check CHECK (direction IN ('incoming', 'outgoing', 'internal', NULL))
);

-- Add comments
COMMENT ON TABLE wallet_transactions IS 'Unified storage for wallet transactions across all chains';
COMMENT ON COLUMN wallet_transactions.chain_type IS 'Chain type: evm or starknet';
COMMENT ON COLUMN wallet_transactions.direction IS 'Transaction direction: incoming, outgoing, or internal';
COMMENT ON COLUMN wallet_transactions.value_eth IS 'Transaction value in native token (ETH, MATIC, etc.)';
COMMENT ON COLUMN wallet_transactions.decoded_params IS 'Decoded function parameters from ABI';
COMMENT ON COLUMN wallet_transactions.raw_data IS 'Raw transaction data for fallback';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_chain ON wallet_transactions(chain);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_block ON wallet_transactions(block_number);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_hash ON wallet_transactions(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_from ON wallet_transactions(from_address);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_to ON wallet_transactions(to_address);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_function ON wallet_transactions(function_name);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_category ON wallet_transactions(function_category);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_contract_interaction ON wallet_transactions(is_contract_interaction);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_timestamp ON wallet_transactions(block_timestamp);

-- ============================================================================
-- 5. Create wallet_events table
-- ============================================================================

CREATE TABLE IF NOT EXISTS wallet_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  transaction_hash VARCHAR(66) NOT NULL,
  chain VARCHAR(50) NOT NULL,
  chain_type VARCHAR(20) NOT NULL DEFAULT 'evm',
  block_number BIGINT NOT NULL,
  block_timestamp TIMESTAMP NOT NULL,
  event_signature VARCHAR(66),
  event_name VARCHAR(255) NOT NULL,
  contract_address VARCHAR(66) NOT NULL,
  decoded_params JSONB NOT NULL,
  log_index INTEGER NOT NULL,
  raw_topics TEXT[],
  raw_data TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT wallet_events_unique UNIQUE(wallet_id, chain, transaction_hash, log_index),
  CONSTRAINT event_chain_type_check CHECK (chain_type IN ('evm', 'starknet'))
);

-- Add comments
COMMENT ON TABLE wallet_events IS 'Stores decoded events emitted by contracts in wallet transactions';
COMMENT ON COLUMN wallet_events.event_signature IS 'Keccak256 hash of event signature (topic0)';
COMMENT ON COLUMN wallet_events.decoded_params IS 'Decoded event parameters from ABI';
COMMENT ON COLUMN wallet_events.log_index IS 'Index of log entry within the transaction';
COMMENT ON COLUMN wallet_events.raw_topics IS 'Raw event topics array';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallet_events_wallet ON wallet_events(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_events_chain ON wallet_events(chain);
CREATE INDEX IF NOT EXISTS idx_wallet_events_tx_hash ON wallet_events(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_wallet_events_name ON wallet_events(event_name);
CREATE INDEX IF NOT EXISTS idx_wallet_events_block ON wallet_events(block_number);
CREATE INDEX IF NOT EXISTS idx_wallet_events_contract ON wallet_events(contract_address);
CREATE INDEX IF NOT EXISTS idx_wallet_events_timestamp ON wallet_events(block_timestamp);
CREATE INDEX IF NOT EXISTS idx_wallet_events_signature ON wallet_events(event_signature);
