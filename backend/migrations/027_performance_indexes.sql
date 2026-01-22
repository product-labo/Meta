-- Performance Optimization Indexes
-- Requirements: 8.3, 8.5

-- Wallet transactions performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_transactions_wallet_block 
ON wallet_transactions(wallet_id, block_number DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_transactions_chain_block 
ON wallet_transactions(chain, block_number DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_transactions_timestamp 
ON wallet_transactions(block_timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_transactions_function_category 
ON wallet_transactions(function_category) WHERE function_category IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_transactions_direction 
ON wallet_transactions(direction) WHERE direction IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_transactions_value 
ON wallet_transactions(value_eth) WHERE value_eth > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_transactions_contract_interaction 
ON wallet_transactions(is_contract_interaction) WHERE is_contract_interaction = true;

-- Composite index for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_transactions_wallet_chain_block 
ON wallet_transactions(wallet_id, chain, block_number DESC);

-- Wallet events performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_events_wallet_block 
ON wallet_events(wallet_id, block_number DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_events_chain_block 
ON wallet_events(chain, block_number DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_events_timestamp 
ON wallet_events(block_timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_events_event_name 
ON wallet_events(event_name);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_events_contract_event 
ON wallet_events(contract_address, event_name);

-- Composite index for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_events_wallet_chain_block 
ON wallet_events(wallet_id, chain, block_number DESC);

-- Wallets table performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallets_project_active 
ON wallets(project_id, is_active) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallets_chain_type 
ON wallets(chain_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallets_last_synced 
ON wallets(last_synced_at DESC NULLS LAST);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallets_total_transactions 
ON wallets(total_transactions DESC) WHERE total_transactions > 0;

-- Indexing jobs performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_indexing_jobs_wallet_created 
ON indexing_jobs(wallet_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_indexing_jobs_status_priority 
ON indexing_jobs(status, priority DESC) WHERE status IN ('queued', 'running');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_indexing_jobs_project_status 
ON indexing_jobs(project_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_indexing_jobs_completed 
ON indexing_jobs(completed_at DESC) WHERE completed_at IS NOT NULL;

-- Contract ABI features performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contract_abi_contract_chain 
ON contract_abi_features(contract_address, chain);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contract_abi_selector_chain 
ON contract_abi_features(selector, chain) WHERE selector IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contract_abi_category 
ON contract_abi_features(category) WHERE category IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contract_abi_feature_type 
ON contract_abi_features(feature_type);

-- Projects table performance indexes (if not already exists)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_user_created 
ON projects(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_user_active 
ON projects(user_id, is_active) WHERE is_active = true;

-- Indexing batch errors performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_indexing_batch_errors_wallet 
ON indexing_batch_errors(wallet_id, start_block);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_indexing_batch_errors_retry_count 
ON indexing_batch_errors(retry_count) WHERE retry_count > 0;

-- Partial indexes for better performance on filtered queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_transactions_recent 
ON wallet_transactions(wallet_id, block_timestamp DESC) 
WHERE block_timestamp > NOW() - INTERVAL '30 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_events_recent 
ON wallet_events(wallet_id, block_timestamp DESC) 
WHERE block_timestamp > NOW() - INTERVAL '30 days';

-- Indexes for analytics queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_transactions_daily_stats 
ON wallet_transactions(wallet_id, DATE(block_timestamp), function_category);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_events_daily_stats 
ON wallet_events(wallet_id, DATE(block_timestamp), event_name);

-- GIN indexes for JSONB columns (for decoded parameters)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_transactions_decoded_params_gin 
ON wallet_transactions USING GIN (decoded_params) 
WHERE decoded_params IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_events_decoded_params_gin 
ON wallet_events USING GIN (decoded_params) 
WHERE decoded_params IS NOT NULL;

-- Hash indexes for exact match queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_transactions_hash 
ON wallet_transactions USING HASH (transaction_hash);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_events_tx_hash 
ON wallet_events USING HASH (transaction_hash);

-- Covering indexes for common SELECT queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallets_project_summary 
ON wallets(project_id) 
INCLUDE (address, chain, chain_type, total_transactions, total_events, last_synced_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_indexing_jobs_status_summary 
ON indexing_jobs(wallet_id) 
INCLUDE (status, current_block, transactions_found, events_found, error_message);

-- Expression indexes for computed values
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_transactions_value_usd 
ON wallet_transactions((value_eth::numeric * 2000)) -- Assuming ETH price for example
WHERE value_eth::numeric > 0;

-- Indexes for text search (if needed for future features)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contract_abi_name_search 
ON contract_abi_features USING GIN (to_tsvector('english', name)) 
WHERE name IS NOT NULL;

-- Statistics update for better query planning
ANALYZE wallet_transactions;
ANALYZE wallet_events;
ANALYZE wallets;
ANALYZE indexing_jobs;
ANALYZE contract_abi_features;
ANALYZE projects;

-- Comments for documentation
COMMENT ON INDEX idx_wallet_transactions_wallet_block IS 'Primary index for wallet transaction queries ordered by block';
COMMENT ON INDEX idx_wallet_events_wallet_block IS 'Primary index for wallet event queries ordered by block';
COMMENT ON INDEX idx_wallets_project_active IS 'Index for active wallets per project';
COMMENT ON INDEX idx_indexing_jobs_status_priority IS 'Index for job queue processing';
COMMENT ON INDEX idx_wallet_transactions_decoded_params_gin IS 'GIN index for searching decoded transaction parameters';
COMMENT ON INDEX idx_wallet_events_decoded_params_gin IS 'GIN index for searching decoded event parameters';