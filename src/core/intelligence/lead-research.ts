import { GoogleGenAI } from '@google/genai'
import { GoogleGroundingProvider, GroundedAnswer } from './providers/search/google-grounding'
import { recordCapabilityUsed } from '@/src/core/context/capabilities'
import { supabaseService, createLeadSummary } from '@/src/core/supabase/client'
import { finalizeLeadSession } from '../workflows/finalizeLeadSession'
import type { LeadContext, CompanyContext, PersonContext } from '../context/context-types'

export interface ResearchResult {
  company: CompanyContext
  person: PersonContext
  role: string
  confidence: number
  citations?: Array<{
    uri: string
    title?: string
    description?: string
  }>
}

export class LeadResearchService {
  private cache = new Map<string, ResearchResult>()
  private cacheTTL = 24 * 60 * 60 * 1000 // 24 hours
  private genAI: GoogleGenAI
  private groundingProvider: GoogleGroundingProvider

  constructor() {
    this.genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
    this.groundingProvider = new GoogleGroundingProvider()
  }

  /**
   * Public method to persist research data to database
   * Call this at session end to ensure data consistency for PDF/email services
   */
  async saveResearchToDatabase(
    email: string,
    name?: string,
    companyUrl?: string,
    sessionId?: string
  ): Promise<string | null> {
    try {
      const researchResult = this.cache.get(this.generateCacheKey(email, name, companyUrl))
      if (!researchResult) {
        return null // No research data in cache
      }

      return await this.persistResearchToDatabase(email, name, companyUrl, researchResult, sessionId)
    } catch (error) {
      // Error: Failed to save research to database
      return null
    }
  }

  /**
   * Complete session workflow - research, PDF generation, and email sending
   * Call this when a lead conversation session ends
   */
  async completeSession(
    email: string,
    name?: string,
    companyUrl?: string,
    sessionId?: string
  ): Promise<any> {
    try {
      // Get research data from cache
      const researchResult = this.cache.get(this.generateCacheKey(email, name, companyUrl))
      if (!researchResult) {
        throw new Error('No research data found in cache')
      }

      // Generate summary from research data
      const summary = this.generateSummaryFromResearch(researchResult)

      // Prepare lead context for workflow
      const leadContext: LeadContext = {
        name: (name ?? email.split('@')[0] ?? 'Unknown').toString(),
        email,
        company: researchResult.company.name || 'Unknown Company'
      }

      // Execute the complete workflow
      const result = await finalizeLeadSession(leadContext as any)

      // Clear cache after successful completion
      this.cache.delete(this.generateCacheKey(email, name, companyUrl))

      return result
    } catch (error) {
      // Error: Session completion failed
      throw error
    }
  }

  /**
   * Generate summary from research data
   */
  private generateSummaryFromResearch(research: ResearchResult): string {
    const company = research.company
    const person = research.person

    return `Lead research completed for ${person.fullName || 'Unknown'} at ${company.name || 'Unknown Company'}.
Company: ${company.industry || 'Unknown industry'}, ${company.size || 'Unknown size'}
Role: ${research.role}
Confidence: ${Math.round(research.confidence * 100)}%
Key findings: ${company.summary || 'Analysis completed'}
Citations: ${research.citations?.length || 0} sources reviewed`
  }

  async researchLead(params: { email: string; name?: string; companyUrl?: string; sessionId?: string }): Promise<ResearchResult> {
    const { email, name, companyUrl, sessionId } = params
    const cacheKey = this.generateCacheKey(email, name, companyUrl)

    // Check cache first
    const cached = this.cache.get(cacheKey)
    if (cached) {
      // Action logged
      return cached
    }

    try {
      // Action logged

      const domain = email.split('@')[1] ?? 'unknown.com'

      // Known profile fallback for Farzad Bayat
      if (email === 'farzad@talktoeve.com' && ((name ?? '').toLowerCase().includes('farzad') || !name)) {
        // Action logged
        
        // Record capability usage for search
        if (sessionId) {
          await recordCapabilityUsed(sessionId, 'search', { email, name, companyUrl })
        }
        
        return {
          company: {
            name: 'Talk to EVE',
            domain: 'talktoeve.com',
            industry: 'Artificial Intelligence, Mental Health Technology',
            size: '2-10 employees',
            summary: 'Talk to EVE is an AI-powered platform focused on mental health and well-being, providing virtual companionship and support.',
            website: 'https://talktoeve.com',
            linkedin: 'https://www.linkedin.com/company/talktoeve/'
          },
          person: {
            fullName: 'Farzad Bayat',
            role: 'Founder & CEO',
            seniority: 'Founder',
            profileUrl: 'https://www.linkedin.com/in/farzad-bayat/',
            company: 'Talk to EVE'
          },
          role: 'Founder & CEO',
          confidence: 1.0,
          citations: [
            {
              uri: 'https://www.linkedin.com/in/farzad-bayat/',
              title: 'Farzad Bayat - LinkedIn Profile',
              description: 'Founder & CEO at Talk to EVE'
            }
          ]
        }
      }

      // Use Google Grounding for comprehensive research
      const researchResult = await this.researchWithGrounding(email, (name ?? email.split('@')[0] ?? 'Unknown').toString(), domain, companyUrl as any)
      
      // Record capability usage for search
      if (sessionId) {
        await recordCapabilityUsed(sessionId, 'search', { email, name, companyUrl })
      }

      // Cache the result
      this.cache.set(cacheKey, researchResult)

      // Action logged
      return researchResult

    } catch (error) {
      // Log error for debugging (remove in production)
      // Error: Lead research failed

      // Return fallback result
      const fallbackDomain = email.split('@')[1] || 'unknown.com'
      return {
        company: {
          name: fallbackDomain.split('.')[0] || 'Unknown Company',
          domain: fallbackDomain,
          summary: 'Company information unavailable',
          website: companyUrl || `https://${fallbackDomain}`
        },
        person: {
          fullName: name || 'Unknown Person',
          company: fallbackDomain.split('.')[0] || 'Unknown Company'
        },
        role: 'Unknown',
        confidence: 0,
        citations: []
      }
    }
  }

  private async researchWithGrounding(email: string, name: string | undefined, domain: string, companyUrl?: string): Promise<ResearchResult> {
    const allCitations: Array<{ uri: string; title?: string; description?: string }> = []

    // Fast path for known reserved domains
    const reservedDomains = ['example.com', 'example.net', 'example.org', 'example.edu', 'test.com', 'localhost']
    if (reservedDomains.includes(domain)) {
      // Action logged
      return {
        company: {
          name: (domain?.split('.')[0] ?? ''),
          domain,
          summary: `${domain} is a reserved domain name used for documentation and testing purposes.`,
          website: companyUrl ?? `https://${domain}`
        },
        person: {
          fullName: (name ?? email.split('@')[0] ?? 'Unknown').toString(),
          company: domain.split('.')[0] ?? 'Unknown'
        } as any,
        role: 'Test Account',
        confidence: 0.95,
        citations: [{
          uri: 'https://en.wikipedia.org/wiki/Example.com',
          title: 'Example.com',
          description: 'Reserved domain for documentation'
        }]
      }
    }

    // Helper function for timeout
    const withTimeout = <T>(p: Promise<T>, ms = 6000): Promise<T | null> =>
      Promise.race([p, new Promise<never>((_, r) => setTimeout(() => r(new Error('timeout')), ms))])
        .catch(() => null as T | null)

    // Run all searches in parallel with timeouts
    const [companySearch, personSearch, roleSearch] = await Promise.allSettled([
      withTimeout(this.groundingProvider.searchCompany(domain), 6000),
      withTimeout(this.groundingProvider.searchPerson((name ?? email.split('@')[0] ?? 'Unknown').toString(), domain), 6000),
      withTimeout(this.groundingProvider.searchRole((name ?? email.split('@')[0] ?? 'Unknown').toString(), domain), 6000)
    ])

    // Extract successful results
    const companyResult = companySearch.status === 'fulfilled' ? companySearch.value : null
    const personResult = personSearch.status === 'fulfilled' ? personSearch.value : null
    const roleResult = roleSearch.status === 'fulfilled' ? roleSearch.value : null

    // Collect citations from successful searches
    if (companyResult) allCitations.push(...companyResult.citations)
    if (personResult) allCitations.push(...personResult.citations)
    if (roleResult) allCitations.push(...roleResult.citations)

    // Use Gemini to synthesize the research results
    const prompt = `
You are a professional research assistant. Analyze the following search results and extract structured information.

Email: ${email}
Name: ${name || 'Unknown'}
Domain: ${domain}
Company URL: ${companyUrl || 'Not provided'}

Company Search Results:
${companyResult?.text || 'No company search results available'}

Person Search Results:
${personResult?.text || 'No person search results available'}

Role Search Results:
${roleResult?.text || 'No role search results available'}

Extract and return ONLY a JSON object with this structure:
{
  "company": {
    "name": "Company Name",
    "domain": "${domain}",
    "industry": "Industry",
    "size": "Company size",
    "summary": "Company description",
    "website": "Website URL",
    "linkedin": "LinkedIn company URL"
  },
  "person": {
    "fullName": "Full Name",
    "role": "Professional role",
    "seniority": "Seniority level",
    "profileUrl": "LinkedIn profile URL",
    "company": "Company name"
  },
  "role": "Detected role",
  "confidence": 0.85
}

Be thorough and accurate. If information is not available, use null for that field.
`

    const result = await this.genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }]}],
    } as any)
    const text = typeof (result as any).text === 'function'
      ? (result as any).text()
      : (result as any).text
        ?? (((result as any).candidates?.[0]?.content?.parts || [])
              .map((p: unknown) => (typeof p === 'object' && p !== null ? (p as any).text : '') || '')
              .filter(Boolean)
              .join('\n'))

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const researchData = JSON.parse(jsonMatch[0])
      try {
        const { normalizeCompany } = await import('./providers/enrich/company-normalizer')
        const { normalizePerson } = await import('./providers/enrich/person-normalizer')
        const nc = normalizeCompany({ name: domain.split('.')[0] ?? '', domain })
        const np = normalizePerson({ fullName: researchData?.person?.fullName, company: nc.name })
        return {
          company: { ...nc, ...researchData.company },
          person: { ...np, ...researchData.person },
          role: researchData.role,
          confidence: researchData.confidence,
          citations: allCitations
        }
      } catch {
        return {
          company: researchData.company,
          person: researchData.person,
          role: researchData.role,
          confidence: researchData.confidence,
          citations: allCitations
        }
      }
    }

    // Fallback if no JSON found
    return {
      company: {
        name: (domain?.split('.')[0] ?? ''),
        domain,
        website: companyUrl ?? `https://${domain}`,
        summary: 'Company information unavailable'
      },
      person: {
        fullName: (name ?? email.split('@')[0] ?? 'Unknown').toString(),
        company: domain.split('.')[0] ?? 'Unknown'
      } as any,
      role: 'Business Professional',
      confidence: 0.2,
      citations: allCitations
    }
  }

  private generateCacheKey(email: string, name?: string, companyUrl?: string): string {
    return `${email}|${name || ''}|${companyUrl || ''}`
  }

  /**
   * Persist the full research data to database at session end
   * This ensures PDF and email services have consistent data
   */
  async persistResearchToDatabase(
    email: string,
    name: string | undefined,
    companyUrl: string | undefined,
    researchResult: ResearchResult,
    sessionId?: string
  ): Promise<string> {
    try {
      // Create or update lead summary with research data
      const leadData = {
        email,
        name: name || email.split('@')[0],
        company: researchResult.company.name,
        industry: researchResult.company.industry,
        company_size: researchResult.company.size,
        notes: `Research completed with ${researchResult.confidence * 100}% confidence. Role: ${researchResult.role}`,
        status: 'qualified',
        lead_score: Math.round(researchResult.confidence * 100),
        user_id: null // Will be set by createLeadSummary
      }

      // Create the lead summary
      const lead = await createLeadSummary({ company_name: leadData.company, ...leadData })

      // Store the full research JSON in search results for retrieval by PDF/email services
      const researchRecord = {
        lead_id: lead.id,
        source: 'lead_research',
        url: researchResult.company.website || researchResult.company.domain,
        title: `Research Data for ${researchResult.person.fullName || 'Unknown Person'}`,
        snippet: `Company: ${researchResult.company.name}, Role: ${researchResult.role}`,
        raw: researchResult
      }

      await supabaseService
        .from('lead_search_results')
        .insert(researchRecord)

      // Action logged
      return lead.id
    } catch (error) {
      // Error: Failed to persist research data
      throw error
    }
  }

  /**
   * Get persisted research data from database
   * Used by PDF and email services
   */
  async getPersistedResearch(leadId: string): Promise<ResearchResult | null> {
    try {
      const { data, error } = await supabaseService
        .from('lead_search_results')
        .select('raw')
        .eq('lead_id', leadId)
        .eq('source', 'lead_research')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !data?.raw) {
        return null
      }

      return data.raw as ResearchResult
    } catch (error) {
      // Error: Failed to retrieve research data
      return null
    }
  }
}
