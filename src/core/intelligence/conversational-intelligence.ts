import { LeadResearchService } from './lead-research'
import { detectRole } from './role-detector'
import type { ContextSnapshot } from '../context/context-schema'
import { getContextSnapshot, updateContext } from '../context/context-manager'
import type { IntentResult as LegacyIntentResult, Suggestion } from '../types/intelligence'
import { suggestTools } from './tool-suggestion-engine'

// Type definitions for advanced intent classifier
interface AdvancedIntentResult {
  type: string
  confidence: number
  reasoning: string[]
  context: {
    urgency: 'low' | 'medium' | 'high' | 'critical'
    complexity: 'simple' | 'moderate' | 'complex'
    sentiment: 'positive' | 'neutral' | 'negative'
    requiresAction: boolean
  }
  suggestedActions: string[]
  metadata: {
    processingTime: number
    tokensUsed?: number
    model?: string
  }
}

interface RoleDetectionInput {
  company?: {
    summary?: string
    industry?: string
  }
  person?: {
    role?: string
    seniority?: string
  }
  role?: string
}

export class ConversationalIntelligence {
  private research = new LeadResearchService()
  private lastStableTranscript = new Map<string, string>()

  async initSession(input: { sessionId: string; email: string; name?: string; companyUrl?: string }): Promise<ContextSnapshot | null> {
    const { sessionId, email, name, companyUrl } = input
    const researchResult = await this.research.researchLead(email, name, companyUrl, sessionId)
    const role = await detectRole({
      company: {
        ...(researchResult.company?.summary ? { summary: researchResult.company.summary } : {}),
        ...(researchResult.company?.industry ? { industry: researchResult.company.industry } : {})
      },
      person: {
        ...(researchResult.person?.role ? { role: researchResult.person.role } : {}),
        ...(researchResult.person?.seniority ? { seniority: researchResult.person.seniority } : {})
      },
      role: researchResult.role,
    })
    await updateContext(sessionId, {
      company: researchResult.company,
      person: researchResult.person,
      role: role.role,
      roleConfidence: role.confidence,
    })
    return await getContextSnapshot(sessionId)
  }

  async researchLead(input: { sessionId: string; email: string; name?: string; companyUrl?: string }) {
    return this.research.researchLead(input.email, input.name, input.companyUrl, input.sessionId)
  }

  // 🔧 PATCH: unknown → guard
  private isResearchResultLike(v: unknown): v is { citations?: unknown[] } {
    return !!v && typeof v === 'object';
  }

  async detectRoleFromResearch(research: unknown) {
    if (!this.isResearchResultLike(research)) {
      // handle invalid shape
      throw new Error('Invalid research result shape');
    }
    return detectRole(research as RoleDetectionInput)
  }

  async detectIntent(text: string, context: ContextSnapshot): Promise<AdvancedIntentResult> {
    // Import the intent detector dynamically to avoid circular dependencies
    const { advancedIntentClassifier } = await import('./advanced-intent-classifier')
    const result = await advancedIntentClassifier.classifyIntent({
      message: text,
      sessionId: (context as any).sessionId || 'unknown',
      timestamp: new Date()
    })
    
    // Convert IntentClassificationResult to AdvancedIntentResult
    return {
      type: result.primaryIntent.id,
      confidence: result.confidence,
      reasoning: result.reasoning,
      context: result.context,
      suggestedActions: result.suggestedActions,
      metadata: result.metadata
    }
  }

  async suggestTools(context: ContextSnapshot, intent: AdvancedIntentResult, stage: string): Promise<Suggestion[]> {
    void stage
    // Convert advanced intent result to legacy format for compatibility
    const legacyIntent = this.convertToLegacyIntent(intent)
    return suggestTools(context as any, legacyIntent)
  }

  /**
   * Analyze voice transcript and update context
   * Caches last stable transcript to avoid re-processing partials
   */
  async analyzeVoiceTranscript(
    transcript: string,
    sessionId: string,
    role: 'user' | 'assistant'
  ): Promise<void> {
    try {
      // Skip if same as last processed (avoid re-processing on streaming updates)
      const cacheKey = `${sessionId}:${role}`
      if (this.lastStableTranscript.get(cacheKey) === transcript) {
        return
      }
      
      this.lastStableTranscript.set(cacheKey, transcript)

      // Only analyze user transcripts for intent
      if (role !== 'user') return

      const context = await getContextSnapshot(sessionId)
      if (!context) return

      // Detect intent from voice
      const intent = await this.detectIntent(transcript, context)
      
      console.log(`🎤 Voice intent: ${intent.type} (${Math.round(intent.confidence * 100)}%)`)

    } catch (err) {
      console.error('Voice transcript analysis failed (non-fatal):', err)
      // Don't throw - this is best-effort analysis
    }
  }

  private convertToLegacyIntent(advancedIntent: AdvancedIntentResult): LegacyIntentResult {
    // Map advanced intent categories to legacy format
    const intentMapping: Record<string, 'consulting' | 'workshop' | 'other'> = {
      'problem_solving': 'consulting',
      'decision_making': 'consulting',
      'collaboration': 'workshop',
      'analysis': 'consulting',
      'creative': 'workshop',
      'transactional': 'consulting',
      'social': 'workshop',
      'information_request': 'other'
    }

    const mappedType = intentMapping[advancedIntent.type] || 'other'

    return {
      type: mappedType,
      confidence: advancedIntent.confidence,
      slots: {}
    }
  }
}
