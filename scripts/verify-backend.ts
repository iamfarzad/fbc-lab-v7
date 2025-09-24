import fs from 'fs'
import path from 'path'
import { POST as sessionInit } from '../app/api/intelligence/session-init/route'
import { POST as suggestionsPost } from '../app/api/intelligence/suggestions/route'
import { POST as chatUnified } from '../app/api/chat/unified/route'

type RequestInitLite = {
  method?: string
  body?: any
  headers?: Record<string, string>
}

type SimpleRequest = {
  url: string
  method: string
  headers: Headers
  json: () => Promise<any>
}

function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) return
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue
    const [key, ...rest] = line.split('=')
    if (!key) continue
    const value = rest.join('=').trim()
    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

function createRequest(url: string, init: RequestInitLite = {}): SimpleRequest {
  const body = init.body ?? null
  const headers = new Headers(init.headers)
  return {
    url,
    method: init.method || 'GET',
    headers,
    async json() {
      if (!body) return {}
      if (typeof body === 'string') return JSON.parse(body)
      return body
    }
  }
}

async function readJson(res: Response): Promise<any> {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function run() {
  loadEnv()
  const sessionId = `verify-${Date.now()}`

  console.log('➡️  Hitting /api/intelligence/session-init')
  const initReq = createRequest('http://localhost/api/intelligence/session-init', {
    method: 'POST',
    body: JSON.stringify({ sessionId, email: 'verifier@farzadbayat.com', name: 'Verifier Bot' }),
    headers: { 'Content-Type': 'application/json' }
  })
  const initRes = await sessionInit(initReq as any)
  const initJson = await readJson(initRes)
  if (initRes.status !== 200) {
    console.error('❌ session-init failed', initRes.status, initJson)
    throw new Error('session-init failed')
  }
  console.log('✅ session-init ok', { contextReady: initJson.contextReady, sessionId: initJson.sessionId })

  console.log('➡️  Hitting /api/intelligence/suggestions')
  const suggestionsReq = createRequest('http://localhost/api/intelligence/suggestions', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
    headers: { 'Content-Type': 'application/json' }
  })
  const suggestionsRes = await suggestionsPost(suggestionsReq as any, {})
  const suggestionsJson = await readJson(suggestionsRes)
  if (suggestionsRes.status !== 200 || !suggestionsJson?.suggestions) {
    console.error('❌ suggestions failed', suggestionsRes.status, suggestionsJson)
    throw new Error('suggestions failed')
  }
  console.log('✅ suggestions ok', suggestionsJson.suggestions.slice(0, 2))

  console.log('➡️  Hitting /api/chat/unified')
  const chatReq = createRequest('http://localhost/api/chat/unified', {
    method: 'POST',
    body: JSON.stringify({
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Give me one sentence about strategic AI consulting.' }
      ],
      context: { sessionId }
    }),
    headers: {
      'Content-Type': 'application/json',
      'x-intelligence-session-id': sessionId,
    }
  })
  const chatRes = await chatUnified(chatReq as any)
  if (chatRes.status !== 200) {
    const body = await readJson(chatRes)
    console.error('❌ chat unified failed', chatRes.status, body)
    throw new Error('chat unified failed')
  }
  const chatJson = await readJson(chatRes)
  console.log('✅ chat unified ok', chatJson.content?.slice(0, 120) || chatJson)

  console.log('\n🎉 Backend verification succeeded')
}

run().catch((error) => {
  console.error('\nVerification failed:', error)
  process.exit(1)
})
