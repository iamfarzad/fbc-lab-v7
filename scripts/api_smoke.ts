import { readFileSync } from 'fs'
import { resolve } from 'path'
import Module from 'module'

const compiledRoot = resolve(__dirname, '..')
const moduleRef = Module as unknown as { _resolveFilename: (request: string, parent: NodeModule | null, isMain: boolean, options: any) => string }
const originalResolve = moduleRef._resolveFilename
moduleRef._resolveFilename = function (request: string, parent: NodeModule | null, isMain: boolean, options: any) {
  if (request.startsWith('@/src/')) {
    const absolutePath = resolve(compiledRoot, 'src', request.slice('@/src/'.length))
    return originalResolve.call(this, absolutePath, parent, isMain, options)
  }
  if (request.startsWith('@/app/')) {
    const absolutePath = resolve(compiledRoot, 'app', request.slice('@/app/'.length))
    return originalResolve.call(this, absolutePath, parent, isMain, options)
  }
  if (request.startsWith('@/')) {
    const absolutePath = resolve(compiledRoot, 'src', request.slice('@/'.length))
    return originalResolve.call(this, absolutePath, parent, isMain, options)
  }
  if (request.startsWith('@app/')) {
    const absolutePath = resolve(compiledRoot, 'app', request.slice('@app/'.length))
    return originalResolve.call(this, absolutePath, parent, isMain, options)
  }
  return originalResolve.call(this, request, parent, isMain, options)
}

function loadEnvLocal() {
  try {
    const envPath = resolve(process.cwd(), '.env.local')
    const raw = readFileSync(envPath, 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex === -1) continue
      const key = trimmed.slice(0, eqIndex).trim()
      let value = trimmed.slice(eqIndex + 1).trim()
      if (!key) continue
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  } catch (error) {
    console.warn('Could not load .env.local:', error)
  }
}

loadEnvLocal()

import { POST as postSessionInit } from '../app/api/intelligence/session-init/route'
import { GET as getContext } from '../app/api/intelligence/context/route'
import { POST as postIntent } from '../app/api/intelligence/intent/route'
import { POST as postChatUnified } from '../app/api/chat/unified/route'

async function callContext(sessionId: string) {
  const request = new Request(`http://localhost/api/intelligence/context?sessionId=${sessionId}`, {
    method: 'GET'
  })
  const response = await getContext(request as any)
  const json = await response.json()
  return { status: response.status, json }
}

async function callSessionInit(sessionId: string, email: string) {
  const body = {
    sessionId,
    email,
    name: 'Smoke Test User',
    companyUrl: 'https://example.com'
  }
  const request = new Request('http://localhost/api/intelligence/session-init', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-intelligence-session-id': sessionId
    },
    body: JSON.stringify(body)
  })
  const response = await postSessionInit(request as any)
  const json = await response.json()
  return { status: response.status, json }
}

async function callIntent(sessionId: string) {
  const body = {
    sessionId,
    userMessage: 'We need help improving onboarding workflows.'
  }
  const request = new Request('http://localhost/api/intelligence/intent', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-intelligence-session-id': sessionId
    },
    body: JSON.stringify(body)
  })
  const response = await postIntent(request as any, {})
  const json = await response.json()
  return { status: response.status, json }
}

async function callChatUnified(sessionId: string, contextSnapshot: any) {
  const body = {
    stream: false,
    mode: 'standard',
    messages: [
      { role: 'user', content: 'Give me a short welcome tailored to my company.' }
    ],
    context: {
      sessionId,
      intelligenceContext: contextSnapshot || undefined
    }
  }
  const request = new Request('http://localhost/api/chat/unified', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-intelligence-session-id': sessionId
    },
    body: JSON.stringify(body)
  })
  const response = await postChatUnified(request as any)
  const json = await response.json()
  return { status: response.status, json }
}

async function run() {
  const sessionId = `smoke-${Date.now()}`
  const email = `smoke.${Date.now()}@example.com`

  console.log('--- Stage 2.4: GET /api/intelligence/context ---')
  const contextBefore = await callContext(sessionId)
  console.dir({ stage: 'context-before', status: contextBefore.status, snapshot: contextBefore.json }, { depth: null })

  console.log('--- Stage 4.4: POST /api/intelligence/session-init ---')
  const sessionInit = await callSessionInit(sessionId, email)
  console.dir({ stage: 'session-init', status: sessionInit.status, payload: sessionInit.json }, { depth: null })

  console.log('--- Stage 4.4: POST /api/intelligence/intent ---')
  const intent = await callIntent(sessionId)
  console.dir({ stage: 'intent', status: intent.status, payload: intent.json }, { depth: null })

  console.log('--- Stage 4.4: POST /api/chat/unified (stream=false) ---')
  const chat = await callChatUnified(sessionId, sessionInit.json?.context)
  console.dir({ stage: 'chat', status: chat.status, payload: chat.json }, { depth: null })

  console.log('--- Stage 5.4: Context after interactions ---')
  const contextAfter = await callContext(sessionId)
  console.dir({ stage: 'context-after', status: contextAfter.status, snapshot: contextAfter.json }, { depth: null })
}

run().catch((error) => {
  console.error('Smoke test script failed:', error)
  process.exitCode = 1
})
