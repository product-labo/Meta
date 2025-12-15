import https from 'node:https'

function post(url, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const payload = Buffer.from(JSON.stringify(data))
    const options = {
      method: 'POST',
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers: Object.assign(
        {
          'Content-Type': 'application/json',
          'Content-Length': payload.length
        },
        headers
      )
    }
    const req = https.request(options, res => {
      let body = ''
      res.on('data', chunk => {
        body += chunk
      })
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body))
          } catch (e) {
            reject(e)
          }
        } else {
          reject(new Error('HTTP ' + res.statusCode + ' ' + body))
        }
      })
    })
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

export async function chat(messages, model) {
  const key = process.env.MISTRAL_API_KEY
  const mock = process.env.AI_MOCK === '1' || process.env.AI_MODE === 'mock'
  if (mock) {
    return {
      choices: [
        { message: { content: 'Mock insight: rising trend with minor anomaly near end.' } }
      ]
    }
  }
  if (!key) throw new Error('Missing MISTRAL_API_KEY')
  const res = await post(
    'https://api.mistral.ai/v1/chat/completions',
    { model: model || 'open-mistral-7b', messages },
    { Authorization: 'Bearer ' + key }
  )
  return res
}

export async function generate(system, user, model) {
  const messages = []
  if (system) messages.push({ role: 'system', content: system })
  messages.push({ role: 'user', content: user })
  const res = await chat(messages, model)
  const c =
    res &&
    res.choices &&
    res.choices[0] &&
    res.choices[0].message &&
    res.choices[0].message.content
  return c || ''
}
 
