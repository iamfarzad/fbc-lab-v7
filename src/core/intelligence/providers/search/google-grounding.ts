import { GoogleGenAI } from '@google/genai'

export type GroundedCitation = { uri: string; title?: string; description?: string; source?: 'url' | 'search' }
export type GroundedAnswer = { text: string; citations: GroundedCitation[]; raw?: unknown }

export interface EnhancedResearchResult {
  searchGrounding: GroundedAnswer
  urlContext: GroundedAnswer[]
  combinedAnswer: string
  allCitations: GroundedCitation[]
  urlsUsed: string[]
}

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

  /**
   * Perform comprehensive research using both search grounding and URL context
   */
  async comprehensiveResearch(
    query: string,
    context: { email?: string; company?: string; industry?: string; previousUrls?: string[] } = {}
  ): Promise<EnhancedResearchResult> {
    console.log('🔍 Starting comprehensive research for:', query)

    // Step 1: Generate search queries based on context
    const searchQueries = this.generateSearchQueries(query, context)

    // Step 2: Perform parallel search grounding
    const searchPromises = searchQueries.map(q => this.groundedAnswer(q))
    const searchResults = await Promise.allSettled(searchPromises)

    // Step 3: Extract and discover relevant URLs from search results
    const discoveredUrls = this.discoverRelevantUrls(searchResults, context)

    // Step 4: Fetch URL context for discovered URLs
    const urlContextPromises = discoveredUrls.slice(0, 5).map(url =>
      this.groundedAnswer(query, [url])
    )
    const urlResults = await Promise.allSettled(urlContextPromises)

    // Step 5: Combine and synthesize results
    const searchGrounding = this.selectBestSearchResult(searchResults)
    const urlContexts = this.filterSuccessfulUrlResults(urlResults)

    // Step 6: Generate combined answer using both sources
    const combinedAnswer = await this.generateCombinedAnswer(query, searchGrounding, urlContexts, context)

    // Step 7: Collect all citations
    const allCitations = this.collectAllCitations(searchGrounding, urlContexts)

    return {
      searchGrounding,
      urlContext: urlContexts,
      combinedAnswer,
      allCitations,
      urlsUsed: discoveredUrls.slice(0, 5)
    }
  }

  private generateSearchQueries(query: string, context: any): string[] {
    const queries = [query] // Original query

    // Add context-specific queries
    if (context.company) {
      queries.push(`${query} ${context.company} industry trends`)
      queries.push(`${query} ${context.company} best practices`)
    }

    if (context.industry) {
      queries.push(`${query} ${context.industry} insights`)
      queries.push(`${query} ${context.industry} news`)
    }

    // Add previous conversation context if available
    if (context.previousUrls?.length > 0) {
      queries.push(`${query} related to ${context.previousUrls.join(' ')}`)
    }

    return queries.slice(0, 3) // Limit to 3 queries for performance
  }

  private discoverRelevantUrls(searchResults: PromiseSettledResult<GroundedAnswer>[], context: any): string[] {
    void context
    const urls = new Set<string>()

    for (const result of searchResults) {
      if (result.status === 'fulfilled') {
        // Extract URLs from citations
        for (const citation of result.value.citations) {
          if (citation.uri.startsWith('http')) {
            urls.add(citation.uri)
          }
        }

        // Look for URLs in the response text
        const urlRegex = /https?:\/\/[^\s]+/g
        const matches = result.value.text.match(urlRegex)
        if (matches) {
          for (const match of matches) {
            urls.add(match.trim())
          }
        }
      }
    }

    // Filter for relevance
    const relevantUrls = Array.from(urls).filter(url => {
      // Exclude social media, images, and other non-content URLs
      const excludePatterns = [
        /\/cdn\//, /\.(jpg|png|gif|svg|ico|css|js)$/,
        /twitter\.com/, /facebook\.com/, /linkedin\.com\/share/,
        /youtube\.com/, /vimeo\.com/
      ]

      return !excludePatterns.some(pattern => pattern.test(url))
    })

    return relevantUrls.slice(0, 8) // Limit to top 8 URLs
  }

  private selectBestSearchResult(searchResults: PromiseSettledResult<GroundedAnswer>[]): GroundedAnswer {
    // Find the most successful search result
    for (const result of searchResults) {
      if (result.status === 'fulfilled' && result.value.citations.length > 0) {
        return result.value
      }
    }

    // Fallback to first successful result
    for (const result of searchResults) {
      if (result.status === 'fulfilled') {
        return result.value
      }
    }

    // Ultimate fallback
    return {
      text: 'Unable to retrieve search results at this time.',
      citations: []
    }
  }

  private filterSuccessfulUrlResults(urlResults: PromiseSettledResult<GroundedAnswer>[]): GroundedAnswer[] {
    return urlResults
      .filter((result): result is PromiseFulfilledResult<GroundedAnswer> =>
        result.status === 'fulfilled' && result.value.citations.length > 0
      )
      .map(result => result.value)
  }

  private async generateCombinedAnswer(
    originalQuery: string,
    searchGrounding: GroundedAnswer,
    urlContexts: GroundedAnswer[],
    context: any
  ): Promise<string> {
    const prompt = `
You are an expert research assistant. I need you to synthesize information from multiple sources to provide the most accurate and comprehensive answer.

ORIGINAL QUERY: ${originalQuery}

${context.company ? `COMPANY CONTEXT: ${context.company}` : ''}
${context.industry ? `INDUSTRY CONTEXT: ${context.industry}` : ''}

SEARCH RESULTS:
${searchGrounding.text}

${urlContexts.length > 0 ? `ADDITIONAL CONTEXT FROM URLs:
${urlContexts.map((ctx, i) => `Source ${i + 1}: ${ctx.text}`).join('\n\n')}` : ''}

Please provide a comprehensive, well-grounded response that:
1. Directly answers the original query
2. Incorporates relevant information from all sources
3. Cites sources appropriately
4. Prioritizes accuracy and usefulness
5. Uses specific facts and data when available

If there are conflicting information between sources, mention this and explain your reasoning for which source to prioritize.
`

    try {
      if (!this.genAI) {
        return searchGrounding.text // Fallback if no API key
      }

      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }]}],
      })

      return response.text || 'Unable to generate response'
    } catch (error) {
      console.error('Failed to generate combined answer:', error)
      return searchGrounding.text // Fallback to search result
    }
  }

  private collectAllCitations(searchGrounding: GroundedAnswer, urlContexts: GroundedAnswer[]): GroundedCitation[] {
    const allCitations = new Map<string, GroundedCitation>()

    // Add search citations
    for (const citation of searchGrounding.citations) {
      allCitations.set(citation.uri, { ...citation, source: 'search' })
    }

    // Add URL context citations
    for (const urlContext of urlContexts) {
      for (const citation of urlContext.citations) {
        allCitations.set(citation.uri, { ...citation, source: 'url' })
      }
    }

    return Array.from(allCitations.values())
  }
}
