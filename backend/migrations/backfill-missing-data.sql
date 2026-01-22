-- =============================================================================
-- GRACEFUL DATA COLLECTION FIXES
-- Phase 1: Enable Missing Data Collection
-- =============================================================================

-- 1. BACKFILL STARKNET WALLETS FROM EXISTING TRANSACTIONS
INSERT INTO starknet_wallets (wallet_address, first_seen_block, transaction_count, created_at)
SELECT 
    from_address as wallet_address,
    MIN(block_number) as first_seen_block,
    COUNT(*) as transaction_count,
    MIN(created_at) as created_at
FROM starknet_transactions 
WHERE from_address IS NOT NULL
GROUP BY from_address
ON CONFLICT (wallet_address) DO NOTHING;

-- Also add 'to' addresses as wallets
INSERT INTO starknet_wallets (wallet_address, first_seen_block, transaction_count, created_at)
SELECT 
    to_address as wallet_address,
    MIN(block_number) as first_seen_block,
    0 as transaction_count, -- They received, didn't send
    MIN(created_at) as created_at
FROM starknet_transactions 
WHERE to_address IS NOT NULL 
  AND to_address NOT IN (SELECT wallet_address FROM starknet_wallets)
GROUP BY to_address
ON CONFLICT (wallet_address) DO NOTHING;

-- 2. BACKFILL LISK TOKENS FROM EXISTING CONTRACTS
-- Identify potential token contracts from existing data
INSERT INTO lisk_tokens (token_address, name, symbol, token_type, created_at)
SELECT DISTINCT
    contract_address as token_address,
    'Unknown Token' as name,
    'UNK' as symbol,
    'ERC20' as token_type,
    NOW() as created_at
FROM lisk_contracts
WHERE contract_address IS NOT NULL
ON CONFLICT (token_address) DO NOTHING;

-- 3. CREATE SAMPLE DAILY METRICS FOR EXISTING DATA
INSERT INTO lisk_daily_metrics (chain_id, date, total_transactions, unique_addresses, total_gas_used)
SELECT 
    1 as chain_id,
    DATE(created_at) as date,
    COUNT(*) as total_transactions,
    COUNT(DISTINCT from_address) as unique_addresses,
    COALESCE(SUM(gas_used), 0) as total_gas_used
FROM lisk_transactions
GROUP BY DATE(created_at)
ON CONFLICT (chain_id, date) DO UPDATE SET
    total_transactions = EXCLUDED.total_transactions,
    unique_addresses = EXCLUDED.unique_addresses,
    total_gas_used = EXCLUDED.total_gas_used;

INSERT INTO starknet_daily_metrics (chain_id, date, total_transactions, unique_addresses, total_gas_used)
SELECT 
    2 as chain_id,
    DATE(created_at) as date,
    COUNT(*) as total_transactions,
    COUNT(DISTINCT from_address) as unique_addresses,
    COALESCE(SUM(gas_used), 0) as total_gas_used
FROM starknet_transactions
GROUP BY DATE(created_at)
ON CONFLICT (chain_id, date) DO UPDATE SET
    total_transactions = EXCLUDED.total_transactions,
    unique_addresses = EXCLUDED.unique_addresses,
    total_gas_used = EXCLUDED.total_gas_used;
