import { execFile } from 'node:child_process'
import fs from 'node:fs'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function envDb() {
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: String(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || ''
  }
}

let usePg = null
let pgPool = null
async function ensurePg() {
  if (usePg !== null) return usePg
  try {
    const mod = await import('pg')
    const { Pool } = mod
    const db = envDb()
    pgPool = new Pool({
      host: db.host,
      port: parseInt(db.port, 10),
      user: db.user,
      password: db.password,
      database: db.database
    })
    usePg = true
  } catch (e) {
    usePg = false
  }
  return usePg
}

function runPsqlArgs(args, input) {
  return new Promise((resolve, reject) => {
    const db = envDb()
    const env = Object.assign({}, process.env, { PGPASSWORD: db.password })
    const child = execFile('psql', args, { env }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message))
      resolve(stdout || '')
    })
    if (input) {
      child.stdin.write(input)
      child.stdin.end()
    }
  })
}

function baseArgs() {
  const db = envDb()
  const args = []
  if (db.host) args.push('-h', db.host)
  if (db.port) args.push('-p', db.port)
  if (db.user) args.push('-U', db.user)
  if (db.database) args.push('-d', db.database)
  return args
}

async function applySql(sql) {
  if (await ensurePg()) {
    const client = await pgPool.connect()
    try {
      await client.query(sql)
    } finally {
      client.release()
    }
  } else {
    const args = baseArgs().concat(['-v', 'ON_ERROR_STOP=1', '-c', sql])
    await runPsqlArgs(args)
  }
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (!lines.length) return []
  const header = parseCsvLine(lines[0])
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i])
    if (!cols.length) continue
    const obj = {}
    for (let j = 0; j < header.length; j++) {
      obj[header[j]] = cols[j] !== undefined ? cols[j] : null
    }
    rows.push(obj)
  }
  return rows
}

function parseCsvLine(line) {
  const out = []
  let i = 0
  let cur = ''
  let inQ = false
  while (i < line.length) {
    const ch = line[i]
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i += 2
          continue
        } else {
          inQ = false
          i++
          continue
        }
      } else {
        cur += ch
        i++
        continue
      }
    } else {
      if (ch === '"') {
        inQ = true
        i++
        continue
      }
      if (ch === ',') {
        out.push(cur)
        cur = ''
        i++
        continue
      }
      cur += ch
      i++
    }
  }
  out.push(cur)
  return out
}

export async function query(sql) {
  if (await ensurePg()) {
    const client = await pgPool.connect()
    try {
      const res = await client.query(sql)
      return res.rows || []
    } finally {
      client.release()
    }
  } else {
    const copy = 'COPY (' + sql + ') TO STDOUT WITH CSV HEADER'
    const args = baseArgs().concat(['-c', copy])
    const out = await runPsqlArgs(args)
    return parseCsv(out)
  }
}

function sq(s) {
  return "'" + String(s).replace(/'/g, "''") + "'"
}

export async function ensureSchema() {
  const f = path.join(__dirname, 'schema.sql')
  const text = fs.readFileSync(f, 'utf8')
  await applySql(text)
}

export async function insertAnalysis(rec) {
  if (await ensurePg()) {
    const client = await pgPool.connect()
    try {
      await client.query(
        'INSERT INTO ai_analyses (id, created_at, objective, model, summary, tags, meta, source) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [
          rec.id,
          rec.created_at,
          rec.objective || null,
          rec.model || null,
          rec.summary || null,
          rec.tags ? JSON.stringify(rec.tags) : null,
          rec.meta ? JSON.stringify(rec.meta) : null,
          rec.source || null
        ]
      )
    } finally {
      client.release()
    }
  } else {
    const id = sq(rec.id)
    const created = sq(rec.created_at)
    const objective = rec.objective == null ? 'NULL' : sq(rec.objective)
    const model = rec.model == null ? 'NULL' : sq(rec.model)
    const summary = rec.summary == null ? 'NULL' : sq(rec.summary)
    const tags = rec.tags == null ? 'NULL' : sq(JSON.stringify(rec.tags)) + '::jsonb'
    const meta = rec.meta == null ? 'NULL' : sq(JSON.stringify(rec.meta)) + '::jsonb'
    const source = rec.source == null ? 'NULL' : sq(rec.source)
    const sql =
      'INSERT INTO ai_analyses (id, created_at, objective, model, summary, tags, meta, source) VALUES (' +
      [id, created, objective, model, summary, tags, meta, source].join(', ') +
      ')'
    await applySql(sql)
  }
}
 
