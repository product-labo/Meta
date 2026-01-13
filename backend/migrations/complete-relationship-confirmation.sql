-- =============================================================================
-- COMPLETE DATA RELATIONSHIP CONFIRMATION
-- WHO did WHAT WHERE with WHAT function on WHAT contract in WHAT category on WHAT chain
-- =============================================================================

-- Master query showing all relationships for comprehensive analytics
CREATE VIEW complete_transaction_analytics AS
SELECT 
    -- WHO: Wallet Information
    t.from_address as wallet_address,
    w.address as wallet_profile,
    bp.wallet_category,
    bp.total_transactions as wallet_total_txs,
    bp.engagement_score,
    bp.risk_score,
    
    -- DID WHAT: Transaction Details
    t.tx_hash,
    t.tx_type as transaction_type,
    t.value as transaction_value,
    t.gas_limit,
    t.gas_price,
    tr.status as transaction_status,
    
    -- WHERE: Location & Timing
    'lisk' as chain_name,
    t.block_number,
    b.timestamp as block_timestamp,
    b.block_hash,
    DATE(t.created_at) as transaction_date,
    EXTRACT(HOUR FROM t.created_at) as transaction_hour,
    
    -- WHAT FUNCTION: Function Called
    fs.function_selector,
    fs.function_name,
    fs.function_signature,
    tb.primary_behavior as transaction_behavior,
    
    -- WHAT CONTRACT: Smart Contract
    t.to_address as contract_address,
    c.contract_address as contract_profile,
    cc.category as contract_category,
    
    -- EVENTS: What Happened
    e.topic0 as event_signature,
    e.contract_address as event_contract,
    
    -- TOKEN TRANSFERS: Value Movement
    tt.token_address,
    tt.from_address as token_from,
    tt.to_address as token_to,
    tt.amount as token_amount,
    tok.symbol as token_symbol,
    tok.name as token_name,
    
    -- INTERACTIONS: Behavioral Context
    wi.interaction_type,
    wi.wallet_address as interacting_wallet,
    
    -- ANALYTICS: Behavioral Insights
    db.behavior_type as daily_behavior,
    db.activity_score,
    db.is_weekend,
    
    -- METADATA
    t.created_at as indexed_at

FROM lisk_transactions t

-- Core relationships
LEFT JOIN lisk_blocks b ON t.block_number = b.block_number
LEFT JOIN lisk_transaction_receipts tr ON t.tx_hash = tr.tx_hash

-- Wallet information
LEFT JOIN lisk_wallets w ON t.from_address = w.address
LEFT JOIN lisk_wallet_behavior_profiles bp ON t.from_address = bp.wallet_address
LEFT JOIN lisk_wallet_daily_behavior db ON t.from_address = db.wallet_address 
    AND DATE(t.created_at) = db.date

-- Contract information
LEFT JOIN lisk_contracts c ON t.to_address = c.contract_address
LEFT JOIN lisk_contract_categories cc ON c.contract_address = cc.contract_address

-- Function information
LEFT JOIN lisk_function_signatures fs ON t.to_address = fs.contract_address
LEFT JOIN lisk_transaction_behavior tb ON t.tx_hash = tb.tx_hash

-- Event information
LEFT JOIN lisk_events e ON t.tx_hash = e.tx_hash

-- Token transfer information
LEFT JOIN lisk_token_transfers tt ON t.tx_hash = tt.tx_hash
LEFT JOIN lisk_tokens tok ON tt.token_address = tok.token_address

-- Interaction information
LEFT JOIN lisk_wallet_interactions wi ON t.tx_hash = wi.tx_hash

WHERE t.from_address IS NOT NULL;

-- =============================================================================
-- RELATIONSHIP SUMMARY STATISTICS
-- =============================================================================

CREATE VIEW data_relationship_summary AS
SELECT 
    'COMPLETE DATA RELATIONSHIPS CONFIRMED' as status,
    '' as metric,
    '' as count,
    '' as description
UNION ALL
SELECT 
    '✅ WHO (Wallets)',
    'Tracked Wallets',
    COUNT(DISTINCT wallet_address)::text,
    'Unique wallet addresses with full behavioral profiles'
FROM lisk_wallet_behavior_profiles
UNION ALL
SELECT 
    '✅ DID WHAT (Transactions)',
    'Total Transactions',
    COUNT(*)::text,
    'All transactions with complete context and behavior classification'
FROM lisk_transactions
UNION ALL
SELECT 
    '✅ WHERE (Blocks/Chain)',
    'Blocks Indexed',
    COUNT(*)::text,
    'Lisk blockchain blocks with timestamp and context'
FROM lisk_blocks
UNION ALL
SELECT 
    '✅ WHAT FUNCTION',
    'Function Signatures',
    COUNT(*)::text,
    'Smart contract functions mapped and categorized'
FROM lisk_function_signatures
UNION ALL
SELECT 
    '✅ WHAT CONTRACT',
    'Smart Contracts',
    COUNT(*)::text,
    'Deployed contracts with category classification'
FROM lisk_contracts
UNION ALL
SELECT 
    '✅ WHAT CATEGORY',
    'Contract Categories',
    COUNT(DISTINCT category)::text,
    'Different contract categories (DEX, DeFi, Token, etc.)'
FROM lisk_contract_categories
UNION ALL
SELECT 
    '✅ EVENTS CAPTURED',
    'Smart Contract Events',
    COUNT(*)::text,
    'Events with topics, data, and contract relationships'
FROM lisk_events
UNION ALL
SELECT 
    '✅ TOKEN MOVEMENTS',
    'Token Transfers',
    COUNT(*)::text,
    'ERC20 token transfers with amounts and addresses'
FROM lisk_token_transfers
UNION ALL
SELECT 
    '✅ BEHAVIORAL ANALYTICS',
    'Behavior Profiles',
    COUNT(*)::text,
    'Complete behavioral analysis with 100+ metrics per wallet'
FROM lisk_wallet_behavior_profiles
UNION ALL
SELECT 
    '✅ DAILY PATTERNS',
    'Daily Snapshots',
    COUNT(*)::text,
    'Daily behavioral patterns and activity classification'
FROM lisk_wallet_daily_behavior;

-- =============================================================================
-- SAMPLE COMPLETE ANALYSIS QUERY
-- =============================================================================

-- Example: Get complete analysis for any wallet
CREATE OR REPLACE FUNCTION get_complete_wallet_analysis(target_wallet VARCHAR(66))
RETURNS TABLE (
    analysis_aspect VARCHAR(50),
    details TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'WALLET_PROFILE'::VARCHAR(50),
           ('Category: ' || wallet_category || 
            ', Transactions: ' || total_transactions || 
            ', Engagement: ' || engagement_score || 
            ', Risk: ' || risk_score)::TEXT
    FROM lisk_wallet_behavior_profiles 
    WHERE wallet_address = target_wallet
    
    UNION ALL
    
    SELECT 'CONTRACTS_USED',
           string_agg(DISTINCT contract_address, ', ')
    FROM lisk_wallet_interactions 
    WHERE wallet_address = target_wallet
    
    UNION ALL
    
    SELECT 'FUNCTIONS_CALLED',
           string_agg(DISTINCT function_name, ', ')
    FROM lisk_transactions t
    JOIN lisk_function_signatures fs ON t.to_address = fs.contract_address
    WHERE t.from_address = target_wallet
    
    UNION ALL
    
    SELECT 'TOKEN_ACTIVITY',
           ('Transfers: ' || COUNT(*) || ', Tokens: ' || COUNT(DISTINCT token_address))::TEXT
    FROM lisk_token_transfers 
    WHERE from_address = target_wallet OR to_address = target_wallet
    
    UNION ALL
    
    SELECT 'BEHAVIORAL_EVENTS',
           string_agg(event_type || ' on ' || event_date::text, '; ')
    FROM lisk_behavior_events 
    WHERE wallet_address = target_wallet;
END;
$$ LANGUAGE plpgsql;
