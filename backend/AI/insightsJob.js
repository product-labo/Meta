import { collectInsights } from './insightsQueries.js'
import { analyzeTrends } from './trendAnalysis.js'
import { saveResult } from './storage.js'
import { ensureSchema, insertAnalysis } from './dbJobs.js'

async function runOnce(objective, model, tags) {
  await ensureSchema()
  const insights = await collectInsights()
  const summary = await analyzeTrends(insights, { objective, model })
  const rec = await saveResult({
    summary,
    objective,
    model,
    tags: tags || null,
    meta: { categories: Object.keys(insights) },
    source: 'db_insights'
  })
  await insertAnalysis(rec)
  return rec
}

async function main() {
  const objective =
    process.env.AI_OBJECTIVE ||
    'Provide insights on cohort retention, adoption, activation, churn, function/event calls, transactions, and user behavior'
  const model = process.env.AI_MODEL || 'open-mistral-7b'
  const tags = process.env.AI_TAGS ? process.env.AI_TAGS.split(',') : null
  const cronMs = parseInt(process.env.AI_CRON_MS || '600000', 10)
  const onceOnly = process.env.AI_CRON_ONCE === '1'
  if (onceOnly) {
    const r = await runOnce(objective, model, tags)
    process.stdout.write(JSON.stringify(r) + '\n')
    return
  }
  async function tick() {
    try {
      const r = await runOnce(objective, model, tags)
      process.stdout.write(JSON.stringify(r) + '\n')
    } catch (e) {
      process.stderr.write(String(e.message || e) + '\n')
    }
  }
  await tick()
  setInterval(tick, cronMs)
}

main().catch(e => {
  process.stderr.write(String(e.message || e) + '\n')
  process.exit(1)
})

