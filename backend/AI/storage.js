import fs from 'node:fs'
import path, { dirname } from 'node:path'
import http from 'node:http'
import https from 'node:https'
import { fileURLToPath } from 'node:url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function postJson(url, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const payload = Buffer.from(JSON.stringify(data))
    const lib = u.protocol === 'http:' ? http : https
    const options = {
      method: 'POST',
      hostname: u.hostname,
      port: u.port || (u.protocol === 'http:' ? 80 : 443),
      path: u.pathname + u.search,
      headers: Object.assign(
        { 'Content-Type': 'application/json', 'Content-Length': payload.length },
        headers
      )
    }
    const req = lib.request(options, res => {
      let body = ''
      res.on('data', chunk => {
        body += chunk
      })
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body ? JSON.parse(body) : {})
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

function uid() {
  return (
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2, 8)
  )
}

export async function saveResult(result) {
  const out = Object.assign({}, result)
  if (!out.id) out.id = uid()
  if (!out.created_at) out.created_at = new Date().toISOString()
  const httpUrl = process.env.AI_SAVE_HTTP_URL
  const httpToken = process.env.AI_SAVE_HTTP_TOKEN
  if (httpUrl) {
    const headers = {}
    if (httpToken) headers.Authorization = 'Bearer ' + httpToken
    await postJson(httpUrl, out, headers)
    return out
  }
  const filePath =
    process.env.AI_SAVE_FILE ||
    path.join(__dirname, 'results.jsonl')
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.appendFileSync(filePath, JSON.stringify(out) + '\n')
  return out
}
 
