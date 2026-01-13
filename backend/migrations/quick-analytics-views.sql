-- =============================================================================
-- QUICK ANALYTICS IMPLEMENTATION - IMMEDIATE VALUE
-- =============================================================================

-- 1. TOP TOKENS BY ACTIVITY
CREATE VIEW lisk_top_tokens AS
SELECT 
  t.token_address,
  tk.symbol,
  tk.name,
  COUNT(*) as transfer_count,
  COUNT(DISTINCT t.from_address) as unique_senders,
  COUNT(DISTINCT t.to_address) as unique_receivers,
  SUM(t.amount) as total_volume
FROM lisk_token_transfers t
LEFT JOIN lisk_tokens tk ON t.token_address = tk.token_address
GROUP BY t.token_address, tk.symbol, tk.name
ORDER BY transfer_count DESC;

-- 2. MOST ACTIVE CONTRACTS
CREATE VIEW lisk_active_contracts AS
SELECT 
  e.contract_address,
  COUNT(*) as event_count,
  COUNT(DISTINCT e.tx_hash) as transaction_count,
  COUNT(DISTINCT DATE(e.created_at)) as active_days,
  MAX(e.created_at) as last_activity
FROM lisk_events e
GROUP BY e.contract_address
ORDER BY event_count DESC;

-- 3. WALLET ACTIVITY RANKINGS
CREATE VIEW lisk_wallet_rankings AS
SELECT 
  w.address as wallet_address,
  w.transaction_count,
  COUNT(DISTINCT wi.contract_address) as contracts_interacted,
  COUNT(wi.interaction_id) as total_interactions,
  MAX(wi.created_at) as last_activity,
  CASE 
    WHEN w.transaction_count > 100 THEN 'WHALE'
    WHEN w.transaction_count > 50 THEN 'ACTIVE'
    WHEN w.transaction_count > 10 THEN 'REGULAR'
    ELSE 'CASUAL'
  END as wallet_type
FROM lisk_wallets w
LEFT JOIN lisk_wallet_interactions wi ON w.address = wi.wallet_address
GROUP BY w.address, w.transaction_count
ORDER BY w.transaction_count DESC;

-- 4. DAILY TREND ANALYSIS
CREATE VIEW lisk_daily_trends AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as transactions,
  COUNT(DISTINCT from_address) as unique_users,
  COUNT(DISTINCT to_address) as unique_recipients,
  AVG(gas_limit) as avg_gas_limit
FROM lisk_transactions
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 5. CONTRACT CATEGORY DETECTION
CREATE VIEW lisk_contract_categories AS
SELECT 
  c.contract_address,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM lisk_events e 
      WHERE e.contract_address = c.contract_address 
      AND e.topic0 = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    ) THEN 'TOKEN'
    WHEN EXISTS (
      SELECT 1 FROM lisk_function_signatures f
      WHERE f.contract_address = c.contract_address
      AND f.function_name IN ('swap', 'addLiquidity')
    ) THEN 'DEX'
    ELSE 'OTHER'
  END as category,
  COUNT(DISTINCT e.tx_hash) as transaction_count
FROM lisk_contracts c
LEFT JOIN lisk_events e ON c.contract_address = e.contract_address
GROUP BY c.contract_address
ORDER BY transaction_count DESC;
