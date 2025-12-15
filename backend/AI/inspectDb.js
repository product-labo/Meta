import { query } from './dbJobs.js'

async function listTables() {
  const rows = await query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
  )
  return rows.map(r => r.table_name)
}

async function sample(table, limit = 3) {
  try {
    const rows = await query(`SELECT * FROM "${table}" LIMIT ${limit}`)
    return rows
  } catch (e) {
    return [{ error: String(e.message || e) }]
  }
}

async function main() {
  const tables = await listTables()
  const out = { tables }
  for (const t of tables) {
    out['sample_' + t] = await sample(t, 3)
  }
  const outPath = process.env.AI_INSPECT_OUT
  const text = JSON.stringify(out, null, 2) + '\n'
  if (outPath) {
    const { writeFileSync } = await import('node:fs')
    writeFileSync(outPath, text, 'utf8')
  } else {
    process.stdout.write(text)
  }
}

main().catch(e => {
  process.stderr.write(String(e.message || e) + '\n')
  process.exit(1)
})
