import { z } from 'zod';
// 🔧 MASTER FLOW: Fixed intelligence service import
import { intelligenceService } from '@/src/core/intelligence/index';

export const sessionInitSchema = z.object({
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  mode: z.string().optional(),
});

export interface IntelligenceRequest {
  action: 'init-session' | 'analyze-message' | 'research-lead'
  data: Record<string, unknown>
}

export async function handleIntelligence(body: IntelligenceRequest): Promise<unknown> {
  const { action, data } = body

  switch (action) {
    case 'init-session': {
      const validated = sessionInitSchema.parse(data)
      if (!validated.sessionId) {
        throw new Error('Session ID required for init-session')
      }
      const context = await intelligenceService.initSession({
        sessionId: validated.sessionId,
        email: (data as any).email,
        name: (data as any).name
      })
      return { success: true, context }
    }

    case 'analyze-message': {
      const { message } = data as { message: string; context?: any }
      const intent = await intelligenceService.analyzeMessage(message)
      return { success: true, intent }
    }

    case 'research-lead': {
      const { email, name, companyUrl, sessionId } = data as { email: string; name?: string; companyUrl?: string; sessionId?: string }

      // Action logged

      // Use the actual LeadResearchService instead of the simple mock
      const { LeadResearchService } = await import('../../core/intelligence/lead-research')
      const leadResearchService = new LeadResearchService()
      const result = await leadResearchService.researchLead({
        email,
        ...(name ? { name } : {}),
        ...(companyUrl ? { companyUrl } : {}),
        ...(sessionId ? { sessionId } : {})
      })

      // Store in context if sessionId provided
      if (sessionId) {
        const { ContextStorage } = await import('../../core/context/context-storage')
        const contextStorage = new ContextStorage()

        await contextStorage.update(sessionId, {
          company_context: result.company,
          person_context: result.person,
          role: result.role,
          role_confidence: result.confidence
        })

        // Optional: store embeddings for memory when enabled
        if (process.env.EMBEDDINGS_ENABLED === 'true') {
          const { embedTexts } = await import('../../core/embeddings/gemini')
          const { upsertEmbeddings } = await import('../../core/embeddings/query')

          const texts: string[] = []
          if (result.company?.summary) texts.push(String(result.company.summary))
          if (result.person?.fullName) texts.push(`Person: ${result.person.fullName}`)
          if (result.person?.role) texts.push(`Role: ${result.person.role}`)
          const vectors = texts.length ? await embedTexts(texts, 1536) : []
          if (vectors.length) await upsertEmbeddings(sessionId, 'lead_research', texts, vectors)
        }
      }

      // Action logged

      return { success: true, research: {
        company: result.company,
        person: result.person,
        role: result.role,
        scores: { confidence: result.confidence },
        citations: result.citations || [],
        provider: result.provider || 'unknown'
      }}
    }

    default:
      throw new Error(`Unknown intelligence action: ${action}`)
  }
}
