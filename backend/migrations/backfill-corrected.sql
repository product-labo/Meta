-- =============================================================================
-- CORRECTED GRACEFUL DATA COLLECTION FIXES
-- =============================================================================

-- 1. BACKFILL STARKNET WALLETS FROM EXISTING TRANSACTIONS
INSERT INTO starknet_wallets (address, first_seen_block, created_at)
SELECT 
    sender_address as address,
    MIN(block_number) as first_seen_block,
    MIN(created_at) as created_at
FROM starknet_transactions 
WHERE sender_address IS NOT NULL
GROUP BY sender_address
ON CONFLICT (address) DO NOTHING;

-- 2. BACKFILL LISK TOKENS FROM EXISTING CONTRACTS (already worked)
-- This was successful from previous run

-- 3. CREATE DAILY METRICS FOR EXISTING DATA
INSERT INTO lisk_daily_metrics (chain_id, date, total_transactions, unique_addresses, total_gas_used)
SELECT 
    1 as chain_id,
    DATE(created_at) as date,
    COUNT(*) as total_transactions,
    COUNT(DISTINCT sender_address) as unique_addresses,
    0 as total_gas_used -- Will be populated when we fix gas tracking
FROM lisk_transactions
WHERE sender_address IS NOT NULL
GROUP BY DATE(created_at)
ON CONFLICT (chain_id, date) DO UPDATE SET
    total_transactions = EXCLUDED.total_transactions,
    unique_addresses = EXCLUDED.unique_addresses;

INSERT INTO starknet_daily_metrics (chain_id, date, total_transactions, unique_addresses, total_gas_used)
SELECT 
    2 as chain_id,
    DATE(created_at) as date,
    COUNT(*) as total_transactions,
    COUNT(DISTINCT sender_address) as unique_addresses,
    COALESCE(SUM(actual_fee), 0) as total_gas_used
FROM starknet_transactions
WHERE sender_address IS NOT NULL
GROUP BY DATE(created_at)
ON CONFLICT (chain_id, date) DO UPDATE SET
    total_transactions = EXCLUDED.total_transactions,
    unique_addresses = EXCLUDED.unique_addresses,
    total_gas_used = EXCLUDED.total_gas_used;
