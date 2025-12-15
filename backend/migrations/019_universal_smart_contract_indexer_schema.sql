-- =====================================================
-- Universal Smart Contract Function Indexer Schema
-- Migration: 019_universal_smart_contract_indexer_schema
-- Description: Comprehensive database schema for indexing all smart contract functions
-- =====================================================

-- =====================================================
-- Function Signatures Table
-- Stores function selector to signature mappings with categories
-- =====================================================
CREATE TABLE IF NOT EXISTS function_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Function identification
    selector VARCHAR(10) NOT NULL UNIQUE, -- 0x12345678 format
    signature TEXT NOT NULL, -- transfer(address,uint256)
    function_name VARCHAR(100) NOT NULL, -- transfer
    
    -- Categorization
    category VARCHAR(50) NOT NULL, -- erc20, erc721, dex, lending, etc.
    subcategory VARCHAR(50), -- transfer, approval, swap, etc.
    protocol VARCHAR(100), -- uniswap, compound, aave, etc.
    
    -- ABI Information
    abi_inputs JSONB, -- Parameter types and names
    abi_outputs JSONB, -- Return types and names
    is_payable BOOLEAN DEFAULT false,
    is_view BOOLEAN DEFAULT false,
    
    -- Source tracking
    source VARCHAR(50) NOT NULL, -- 4byte, manual, contract_abi, etc.
    source_url TEXT,
    confidence_score INTEGER DEFAULT 100, -- 0-100, higher = more confident
    
    -- Usage statistics
    usage_count BIGINT DEFAULT 0,
    first_seen TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for function signatures
CREATE INDEX IF NOT EXISTS idx_function_signatures_selector ON function_signatures(selector);
CREATE INDEX IF NOT EXISTS idx_function_signatures_category ON function_signatures(category);
CREATE INDEX IF NOT EXISTS idx_function_signatures_subcategory ON function_signatures(subcategory);
CREATE INDEX IF NOT EXISTS idx_function_signatures_protocol ON function_signatures(protocol);
CREATE INDEX IF NOT EXISTS idx_function_signatures_name ON function_signatures(function_name);
CREATE INDEX IF NOT EXISTS idx_function_signatures_usage ON function_signatures(usage_count DESC);

-- =====================================================
-- Function Calls Table
-- Stores decoded function calls from transactions
-- =====================================================
CREATE TABLE IF NOT EXISTS function_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Transaction reference
    transaction_hash VARCHAR(66) NOT NULL REFERENCES transactions(txid),
    block_number BIGINT NOT NULL,
    block_timestamp TIMESTAMP NOT NULL,
    transaction_index INTEGER NOT NULL,
    
    -- Contract information
    contract_address VARCHAR(42) NOT NULL,
    contract_name VARCHAR(100), -- ENS name or known contract name
    
    -- Function identification
    function_selector VARCHAR(10) NOT NULL,
    function_signature TEXT,
    function_name VARCHAR(100),
    
    -- Categorization (denormalized for performance)
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),
    protocol VARCHAR(100),
    
    -- Call details
    caller_address VARCHAR(42) NOT NULL, -- tx.from
    value_eth DECIMAL(30, 18) DEFAULT 0, -- ETH value sent
    gas_used BIGINT,
    gas_price BIGINT,
    
    -- Decoded parameters
    input_data TEXT NOT NULL, -- Raw input data
    decoded_params JSONB, -- Decoded parameters with names and values
    param_count INTEGER DEFAULT 0,
    
    -- Call result
    success BOOLEAN NOT NULL,
    revert_reason TEXT, -- If failed, the revert reason
    output_data TEXT, -- Raw output data
    decoded_outputs JSONB, -- Decoded return values
    
    -- Internal call tracking
    is_internal_call BOOLEAN DEFAULT false,
    parent_call_id UUID REFERENCES function_calls(id),
    call_depth INTEGER DEFAULT 0,
    call_type VARCHAR(20) DEFAULT 'CALL', -- CALL, DELEGATECALL, STATICCALL
    
    -- Proxy resolution
    is_proxy_call BOOLEAN DEFAULT false,
    implementation_address VARCHAR(42), -- For proxy contracts
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_function_call UNIQUE (transaction_hash, transaction_index, call_depth)
);

-- Indexes for function calls
CREATE INDEX IF NOT EXISTS idx_function_calls_tx_hash ON function_calls(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_function_calls_block ON function_calls(block_number);
CREATE INDEX IF NOT EXISTS idx_function_calls_timestamp ON function_calls(block_timestamp);
CREATE INDEX IF NOT EXISTS idx_function_calls_contract ON function_calls(contract_address);
CREATE INDEX IF NOT EXISTS idx_function_calls_caller ON function_calls(caller_address);
CREATE INDEX IF NOT EXISTS idx_function_calls_selector ON function_calls(function_selector);
CREATE INDEX IF NOT EXISTS idx_function_calls_category ON function_calls(category);
CREATE INDEX IF NOT EXISTS idx_function_calls_subcategory ON function_calls(subcategory);
CREATE INDEX IF NOT EXISTS idx_function_calls_protocol ON function_calls(protocol);
CREATE INDEX IF NOT EXISTS idx_function_calls_success ON function_calls(success);
CREATE INDEX IF NOT EXISTS idx_function_calls_internal ON function_calls(is_internal_call);
CREATE INDEX IF NOT EXISTS idx_function_calls_proxy ON function_calls(is_proxy_call);
CREATE INDEX IF NOT EXISTS idx_function_calls_parent ON function_calls(parent_call_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_function_calls_contract_category ON function_calls(contract_address, category);
CREATE INDEX IF NOT EXISTS idx_function_calls_caller_category ON function_calls(caller_address, category);
CREATE INDEX IF NOT EXISTS idx_function_calls_time_category ON function_calls(block_timestamp, category);

-- =====================================================
-- Event Logs Table
-- Stores decoded event logs from transaction receipts
-- =====================================================
CREATE TABLE IF NOT EXISTS event_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Transaction reference
    transaction_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    block_timestamp TIMESTAMP NOT NULL,
    log_index INTEGER NOT NULL,
    
    -- Contract information
    contract_address VARCHAR(42) NOT NULL,
    contract_name VARCHAR(100),
    
    -- Event identification
    event_signature VARCHAR(66) NOT NULL, -- keccak256 hash of event signature
    event_name VARCHAR(100),
    topic0 VARCHAR(66) NOT NULL, -- First topic (event signature hash)
    
    -- Categorization
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),
    protocol VARCHAR(100),
    
    -- Event data
    topics JSONB NOT NULL, -- All topics as array
    data TEXT NOT NULL, -- Raw event data
    decoded_data JSONB, -- Decoded event parameters
    
    -- Related function call
    function_call_id UUID REFERENCES function_calls(id),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_event_log UNIQUE (transaction_hash, log_index)
);

-- Indexes for event logs
CREATE INDEX IF NOT EXISTS idx_event_logs_tx_hash ON event_logs(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_event_logs_block ON event_logs(block_number);
CREATE INDEX IF NOT EXISTS idx_event_logs_timestamp ON event_logs(block_timestamp);
CREATE INDEX IF NOT EXISTS idx_event_logs_contract ON event_logs(contract_address);
CREATE INDEX IF NOT EXISTS idx_event_logs_signature ON event_logs(event_signature);
CREATE INDEX IF NOT EXISTS idx_event_logs_name ON event_logs(event_name);
CREATE INDEX IF NOT EXISTS idx_event_logs_category ON event_logs(category);
CREATE INDEX IF NOT EXISTS idx_event_logs_subcategory ON event_logs(subcategory);
CREATE INDEX IF NOT EXISTS idx_event_logs_protocol ON event_logs(protocol);
CREATE INDEX IF NOT EXISTS idx_event_logs_function_call ON event_logs(function_call_id);

-- =====================================================
-- Internal Calls Table
-- Stores internal calls from transaction traces
-- =====================================================
CREATE TABLE IF NOT EXISTS internal_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Transaction reference
    transaction_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    block_timestamp TIMESTAMP NOT NULL,
    
    -- Call hierarchy
    trace_address TEXT NOT NULL, -- e.g., "0,1,2" for nested calls
    call_depth INTEGER NOT NULL,
    parent_call_id UUID REFERENCES internal_calls(id),
    
    -- Call details
    call_type VARCHAR(20) NOT NULL, -- CALL, DELEGATECALL, STATICCALL, CREATE, CREATE2
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42),
    value_eth DECIMAL(30, 18) DEFAULT 0,
    gas_limit BIGINT,
    gas_used BIGINT,
    
    -- Function information
    input_data TEXT,
    function_selector VARCHAR(10),
    function_signature TEXT,
    function_name VARCHAR(100),
    category VARCHAR(50),
    
    -- Call result
    success BOOLEAN NOT NULL,
    revert_reason TEXT,
    output_data TEXT,
    
    -- Contract creation
    created_contract_address VARCHAR(42), -- For CREATE/CREATE2 calls
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_internal_call UNIQUE (transaction_hash, trace_address)
);

-- Indexes for internal calls
CREATE INDEX IF NOT EXISTS idx_internal_calls_tx_hash ON internal_calls(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_internal_calls_block ON internal_calls(block_number);
CREATE INDEX IF NOT EXISTS idx_internal_calls_timestamp ON internal_calls(block_timestamp);
CREATE INDEX IF NOT EXISTS idx_internal_calls_from ON internal_calls(from_address);
CREATE INDEX IF NOT EXISTS idx_internal_calls_to ON internal_calls(to_address);
CREATE INDEX IF NOT EXISTS idx_internal_calls_type ON internal_calls(call_type);
CREATE INDEX IF NOT EXISTS idx_internal_calls_selector ON internal_calls(function_selector);
CREATE INDEX IF NOT EXISTS idx_internal_calls_category ON internal_calls(category);
CREATE INDEX IF NOT EXISTS idx_internal_calls_depth ON internal_calls(call_depth);
CREATE INDEX IF NOT EXISTS idx_internal_calls_parent ON internal_calls(parent_call_id);

-- =====================================================
-- Contract Information Table
-- Stores metadata about contracts
-- =====================================================
CREATE TABLE IF NOT EXISTS contract_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Contract identification
    address VARCHAR(42) NOT NULL UNIQUE,
    name VARCHAR(100),
    symbol VARCHAR(20),
    
    -- Contract type detection
    contract_type VARCHAR(50), -- erc20, erc721, erc1155, proxy, etc.
    standards JSONB, -- Array of supported standards
    
    -- Proxy information
    is_proxy BOOLEAN DEFAULT false,
    proxy_type VARCHAR(50), -- transparent, uups, beacon, etc.
    implementation_address VARCHAR(42),
    admin_address VARCHAR(42),
    
    -- Creation information
    creator_address VARCHAR(42),
    creation_tx_hash VARCHAR(66),
    creation_block_number BIGINT,
    creation_timestamp TIMESTAMP,
    
    -- ABI and source code
    abi JSONB, -- Contract ABI if available
    source_code TEXT, -- Verified source code
    compiler_version VARCHAR(50),
    is_verified BOOLEAN DEFAULT false,
    
    -- Protocol classification
    protocol VARCHAR(100), -- uniswap, compound, etc.
    protocol_version VARCHAR(20),
    
    -- Usage statistics
    total_transactions BIGINT DEFAULT 0,
    total_function_calls BIGINT DEFAULT 0,
    total_events BIGINT DEFAULT 0,
    first_activity TIMESTAMP,
    last_activity TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for contract info
CREATE INDEX IF NOT EXISTS idx_contract_info_address ON contract_info(address);
CREATE INDEX IF NOT EXISTS idx_contract_info_type ON contract_info(contract_type);
CREATE INDEX IF NOT EXISTS idx_contract_info_proxy ON contract_info(is_proxy);
CREATE INDEX IF NOT EXISTS idx_contract_info_protocol ON contract_info(protocol);
CREATE INDEX IF NOT EXISTS idx_contract_info_creator ON contract_info(creator_address);
CREATE INDEX IF NOT EXISTS idx_contract_info_creation_block ON contract_info(creation_block_number);

-- =====================================================
-- Function Categories Table
-- Defines function categories and their properties
-- =====================================================
CREATE TABLE IF NOT EXISTS function_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Category identification
    category VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Category properties
    color_code VARCHAR(7), -- Hex color for UI
    icon VARCHAR(50), -- Icon identifier
    priority INTEGER DEFAULT 0, -- Display priority
    
    -- Category relationships
    parent_category VARCHAR(50) REFERENCES function_categories(category),
    
    -- Statistics
    total_signatures INTEGER DEFAULT 0,
    total_calls BIGINT DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for function categories
CREATE INDEX IF NOT EXISTS idx_function_categories_category ON function_categories(category);
CREATE INDEX IF NOT EXISTS idx_function_categories_parent ON function_categories(parent_category);
CREATE INDEX IF NOT EXISTS idx_function_categories_priority ON function_categories(priority);

-- =====================================================
-- Address Labels Table
-- Stores human-readable labels for addresses
-- =====================================================
CREATE TABLE IF NOT EXISTS address_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Address identification
    address VARCHAR(42) NOT NULL,
    label VARCHAR(200) NOT NULL,
    label_type VARCHAR(50) NOT NULL, -- exchange, defi, nft, etc.
    
    -- Label source
    source VARCHAR(50) NOT NULL, -- manual, etherscan, ens, etc.
    confidence_score INTEGER DEFAULT 100,
    
    -- Additional metadata
    description TEXT,
    website_url TEXT,
    twitter_handle VARCHAR(100),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_address_label UNIQUE (address, label, label_type)
);

-- Indexes for address labels
CREATE INDEX IF NOT EXISTS idx_address_labels_address ON address_labels(address);
CREATE INDEX IF NOT EXISTS idx_address_labels_type ON address_labels(label_type);
CREATE INDEX IF NOT EXISTS idx_address_labels_source ON address_labels(source);

-- =====================================================
-- Views for Easy Querying
-- =====================================================

-- Function call summary view
CREATE OR REPLACE VIEW v_function_call_summary AS
SELECT 
    fc.category,
    fc.subcategory,
    fc.protocol,
    COUNT(*) as call_count,
    COUNT(DISTINCT fc.contract_address) as unique_contracts,
    COUNT(DISTINCT fc.caller_address) as unique_callers,
    SUM(fc.value_eth) as total_value_eth,
    AVG(fc.gas_used) as avg_gas_used,
    MIN(fc.block_timestamp) as first_call,
    MAX(fc.block_timestamp) as last_call
FROM function_calls fc
WHERE fc.success = true
GROUP BY fc.category, fc.subcategory, fc.protocol
ORDER BY call_count DESC;

-- Daily function activity view
CREATE OR REPLACE VIEW v_daily_function_activity AS
SELECT 
    DATE_TRUNC('day', fc.block_timestamp) as date,
    fc.category,
    COUNT(*) as call_count,
    COUNT(DISTINCT fc.contract_address) as unique_contracts,
    COUNT(DISTINCT fc.caller_address) as unique_users,
    SUM(fc.value_eth) as total_value_eth
FROM function_calls fc
WHERE fc.success = true
GROUP BY DATE_TRUNC('day', fc.block_timestamp), fc.category
ORDER BY date DESC, call_count DESC;

-- Contract activity summary view
CREATE OR REPLACE VIEW v_contract_activity AS
SELECT 
    ci.address,
    ci.name,
    ci.contract_type,
    ci.protocol,
    COUNT(fc.id) as total_calls,
    COUNT(DISTINCT fc.function_selector) as unique_functions,
    COUNT(DISTINCT fc.caller_address) as unique_users,
    SUM(fc.value_eth) as total_value_received,
    MIN(fc.block_timestamp) as first_activity,
    MAX(fc.block_timestamp) as last_activity
FROM contract_info ci
LEFT JOIN function_calls fc ON ci.address = fc.contract_address
WHERE fc.success = true
GROUP BY ci.address, ci.name, ci.contract_type, ci.protocol
ORDER BY total_calls DESC;

-- Top function signatures view
CREATE OR REPLACE VIEW v_top_function_signatures AS
SELECT 
    fs.selector,
    fs.signature,
    fs.function_name,
    fs.category,
    fs.protocol,
    fs.usage_count,
    COUNT(fc.id) as recent_calls,
    MAX(fc.block_timestamp) as last_used
FROM function_signatures fs
LEFT JOIN function_calls fc ON fs.selector = fc.function_selector
WHERE fc.block_timestamp > NOW() - INTERVAL '30 days'
GROUP BY fs.selector, fs.signature, fs.function_name, fs.category, fs.protocol, fs.usage_count
ORDER BY recent_calls DESC, fs.usage_count DESC;

-- =====================================================
-- Functions
-- =====================================================

-- Function to update signature usage count
CREATE OR REPLACE FUNCTION update_signature_usage(p_selector VARCHAR(10))
RETURNS VOID AS $$
BEGIN
    UPDATE function_signatures 
    SET 
        usage_count = usage_count + 1,
        last_seen = NOW(),
        updated_at = NOW()
    WHERE selector = p_selector;
END;
$$ LANGUAGE plpgsql;

-- Function to get or create function signature
CREATE OR REPLACE FUNCTION get_or_create_function_signature(
    p_selector VARCHAR(10),
    p_signature TEXT DEFAULT NULL,
    p_category VARCHAR(50) DEFAULT 'unknown',
    p_source VARCHAR(50) DEFAULT 'auto'
) RETURNS UUID AS $$
DECLARE
    v_signature_id UUID;
    v_function_name VARCHAR(100);
BEGIN
    -- Extract function name from signature
    IF p_signature IS NOT NULL THEN
        v_function_name := SPLIT_PART(p_signature, '(', 1);
    ELSE
        v_function_name := 'unknown';
    END IF;
    
    -- Try to get existing signature
    SELECT id INTO v_signature_id
    FROM function_signatures
    WHERE selector = p_selector;
    
    -- Create if not exists
    IF v_signature_id IS NULL THEN
        INSERT INTO function_signatures (
            selector, signature, function_name, category, source
        ) VALUES (
            p_selector, 
            COALESCE(p_signature, 'unknown'), 
            v_function_name, 
            p_category, 
            p_source
        )
        RETURNING id INTO v_signature_id;
    END IF;
    
    RETURN v_signature_id;
END;
$$ LANGUAGE plpgsql;

-- Function to classify contract type
CREATE OR REPLACE FUNCTION classify_contract_type(p_address VARCHAR(42))
RETURNS VARCHAR(50) AS $$
DECLARE
    v_contract_type VARCHAR(50) := 'unknown';
    v_erc20_functions INTEGER;
    v_erc721_functions INTEGER;
    v_erc1155_functions INTEGER;
BEGIN
    -- Check for ERC-20 functions
    SELECT COUNT(DISTINCT fc.function_selector) INTO v_erc20_functions
    FROM function_calls fc
    JOIN function_signatures fs ON fc.function_selector = fs.selector
    WHERE fc.contract_address = p_address 
    AND fs.category = 'erc20'
    AND fs.function_name IN ('transfer', 'approve', 'transferFrom');
    
    -- Check for ERC-721 functions
    SELECT COUNT(DISTINCT fc.function_selector) INTO v_erc721_functions
    FROM function_calls fc
    JOIN function_signatures fs ON fc.function_selector = fs.selector
    WHERE fc.contract_address = p_address 
    AND fs.category = 'erc721';
    
    -- Check for ERC-1155 functions
    SELECT COUNT(DISTINCT fc.function_selector) INTO v_erc1155_functions
    FROM function_calls fc
    JOIN function_signatures fs ON fc.function_selector = fs.selector
    WHERE fc.contract_address = p_address 
    AND fs.category = 'erc1155';
    
    -- Classify based on function presence
    IF v_erc20_functions >= 3 THEN
        v_contract_type := 'erc20';
    ELSIF v_erc721_functions > 0 THEN
        v_contract_type := 'erc721';
    ELSIF v_erc1155_functions > 0 THEN
        v_contract_type := 'erc1155';
    END IF;
    
    RETURN v_contract_type;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Triggers
-- =====================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_function_signatures_updated_at
    BEFORE UPDATE ON function_signatures
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contract_info_updated_at
    BEFORE UPDATE ON contract_info
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_function_categories_updated_at
    BEFORE UPDATE ON function_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_address_labels_updated_at
    BEFORE UPDATE ON address_labels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Initial Data
-- =====================================================

-- Insert function categories
INSERT INTO function_categories (category, display_name, description, color_code, priority) VALUES
    ('erc20', 'ERC-20 Tokens', 'Standard fungible token functions', '#3B82F6', 100),
    ('erc721', 'ERC-721 NFTs', 'Non-fungible token functions', '#8B5CF6', 90),
    ('erc1155', 'ERC-1155 Multi-Token', 'Multi-token standard functions', '#A855F7', 85),
    ('dex', 'DEX Trading', 'Decentralized exchange functions', '#10B981', 80),
    ('amm', 'AMM Liquidity', 'Automated market maker functions', '#059669', 75),
    ('lending', 'Lending Protocols', 'Lending and borrowing functions', '#F59E0B', 70),
    ('borrowing', 'Borrowing', 'Borrowing specific functions', '#D97706', 65),
    ('staking', 'Staking', 'Token staking functions', '#DC2626', 60),
    ('rewards', 'Rewards', 'Reward claiming functions', '#B91C1C', 55),
    ('governance', 'Governance', 'DAO governance functions', '#7C2D12', 50),
    ('bridge', 'Cross-Chain Bridge', 'Bridge and cross-chain functions', '#0891B2', 45),
    ('admin', 'Admin Functions', 'Administrative functions', '#EF4444', 40),
    ('ownership', 'Ownership', 'Contract ownership functions', '#DC2626', 35),
    ('multisig', 'Multisig', 'Multi-signature wallet functions', '#6B7280', 30),
    ('oracle', 'Oracle', 'Price feed and oracle functions', '#374151', 25),
    ('marketplace', 'Marketplace', 'NFT and asset marketplace functions', '#EC4899', 20),
    ('subscription', 'Subscription', 'Subscription and payment functions', '#8B5CF6', 15),
    ('social', 'Social', 'Social and identity functions', '#06B6D4', 10),
    ('factory', 'Factory', 'Contract factory functions', '#64748B', 5),
    ('unknown', 'Unknown', 'Unclassified functions', '#9CA3AF', 0)
ON CONFLICT (category) DO NOTHING;

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE function_signatures IS 'Stores function selector to signature mappings with categories';
COMMENT ON TABLE function_calls IS 'Stores decoded function calls from transactions';
COMMENT ON TABLE event_logs IS 'Stores decoded event logs from transaction receipts';
COMMENT ON TABLE internal_calls IS 'Stores internal calls from transaction traces';
COMMENT ON TABLE contract_info IS 'Stores metadata about smart contracts';
COMMENT ON TABLE function_categories IS 'Defines function categories and their properties';
COMMENT ON TABLE address_labels IS 'Stores human-readable labels for addresses';

COMMENT ON COLUMN function_signatures.selector IS 'Function selector (first 4 bytes of keccak256 hash)';
COMMENT ON COLUMN function_signatures.category IS 'Primary function category (erc20, dex, lending, etc.)';
COMMENT ON COLUMN function_calls.decoded_params IS 'Decoded function parameters with names and values';
COMMENT ON COLUMN event_logs.decoded_data IS 'Decoded event parameters with names and values';
COMMENT ON COLUMN internal_calls.trace_address IS 'Trace address path for nested calls';

-- =====================================================
-- Migration Complete
-- =====================================================

-- Log migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 019_universal_smart_contract_indexer_schema completed successfully';
    RAISE NOTICE 'Created tables: function_signatures, function_calls, event_logs, internal_calls, contract_info, function_categories, address_labels';
    RAISE NOTICE 'Created views: v_function_call_summary, v_daily_function_activity, v_contract_activity, v_top_function_signatures';
    RAISE NOTICE 'Created functions: update_signature_usage, get_or_create_function_signature, classify_contract_type';
    RAISE NOTICE 'Loaded 20 function categories with color coding and priorities';
END $$;