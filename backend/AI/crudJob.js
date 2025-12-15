import { analyzeTrends } from './trendAnalysis.js'
import { saveResult } from './storage.js'
import { query, ensureSchema, insertAnalysis } from './dbJobs.js'

async function once(sql, objective, model, tags, meta, source) {
  await ensureSchema()
  const rows = await query(sql)
  const summary = await analyzeTrends({ rows }, { objective, model })
  const rec = await saveResult({
    summary,
    objective: objective || null,
    model: model || 'open-mistral-7b',
    tags: tags || null,
    meta: meta || null,
    source: source || 'db'
  })
  await insertAnalysis(rec)
  return rec
}

async function run() {
  const sql = process.env.AI_SOURCE_SQL || 'SELECT NOW() as ts'
  const objective =
    process.env.AI_OBJECTIVE ||
    'Analyze blockchain activity for business and user insights'
  const model = process.env.AI_MODEL || 'open-mistral-7b'
  const tags = process.env.AI_TAGS ? process.env.AI_TAGS.split(',') : null
  const meta = null
  const source = process.env.AI_SOURCE || 'db'
  const cronMs = parseInt(process.env.AI_CRON_MS || '600000', 10)
  const onceOnly = process.env.AI_CRON_ONCE === '1'
  if (onceOnly) {
    const r = await once(sql, objective, model, tags, meta, source)
    process.stdout.write(JSON.stringify(r) + '\n')
    return
  }
  async function tick() {
    try {
      const r = await once(sql, objective, model, tags, meta, source)
      process.stdout.write(JSON.stringify(r) + '\n')
    } catch (e) {
      process.stderr.write(String(e.message || e) + '\n')
    }
  }
  await tick()
  setInterval(tick, cronMs)
}

run().catch(e => {
  process.stderr.write(String(e.message || e) + '\n')
  process.exit(1)
})
