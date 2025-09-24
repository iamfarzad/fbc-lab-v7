// Simplified Intelligence Service - Single Source of Truth
import type { ContextSnapshot, IntentResult, ResearchResult } from '../types/intelligence'
import type { CompanyContext, PersonContext } from '../context/context-types'

/**
 * Clean, simplified intelligence service that integrates with existing systems
 * Replaces complex ActivityDisplay with ai-elements integration
 */
export class SimpleIntelligenceService {
  
  async initSession(input: {
    sessionId: string
    email?: string
    name?: string
  }): Promise<ContextSnapshot> {
    const { sessionId, email, name } = input

    // Build basic context - can be enhanced later
    const context: ContextSnapshot = {
      lead: {
        email: email || '',
        name: name || email?.split('@')[0] || ''
      },
      capabilities: ['search', 'roi', 'webcam', 'screen'],
      role: 'prospect'
    }

    return context
  }

  async researchLead(input: {
    sessionId: string
    email: string
    name?: string
  }): Promise<ResearchResult> {
    // Simple mock research result - can be enhanced with actual research
    const email = input.email || '';
    const company: CompanyContext = {
      name: 'Unknown Company',
      domain: email.split('@')[1] || 'unknown.com'
    }

    const person: PersonContext = {
      fullName: input.name || email.split('@')[0] || 'Unknown Person'
    }

    return {
      company,
      person: { ...person, profileUrl: person.profileUrl ?? '' },
      role: 'Business Professional',
      confidence: 0.5
    }
  }

  async analyzeMessage(message: string): Promise<IntentResult> {
    const text = message.toLowerCase()
    
    // Simple intent detection
    if (text.includes('roi') || text.includes('calculate') || text.includes('cost')) {
      return { type: 'consulting', confidence: 0.8, slots: { tool: 'roi' } }
    }
    
    if (text.includes('workshop') || text.includes('learn') || text.includes('training')) {
      return { type: 'workshop', confidence: 0.8, slots: { tool: 'workshop' } }
    }
    
    return { type: 'other', confidence: 0.6, slots: {} }
  }

  clearCache() {
    console.log('Intelligence cache cleared')
  }
}

// Export singleton instance for compatibility
export const intelligenceService = new SimpleIntelligenceService()

