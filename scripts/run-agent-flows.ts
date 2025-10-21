/*
  Lightweight runner to validate multi-agent flows without Jest.
  NOTE: This script now loads environment variables from .env.local/.env
  so GEMINI_API_KEY and ENABLE_MULTI_AGENT can be set there.
*/
import { existsSync, readFileSync } from 'fs'
import type { AgentContext, ChatMessage } from '@/core/agents/types'

function parseAndSetEnv(path: string, override = false) {
  try {
    const content = readFileSync(path, 'utf8')
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const eqIndex = line.indexOf('=')
      if (eqIndex === -1) continue
      const key = line.slice(0, eqIndex).trim()
      let val = line.slice(eqIndex + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (override || process.env[key] === undefined) {
        process.env[key] = val
      }
    }
    return true
  } catch {
    return false
  }
}

function loadEnvFiles() {
  // Load root .env.local, then .env, then server/.env.local as fallback
  const tried: string[] = []
  const paths = [
    '.env.local',
    '.env',
    'server/.env.local',
  ]
  for (const p of paths) {
    if (existsSync(p)) {
      parseAndSetEnv(p, false)
      tried.push(p)
    }
  }
  return tried
}

async function run() {
  const loaded = loadEnvFiles()
  // Default multi-agent on for this runner
  process.env.ENABLE_MULTI_AGENT = process.env.ENABLE_MULTI_AGENT || 'true'

  // Sanity log for keys presence (mask value)
  const gk = process.env.GEMINI_API_KEY
  console.log('[Runner] Loaded env files:', loaded)
  console.log('[Runner] ENABLE_MULTI_AGENT:', process.env.ENABLE_MULTI_AGENT)
  console.log('[Runner] GEMINI_API_KEY:', gk ? `${gk.substring(0, 6)}...` : 'NOT SET')

  // Import after env has been loaded above. Dynamic import keeps order explicit.
  const { routeToAgent } = await import('@/core/agents/orchestrator')
  // For this runner we don't need compile-time AgentContext typing; skip dynamic type import

  const sessionId = `cli-test-${Date.now()}`

  // Helper to build canonical messages
  const mkId = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
  const msg = (role: ChatMessage['role'], content: string): ChatMessage => ({
    id: mkId(),
    role,
    content,
    timestamp: new Date(),
  })

  // 1) Workshop flow: DISCOVERY -> SCORING/WORKSHOP_PITCH
  {
    let messages: ChatMessage[] = [
      msg('user', 'What services do you offer?'),
    ]
    let context: AgentContext = {
      sessionId,
      intelligenceContext: {
        email: 'manager@midsize.com',
        name: 'Jane Manager',
        company: { name: 'MidSize Tech', industry: 'Software', size: '200 employees' },
        person: { fullName: 'Jane Manager', role: 'Engineering Manager', seniority: 'Manager' },
        role: 'Engineering Manager',
      },
      conversationFlow: {
        covered: { goals: false, pain: false, data: false, readiness: false, budget: false, success: false },
        recommendedNext: 'goals',
        evidence: {},
        insights: {},
        coverageOrder: [],
        totalUserTurns: 1,
        firstUserTimestamp: Date.now(),
        latestUserTimestamp: Date.now(),
        shouldOfferRecap: false,
      },
    }
    let res = await routeToAgent({ messages, context, trigger: 'chat' })
    console.log('[Workshop#1]', res.agent, res.metadata?.stage)

    messages.push(msg('assistant', res.output))
    messages.push(msg('user', 'We want to automate our manual reporting'))
    context.conversationFlow = {
      ...context.conversationFlow!,
      covered: { goals: true, pain: true, data: true, readiness: true, budget: false, success: false },
      totalUserTurns: 2,
    }
    res = await routeToAgent({ messages, context, trigger: 'chat' })
    console.log('[Workshop#2]', res.agent, res.metadata?.stage)
  }

  // 2) Consulting flow: CONSULTING_PITCH
  {
    const messages: ChatMessage[] = [
      msg('user', 'We need a custom AI system for our operations'),
    ]
    const context: AgentContext = {
      sessionId,
      intelligenceContext: {
        email: 'cto@enterprise.com',
        name: 'Bob CTO',
        company: { name: 'Enterprise Inc', industry: 'Finance', size: '1000+ employees' },
        person: { fullName: 'Bob CTO', role: 'Chief Technology Officer', seniority: 'C-level' },
        role: 'CTO',
        fitScore: { workshop: 0.2, consulting: 0.9 },
      },
      conversationFlow: {
        covered: { goals: true, pain: true, data: true, readiness: true, budget: true, success: true },
        recommendedNext: null,
        evidence: { goals: ['Custom AI system'], pain: ['Manual operations'], budget: ['Q2 timeline'] },
        insights: {},
        coverageOrder: [],
        totalUserTurns: 6,
        firstUserTimestamp: Date.now() - 60_000,
        latestUserTimestamp: Date.now(),
        shouldOfferRecap: true,
      },
    }
    const res = await routeToAgent({ messages, context, trigger: 'chat' })
    console.log('[Consulting]', res.agent, res.metadata?.stage)
  }

  // 3) Multimodal signal
  {
    const messages: ChatMessage[] = [
      msg('user', 'Let me show you our current analytics dashboard'),
    ]
    const context: AgentContext = {
      sessionId,
      intelligenceContext: { email: 'user@company.com', name: 'User Name' },
      conversationFlow: {
        covered: { goals: false, pain: false, data: false, readiness: false, budget: false, success: false },
        recommendedNext: 'goals',
        evidence: {},
        insights: {},
        coverageOrder: [],
        totalUserTurns: 1,
        firstUserTimestamp: Date.now(),
        latestUserTimestamp: Date.now(),
        shouldOfferRecap: false,
      },
      multimodalContext: {
        hasRecentImages: true,
        hasRecentAudio: false,
        hasRecentUploads: false,
        recentAnalyses: ['Dashboard shows manual data entry in Excel with errors'],
        recentUploads: [],
      },
    }
    const res = await routeToAgent({ messages, context, trigger: 'chat' })
    console.log('[Multimodal]', res.agent, res.metadata?.stage, 'multimodalUsed=', res.metadata?.multimodalUsed)
  }
}

run().catch((err) => {
  console.error('[Runner] Error:', err)
  process.exit(1)
})
