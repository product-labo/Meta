import { query } from './dbJobs.js'

// David Database User Intelligence: Analyze wallet behavior using actual database schema
// Database: david (PostgreSQL)
// Key tables: transactions, contracts, wallet_interactions, events

/**
 * PHASE 1: Single Wallet Intelligence (adapted for david database)
 */

// 1. Activity timeline reconstruction using actual transactions table
async function qWalletActivityTimeline(contractAddress) {
  const sql = `
    SELECT 
      t.sender_address as wallet_address,
      t.created_at as timestamp,
      t.tx_hash,
      t.tx_type,
      t.actual_fee,
      t.status,
      LAG(t.created_at) OVER (PARTITION BY t.sender_address ORDER BY t.created_at) as prev_timestamp,
      EXTRACT(epoch FROM (t.created_at - LAG(t.created_at) OVER (PARTITION BY t.sender_address ORDER BY t.created_at)))/3600 as hours_gap
    FROM transactions t
    LEFT JOIN wallet_interactions wi ON t.tx_hash = wi.tx_hash
    WHERE wi.contract_address = $1 OR $1 IS NULL
    ORDER BY t.sender_address, t.created_at
  `
  const rows = await query(sql, [contractAddress])
  return { name: 'wallet_activity_timelines', rows }
}

// 2. Usage intensity analysis using david database
async function qWalletUsageIntensity(contractAddress) {
  const sql = `
    WITH wallet_sessions AS (
      SELECT 
        t.sender_address as wallet_address,
        DATE_TRUNC('day', t.created_at) as session_day,
        COUNT(*) as tx_per_session,
        COUNT(DISTINCT wi.function_id) as unique_functions
      FROM transactions t
      LEFT JOIN wallet_interactions wi ON t.tx_hash = wi.tx_hash
      WHERE (wi.contract_address = $1 OR $1 IS NULL) AND t.sender_address IS NOT NULL
      GROUP BY t.sender_address, session_day
    )
    SELECT 
      wallet_address,
      AVG(tx_per_session) as avg_tx_per_session,
      MAX(tx_per_session) as max_tx_per_session,
      AVG(unique_functions) as avg_functions_per_session,
      COUNT(*) as total_sessions,
      CASE WHEN AVG(tx_per_session) > 10 THEN 'deep' ELSE 'shallow' END as engagement_depth
    FROM wallet_sessions
    GROUP BY wallet_address
  `
  const rows = await query(sql, [contractAddress])
  return { name: 'wallet_usage_intensity', rows }
}

// 3. Time behavior modeling using david database
async function qWalletTimeBehavior(contractAddress) {
  const sql = `
    SELECT 
      t.sender_address as wallet_address,
      EXTRACT(hour FROM t.created_at) as hour_of_day,
      EXTRACT(dow FROM t.created_at) as day_of_week,
      COUNT(*) as activity_count,
      t.status,
      CASE 
        WHEN COUNT(*) > 50 THEN 'burst'
        WHEN COUNT(*) BETWEEN 10 AND 50 THEN 'steady' 
        ELSE 'sporadic'
      END as behavior_pattern
    FROM transactions t
    LEFT JOIN wallet_interactions wi ON t.tx_hash = wi.tx_hash
    WHERE (wi.contract_address = $1 OR $1 IS NULL) AND t.sender_address IS NOT NULL
    GROUP BY t.sender_address, hour_of_day, day_of_week, t.status
  `
  const rows = await query(sql, [contractAddress])
  return { name: 'wallet_time_behavior', rows }
}

// 4. Spending behavior analysis using actual_fee from david database
async function qWalletSpendingBehavior(contractAddress) {
  const sql = `
    WITH wallet_spending AS (
      SELECT 
        t.sender_address as wallet_address,
        DATE_TRUNC('week', t.created_at) as week,
        SUM(COALESCE(t.actual_fee, 0)) as weekly_spend,
        AVG(COALESCE(t.actual_fee, 0)) as avg_tx_cost,
        COUNT(*) as tx_count
      FROM transactions t
      LEFT JOIN wallet_interactions wi ON t.tx_hash = wi.tx_hash
      WHERE (wi.contract_address = $1 OR $1 IS NULL) AND t.sender_address IS NOT NULL
      GROUP BY t.sender_address, week
    )
    SELECT 
      wallet_address,
      AVG(weekly_spend) as avg_weekly_spend,
      STDDEV(weekly_spend) as spend_volatility,
      AVG(avg_tx_cost) as avg_transaction_cost,
      CASE 
        WHEN AVG(avg_tx_cost) < 1000 THEN 'price_sensitive'
        WHEN AVG(avg_tx_cost) > 10000 THEN 'value_driven'
        ELSE 'moderate'
      END as price_sensitivity
    FROM wallet_spending
    GROUP BY wallet_address
  `
  const rows = await query(sql, [contractAddress])
  return { name: 'wallet_spending_behavior', rows }
}

// 5. Function preferences using david database
async function qWalletPreferences(contractAddress) {
  const sql = `
    SELECT 
      wi.wallet_address,
      f.function_name,
      COUNT(*) as usage_count,
      MIN(wi.created_at) as first_used,
      MAX(wi.created_at) as last_used,
      RANK() OVER (PARTITION BY wi.wallet_address ORDER BY COUNT(*) DESC) as preference_rank
    FROM wallet_interactions wi
    LEFT JOIN functions f ON wi.function_id = f.function_id
    WHERE wi.contract_address = $1 OR $1 IS NULL
    GROUP BY wi.wallet_address, f.function_name
  `
  const rows = await query(sql, [contractAddress])
  return { name: 'wallet_preferences', rows }
}

// 6. Stability and risk scoring using david database
async function qWalletStabilityRisk(contractAddress) {
  const sql = `
    WITH wallet_gaps AS (
      SELECT 
        t.sender_address as wallet_address,
        EXTRACT(epoch FROM (t.created_at - LAG(t.created_at) OVER (PARTITION BY t.sender_address ORDER BY t.created_at)))/86400 as days_gap
      FROM transactions t
      LEFT JOIN wallet_interactions wi ON t.tx_hash = wi.tx_hash
      WHERE (wi.contract_address = $1 OR $1 IS NULL) AND t.sender_address IS NOT NULL
    )
    SELECT 
      wallet_address,
      AVG(days_gap) as avg_days_between_activity,
      STDDEV(days_gap) as consistency_score,
      MAX(days_gap) as longest_gap_days,
      CASE 
        WHEN MAX(days_gap) > 30 THEN 'high_risk'
        WHEN MAX(days_gap) > 7 THEN 'medium_risk'
        ELSE 'stable'
      END as churn_risk,
      CASE 
        WHEN MAX(days_gap) < 7 AND STDDEV(days_gap) < 2 THEN 'high'
        ELSE 'low'
      END as reactivation_likelihood
    FROM wallet_gaps
    WHERE days_gap IS NOT NULL
    GROUP BY wallet_address
  `
  const rows = await query(sql, [contractAddress])
  return { name: 'wallet_stability_risk', rows }
}

/**
 * PHASE 2: Cohort Intelligence using david database
 */

// 7. Entry cohort creation
async function qEntryCohorts(contractAddress) {
  const sql = `
    WITH first_interactions AS (
      SELECT 
        t.sender_address as wallet_address,
        MIN(t.created_at) as first_interaction,
        DATE_TRUNC('week', MIN(t.created_at)) as entry_cohort
      FROM transactions t
      LEFT JOIN wallet_interactions wi ON t.tx_hash = wi.tx_hash
      WHERE (wi.contract_address = $1 OR $1 IS NULL) AND t.sender_address IS NOT NULL
      GROUP BY t.sender_address
    )
    SELECT 
      entry_cohort,
      COUNT(*) as cohort_size,
      MIN(first_interaction) as cohort_start,
      MAX(first_interaction) as cohort_end
    FROM first_interactions
    GROUP BY entry_cohort
    ORDER BY entry_cohort
  `
  const rows = await query(sql, [contractAddress])
  return { name: 'entry_cohorts', rows }
}

/**
 * PHASE 3: Segmentation Intelligence using david database
 */

// 11. Behavior based clustering
async function qBehaviorClustering(contractAddress) {
  const sql = `
    WITH wallet_metrics AS (
      SELECT 
        t.sender_address as wallet_address,
        COUNT(*) as tx_count,
        SUM(COALESCE(t.actual_fee, 0)) as total_spent,
        EXTRACT(epoch FROM (MAX(t.created_at) - MIN(t.created_at)))/86400 as lifespan_days,
        COUNT(DISTINCT DATE_TRUNC('day', t.created_at)) as active_days
      FROM transactions t
      LEFT JOIN wallet_interactions wi ON t.tx_hash = wi.tx_hash
      WHERE (wi.contract_address = $1 OR $1 IS NULL) AND t.sender_address IS NOT NULL
      GROUP BY t.sender_address
    ),
    percentiles AS (
      SELECT 
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY tx_count) as tx_p25,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY tx_count) as tx_p75,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY total_spent) as spend_p25,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY total_spent) as spend_p75
      FROM wallet_metrics
    )
    SELECT 
      w.wallet_address,
      w.tx_count,
      w.total_spent,
      w.lifespan_days,
      w.active_days,
      CASE 
        WHEN w.tx_count >= p.tx_p75 AND w.total_spent >= p.spend_p75 THEN 'power_user'
        WHEN w.tx_count >= p.tx_p25 AND w.total_spent >= p.spend_p25 THEN 'regular_user'
        WHEN w.tx_count < p.tx_p25 AND w.active_days > 7 THEN 'explorer'
        ELSE 'one_time_user'
      END as user_segment
    FROM wallet_metrics w, percentiles p
  `
  const rows = await query(sql, [contractAddress])
  return { name: 'behavior_clustering', rows }
}

/**
 * Get all contracts in the database
 */
async function qAllContracts() {
  const sql = `
    SELECT 
      contract_address,
      deployer_address,
      deployment_block,
      created_at,
      is_proxy
    FROM contracts
    ORDER BY created_at DESC
  `
  const rows = await query(sql)
  return { name: 'all_contracts', rows }
}

/**
 * Get database overview statistics
 */
async function qDatabaseOverview() {
  const sql = `
    SELECT 
      'transactions' as table_name,
      COUNT(*) as record_count,
      MIN(created_at) as earliest_record,
      MAX(created_at) as latest_record
    FROM transactions
    WHERE sender_address IS NOT NULL
    
    UNION ALL
    
    SELECT 
      'contracts' as table_name,
      COUNT(*) as record_count,
      MIN(created_at) as earliest_record,
      MAX(created_at) as latest_record
    FROM contracts
    
    UNION ALL
    
    SELECT 
      'wallet_interactions' as table_name,
      COUNT(*) as record_count,
      MIN(created_at) as earliest_record,
      MAX(created_at) as latest_record
    FROM wallet_interactions
  `
  const rows = await query(sql)
  return { name: 'database_overview', rows }
}

/**
 * Collect comprehensive user base intelligence from david database
 */
export async function collectDavidDbIntelligence(userId, contractAddress) {
  const data = {
    user_id: userId,
    contract_address: contractAddress,
    database_name: 'david',
    analysis_timestamp: new Date().toISOString()
  }
  
  // Database overview
  const overview = await qDatabaseOverview()
  data[overview.name] = overview.rows
  
  // All contracts (if no specific contract provided)
  if (!contractAddress) {
    const contracts = await qAllContracts()
    data[contracts.name] = contracts.rows
  }
  
  // Phase 1: Single wallet intelligence
  const timeline = await qWalletActivityTimeline(contractAddress)
  data[timeline.name] = timeline.rows
  
  const intensity = await qWalletUsageIntensity(contractAddress)
  data[intensity.name] = intensity.rows
  
  const timeBehavior = await qWalletTimeBehavior(contractAddress)
  data[timeBehavior.name] = timeBehavior.rows
  
  const spending = await qWalletSpendingBehavior(contractAddress)
  data[spending.name] = spending.rows
  
  const preferences = await qWalletPreferences(contractAddress)
  data[preferences.name] = preferences.rows
  
  const stability = await qWalletStabilityRisk(contractAddress)
  data[stability.name] = stability.rows
  
  // Phase 2: Cohort intelligence
  const cohorts = await qEntryCohorts(contractAddress)
  data[cohorts.name] = cohorts.rows
  
  // Phase 3: Segmentation intelligence
  const clustering = await qBehaviorClustering(contractAddress)
  data[clustering.name] = clustering.rows
  
  return data
}
