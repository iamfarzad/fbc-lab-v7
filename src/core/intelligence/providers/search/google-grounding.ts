import { GoogleGenAI } from '@google/genai'

export type GroundedCitation = { uri: string; title?: string; description?: string; source?: 'url' | 'search' }
export type GroundedAnswer = { text: string; citations: GroundedCitation[]; raw?: unknown }

export class GoogleGroundingProvider {
  private genAI: GoogleGenAI | null = null

  constructor() {
    // Gracefully handle missing API key during build time
    if (!process.env.GEMINI_API_KEY) {
      console.warn('⚠️ GEMINI_API_KEY not configured - GoogleGroundingProvider will use fallback mode')
      return
    }
    this.genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  }

  /**
   * Extract citations from Gemini response metadata
   */
  private extractCitations(candidate: unknown): GroundedCitation[] {
    const citations: GroundedCitation[] = []

    try {
      // Search grounding citations - keep your logic
      type WebRef = { uri?: string; url?: string; title?: string; snippet?: string; description?: string }
      type GroundingChunk = { web?: WebRef | null }
      type CandidateLike = {
        groundingMetadata?: { groundingChunks?: unknown }
        urlContextMetadata?: unknown
      }

      const asRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null

      const safeCandidate: CandidateLike = asRecord(candidate) ? (candidate as CandidateLike) : {}
      const rawChunks: unknown = safeCandidate.groundingMetadata && asRecord(safeCandidate.groundingMetadata)
        ? (safeCandidate.groundingMetadata as Record<string, unknown>).groundingChunks
        : undefined

      const list: unknown[] = Array.isArray(rawChunks) ? rawChunks : []
      const searchCitations: GroundedCitation[] = list
        .map((c: unknown) => (asRecord(c) ? (c as GroundingChunk).web : undefined))
        .filter((w: unknown): w is WebRef => asRecord(w))
        .map((w: WebRef) => ({
          uri: w.uri || w.url || '',
          title: w.title || 'Search Result',
          description: w.snippet || w.description || '',
          source: 'search' as const
        }))

      // URL Context citations - SIMPLIFIED approach
      const urlContextMetadata = asRecord(safeCandidate.urlContextMetadata)
        ? (safeCandidate.urlContextMetadata as Record<string, unknown>)
        : undefined
      const urlCitations: GroundedCitation[] = []

      if (urlContextMetadata && typeof urlContextMetadata === 'object') {
        const urlMetadata = urlContextMetadata.urlMetadata

        if (Array.isArray(urlMetadata)) {
          urlMetadata.forEach((meta: unknown) => {
            if (meta && typeof meta === 'object') {
              const uri = String((meta as any).retrievedUrl || (meta as any).url || (meta as any).uri || '')
              const title = String((meta as any).title || 'URL Content')
              const description = String((meta as any).snippet || (meta as any).description || '')
              if (uri) {
                urlCitations.push({
                  uri,
                  title,
                  description,
                  source: 'url' as const
                })
              }
            }
          })
        }
      }

      citations.push(...urlCitations, ...searchCitations)
    } catch (error) {
      console.warn('Citation extraction failed:', error)
      // Return empty array instead of crashing
    }

    return citations
  }

  /**
   * Generate a grounded answer using Google Search and optional URL Context.
   * If urls are provided, the urlContext tool will be enabled and Gemini will
   * fetch content directly from those URLs to ground its response. When no URLs
   * are provided, we fall back to Search-only grounding.
   */
  async groundedAnswer(query: string, urls?: string[]): Promise<GroundedAnswer> {
    try {
      // Handle case where API key is not available (build time)
      if (!this.genAI) {
        return {
          text: 'Search functionality is currently unavailable. Please check the API configuration.',
          citations: [],
          raw: { error: 'GEMINI_API_KEY not configured' }
        }
      }

      const useUrls = Array.isArray(urls) && urls.length > 0
      const tools: unknown[] = [{ googleSearch: {} }]
      if (useUrls) tools.unshift({ urlContext: {} })

      // SIMPLIFIED: Direct prompt construction like chat-with-docs
      const prompt = useUrls
        ? `${query}\n\nRelevant URLs for context:\n${urls.slice(0, 20).join('\n')}`
        : query

      const res = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }]}],
        config: { tools },
      } as any)

      // SIMPLIFIED: Robust text extraction
      let text = ''
      try {
        if (typeof (res as any).text === 'function') {
          text = (res as any).text()
        } else if ((res as any).text) {
          text = (res as any).text
        } else if ((res as any).candidates?.[0]?.content?.parts) {
          text = (res as any).candidates[0].content.parts
            .map((p: unknown) => (typeof p === 'object' && p !== null ? (p as any).text : '') || '')
            .filter(Boolean)
            .join('\n')
        }
      } catch {
        text = 'I encountered an issue processing the response.'
      }

      const candidate = (res as any).candidates?.[0] || {}

      // Extract citations using helper function
      const citations = this.extractCitations(candidate)

      return { text, citations, raw: res }
    } catch (error) {
    console.error('Google grounding search failed', error)
      return {
        text: `I couldn't find specific information about "${query}". Please try rephrasing your question or provide more context.`,
        citations: [],
        raw: null,
      }
    }
  }

  async searchCompany(domain: string): Promise<GroundedAnswer> {
    const query = `Find information about the company at ${domain}. Include: company name, industry, size, location, main products/services, and company description.`
    return this.groundedAnswer(query)
  }

  async searchPerson(name: string, company?: string): Promise<GroundedAnswer> {
    const companyFilter = company ? ` at ${company}` : ''
    const query = `Find professional information about ${name}${companyFilter}. Include: full name, current role, company, LinkedIn profile if available, and professional background.`
    return this.groundedAnswer(query)
  }

  async searchRole(name: string, domain: string): Promise<GroundedAnswer> {
    const query = `What is ${name}'s current role and position at ${domain}? Find their professional title, seniority level, and responsibilities.`
    return this.groundedAnswer(query)
  }
}
