import { query } from './dbJobs.js'

async function tables() {
  const rows = await query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
  )
  return new Set(rows.map(r => r.table_name))
}

function exists(set, name) {
  return set.has(name)
}

async function qCohortRetention(tb) {
  const name = 'wallet_cohorts'
  if (!exists(tb, name)) return { name, rows: [] }
  const sql =
    'SELECT cohort_type, cohort_period, wallet_count, retention_week_1, retention_week_2, retention_week_3, retention_week_4 ' +
    'FROM wallet_cohorts ORDER BY cohort_period DESC LIMIT 12'
  const rows = await query(sql)
  return { name, rows }
}

async function qAdoptionStages(tb) {
  const name = 'wallet_adoption_stages'
  if (!exists(tb, name)) return { name, rows: [] }
  const sql =
    'SELECT stage_name, COUNT(*) AS stage_count ' +
    'FROM wallet_adoption_stages GROUP BY stage_name ORDER BY stage_count DESC LIMIT 20'
  const rows = await query(sql)
  return { name, rows }
}

async function qHealthChurn(tb) {
  const name = 'wallet_health_dashboard'
  if (!exists(tb, name)) return { name, rows: [] }
  const sql =
    'SELECT health_status, wallet_count, avg_score, percentage ' +
    'FROM wallet_health_dashboard ORDER BY wallet_count DESC'
  const rows = await query(sql)
  return { name, rows }
}

async function qFunctionCalls(tb) {
  const name = 'mc_decoded_events'
  if (!exists(tb, name)) return { name, rows: [] }
  const sql =
    "SELECT event_name, event_signature, COUNT(*) AS occurrences " +
    "FROM mc_decoded_events " +
    "WHERE captured_at >= now() - interval '7 days' " +
    "GROUP BY event_name, event_signature " +
    "ORDER BY occurrences DESC LIMIT 50"
  const rows = await query(sql)
  return { name, rows }
}

async function qTransactions(tb) {
  const out = []
  if (exists(tb, 'transactions')) {
    const sql =
      "SELECT date_trunc('day', timestamp) AS day, COUNT(*) AS tx_count " +
      'FROM transactions GROUP BY day ORDER BY day DESC LIMIT 30'
    const rows = await query(sql)
    out.push({ name: 'transactions_daily', rows })
  }
  if (exists(tb, 'mc_transactions')) {
    const sql =
      "SELECT date_trunc('day', block_timestamp) AS day, COUNT(*) AS tx_count " +
      'FROM mc_transactions GROUP BY day ORDER BY day DESC LIMIT 30'
    const rows = await query(sql)
    out.push({ name: 'mc_transactions_daily', rows })
  }
  return out
}

async function qUserBehavior(tb) {
  const name = 'wallet_behavior_flows'
  if (!exists(tb, name)) return { name, rows: [] }
  const sql =
    'SELECT COUNT(*) AS flow_count FROM wallet_behavior_flows'
  const rows = await query(sql)
  return { name, rows }
}

async function qWalletsTotal(tb) {
  const name = 'wallets_total'
  if (!exists(tb, 'wallets')) return { name, rows: [] }
  const rows = await query('SELECT COUNT(*) AS total_wallets FROM wallets')
  return { name, rows }
}

async function qDefiInteractionsTrend(tb) {
  const name = 'mc_defi_interactions_trend'
  if (!exists(tb, 'mc_defi_interactions')) return { name, rows: [] }
  const sql =
    "SELECT protocol_name, interaction_type, COUNT(*) AS interactions " +
    "FROM mc_defi_interactions " +
    "WHERE captured_at >= now() - interval '7 days' " +
    "GROUP BY protocol_name, interaction_type " +
    "ORDER BY interactions DESC LIMIT 50"
  const rows = await query(sql)
  return { name, rows }
}

async function qContractInteractions(tb) {
  const name = 'contract_interactions'
  if (!exists(tb, 'mc_defi_interactions')) return { name, rows: [] }
  const sql =
    "SELECT contract_address, protocol_name, COUNT(*) AS interactions " +
    "FROM mc_defi_interactions " +
    "WHERE captured_at >= now() - interval '7 days' " +
    "GROUP BY contract_address, protocol_name " +
    "ORDER BY interactions DESC LIMIT 50"
  const rows = await query(sql)
  return { name, rows }
}

async function qInvestorCategories(tb) {
  const name = 'bi_contract_categories'
  if (!exists(tb, name)) return { name, rows: [] }
  const sql =
    'SELECT category_name, subcategory, COUNT(*) AS contracts ' +
    'FROM bi_contract_index i JOIN bi_contract_categories c ON i.category_id = c.id ' +
    'GROUP BY category_name, subcategory ORDER BY contracts DESC LIMIT 50'
  const rows = await query(sql)
  return { name, rows }
}

export async function collectInsights() {
  const tb = await tables()
  const parts = []
  parts.push(await qCohortRetention(tb))
  parts.push(await qAdoptionStages(tb))
  parts.push(await qHealthChurn(tb))
  parts.push(await qUserBehavior(tb))
  parts.push(await qWalletsTotal(tb))
  const txParts = await qTransactions(tb)
  for (const p of txParts) parts.push(p)
  parts.push(await qFunctionCalls(tb))
  parts.push(await qDefiInteractionsTrend(tb))
  parts.push(await qContractInteractions(tb))
  parts.push(await qInvestorCategories(tb))
  const data = {}
  for (const p of parts) {
    data[p.name] = p.rows
  }
  return data
}
