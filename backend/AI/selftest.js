process.env.AI_MODE = process.env.AI_MODE || 'mock'
import { analyzeTrends } from './trendAnalysis.js'
import { saveResult } from './storage.js'

async function main() {
  const data = {
    series: [10, 12, 15, 22, 21, 25, 31, 30],
    meta: { window: 'daily', symbol: 'XYZ' }
  }
  const summary = await analyzeTrends(data, {
    objective: 'Detect emerging upward trends and anomalies'
  })
  const saved = await saveResult({
    summary,
    objective: 'Detect emerging upward trends and anomalies',
    model: 'open-mistral-7b',
    tags: ['selftest'],
    meta: { origin: 'selftest' }
  })
  process.stdout.write(JSON.stringify(saved) + '\n')
}

main().catch(e => {
  process.stderr.write(String(e.message || e) + '\n')
  process.exit(1)
})
