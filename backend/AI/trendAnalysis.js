import { generate } from './mistralClient.js'

function toText(v) {
  if (typeof v === 'string') return v
  try {
    return JSON.stringify(v)
  } catch (e) {
    return String(v)
  }
}

export async function analyzeTrends(input, options = {}) {
  const objective =
    options.objective ||
    'Identify key trends, anomalies, and actionable insights.'
  const model = options.model || 'open-mistral-7b'
  const system =
    'You analyze data and output a structured report with the following sections: ' +
    '1) Dapp Growth Playbook, 2) Investor Traction Metrics, 3) Startup Ideas (User Behavior), ' +
    '4) Startup Ideas (General Data), 5) Market Gaps & Trends, 6) Competitive Analysis (Contracts), ' +
    '7) Risks & Caveats, 8) Next Actions. ' +
    'Use concise bullets, quantify where possible, and tie recommendations to metrics.'
  const user = 'Objective: ' + objective + '\nData:\n' + toText(input)
  const out = await generate(system, user, model)
  return out
}
 
