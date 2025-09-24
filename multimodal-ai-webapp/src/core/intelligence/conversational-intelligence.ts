import { GoogleGroundingProvider } from './providers/search/google-grounding'
import { LeadResearchService } from './lead-research'
import { detectRole } from './role-detector'
import type { ContextSnapshot } from '../context/context-schema'
import { getContextSnapshot, updateContext } from '../context/context-manager'
import type { IntentResult, Suggestion } from '../types/intelligence'
import { suggestTools } from './tool-suggestion-engine'

export class ConversationalIntelligence {
  private grounding = new GoogleGroundingProvider()
  private research = new LeadResearchService()

  async initSession(input: { sessionId: string; email: string; name?: string; companyUrl?: string }): Promise<ContextSnapshot | null> {
    const { sessionId, email, name, companyUrl } = input
    const researchResult = await this.research.researchLead({ email, name, companyUrl, sessionId } as any)
    const role = await detectRole({
      company: {
        ...(researchResult.company?.summary ? { summary: researchResult.company.summary } : {}),
        ...(researchResult.company?.industry ? { industry: researchResult.company.industry } : {})
      } as any,
      person: {
        ...(researchResult.person?.role ? { role: researchResult.person.role } : {}),
        ...(researchResult.person?.seniority ? { seniority: researchResult.person.seniority } : {})
      } as any,
      role: researchResult.role,
    })
    await updateContext(sessionId, {
      company: researchResult.company,
      person: researchResult.person,
      role: role.role,
      roleConfidence: role.confidence,
    } as any)
    return await getContextSnapshot(sessionId)
  }

  async researchLead(input: { sessionId: string; email: string; name?: string; companyUrl?: string }) {
    return this.research.researchLead(input)
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
    return detectRole(research as any)
  }

  async detectIntent(text: string, context: ContextSnapshot): Promise<IntentResult> {
    // Import the intent detector dynamically to avoid circular dependencies
    // 🔧 PATCH: make NodeNext happy
    const { detectIntent } = await import('./intent-detector.js')
    return detectIntent(text)
  }

  async suggestTools(context: ContextSnapshot, intent: IntentResult, stage: string): Promise<Suggestion[]> {
    return suggestTools(context as any, intent as any)
  }
}


