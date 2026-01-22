import { query } from './dbJobs.js'

// User Base Intelligence: Analyze ALL wallets interacting with a user's smart contract
// Apply full 7-phase wallet intelligence to each wallet in the user base

/**
 * PHASE 1: Single Wallet Intelligence (per wallet in user base)
 */

// 1. Activity timeline reconstruction
async function qWalletActivityTimeline(contractAddress, chainId) {
  const sql = `
    SELECT 
      from_address as wallet_address,
      block_timestamp,
      transaction_hash,
      gas_used,
      gas_price,
      LAG(block_timestamp) OVER (PARTITION BY from_address ORDER BY block_timestamp) as prev_timestamp,
      EXTRACT(epoch FROM (block_timestamp - LAG(block_timestamp) OVER (PARTITION BY from_address ORDER BY block_timestamp)))/3600 as hours_gap
    FROM mc_transactions 
    WHERE to_address = $1 AND chain_id = $2
    ORDER BY from_address, block_timestamp
  `
  const rows = await query(sql, [contractAddress, chainId])
  return { name: 'wallet_activity_timelines', rows }
}

// 2. Usage intensity analysis
async function qWalletUsageIntensity(contractAddress, chainId) {
  const sql = `
    WITH wallet_sessions AS (
      SELECT 
        from_address as wallet_address,
        DATE_TRUNC('day', block_timestamp) as session_day,
        COUNT(*) as tx_per_session,
        COUNT(DISTINCT function_signature) as unique_functions
      FROM mc_transactions t
      LEFT JOIN mc_decoded_events e ON t.transaction_hash = e.transaction_hash
      WHERE t.to_address = $1 AND t.chain_id = $2
      GROUP BY from_address, session_day
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
  const rows = await query(sql, [contractAddress, chainId])
  return { name: 'wallet_usage_intensity', rows }
}

// 3. Time behavior modeling
async function qWalletTimeBehavior(contractAddress, chainId) {
  const sql = `
    SELECT 
      from_address as wallet_address,
      EXTRACT(hour FROM block_timestamp) as hour_of_day,
      EXTRACT(dow FROM block_timestamp) as day_of_week,
      COUNT(*) as activity_count,
      AVG(gas_price) as avg_gas_price,
      CASE 
        WHEN COUNT(*) > 50 THEN 'burst'
        WHEN COUNT(*) BETWEEN 10 AND 50 THEN 'steady' 
        ELSE 'sporadic'
      END as behavior_pattern
    FROM mc_transactions 
    WHERE to_address = $1 AND chain_id = $2
    GROUP BY from_address, hour_of_day, day_of_week
  `
  const rows = await query(sql, [contractAddress, chainId])
  return { name: 'wallet_time_behavior', rows }
}

// 4. Spending behavior analysis
async function qWalletSpendingBehavior(contractAddress, chainId) {
  const sql = `
    WITH wallet_spending AS (
      SELECT 
        from_address as wallet_address,
        DATE_TRUNC('week', block_timestamp) as week,
        SUM(gas_used * gas_price) as weekly_spend,
        AVG(gas_used * gas_price) as avg_tx_cost,
        COUNT(*) as tx_count
      FROM mc_transactions 
      WHERE to_address = $1 AND chain_id = $2
      GROUP BY from_address, week
    )
    SELECT 
      wallet_address,
      AVG(weekly_spend) as avg_weekly_spend,
      STDDEV(weekly_spend) as spend_volatility,
      AVG(avg_tx_cost) as avg_transaction_cost,
      CASE 
        WHEN AVG(avg_tx_cost) < 0.001 THEN 'price_sensitive'
        WHEN AVG(avg_tx_cost) > 0.01 THEN 'value_driven'
        ELSE 'moderate'
      END as price_sensitivity
    FROM wallet_spending
    GROUP BY wallet_address
  `
  const rows = await query(sql, [contractAddress, chainId])
  return { name: 'wallet_spending_behavior', rows }
}

// 5. Preference detection
async function qWalletPreferences(contractAddress, chainId) {
  const sql = `
    SELECT 
      address as wallet_address,
      event_name,
      COUNT(*) as usage_count,
      MIN(captured_at) as first_used,
      MAX(captured_at) as last_used,
      RANK() OVER (PARTITION BY address ORDER BY COUNT(*) DESC) as preference_rank
    FROM mc_decoded_events 
    WHERE contract_address = $1 AND chain_id = $2
    GROUP BY address, event_name
  `
  const rows = await query(sql, [contractAddress, chainId])
  return { name: 'wallet_preferences', rows }
}

// 6. Stability and risk scoring
async function qWalletStabilityRisk(contractAddress, chainId) {
  const sql = `
    WITH wallet_gaps AS (
      SELECT 
        from_address as wallet_address,
        EXTRACT(epoch FROM (block_timestamp - LAG(block_timestamp) OVER (PARTITION BY from_address ORDER BY block_timestamp)))/86400 as days_gap
      FROM mc_transactions 
      WHERE to_address = $1 AND chain_id = $2
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
  const rows = await query(sql, [contractAddress, chainId])
  return { name: 'wallet_stability_risk', rows }
}

/**
 * PHASE 2: Cohort Intelligence
 */

// 7. Entry cohort creation
async function qEntryCohorts(contractAddress, chainId) {
  const sql = `
    WITH first_interactions AS (
      SELECT 
        from_address as wallet_address,
        MIN(block_timestamp) as first_interaction,
        DATE_TRUNC('week', MIN(block_timestamp)) as entry_cohort
      FROM mc_transactions 
      WHERE to_address = $1 AND chain_id = $2
      GROUP BY from_address
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
  const rows = await query(sql, [contractAddress, chainId])
  return { name: 'entry_cohorts', rows }
}

// 8. Cohort retention curves
async function qCohortRetention(contractAddress, chainId) {
  const sql = `
    WITH first_interactions AS (
      SELECT 
        from_address as wallet_address,
        MIN(block_timestamp) as first_interaction,
        DATE_TRUNC('week', MIN(block_timestamp)) as entry_cohort
      FROM mc_transactions 
      WHERE to_address = $1 AND chain_id = $2
      GROUP BY from_address
    ),
    weekly_activity AS (
      SELECT 
        f.wallet_address,
        f.entry_cohort,
        DATE_TRUNC('week', t.block_timestamp) as activity_week,
        EXTRACT(week FROM t.block_timestamp) - EXTRACT(week FROM f.first_interaction) as weeks_since_first
      FROM first_interactions f
      JOIN mc_transactions t ON f.wallet_address = t.from_address
      WHERE t.to_address = $1 AND t.chain_id = $2
    )
    SELECT 
      entry_cohort,
      weeks_since_first,
      COUNT(DISTINCT wallet_address) as active_wallets,
      COUNT(DISTINCT wallet_address) * 100.0 / FIRST_VALUE(COUNT(DISTINCT wallet_address)) OVER (PARTITION BY entry_cohort ORDER BY weeks_since_first) as retention_rate
    FROM weekly_activity
    WHERE weeks_since_first <= 12
    GROUP BY entry_cohort, weeks_since_first
    ORDER BY entry_cohort, weeks_since_first
  `
  const rows = await query(sql, [contractAddress, chainId])
  return { name: 'cohort_retention', rows }
}

/**
 * PHASE 3: Segmentation Intelligence
 */

// 11. Behavior based clustering
async function qBehaviorClustering(contractAddress, chainId) {
  const sql = `
    WITH wallet_metrics AS (
      SELECT 
        from_address as wallet_address,
        COUNT(*) as tx_count,
        SUM(gas_used * gas_price) as total_spent,
        EXTRACT(epoch FROM (MAX(block_timestamp) - MIN(block_timestamp)))/86400 as lifespan_days,
        COUNT(DISTINCT DATE_TRUNC('day', block_timestamp)) as active_days
      FROM mc_transactions 
      WHERE to_address = $1 AND chain_id = $2
      GROUP BY from_address
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
  const rows = await query(sql, [contractAddress, chainId])
  return { name: 'behavior_clustering', rows }
}

/**
 * Collect comprehensive user base intelligence
 */
export async function collectUserBaseIntelligence(userId, contractAddress, chainId) {
  const data = {
    user_id: userId,
    contract_address: contractAddress,
    chain_id: chainId,
    analysis_timestamp: new Date().toISOString()
  }
  
  // Phase 1: Single wallet intelligence for all wallets
  const timeline = await qWalletActivityTimeline(contractAddress, chainId)
  data[timeline.name] = timeline.rows
  
  const intensity = await qWalletUsageIntensity(contractAddress, chainId)
  data[intensity.name] = intensity.rows
  
  const timeBehavior = await qWalletTimeBehavior(contractAddress, chainId)
  data[timeBehavior.name] = timeBehavior.rows
  
  const spending = await qWalletSpendingBehavior(contractAddress, chainId)
  data[spending.name] = spending.rows
  
  const preferences = await qWalletPreferences(contractAddress, chainId)
  data[preferences.name] = preferences.rows
  
  const stability = await qWalletStabilityRisk(contractAddress, chainId)
  data[stability.name] = stability.rows
  
  // Phase 2: Cohort intelligence
  const cohorts = await qEntryCohorts(contractAddress, chainId)
  data[cohorts.name] = cohorts.rows
  
  const retention = await qCohortRetention(contractAddress, chainId)
  data[retention.name] = retention.rows
  
/**
 * PHASE 4: Funnel Intelligence
 */

// 15. Interaction funnel creation
async function qInteractionFunnels(contractAddress, chainId) {
  const sql = `
    WITH wallet_journey AS (
      SELECT 
        from_address as wallet_address,
        MIN(block_timestamp) as first_interaction,
        COUNT(*) as total_interactions,
        COUNT(DISTINCT DATE_TRUNC('day', block_timestamp)) as active_days,
        CASE WHEN COUNT(*) = 1 THEN 'single_interaction'
             WHEN COUNT(*) BETWEEN 2 AND 5 THEN 'early_adoption'
             WHEN COUNT(*) BETWEEN 6 AND 20 THEN 'regular_usage'
             ELSE 'power_usage'
        END as funnel_stage
      FROM mc_transactions 
      WHERE to_address = $1 AND chain_id = $2
      GROUP BY from_address
    )
    SELECT 
      funnel_stage,
      COUNT(*) as wallet_count,
      AVG(total_interactions) as avg_interactions,
      AVG(active_days) as avg_active_days
    FROM wallet_journey
    GROUP BY funnel_stage
    ORDER BY 
      CASE funnel_stage 
        WHEN 'single_interaction' THEN 1
        WHEN 'early_adoption' THEN 2
        WHEN 'regular_usage' THEN 3
        WHEN 'power_usage' THEN 4
      END
  `
  const rows = await query(sql, [contractAddress, chainId])
  return { name: 'interaction_funnels', rows }
}

// 16. Funnel drop off scoring
async function qFunnelDropOff(contractAddress, chainId) {
  const sql = `
    WITH function_usage AS (
      SELECT 
        address as wallet_address,
        event_name,
        COUNT(*) as usage_count,
        ROW_NUMBER() OVER (PARTITION BY address ORDER BY MIN(captured_at)) as function_order
      FROM mc_decoded_events 
      WHERE contract_address = $1 AND chain_id = $2
      GROUP BY address, event_name
    ),
    funnel_progression AS (
      SELECT 
        event_name,
        function_order,
        COUNT(DISTINCT wallet_address) as wallets_reached,
        LAG(COUNT(DISTINCT wallet_address)) OVER (ORDER BY function_order) as prev_stage_wallets
      FROM function_usage
      GROUP BY event_name, function_order
    )
    SELECT 
      event_name,
      function_order,
      wallets_reached,
      prev_stage_wallets,
      CASE WHEN prev_stage_wallets > 0 
           THEN (prev_stage_wallets - wallets_reached) * 100.0 / prev_stage_wallets 
           ELSE 0 
      END as drop_off_rate
    FROM funnel_progression
    ORDER BY function_order
  `
  const rows = await query(sql, [contractAddress, chainId])
  return { name: 'funnel_drop_off', rows }
}

/**
 * PHASE 5: Spending Power Intelligence
 */

// 18. Wallet lifetime value estimation
async function qLifetimeValue(contractAddress, chainId) {
  const sql = `
    WITH wallet_metrics AS (
      SELECT 
        from_address as wallet_address,
        SUM(gas_used * gas_price) as total_spent,
        COUNT(*) as tx_count,
        EXTRACT(epoch FROM (MAX(block_timestamp) - MIN(block_timestamp)))/86400 as lifespan_days,
        MAX(block_timestamp) as last_activity
      FROM mc_transactions 
      WHERE to_address = $1 AND chain_id = $2
      GROUP BY from_address
    )
    SELECT 
      wallet_address,
      total_spent,
      tx_count,
      lifespan_days,
      CASE WHEN lifespan_days > 0 
           THEN total_spent / lifespan_days 
           ELSE total_spent 
      END as daily_value,
      CASE WHEN lifespan_days > 0 
           THEN (total_spent / lifespan_days) * 365 
           ELSE total_spent * 365 
      END as estimated_annual_value,
      EXTRACT(epoch FROM (NOW() - last_activity))/86400 as days_since_last_activity
    FROM wallet_metrics
    ORDER BY estimated_annual_value DESC
  `
  const rows = await query(sql, [contractAddress, chainId])
  return { name: 'lifetime_value', rows }
}

// 19. Spending power tiers
async function qSpendingTiers(contractAddress, chainId) {
  const sql = `
    WITH wallet_spending AS (
      SELECT 
        from_address as wallet_address,
        SUM(gas_used * gas_price) as total_spent
      FROM mc_transactions 
      WHERE to_address = $1 AND chain_id = $2
      GROUP BY from_address
    ),
    spending_percentiles AS (
      SELECT 
        PERCENTILE_CONT(0.33) WITHIN GROUP (ORDER BY total_spent) as low_tier_threshold,
        PERCENTILE_CONT(0.66) WITHIN GROUP (ORDER BY total_spent) as medium_tier_threshold
      FROM wallet_spending
    )
    SELECT 
      w.wallet_address,
      w.total_spent,
      CASE 
        WHEN w.total_spent >= p.medium_tier_threshold THEN 'high_spender'
        WHEN w.total_spent >= p.low_tier_threshold THEN 'medium_spender'
        ELSE 'low_spender'
      END as spending_tier
    FROM wallet_spending w, spending_percentiles p
    ORDER BY w.total_spent DESC
  `
  const rows = await query(sql, [contractAddress, chainId])
  return { name: 'spending_tiers', rows }
}

/**
 * PHASE 6: Predictive Intelligence
 */

// 21. Next action prediction
async function qNextActionPrediction(contractAddress, chainId) {
  const sql = `
    WITH wallet_patterns AS (
      SELECT 
        from_address as wallet_address,
        AVG(EXTRACT(epoch FROM (block_timestamp - LAG(block_timestamp) OVER (PARTITION BY from_address ORDER BY block_timestamp)))/86400) as avg_days_between_tx,
        MAX(block_timestamp) as last_activity,
        COUNT(*) as total_transactions
      FROM mc_transactions 
      WHERE to_address = $1 AND chain_id = $2
      GROUP BY from_address
      HAVING COUNT(*) > 1
    )
    SELECT 
      wallet_address,
      last_activity,
      avg_days_between_tx,
      total_transactions,
      last_activity + INTERVAL '1 day' * avg_days_between_tx as predicted_next_activity,
      EXTRACT(epoch FROM (NOW() - last_activity))/86400 as days_since_last_activity,
      CASE 
        WHEN EXTRACT(epoch FROM (NOW() - last_activity))/86400 < avg_days_between_tx THEN 'likely_soon'
        WHEN EXTRACT(epoch FROM (NOW() - last_activity))/86400 < avg_days_between_tx * 2 THEN 'possible'
        ELSE 'unlikely'
      END as next_action_probability
    FROM wallet_patterns
    ORDER BY predicted_next_activity ASC
  `
  const rows = await query(sql, [contractAddress, chainId])
  return { name: 'next_action_prediction', rows }
}

// 22. Churn probability modeling
async function qChurnProbability(contractAddress, chainId) {
  const sql = `
    WITH wallet_activity AS (
      SELECT 
        from_address as wallet_address,
        COUNT(*) as total_transactions,
        MAX(block_timestamp) as last_activity,
        MIN(block_timestamp) as first_activity,
        EXTRACT(epoch FROM (MAX(block_timestamp) - MIN(block_timestamp)))/86400 as lifespan_days,
        AVG(EXTRACT(epoch FROM (block_timestamp - LAG(block_timestamp) OVER (PARTITION BY from_address ORDER BY block_timestamp)))/86400) as avg_gap_days
      FROM mc_transactions 
      WHERE to_address = $1 AND chain_id = $2
      GROUP BY from_address
    )
    SELECT 
      wallet_address,
      total_transactions,
      last_activity,
      lifespan_days,
      avg_gap_days,
      EXTRACT(epoch FROM (NOW() - last_activity))/86400 as days_inactive,
      CASE 
        WHEN EXTRACT(epoch FROM (NOW() - last_activity))/86400 > COALESCE(avg_gap_days * 3, 30) THEN 'high_churn_risk'
        WHEN EXTRACT(epoch FROM (NOW() - last_activity))/86400 > COALESCE(avg_gap_days * 1.5, 14) THEN 'medium_churn_risk'
        ELSE 'low_churn_risk'
      END as churn_probability,
      CASE 
        WHEN total_transactions > 10 AND lifespan_days > 30 THEN 'high'
        WHEN total_transactions > 3 AND lifespan_days > 7 THEN 'medium'
        ELSE 'low'
      END as reactivation_potential
    FROM wallet_activity
    ORDER BY days_inactive DESC
  `
  const rows = await query(sql, [contractAddress, chainId])
  return { name: 'churn_probability', rows }
}

/**
 * Collect comprehensive user base intelligence (all phases)
 */
export async function collectUserBaseIntelligence(userId, contractAddress, chainId) {
  const data = {
    user_id: userId,
    contract_address: contractAddress,
    chain_id: chainId,
    analysis_timestamp: new Date().toISOString()
  }
  
  // Phase 1: Single wallet intelligence for all wallets
  const timeline = await qWalletActivityTimeline(contractAddress, chainId)
  data[timeline.name] = timeline.rows
  
  const intensity = await qWalletUsageIntensity(contractAddress, chainId)
  data[intensity.name] = intensity.rows
  
  const timeBehavior = await qWalletTimeBehavior(contractAddress, chainId)
  data[timeBehavior.name] = timeBehavior.rows
  
  const spending = await qWalletSpendingBehavior(contractAddress, chainId)
  data[spending.name] = spending.rows
  
  const preferences = await qWalletPreferences(contractAddress, chainId)
  data[preferences.name] = preferences.rows
  
  const stability = await qWalletStabilityRisk(contractAddress, chainId)
  data[stability.name] = stability.rows
  
  // Phase 2: Cohort intelligence
  const cohorts = await qEntryCohorts(contractAddress, chainId)
  data[cohorts.name] = cohorts.rows
  
  const retention = await qCohortRetention(contractAddress, chainId)
  data[retention.name] = retention.rows
  
  // Phase 3: Segmentation intelligence
  const clustering = await qBehaviorClustering(contractAddress, chainId)
  data[clustering.name] = clustering.rows
  
  // Phase 4: Funnel intelligence
  const funnels = await qInteractionFunnels(contractAddress, chainId)
  data[funnels.name] = funnels.rows
  
  const dropOff = await qFunnelDropOff(contractAddress, chainId)
  data[dropOff.name] = dropOff.rows
  
  // Phase 5: Spending power intelligence
  const ltv = await qLifetimeValue(contractAddress, chainId)
  data[ltv.name] = ltv.rows
  
  const tiers = await qSpendingTiers(contractAddress, chainId)
  data[tiers.name] = tiers.rows
  
  // Phase 6: Predictive intelligence
  const nextAction = await qNextActionPrediction(contractAddress, chainId)
  data[nextAction.name] = nextAction.rows
  
  const churn = await qChurnProbability(contractAddress, chainId)
  data[churn.name] = churn.rows
  
  return data
}
