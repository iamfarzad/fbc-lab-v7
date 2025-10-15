import { LeadResearchService } from '@/core/intelligence/lead-research'

/**
 * Lead Intelligence Agent - Background research worker
 * 
 * NOT a chat agent - runs when user accepts terms
 * Researches: LinkedIn, company enrichment, industry analysis
 * Output: Intelligence context stored in session
 */

const leadResearchService = new LeadResearchService()

export async function leadIntelligenceAgent({
  email,
  name,
  companyUrl,
  sessionId
}: {
  email: string
  name?: string
  companyUrl?: string
  sessionId: string
}) {
  console.log('🔍 [Lead Intelligence Agent] Starting research for:', email)

  try {
    // Use existing lead research service
    const research = await leadResearchService.researchLead(
      email,
      name,
      companyUrl,
      sessionId
    )

    // Calculate initial fit scores based on intelligence
    const fitScore = calculateInitialFitScore(research)

    console.log('✅ [Lead Intelligence Agent] Research complete:', {
      company: research.company.name,
      role: research.role,
      confidence: research.confidence,
      fitScore
    })

    return {
      output: 'Intelligence research complete',
      agent: 'Lead Intelligence Agent',
      metadata: {
        stage: 'INTELLIGENCE_GATHERING' as const,
        research,
        fitScore,
        confidence: research.confidence
      }
    }

  } catch (error) {
    console.error('❌ [Lead Intelligence Agent] Research failed:', error)
    
    return {
      output: 'Intelligence research failed',
      agent: 'Lead Intelligence Agent',
      metadata: {
        stage: 'INTELLIGENCE_GATHERING' as const,
        error: error instanceof Error ? error.message : 'Unknown error',
        fitScore: { workshop: 0.5, consulting: 0.5 }
      }
    }
  }
}

/**
 * Calculate initial fit scores based on intelligence data
 * (Before conversation - just from LinkedIn/company data)
 */
function calculateInitialFitScore(research: any): { workshop: number; consulting: number } {
  let workshopFit = 0.5
  let consultingFit = 0.5

  // Role-based signals
  const role = research.role?.toLowerCase() || ''
  const seniority = research.person?.seniority?.toLowerCase() || ''

  if (role.includes('ceo') || role.includes('founder') || role.includes('vp') || seniority === 'c-level') {
    consultingFit += 0.3
  } else if (role.includes('manager') || role.includes('director') || role.includes('lead')) {
    workshopFit += 0.3
  }

  // Company size signals
  const companySize = research.company?.size?.toLowerCase() || ''
  if (companySize.includes('500+') || companySize.includes('1000+') || companySize.includes('enterprise')) {
    consultingFit += 0.2
  } else if (companySize.includes('50-') || companySize.includes('100-') || companySize.includes('mid')) {
    workshopFit += 0.2
  }

  // Industry signals (some industries prefer consulting)
  const industry = research.company?.industry?.toLowerCase() || ''
  if (industry.includes('finance') || industry.includes('healthcare') || industry.includes('enterprise')) {
    consultingFit += 0.1
  }

  // Clamp scores to 0.0 - 1.0
  workshopFit = Math.max(0, Math.min(1, workshopFit))
  consultingFit = Math.max(0, Math.min(1, consultingFit))

  return { workshop: workshopFit, consulting: consultingFit }
}
