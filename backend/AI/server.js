import http from 'node:http'
import { analyzeTrends } from './trendAnalysis.js'
import { saveResult } from './storage.js'

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => {
      data += chunk
    })
    req.on('end', () => {
      if (!data) return resolve({})
      try {
        resolve(JSON.parse(data))
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

function send(res, status, obj) {
  const text = JSON.stringify(obj)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  })
  res.end(text)
}

const port = parseInt(process.env.AI_PORT || '3080', 10)
const host = process.env.AI_HOST || '0.0.0.0'

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    })
    return res.end()
  }
  if (req.method === 'POST' && req.url.startsWith('/ai/analyze-db')) {
    try {
      const { query } = await import('./dbJobs.js')
      const body = await readBody(req)
      const sql = body.sql || process.env.AI_SOURCE_SQL
      const objective = body.objective || process.env.AI_OBJECTIVE
      const model = body.model || process.env.AI_MODEL || 'open-mistral-7b'
      if (!sql) return send(res, 400, { error: 'missing sql' })
      const rows = await query(sql)
      const summary = await analyzeTrends({ rows }, { objective, model })
      const result = {
        summary,
        objective: objective || null,
        model,
        source: 'db',
        meta: { row_count: rows.length }
      }
      const saved = await saveResult(result)
      return send(res, 200, saved)
    } catch (e) {
      return send(res, 500, { error: String(e.message || e) })
    }
  }
  if (req.method === 'POST' && req.url.startsWith('/ai/analyze')) {
    try {
      const body = await readBody(req)
      const data = body.data
      const objective = body.objective
      const model = body.model
      const tags = body.tags
      const meta = body.meta
      if (typeof data === 'undefined') {
        return send(res, 400, { error: 'missing data' })
      }
      const summary = await analyzeTrends(data, { objective, model })
      const result = {
        summary,
        objective: objective || null,
        model: model || 'open-mistral-7b',
        tags: tags || null,
        meta: meta || null,
        source: body.source || null
      }
      const saved = await saveResult(result)
      return send(res, 200, saved)
    } catch (e) {
      return send(res, 500, { error: String(e.message || e) })
    }
  }
  if (req.method === 'POST' && req.url.startsWith('/ai/analyze-insights')) {
    try {
      const { collectInsights } = await import('./insightsQueries.js')
      const body = await readBody(req)
      const model = body.model || process.env.AI_MODEL || 'open-mistral-7b'
      const objective =
        body.objective ||
        'Provide insights on cohort retention, adoption, activation, churn, function/event calls, transactions, and user behavior'
      const insights = await collectInsights()
      const summary = await analyzeTrends(insights, { objective, model })
      const result = {
        summary,
        objective,
        model,
        source: 'db_insights',
        meta: { categories: Object.keys(insights) }
      }
      const saved = await saveResult(result)
      return send(res, 200, saved)
    } catch (e) {
      return send(res, 500, { error: String(e.message || e) })
    }
  }
  send(res, 404, { error: 'not_found' })
})

server.listen(port, host, () => {})
