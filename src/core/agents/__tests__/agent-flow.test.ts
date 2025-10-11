/**
 * End-to-End Agent Flow Tests
 * 
 * Tests complete conversation flows through multi-agent system
 */

import { routeToAgent } from '../orchestrator'
import type { AgentContext, ChatMessage } from '../types'

describe('Agent Flow - End to End', () => {
  const sessionId = 'e2e-test-session'

  describe('Workshop Lead Flow', () => {
    it('should complete full workshop funnel', async () => {
      // STEP 1: Discovery
      let messages: ChatMessage[] = [
        { role: 'user', content: 'What services do you offer?' }
      ]

      let context: AgentContext = {
        sessionId,
        intelligenceContext: {
          email: 'manager@midsize.com',
          name: 'Jane Manager',
          company: {
            name: 'MidSize Tech',
            industry: 'Software',
            size: '200 employees'
          },
          person: {
            fullName: 'Jane Manager',
            role: 'Engineering Manager',
            seniority: 'Manager'
          },
          role: 'Engineering Manager'
        },
        conversationFlow: {
          covered: { goals: false, pain: false, data: false, readiness: false, budget: false, success: false },
          recommendedNext: 'goals' as const,
          evidence: {},
          coverageOrder: [],
          totalUserTurns: 1,
          shouldOfferRecap: false
        }
      }

      let result = await routeToAgent({ messages, context, trigger: 'chat' })
      expect(result.agent).toBe('Discovery Agent')
      expect(result.metadata?.stage).toBe('DISCOVERY')

      // STEP 2: Continue discovery (cover categories)
      messages.push(
        { role: 'assistant', content: result.output },
        { role: 'user', content: 'We want to automate our manual reporting' }
      )

      context.conversationFlow = {
        ...context.conversationFlow!,
        covered: { goals: true, pain: true, data: true, readiness: true, budget: false, success: false },
        totalUserTurns: 2
      }

      result = await routeToAgent({ messages, context, trigger: 'chat' })
      // Should trigger scoring after 4 categories
      expect(['SCORING', 'WORKSHOP_PITCH']).toContain(result.metadata?.stage)

      console.log('✅ Workshop flow test passed')
    })
  })

  describe('Consulting Lead Flow', () => {
    it('should complete full consulting funnel', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'We need a custom AI system for our operations' }
      ]

      const context: AgentContext = {
        sessionId,
        intelligenceContext: {
          email: 'cto@enterprise.com',
          name: 'Bob CTO',
          company: {
            name: 'Enterprise Inc',
            industry: 'Finance',
            size: '1000+ employees'
          },
          person: {
            fullName: 'Bob CTO',
            role: 'Chief Technology Officer',
            seniority: 'C-level'
          },
          role: 'CTO',
          fitScore: {
            workshop: 0.2,
            consulting: 0.9
          }
        },
        conversationFlow: {
          covered: { goals: true, pain: true, data: true, readiness: true, budget: true, success: true },
          recommendedNext: null,
          evidence: {
            goals: ['Custom AI system'],
            pain: ['Manual operations'],
            budget: ['Q2 timeline']
          },
          coverageOrder: [],
          totalUserTurns: 6,
          shouldOfferRecap: true
        }
      }

      const result = await routeToAgent({ messages, context, trigger: 'chat' })
      expect(result.agent).toBe('Consulting Sales Agent')
      expect(result.metadata?.stage).toBe('CONSULTING_PITCH')

      console.log('✅ Consulting flow test passed')
    })
  })

  describe('Multimodal Enhancement', () => {
    it('should include screen share context in response', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Let me show you our current analytics dashboard' }
      ]

      const context: AgentContext = {
        sessionId,
        intelligenceContext: {
          email: 'user@company.com',
          name: 'User Name'
        },
        conversationFlow: {
          covered: { goals: false, pain: false, data: false, readiness: false, budget: false, success: false },
          recommendedNext: 'goals' as const,
          evidence: {},
          coverageOrder: [],
          totalUserTurns: 1,
          shouldOfferRecap: false
        },
        multimodalContext: {
          hasRecentImages: true,
          hasRecentAudio: false,
          hasRecentUploads: false,
          recentAnalyses: ['Dashboard showing Excel-based reporting with manual data entry'],
          recentUploads: []
        }
      }

      const result = await routeToAgent({ messages, context, trigger: 'chat' })
      
      expect(result.metadata?.multimodalUsed).toBe(true)
      expect(result.output).toBeTruthy()

      console.log('✅ Multimodal context test passed')
    })
  })
})
