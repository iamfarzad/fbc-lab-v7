import { GoogleGenAI } from '@google/genai'
import { GoogleGroundingProvider } from './providers/search/google-grounding'
import { createCachedFunction, CACHE_TTL } from '@/src/lib/ai-cache'

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

export interface CompanyContext {
  name: string
  domain: string
  industry?: string
  size?: string
  summary?: string
  website?: string
  linkedin?: string
}

export interface PersonContext {
  fullName: string
  role?: string
  seniority?: string
  profileUrl?: string
  company?: string
}

export class LeadResearchService {
  private genAI: GoogleGenAI
  private groundingProvider: GoogleGroundingProvider
  
  // Cached research function
  private cachedResearch: (email: string, name?: string, companyUrl?: string, sessionId?: string) => Promise<ResearchResult>

  constructor() {
    this.genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
    this.groundingProvider = new GoogleGroundingProvider()
    
    // Wrap the internal method with caching (24 hour TTL)
    this.cachedResearch = createCachedFunction(
      this.researchLeadInternal.bind(this),
      {
        ttl: CACHE_TTL.VERY_LONG, // 24 hours
        keyPrefix: 'lead-research:',
        keyGenerator: (email, name, companyUrl) => `${email}|${name || ''}|${companyUrl || ''}`
      }
    )
  }

  async researchLead(email: string, name?: string, companyUrl?: string, sessionId?: string): Promise<ResearchResult> {
    // Use cached version - cache key based on email, name, companyUrl
    return await this.cachedResearch(email, name, companyUrl, sessionId)
  }

  private async researchLeadInternal(email: string, name?: string, companyUrl?: string, sessionId?: string): Promise<ResearchResult> {
    void sessionId

    try {
      console.log('🔍 [Lead Research] Starting for:', email)

      const domain = email.split('@')[1]

      // Known profile fallback for Farzad Bayat
      if (email === 'farzad@talktoeve.com' && (name?.toLowerCase().includes('farzad') || !name)) {
        console.log('🎯 Using known profile for Farzad Bayat')
        
        
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
      const researchResult = await this.researchWithGrounding(email, name, domain, companyUrl)

      console.log('✅ [Lead Research] Completed:', { 
        company: researchResult.company.name,
        person: researchResult.person.fullName,
        confidence: researchResult.confidence
      })
      return researchResult

    } catch (error) {
      console.error('❌ [Lead Research] Failed:', error)

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

  private async researchWithGrounding(email: string, name: string | undefined, domain: string, companyUrl: string | undefined): Promise<ResearchResult> {
    const allCitations: Array<{ uri: string; title?: string; description?: string }> = []

    // Search for company information
    const companySearch = await this.groundingProvider.searchCompany(domain)
    allCitations.push(...companySearch.citations)

    // Search for person information
    const personSearch = await this.groundingProvider.searchPerson(name || email.split('@')[0], domain)
    allCitations.push(...personSearch.citations)

    // Search for specific role information
    const roleSearch = await this.groundingProvider.searchRole(name || email.split('@')[0], domain)
    allCitations.push(...roleSearch.citations)

    // Use Gemini to synthesize the research results
    const prompt = `
You are a professional research assistant. Analyze the following search results and extract structured information.

Email: ${email}
Name: ${name || 'Unknown'}
Domain: ${domain}
Company URL: ${companyUrl || 'Not provided'}

Company Search Results:
${companySearch.text}

Person Search Results:
${personSearch.text}

Role Search Results:
${roleSearch.text}

Extract and return ONLY a valid JSON object. Do not include any text before or after the JSON. Use this exact structure:
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

Be thorough and accurate. If information is not available, use null for that field. Ensure the output is valid JSON without any invalid characters.
`

    const result = await this.genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }]}],
    } as any)
    const text = typeof (result as any).text === 'function'
      ? (result as any).text()
      : (result as any).text
        ?? (((result as any).candidates?.[0]?.content?.parts || [])
              .map((p: any) => p.text || '')
              .filter(Boolean)
              .join('\n'))

    // Extract JSON from response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const researchData = JSON.parse(jsonMatch[0])
        return {
          company: researchData.company,
          person: researchData.person,
          role: researchData.role,
          confidence: researchData.confidence,
          citations: allCitations
        }
      }
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError, 'Raw text:', text)
    }

    // Fallback if no JSON found
    return {
      company: {
        name: domain.split('.')[0],
        domain,
        website: companyUrl || `https://${domain}`,
        summary: 'Company information unavailable'
      },
      person: {
        fullName: name || email.split('@')[0],
        company: domain.split('.')[0]
      },
      role: 'Business Professional',
      confidence: 0.2,
      citations: allCitations
    }
  }

}
