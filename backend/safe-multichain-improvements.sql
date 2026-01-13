-- Safe Multichain Database Improvements
-- Phase 1: Critical enhancements without breaking existing functionality

BEGIN;

-- 1. Enhanced chain competitive overview (builds on existing chains table)
CREATE TABLE IF NOT EXISTS chain_competitive_overview (
  overview_id BIGSERIAL PRIMARY KEY,
  chain_id INTEGER REFERENCES chains(chain_id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Wallet Metrics
  total_active_wallets INTEGER DEFAULT 0,
  new_wallets INTEGER DEFAULT 0,
  retained_wallets INTEGER DEFAULT 0,
  
  -- Activity Metrics
  total_contracts_active INTEGER DEFAULT 0,
  total_function_calls BIGINT DEFAULT 0,
  avg_calls_per_wallet DECIMAL(10, 2) DEFAULT 0,
  
  -- Economic Metrics
  total_value_transferred NUMERIC(36, 18) DEFAULT 0,
  total_gas_spent BIGINT DEFAULT 0,
  
  captured_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(chain_id, period_start, period_end)
);

-- 2. Cross-chain wallet correlation (extends existing wallets table)
CREATE TABLE IF NOT EXISTS wallet_identity_clusters (
  cluster_id BIGSERIAL PRIMARY KEY,
  cluster_name VARCHAR(100),
  confidence_score DECIMAL(5,2),
  detection_method VARCHAR(50),
  wallet_count INTEGER,
  total_volume_usd NUMERIC(20, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_cluster_members (
  member_id BIGSERIAL PRIMARY KEY,
  cluster_id BIGINT REFERENCES wallet_identity_clusters(cluster_id),
  wallet_id BIGINT REFERENCES wallets(wallet_id),
  membership_confidence DECIMAL(5,2),
  evidence JSONB,
  added_at TIMESTAMP DEFAULT NOW()
);

-- 3. Cross-chain transaction correlation (extends existing transactions table)
CREATE TABLE IF NOT EXISTS cross_chain_correlations (
  correlation_id BIGSERIAL PRIMARY KEY,
  source_tx_id BIGINT REFERENCES transactions(transaction_id),
  target_tx_id BIGINT REFERENCES transactions(transaction_id),
  correlation_type VARCHAR(50),
  time_diff_seconds INTEGER,
  amount_correlation DECIMAL(10,8),
  confidence_score DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Bridge transaction tracking (new capability)
CREATE TABLE IF NOT EXISTS bridge_transactions (
  bridge_id BIGSERIAL PRIMARY KEY,
  source_chain_id INTEGER REFERENCES chains(chain_id),
  dest_chain_id INTEGER REFERENCES chains(chain_id),
  source_tx_id BIGINT REFERENCES transactions(transaction_id),
  dest_tx_id BIGINT REFERENCES transactions(transaction_id),
  bridge_contract VARCHAR(66),
  amount NUMERIC(36, 18),
  token_address VARCHAR(66),
  status VARCHAR(20) DEFAULT 'pending',
  bridge_time_seconds INTEGER,
  fees_paid NUMERIC(36, 18),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Performance indexes (safe to add)
CREATE INDEX IF NOT EXISTS idx_chain_competitive_period 
ON chain_competitive_overview(period_start DESC);

CREATE INDEX IF NOT EXISTS idx_correlations_confidence 
ON cross_chain_correlations(confidence_score DESC) 
WHERE confidence_score > 0.7;

CREATE INDEX IF NOT EXISTS idx_bridge_status_time 
ON bridge_transactions(status, created_at DESC);

-- 6. Safe materialized view for analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS cross_chain_summary AS
SELECT 
  c.chain_name,
  COUNT(DISTINCT w.wallet_id) as total_wallets,
  COUNT(DISTINCT t.transaction_id) as total_transactions,
  COUNT(DISTINCT co.contract_id) as total_contracts,
  SUM(w.total_value_transferred) as chain_volume,
  MAX(t.block_timestamp) as last_activity
FROM chains c
LEFT JOIN wallets w ON c.chain_id = w.chain_id
LEFT JOIN transactions t ON c.chain_id = t.chain_id
LEFT JOIN contracts co ON c.chain_id = co.chain_id
GROUP BY c.chain_id, c.chain_name;

-- 7. Safe trigger for real-time updates (non-breaking)
CREATE OR REPLACE FUNCTION update_chain_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update daily metrics when new wallet interaction occurs
  INSERT INTO chain_competitive_overview (
    chain_id, period_start, period_end, 
    total_active_wallets, total_function_calls
  )
  VALUES (
    NEW.chain_id, 
    CURRENT_DATE, 
    CURRENT_DATE,
    1,
    1
  )
  ON CONFLICT (chain_id, period_start, period_end) 
  DO UPDATE SET
    total_function_calls = chain_competitive_overview.total_function_calls + 1;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_update_chain_metrics'
  ) THEN
    CREATE TRIGGER trigger_update_chain_metrics
      AFTER INSERT ON wallet_interactions
      FOR EACH ROW EXECUTE FUNCTION update_chain_metrics();
  END IF;
END $$;

COMMIT;
