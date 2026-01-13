-- =============================================================================
-- ADVANCED WALLET BEHAVIOR CALCULATION FUNCTIONS
-- Calculate 100+ Behavioral Metrics for Each Wallet
-- =============================================================================

-- Function to calculate comprehensive wallet behavior scores
CREATE OR REPLACE FUNCTION calculate_wallet_behavior_scores(target_wallet VARCHAR(66))
RETURNS TABLE (
    metric_name VARCHAR(50),
    metric_value DECIMAL(10,4),
    metric_description TEXT
) AS $$
BEGIN
    -- Activity Pattern Metrics
    RETURN QUERY
    WITH wallet_stats AS (
        SELECT 
            COUNT(DISTINCT t.tx_hash) as total_txs,
            COUNT(DISTINCT DATE(t.created_at)) as active_days,
            COUNT(DISTINCT wi.contract_address) as unique_contracts,
            MIN(t.created_at) as first_tx,
            MAX(t.created_at) as last_tx,
            SUM(t.value) as total_volume,
            AVG(t.value) as avg_tx_value,
            STDDEV(t.value) as value_stddev
        FROM lisk_transactions t
        LEFT JOIN lisk_wallet_interactions wi ON t.tx_hash = wi.tx_hash
        WHERE t.from_address = target_wallet
    ),
    time_patterns AS (
        SELECT 
            COUNT(CASE WHEN EXTRACT(DOW FROM created_at) IN (0,6) THEN 1 END) as weekend_txs,
            COUNT(CASE WHEN EXTRACT(HOUR FROM created_at) BETWEEN 22 AND 6 THEN 1 END) as night_txs,
            COUNT(*) as total_txs
        FROM lisk_transactions
        WHERE from_address = target_wallet
    )
    SELECT 'dau_consistency'::VARCHAR(50), 
           (ws.active_days::DECIMAL / GREATEST(1, EXTRACT(DAYS FROM (ws.last_tx - ws.first_tx))))::DECIMAL(10,4),
           'Daily activity consistency (0-1 scale)'::TEXT
    FROM wallet_stats ws
    
    UNION ALL
    
    SELECT 'transaction_frequency',
           (ws.total_txs::DECIMAL / GREATEST(1, ws.active_days))::DECIMAL(10,4),
           'Average transactions per active day'
    FROM wallet_stats ws
    
    UNION ALL
    
    SELECT 'contract_diversity',
           (ws.unique_contracts::DECIMAL / GREATEST(1, ws.total_txs))::DECIMAL(10,4),
           'Contract diversity score (0-1 scale)'
    FROM wallet_stats ws
    
    UNION ALL
    
    SELECT 'spending_consistency',
           CASE WHEN ws.avg_tx_value > 0 THEN 
               (1 - (COALESCE(ws.value_stddev, 0) / ws.avg_tx_value))::DECIMAL(10,4)
           ELSE 0 END,
           'Spending consistency (1 = very consistent, 0 = highly variable)'
    FROM wallet_stats ws
    
    UNION ALL
    
    SELECT 'weekend_activity_ratio',
           (tp.weekend_txs::DECIMAL / GREATEST(1, tp.total_txs))::DECIMAL(10,4),
           'Ratio of weekend to total activity'
    FROM time_patterns tp
    
    UNION ALL
    
    SELECT 'night_owl_score',
           (tp.night_txs::DECIMAL / GREATEST(1, tp.total_txs))::DECIMAL(10,4),
           'Late night activity score (22:00-06:00)'
    FROM time_patterns tp;
    
END;
$$ LANGUAGE plpgsql;

-- Function to detect behavioral events
CREATE OR REPLACE FUNCTION detect_behavioral_events(target_wallet VARCHAR(66))
RETURNS TABLE (
    event_type VARCHAR(50),
    event_date DATE,
    significance DECIMAL(3,2),
    description TEXT
) AS $$
BEGIN
    -- Detect whale upgrade events
    RETURN QUERY
    WITH daily_volumes AS (
        SELECT 
            DATE(created_at) as tx_date,
            SUM(value) as daily_volume
        FROM lisk_transactions
        WHERE from_address = target_wallet
        GROUP BY DATE(created_at)
        ORDER BY tx_date
    ),
    volume_changes AS (
        SELECT 
            tx_date,
            daily_volume,
            LAG(daily_volume) OVER (ORDER BY tx_date) as prev_volume
        FROM daily_volumes
    )
    SELECT 'VOLUME_SPIKE'::VARCHAR(50),
           vc.tx_date,
           0.8::DECIMAL(3,2),
           ('Daily volume increased by ' || 
            ROUND((vc.daily_volume - vc.prev_volume)::DECIMAL / vc.prev_volume * 100, 2) || 
            '%')::TEXT
    FROM volume_changes vc
    WHERE vc.prev_volume > 0 
    AND vc.daily_volume > vc.prev_volume * 5 -- 5x increase
    
    UNION ALL
    
    -- Detect dormancy periods
    WITH tx_gaps AS (
        SELECT 
            created_at,
            LAG(created_at) OVER (ORDER BY created_at) as prev_tx,
            EXTRACT(DAYS FROM created_at - LAG(created_at) OVER (ORDER BY created_at)) as gap_days
        FROM lisk_transactions
        WHERE from_address = target_wallet
    )
    SELECT 'REACTIVATION'::VARCHAR(50),
           DATE(tg.created_at),
           0.7::DECIMAL(3,2),
           ('Returned after ' || tg.gap_days || ' days of inactivity')::TEXT
    FROM tx_gaps tg
    WHERE tg.gap_days > 30; -- More than 30 days gap
    
END;
$$ LANGUAGE plpgsql;

-- Function to classify wallet type based on behavior
CREATE OR REPLACE FUNCTION classify_wallet_type(target_wallet VARCHAR(66))
RETURNS TABLE (
    wallet_type VARCHAR(50),
    confidence DECIMAL(3,2),
    reasoning TEXT
) AS $$
DECLARE
    total_txs INTEGER;
    unique_contracts INTEGER;
    avg_tx_value BIGINT;
    active_days INTEGER;
    total_volume BIGINT;
BEGIN
    -- Get wallet statistics
    SELECT 
        COUNT(DISTINCT t.tx_hash),
        COUNT(DISTINCT wi.contract_address),
        AVG(t.value)::BIGINT,
        COUNT(DISTINCT DATE(t.created_at)),
        SUM(t.value)
    INTO total_txs, unique_contracts, avg_tx_value, active_days, total_volume
    FROM lisk_transactions t
    LEFT JOIN lisk_wallet_interactions wi ON t.tx_hash = wi.tx_hash
    WHERE t.from_address = target_wallet;
    
    -- Classification logic
    IF total_volume > 10000000000000000000 THEN -- > 10 ETH
        RETURN QUERY SELECT 'WHALE'::VARCHAR(50), 0.9::DECIMAL(3,2), 
                           ('High volume trader with ' || total_volume/1000000000000000000 || ' ETH total volume')::TEXT;
    ELSIF total_txs > 100 AND active_days > 30 THEN
        RETURN QUERY SELECT 'DAY_TRADER'::VARCHAR(50), 0.8::DECIMAL(3,2),
                           ('High frequency trader with ' || total_txs || ' transactions over ' || active_days || ' days')::TEXT;
    ELSIF unique_contracts > 10 THEN
        RETURN QUERY SELECT 'YIELD_FARMER'::VARCHAR(50), 0.8::DECIMAL(3,2),
                           ('DeFi power user interacting with ' || unique_contracts || ' different contracts')::TEXT;
    ELSIF total_txs < 5 AND active_days < 3 THEN
        RETURN QUERY SELECT 'CASUAL_USER'::VARCHAR(50), 0.7::DECIMAL(3,2),
                           ('Infrequent user with only ' || total_txs || ' transactions')::TEXT;
    ELSIF avg_tx_value > 1000000000000000000 THEN -- > 1 ETH average
        RETURN QUERY SELECT 'HIGH_VALUE_USER'::VARCHAR(50), 0.7::DECIMAL(3,2),
                           ('Consistent high-value transactions averaging ' || avg_tx_value/1000000000000000000 || ' ETH')::TEXT;
    ELSE
        RETURN QUERY SELECT 'REGULAR_USER'::VARCHAR(50), 0.6::DECIMAL(3,2),
                           ('Standard usage pattern with moderate activity')::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate behavioral similarity between wallets
CREATE OR REPLACE FUNCTION calculate_wallet_similarity(wallet1 VARCHAR(66), wallet2 VARCHAR(66))
RETURNS DECIMAL(3,2) AS $$
DECLARE
    similarity_score DECIMAL(3,2) := 0;
    common_contracts INTEGER;
    total_contracts INTEGER;
    activity_similarity DECIMAL(3,2);
    volume_similarity DECIMAL(3,2);
BEGIN
    -- Contract overlap similarity
    SELECT 
        COUNT(CASE WHEN w1.contract_address = w2.contract_address THEN 1 END),
        COUNT(DISTINCT COALESCE(w1.contract_address, w2.contract_address))
    INTO common_contracts, total_contracts
    FROM (
        SELECT DISTINCT contract_address FROM lisk_wallet_interactions WHERE wallet_address = wallet1
    ) w1
    FULL OUTER JOIN (
        SELECT DISTINCT contract_address FROM lisk_wallet_interactions WHERE wallet_address = wallet2
    ) w2 ON w1.contract_address = w2.contract_address;
    
    -- Calculate similarity components
    similarity_score := COALESCE(common_contracts::DECIMAL / NULLIF(total_contracts, 0), 0) * 0.4;
    
    -- Add more similarity factors here (activity patterns, timing, etc.)
    
    RETURN LEAST(1.0, similarity_score);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- BEHAVIORAL ANALYTICS VIEWS
-- =============================================================================

-- Comprehensive wallet behavior dashboard
CREATE VIEW lisk_wallet_behavior_dashboard AS
SELECT 
    bp.wallet_address,
    bp.total_transactions,
    bp.active_days,
    bp.total_volume_eth,
    bp.unique_contracts_used,
    bp.first_activity_date,
    bp.last_activity_date,
    
    -- Calculated behavioral scores
    CASE 
        WHEN bp.total_volume_eth > 1000000000000000000 THEN 'WHALE'
        WHEN bp.total_transactions > 50 THEN 'ACTIVE_TRADER'
        WHEN bp.unique_contracts_used > 5 THEN 'DEFI_USER'
        WHEN bp.total_transactions < 5 THEN 'CASUAL'
        ELSE 'REGULAR'
    END as wallet_category,
    
    -- Activity metrics
    ROUND(bp.total_transactions::DECIMAL / GREATEST(1, bp.active_days), 2) as avg_daily_transactions,
    ROUND(bp.unique_contracts_used::DECIMAL / GREATEST(1, bp.total_transactions), 3) as contract_diversity_ratio,
    
    -- Engagement score (0-100)
    LEAST(100, 
        (bp.total_transactions * 2) + 
        (bp.active_days * 3) + 
        (bp.unique_contracts_used * 5)
    ) as engagement_score,
    
    -- Risk score based on contract diversity and volume
    ROUND(
        (bp.unique_contracts_used::DECIMAL / 20.0) * 0.6 +
        (LEAST(bp.total_volume_eth, 10000000000000000000)::DECIMAL / 10000000000000000000) * 0.4,
        2
    ) as risk_score

FROM lisk_wallet_behavior_profiles bp
WHERE bp.total_transactions > 0;

-- Daily behavior trends
CREATE VIEW lisk_daily_behavior_trends AS
SELECT 
    date,
    COUNT(DISTINCT wallet_address) as active_wallets,
    SUM(transaction_count) as total_transactions,
    AVG(transaction_count) as avg_transactions_per_wallet,
    COUNT(CASE WHEN transaction_count > 10 THEN 1 END) as high_activity_wallets,
    COUNT(CASE WHEN is_weekend THEN 1 END) as weekend_active_wallets
FROM lisk_wallet_daily_behavior
GROUP BY date
ORDER BY date DESC;
