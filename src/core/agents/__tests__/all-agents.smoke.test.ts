import { routeToAgent } from '../orchestrator'
import type { AgentContext, ChatMessage } from '../types'

const mkId = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
const msg = (role: ChatMessage['role'], content: string): ChatMessage => ({
  id: mkId(),
  role,
  content,
  timestamp: new Date(),
})

describe('All Agents Smoke', () => {
  const sessionId = 'smoke-session-1'

  it('routes to Closer Agent (CLOSING)', async () => {
    const messages: ChatMessage[] = [msg('user', 'We have a couple of questions before booking')]
    const context: AgentContext = {
      sessionId,
      intelligenceContext: { email: 'lead@example.com', name: 'Lead', pitchDelivered: true, calendarBooked: false },
      conversationFlow: {
        covered: { goals: true, pain: true, data: true, readiness: true, budget: true, success: true },
        recommendedNext: null,
        evidence: {},
        insights: {},
        coverageOrder: [],
        totalUserTurns: 3,
        firstUserTimestamp: Date.now() - 1_000,
        latestUserTimestamp: Date.now(),
        shouldOfferRecap: false,
      },
    }
    const res = await routeToAgent({ messages, context, trigger: 'chat' })
    expect(res.agent).toBe('Closer Agent')
    expect(res.metadata?.stage).toBe('CLOSING')
  })

  it('routes to Summary Agent (conversation_end)', async () => {
    const messages: ChatMessage[] = [msg('assistant', 'Goodbye!')]
    const context: AgentContext = {
      sessionId,
      conversationFlow: {
        covered: { goals: false, pain: false, data: false, readiness: false, budget: false, success: false },
        recommendedNext: 'goals',
        evidence: {},
        insights: {},
        coverageOrder: [],
        totalUserTurns: 0,
        firstUserTimestamp: null,
        latestUserTimestamp: null,
        shouldOfferRecap: false,
      },
    }
    const res = await routeToAgent({ messages, context, trigger: 'conversation_end' })
    expect(res.agent).toBe('Summary Agent')
    expect(res.metadata?.stage).toBe('SUMMARY')
  })

  it('routes to Admin AI Agent (admin)', async () => {
    const messages: ChatMessage[] = [msg('user', 'Show me high-score leads from last week')] 
    const res = await routeToAgent({
      messages,
      context: { sessionId: 'admin-session', intelligenceContext: { email: 'admin@example.com', name: 'Admin' } } as AgentContext,
      trigger: 'admin',
    })
    expect(res.agent).toBe('Admin AI Agent')
    expect(res.metadata?.stage).toBe('ADMIN')
  })

  it('routes to Proposal Agent (proposal_request)', async () => {
    const messages: ChatMessage[] = [msg('user', 'Can you send a proposal?')] 
    const context: AgentContext = {
      sessionId,
      intelligenceContext: {
        email: 'cto@enterprise.com',
        name: 'CTO',
        company: { name: 'Big Co', industry: 'Finance', size: '1000+' },
      },
      conversationFlow: {
        covered: { goals: true, pain: true, data: true, readiness: true, budget: true, success: true },
        recommendedNext: null,
        evidence: { goals: ['custom ai'], budget: ['Q2'] },
        insights: {},
        coverageOrder: [],
        totalUserTurns: 4,
        firstUserTimestamp: Date.now() - 10_000,
        latestUserTimestamp: Date.now(),
        shouldOfferRecap: false,
      },
    }
    const res = await routeToAgent({ messages, context, trigger: 'proposal_request' })
    expect(res.agent).toBe('Proposal Agent')
    expect(res.metadata?.stage).toBe('PROPOSAL')
  })

  it('routes to Retargeting Agent (retargeting trigger)', async () => {
    const messages: ChatMessage[] = [msg('assistant', 'We will follow up soon')] 
    const context: AgentContext = {
      sessionId,
      intelligenceContext: { email: 'lead@example.com', name: 'Lead Name', fitScore: { workshop: 0.9, consulting: 0.2 } },
      conversationFlow: {
        covered: { goals: true, pain: true, data: true, readiness: true, budget: false, success: false },
        recommendedNext: 'budget',
        evidence: {},
        insights: {},
        coverageOrder: [],
        totalUserTurns: 3,
        firstUserTimestamp: Date.now() - 5_000,
        latestUserTimestamp: Date.now(),
        shouldOfferRecap: false,
      },
    }
    // @ts-expect-error: retargeting is supported at runtime
    const res = await routeToAgent({ messages, context, trigger: 'retargeting' })
    expect(res.agent).toBe('Retargeting Agent')
    expect(res.metadata?.stage).toBe('RETARGETING')
  })
})
