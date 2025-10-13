import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import ts from 'typescript'
import vm from 'vm'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

function loadEnv() {
  const envPath = path.join(rootDir, '.env.local')
  if (!fs.existsSync(envPath)) return
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    const value = line.slice(eq + 1).trim()
    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

function resolveImport(specifier, parentDir) {
  if (specifier.startsWith('@/')) {
    const resolved = path.join(rootDir, specifier.slice(2))
    if (fs.existsSync(resolved)) return resolved
    if (fs.existsSync(resolved + '.ts')) return resolved + '.ts'
    if (fs.existsSync(resolved + '.js')) return resolved + '.js'
    throw new Error(`Cannot resolve alias import ${specifier}`)
  }
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    const base = path.resolve(parentDir, specifier)
    if (fs.existsSync(base)) return base
    if (fs.existsSync(base + '.ts')) return base + '.ts'
    if (fs.existsSync(base + '.js')) return base + '.js'
    throw new Error(`Cannot resolve relative import ${specifier}`)
  }
  return specifier
}

const sharedMemory = new Map()
const sharedTimestamps = new Map()

function loadModule(modulePath) {
  if (!modulePath.endsWith('.ts') && !modulePath.endsWith('.js') && !modulePath.startsWith('next/')) {
    if (fs.existsSync(modulePath + '.ts')) modulePath = modulePath + '.ts'
    else if (fs.existsSync(modulePath + '.js')) modulePath = modulePath + '.js'
  }
  if (modulePath in loadModule.cache) {
    return loadModule.cache[modulePath]
  }
  if (modulePath === 'next/server') {
    const NextResponse = class extends Response {
      static json(data, init) {
        const body = JSON.stringify(data)
        const headers = new Headers({ 'Content-Type': 'application/json' })
        if (init?.headers) {
          for (const [k, v] of Object.entries(init.headers)) headers.set(k, v)
        }
        return new Response(body, { status: init?.status ?? 200, headers })
      }
    }
    loadModule.cache[modulePath] = { NextResponse }
    return loadModule.cache[modulePath]
  }
  if (!modulePath.endsWith('.ts') && !modulePath.endsWith('.js')) {
    const mod = require(modulePath)
    loadModule.cache[modulePath] = mod
    return mod
  }
  const code = fs.readFileSync(modulePath, 'utf8')
  const transpiled = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText
  const dirname = path.dirname(modulePath)
  const module = { exports: {} }
  const req = (spec) => loadModule(resolveImport(spec, dirname))
  const wrapped = `(function(require, module, exports, __filename, __dirname){${transpiled}\n})`
  vm.runInThisContext(wrapped)(req, module, module.exports, modulePath, dirname)
  const exported = module.exports
  if (modulePath.endsWith('context-storage.ts')) {
    const { ContextStorage } = exported
    if (ContextStorage) {
      Object.defineProperty(ContextStorage.prototype, 'inMemoryStorage', {
        get() { return sharedMemory },
        set() {},
        configurable: true
      })
      Object.defineProperty(ContextStorage.prototype, 'cacheTimestamps', {
        get() { return sharedTimestamps },
        set() {},
        configurable: true
      })
    }
  }
  loadModule.cache[modulePath] = exported
  return exported
}
loadModule.cache = {}

function createRequest(url, init = {}) {
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

async function readJson(res) {
  const text = await res.text()
  try { return JSON.parse(text) } catch { return text }
}

async function run() {
  loadEnv()
  const sessionId = `verify-${Date.now()}`

  const { POST: sessionInit } = loadModule(path.join(rootDir, 'app/api/intelligence/session-init/route.ts'))
  const { POST: suggestionsPost } = loadModule(path.join(rootDir, 'app/api/intelligence/suggestions/route.ts'))
  const { POST: chatUnified } = loadModule(path.join(rootDir, 'app/api/chat/unified/route.ts'))

  console.log('➡️  Hitting /api/intelligence/session-init')
  const initReq = createRequest('http://localhost/api/intelligence/session-init', {
    method: 'POST',
    body: JSON.stringify({ sessionId, email: 'verifier@farzadbayat.com', name: 'Verifier Bot' }),
    headers: { 'Content-Type': 'application/json' },
  })
  const initRes = await sessionInit(initReq)
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
    headers: { 'Content-Type': 'application/json' },
  })
  const suggestionsRes = await suggestionsPost(suggestionsReq, {})
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
    },
  })
  const chatRes = await chatUnified(chatReq)
  const chatJson = await readJson(chatRes)
  if (chatRes.status !== 200) {
    console.error('❌ chat unified failed', chatRes.status, chatJson)
    throw new Error('chat unified failed')
  }
  console.log('✅ chat unified ok', chatJson.content?.slice(0, 120) || chatJson)

  console.log('\n🎉 Backend verification succeeded')
}

run().catch((error) => {
  console.error('\nVerification failed:', error)
  process.exit(1)
})
