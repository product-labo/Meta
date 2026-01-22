-- =============================================================================
-- COMPREHENSIVE BLOCKCHAIN ANALYTICS DATABASE SCHEMA
-- Chain-Specific Tables with Clear Relationships
-- =============================================================================

-- =============================================================================
-- LEVEL 0: GLOBAL REGISTRY (Chain-Agnostic)
-- =============================================================================

-- Master chain registry
CREATE TABLE chains (
    chain_id SERIAL PRIMARY KEY,
    chain_name VARCHAR(50) UNIQUE NOT NULL, -- 'lisk', 'starknet', 'ethereum'
    chain_type VARCHAR(20) NOT NULL, -- 'L1', 'L2', 'sidechain'
    native_token VARCHAR(10) NOT NULL, -- 'LSK', 'ETH', 'STRK'
    rpc_endpoint VARCHAR(255),
    explorer_url VARCHAR(255),
    block_time_seconds INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Global project registry (cross-chain projects)
CREATE TABLE projects (
    project_id SERIAL PRIMARY KEY,
    project_name VARCHAR(100) UNIQUE NOT NULL,
    project_slug VARCHAR(50) UNIQUE NOT NULL, -- 'uniswap', 'aave', 'compound'
    primary_category VARCHAR(50) NOT NULL, -- 'DEX', 'Lending', 'Gaming'
    subcategory VARCHAR(50), -- 'AMM', 'Order Book', 'P2E'
    website VARCHAR(255),
    description TEXT,
    founded_date DATE,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cross-chain bridge registry
CREATE TABLE bridges (
    bridge_id SERIAL PRIMARY KEY,
    bridge_name VARCHAR(100) NOT NULL,
    source_chain_id INTEGER REFERENCES chains(chain_id),
    dest_chain_id INTEGER REFERENCES chains(chain_id),
    bridge_contract_source VARCHAR(66),
    bridge_contract_dest VARCHAR(66),
    is_active BOOLEAN DEFAULT true
);

-- =============================================================================
-- LEVEL 1: CHAIN-SPECIFIC FOUNDATIONAL DATA
-- Template: {chain_name}_table_name
-- =============================================================================

-- BLOCKS (Foundation for all temporal data)
-- Example: lisk_blocks, starknet_blocks, ethereum_blocks
CREATE TABLE IF NOT EXISTS {chain}_blocks (
    block_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chains(chain_id),
    block_number BIGINT UNIQUE NOT NULL,
    block_hash VARCHAR(66) UNIQUE NOT NULL,
    parent_hash VARCHAR(66),
    timestamp BIGINT NOT NULL,
    gas_limit BIGINT,
    gas_used BIGINT,
    base_fee_per_gas BIGINT,
    difficulty BIGINT,
    total_difficulty BIGINT,
    size_bytes INTEGER,
    transaction_count INTEGER DEFAULT 0,
    finality_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted_l2', 'accepted_l1'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_{chain}_blocks_number (block_number),
    INDEX idx_{chain}_blocks_hash (block_hash),
    INDEX idx_{chain}_blocks_timestamp (timestamp),
    INDEX idx_{chain}_blocks_chain (chain_id)
);

-- TRANSACTIONS (Core transaction data)
CREATE TABLE IF NOT EXISTS {chain}_transactions (
    tx_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chains(chain_id),
    tx_hash VARCHAR(66) UNIQUE NOT NULL,
    block_number BIGINT NOT NULL,
    tx_index INTEGER NOT NULL,
    from_address VARCHAR(66) NOT NULL,
    to_address VARCHAR(66),
    value NUMERIC(78,0) DEFAULT 0, -- Support large numbers
    gas_limit BIGINT,
    gas_price BIGINT,
    gas_used BIGINT,
    nonce BIGINT,
    input_data TEXT,
    tx_type VARCHAR(20) NOT NULL, -- 'invoke', 'deploy', 'declare', 'transfer'
    status VARCHAR(20) DEFAULT 'pending', -- 'success', 'failed', 'pending'
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key relationships
    FOREIGN KEY (chain_id, block_number) REFERENCES {chain}_blocks(chain_id, block_number),
    
    -- Indexes
    INDEX idx_{chain}_tx_hash (tx_hash),
    INDEX idx_{chain}_tx_block (block_number),
    INDEX idx_{chain}_tx_from (from_address),
    INDEX idx_{chain}_tx_to (to_address),
    INDEX idx_{chain}_tx_status (status)
);

-- TRANSACTION RECEIPTS (Execution results)
CREATE TABLE IF NOT EXISTS {chain}_transaction_receipts (
    receipt_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chains(chain_id),
    tx_hash VARCHAR(66) UNIQUE NOT NULL,
    block_number BIGINT NOT NULL,
    gas_used BIGINT NOT NULL,
    effective_gas_price BIGINT,
    cumulative_gas_used BIGINT,
    status INTEGER NOT NULL, -- 1 = success, 0 = failed
    logs_bloom TEXT,
    contract_address VARCHAR(66), -- For contract creation
    revert_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (chain_id, tx_hash) REFERENCES {chain}_transactions(chain_id, tx_hash),
    INDEX idx_{chain}_receipts_tx (tx_hash),
    INDEX idx_{chain}_receipts_status (status)
);

-- =============================================================================
-- LEVEL 2: CONTRACT INTELLIGENCE
-- =============================================================================

-- CONTRACTS (Smart contract registry)
CREATE TABLE IF NOT EXISTS {chain}_contracts (
    contract_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chains(chain_id),
    contract_address VARCHAR(66) UNIQUE NOT NULL,
    deployer_address VARCHAR(66) NOT NULL,
    deployment_tx_hash VARCHAR(66) NOT NULL,
    deployment_block BIGINT NOT NULL,
    contract_name VARCHAR(100),
    is_verified BOOLEAN DEFAULT false,
    source_code TEXT,
    abi_json JSONB,
    compiler_version VARCHAR(50),
    optimization_enabled BOOLEAN,
    proxy_type VARCHAR(20), -- 'transparent', 'uups', 'beacon', 'none'
    implementation_address VARCHAR(66), -- For proxy contracts
    is_token BOOLEAN DEFAULT false,
    token_standard VARCHAR(20), -- 'ERC20', 'ERC721', 'ERC1155'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (chain_id, deployment_tx_hash) REFERENCES {chain}_transactions(chain_id, tx_hash),
    FOREIGN KEY (chain_id, deployment_block) REFERENCES {chain}_blocks(chain_id, block_number),
    
    INDEX idx_{chain}_contracts_address (contract_address),
    INDEX idx_{chain}_contracts_deployer (deployer_address),
    INDEX idx_{chain}_contracts_block (deployment_block)
);

-- FUNCTION SIGNATURES (Contract function definitions)
CREATE TABLE IF NOT EXISTS {chain}_function_signatures (
    signature_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chains(chain_id),
    contract_id BIGINT NOT NULL REFERENCES {chain}_contracts(contract_id),
    function_selector VARCHAR(10) NOT NULL, -- '0x12345678'
    function_name VARCHAR(100) NOT NULL,
    function_signature TEXT NOT NULL, -- 'transfer(address,uint256)'
    input_types TEXT[], -- ['address', 'uint256']
    output_types TEXT[], -- ['bool']
    is_payable BOOLEAN DEFAULT false,
    is_view BOOLEAN DEFAULT false,
    is_pure BOOLEAN DEFAULT false,
    access_level VARCHAR(20) DEFAULT 'external', -- 'public', 'external', 'internal', 'private'
    gas_estimate BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(contract_id, function_selector),
    INDEX idx_{chain}_func_sig_selector (function_selector),
    INDEX idx_{chain}_func_sig_contract (contract_id),
    INDEX idx_{chain}_func_sig_name (function_name)
);

-- EVENT SIGNATURES (Contract event definitions)
CREATE TABLE IF NOT EXISTS {chain}_event_signatures (
    event_sig_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chains(chain_id),
    contract_id BIGINT NOT NULL REFERENCES {chain}_contracts(contract_id),
    event_selector VARCHAR(66) NOT NULL, -- Full keccak256 hash
    event_name VARCHAR(100) NOT NULL,
    event_signature TEXT NOT NULL, -- 'Transfer(address,address,uint256)'
    indexed_params TEXT[], -- ['address', 'address']
    non_indexed_params TEXT[], -- ['uint256']
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(contract_id, event_selector),
    INDEX idx_{chain}_event_sig_selector (event_selector),
    INDEX idx_{chain}_event_sig_contract (contract_id)
);

-- =============================================================================
-- LEVEL 3: TOKEN & ASSET TRACKING
-- =============================================================================

-- TOKENS (Token contract metadata)
CREATE TABLE IF NOT EXISTS {chain}_tokens (
    token_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chains(chain_id),
    contract_id BIGINT NOT NULL REFERENCES {chain}_contracts(contract_id),
    token_address VARCHAR(66) UNIQUE NOT NULL,
    name VARCHAR(100),
    symbol VARCHAR(20),
    decimals INTEGER DEFAULT 18,
    total_supply NUMERIC(78,0),
    token_type VARCHAR(20) NOT NULL, -- 'ERC20', 'ERC721', 'ERC1155'
    is_mintable BOOLEAN DEFAULT false,
    is_burnable BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_{chain}_tokens_address (token_address),
    INDEX idx_{chain}_tokens_symbol (symbol),
    INDEX idx_{chain}_tokens_type (token_type)
);

-- TOKEN TRANSFERS (All token movement)
CREATE TABLE IF NOT EXISTS {chain}_token_transfers (
    transfer_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chains(chain_id),
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    log_index INTEGER NOT NULL,
    token_address VARCHAR(66) NOT NULL,
    from_address VARCHAR(66),
    to_address VARCHAR(66),
    amount NUMERIC(78,0) NOT NULL,
    token_id NUMERIC(78,0), -- For NFTs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (chain_id, tx_hash) REFERENCES {chain}_transactions(chain_id, tx_hash),
    FOREIGN KEY (chain_id, token_address) REFERENCES {chain}_tokens(chain_id, token_address),
    
    INDEX idx_{chain}_transfers_tx (tx_hash),
    INDEX idx_{chain}_transfers_token (token_address),
    INDEX idx_{chain}_transfers_from (from_address),
    INDEX idx_{chain}_transfers_to (to_address),
    INDEX idx_{chain}_transfers_block (block_number)
);

-- =============================================================================
-- LEVEL 4: INTERACTION & EVENT DATA
-- =============================================================================

-- FUNCTION CALLS (Detailed function execution)
CREATE TABLE IF NOT EXISTS {chain}_function_calls (
    call_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chains(chain_id),
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    signature_id BIGINT NOT NULL REFERENCES {chain}_function_signatures(signature_id),
    caller_address VARCHAR(66) NOT NULL,
    contract_address VARCHAR(66) NOT NULL,
    input_data TEXT,
    output_data TEXT,
    gas_used BIGINT,
    gas_price BIGINT,
    value_sent NUMERIC(78,0) DEFAULT 0,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    call_trace_address INTEGER[], -- For internal calls
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (chain_id, tx_hash) REFERENCES {chain}_transactions(chain_id, tx_hash),
    
    INDEX idx_{chain}_calls_tx (tx_hash),
    INDEX idx_{chain}_calls_signature (signature_id),
    INDEX idx_{chain}_calls_caller (caller_address),
    INDEX idx_{chain}_calls_contract (contract_address),
    INDEX idx_{chain}_calls_block (block_number),
    INDEX idx_{chain}_calls_success (success)
);

-- EVENTS (Smart contract events)
CREATE TABLE IF NOT EXISTS {chain}_events (
    event_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chains(chain_id),
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    log_index INTEGER NOT NULL,
    contract_address VARCHAR(66) NOT NULL,
    event_sig_id BIGINT REFERENCES {chain}_event_signatures(event_sig_id),
    topic0 VARCHAR(66), -- Event signature hash
    topic1 VARCHAR(66), -- First indexed parameter
    topic2 VARCHAR(66), -- Second indexed parameter  
    topic3 VARCHAR(66), -- Third indexed parameter
    data TEXT, -- Non-indexed parameters
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (chain_id, tx_hash) REFERENCES {chain}_transactions(chain_id, tx_hash),
    
    INDEX idx_{chain}_events_tx (tx_hash),
    INDEX idx_{chain}_events_contract (contract_address),
    INDEX idx_{chain}_events_topic0 (topic0),
    INDEX idx_{chain}_events_block (block_number),
    INDEX idx_{chain}_events_log_index (log_index)
);

-- =============================================================================
-- LEVEL 5: WALLET & USER ANALYTICS
-- =============================================================================

-- WALLETS (Wallet profiles and metadata)
CREATE TABLE IF NOT EXISTS {chain}_wallets (
    wallet_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chains(chain_id),
    wallet_address VARCHAR(66) UNIQUE NOT NULL,
    wallet_type VARCHAR(20) DEFAULT 'eoa', -- 'eoa', 'contract', 'multisig'
    first_seen_block BIGINT,
    last_active_block BIGINT,
    transaction_count BIGINT DEFAULT 0,
    total_gas_used BIGINT DEFAULT 0,
    total_value_sent NUMERIC(78,0) DEFAULT 0,
    total_value_received NUMERIC(78,0) DEFAULT 0,
    is_contract BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_{chain}_wallets_address (wallet_address),
    INDEX idx_{chain}_wallets_type (wallet_type),
    INDEX idx_{chain}_wallets_first_seen (first_seen_block)
);

-- WALLET LABELS (Address labeling and classification)
CREATE TABLE IF NOT EXISTS {chain}_wallet_labels (
    label_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chains(chain_id),
    wallet_address VARCHAR(66) NOT NULL,
    label VARCHAR(100) NOT NULL,
    label_type VARCHAR(50) NOT NULL, -- 'exchange', 'defi', 'whale', 'bot', 'bridge'
    confidence_score DECIMAL(3,2) DEFAULT 1.0, -- 0.0 to 1.0
    source VARCHAR(50) NOT NULL, -- 'manual', 'algorithm', 'community'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (chain_id, wallet_address) REFERENCES {chain}_wallets(chain_id, wallet_address),
    INDEX idx_{chain}_labels_address (wallet_address),
    INDEX idx_{chain}_labels_type (label_type)
);

-- =============================================================================
-- LEVEL 6: PROJECT & CLASSIFICATION
-- =============================================================================

-- PROJECT CONTRACTS (Link contracts to projects)
CREATE TABLE IF NOT EXISTS {chain}_project_contracts (
    id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chains(chain_id),
    project_id INTEGER NOT NULL REFERENCES projects(project_id),
    contract_id BIGINT NOT NULL REFERENCES {chain}_contracts(contract_id),
    contract_role VARCHAR(50) NOT NULL, -- 'main', 'proxy', 'implementation', 'helper'
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(chain_id, project_id, contract_id),
    INDEX idx_{chain}_proj_contracts_project (project_id),
    INDEX idx_{chain}_proj_contracts_contract (contract_id)
);

-- CONTRACT CATEGORIES (Contract classification)
CREATE TABLE IF NOT EXISTS {chain}_contract_categories (
    category_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chains(chain_id),
    contract_id BIGINT NOT NULL REFERENCES {chain}_contracts(contract_id),
    primary_category VARCHAR(50) NOT NULL, -- 'DEX', 'Lending', 'Gaming', 'NFT'
    subcategory VARCHAR(50), -- 'AMM', 'Order Book', 'Yield Farming'
    confidence_score DECIMAL(3,2) DEFAULT 1.0,
    classification_method VARCHAR(20) DEFAULT 'manual', -- 'manual', 'auto', 'ai'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(chain_id, contract_id),
    INDEX idx_{chain}_categories_primary (primary_category),
    INDEX idx_{chain}_categories_sub (subcategory)
);

-- FUNCTION CATEGORIES (Function classification)
CREATE TABLE IF NOT EXISTS {chain}_function_categories (
    func_cat_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chains(chain_id),
    signature_id BIGINT NOT NULL REFERENCES {chain}_function_signatures(signature_id),
    function_category VARCHAR(50) NOT NULL, -- 'swap', 'transfer', 'mint', 'burn'
    business_purpose VARCHAR(100), -- 'token_exchange', 'liquidity_provision', 'governance'
    risk_level VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
    gas_efficiency VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(chain_id, signature_id),
    INDEX idx_{chain}_func_categories_category (function_category),
    INDEX idx_{chain}_func_categories_purpose (business_purpose)
);

-- =============================================================================
-- LEVEL 7: ANALYTICS & METRICS
-- =============================================================================

-- DAILY METRICS (Aggregated daily statistics)
CREATE TABLE IF NOT EXISTS {chain}_daily_metrics (
    metric_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chains(chain_id),
    date DATE NOT NULL,
    total_transactions BIGINT DEFAULT 0,
    successful_transactions BIGINT DEFAULT 0,
    failed_transactions BIGINT DEFAULT 0,
    unique_addresses BIGINT DEFAULT 0,
    total_gas_used BIGINT DEFAULT 0,
    average_gas_price BIGINT DEFAULT 0,
    total_value_transferred NUMERIC(78,0) DEFAULT 0,
    new_contracts BIGINT DEFAULT 0,
    active_contracts BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(chain_id, date),
    INDEX idx_{chain}_daily_date (date)
);

-- VALUE FLOWS (Financial flow analysis)
CREATE TABLE IF NOT EXISTS {chain}_value_flows (
    flow_id BIGSERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chains(chain_id),
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    from_address VARCHAR(66) NOT NULL,
    to_address VARCHAR(66) NOT NULL,
    token_address VARCHAR(66), -- NULL for native token
    amount NUMERIC(78,0) NOT NULL,
    usd_value DECIMAL(20,8), -- USD value at time of transaction
    flow_type VARCHAR(20) NOT NULL, -- 'transfer', 'fee', 'mint', 'burn'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (chain_id, tx_hash) REFERENCES {chain}_transactions(chain_id, tx_hash),
    INDEX idx_{chain}_flows_tx (tx_hash),
    INDEX idx_{chain}_flows_from (from_address),
    INDEX idx_{chain}_flows_to (to_address),
    INDEX idx_{chain}_flows_token (token_address),
    INDEX idx_{chain}_flows_type (flow_type)
);

-- =============================================================================
-- LEVEL 8: CROSS-CHAIN & BRIDGE DATA
-- =============================================================================

-- BRIDGE TRANSACTIONS (Cross-chain transfers)
CREATE TABLE bridge_transactions (
    bridge_tx_id BIGSERIAL PRIMARY KEY,
    bridge_id INTEGER NOT NULL REFERENCES bridges(bridge_id),
    source_chain_id INTEGER NOT NULL REFERENCES chains(chain_id),
    dest_chain_id INTEGER NOT NULL REFERENCES chains(chain_id),
    source_tx_hash VARCHAR(66) NOT NULL,
    dest_tx_hash VARCHAR(66),
    source_block_number BIGINT NOT NULL,
    dest_block_number BIGINT,
    from_address VARCHAR(66) NOT NULL,
    to_address VARCHAR(66) NOT NULL,
    token_address_source VARCHAR(66),
    token_address_dest VARCHAR(66),
    amount NUMERIC(78,0) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_bridge_tx_source (source_tx_hash),
    INDEX idx_bridge_tx_dest (dest_tx_hash),
    INDEX idx_bridge_tx_status (status)
);

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE chains IS 'Master registry of all supported blockchain networks';
COMMENT ON TABLE projects IS 'Global registry of DeFi/Web3 projects across all chains';
COMMENT ON TABLE bridges IS 'Cross-chain bridge configurations and metadata';

-- Chain-specific table comments will be added per chain
-- Example: COMMENT ON TABLE lisk_blocks IS 'Lisk blockchain blocks with full metadata';
-- Example: COMMENT ON TABLE starknet_contracts IS 'Starknet smart contracts with deployment info';
