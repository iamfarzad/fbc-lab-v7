import { LeadResearchService } from '@/core/intelligence/lead-research'
import type { ChainOfThoughtStep } from './types'

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

  const steps: ChainOfThoughtStep[] = []
  
  try {
    // Step 1: Extract company domain
    steps.push({
      label: 'Extracting company domain',
      description: `Parsing email: ${email}`,
      status: 'complete',
      timestamp: Date.now()
    })

    // Step 2: Research company profile
    steps.push({
      label: 'Researching company profile',
      description: 'Looking up company information and industry data',
      status: 'active',
      timestamp: Date.now()
    })

    // Use existing lead research service
    const research = await leadResearchService.researchLead(
      email,
      name,
      companyUrl,
      sessionId
    )

    steps[1].status = 'complete'

    // Step 3: Analyze LinkedIn data
    steps.push({
      label: 'Analyzing LinkedIn data',
      description: `Found: ${research.person?.fullName || name || 'Unknown'}, ${research.role || 'Role unknown'}`,
      status: 'complete',
      timestamp: Date.now()
    })

    // Step 4: Calculate fit scores
    steps.push({
      label: 'Calculating fit scores',
      description: 'Analyzing role seniority, company size, and industry signals',
      status: 'active',
      timestamp: Date.now()
    })

    const fitScore = calculateInitialFitScore(research)

    steps[3].status = 'complete'
    steps[3].description = `Workshop: ${(fitScore.workshop * 100).toFixed(0)}%, Consulting: ${(fitScore.consulting * 100).toFixed(0)}%`

    // Step 5: Finalize intelligence context
    steps.push({
      label: 'Finalizing intelligence context',
      description: `Confidence: ${(research.confidence * 100).toFixed(0)}%`,
      status: 'complete',
      timestamp: Date.now()
    })

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
        chainOfThought: { steps },
        research,
        fitScore,
        confidence: research.confidence
      }
    }

  } catch (error) {
    console.error('❌ [Lead Intelligence Agent] Research failed:', error)
    
    // Mark last active step as error
    const lastActiveIndex = steps.findIndex(s => s.status === 'active')
    if (lastActiveIndex !== -1) {
      steps[lastActiveIndex].status = 'complete'
      steps[lastActiveIndex].description = 'Failed: ' + (error instanceof Error ? error.message : 'Unknown error')
    }

    return {
      output: 'Intelligence research failed',
      agent: 'Lead Intelligence Agent',
      metadata: {
        stage: 'INTELLIGENCE_GATHERING' as const,
        chainOfThought: { steps },
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
