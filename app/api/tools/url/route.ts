import { NextRequest } from 'next/server'
import { respond } from '@/lib/api/response'
import { GoogleGenAI } from '@google/genai'
import { createCachedFunction, CACHE_TTL } from '@/src/lib/ai-cache'
import { GEMINI_MODELS } from '@/config/constants'
import { getResolvedGeminiApiKey } from '@/config/env'
import { logJsonl } from '@/src/lib/jsonl-logger'
import { createHash } from 'crypto'
import { multimodalContextManager } from '@/core/context/multimodal-context'

// Create a cached function for URL analysis (2 hour TTL)
const cachedAnalyzeUrl = createCachedFunction(
  async (_urlHash: string, url: string) => {
    // If no API key, return a mock analysis to avoid 500s in dev/demo
    if (!process.env.GEMINI_API_KEY) {
      return {
        analysis: `URL analysis (mock): Processed ${url}. Ready to assist with web content questions.`,
        title: 'Mock Page Title',
        description: 'Mock page description'
      }
    }

    try {
      // Fetch the URL content
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; F.B/c AI Bot/1.0)'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const html = await response.text()
      
      // Extract basic metadata
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
      const title = titleMatch ? titleMatch[1].trim() : 'Untitled'
      
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)
      const description = descMatch ? descMatch[1].trim() : 'No description available'

      // Normalize API key for @google/genai
      const apiKey = getResolvedGeminiApiKey()
      const genAI = new GoogleGenAI({ apiKey })
      
      // Use appropriate model for text analysis
      const model = process.env.URL_MODEL || `models/${GEMINI_MODELS.DEFAULT_MULTIMODAL}`
      
      const result = await genAI.models.generateContent({
        model,
        contents: [{
          role: 'user',
          parts: [{
            text: `Analyze this web page content for business insights and key information.
            
            URL: ${url}
            Title: ${title}
            Description: ${description}
            
            HTML Content (first 8000 characters):
            ${html.substring(0, 8000)}
            
            Provide:
            1. A comprehensive analysis of the content
            2. Key business insights and opportunities
            3. Technical observations
            4. Recommendations for consulting engagement
            
            Focus on practical business value and consulting opportunities.`
          }]
        }]
      })

      const text = result.text || ''
      
      return { 
        analysis: text,
        title,
        description,
        url
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown analysis error'
      throw new Error(`URL analysis failed: ${message}`)
    }
  },
  {
    ttl: CACHE_TTL.URL || 7200, // 2 hours
    keyPrefix: 'url:',
    keyGenerator: (urlHash) => urlHash
  }
)

// Generate a consistent hash for URL content
function generateUrlHash(url: string): string {
  return createHash('sha256').update(url).digest('hex').substring(0, 16)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { url } = body
    
    if (!url) {
      logJsonl('url', 'missing_url')
      return respond.badRequest('No URL provided')
    }

    const sessionId = req.headers.get('x-intelligence-session-id')
    if (!sessionId) {
      return respond.badRequest('Session ID required')
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      return respond.badRequest('Invalid URL format')
    }
    
    // Generate hash for caching
    const urlHash = generateUrlHash(url)

    console.log('🔗 Analyzing URL:', url)
    logJsonl('url', 'received', { 
      url,
      hash: urlHash 
    })

    // Use cached analysis
    const result = await cachedAnalyzeUrl(urlHash, url)
    
    // Add to multimodal context as upload entry
    try {
      await multimodalContextManager.addUploadEntry(sessionId, {
        id: crypto.randomUUID(),
        filename: result.title || url,
        mimeType: 'text/html',
        size: result.analysis.length,
        analysis: result.analysis,
        summary: result.description,
        dataUrl: url,
        pages: 1
      })
      
      console.log('✅ URL analysis added to multimodal context')
    } catch (contextErr) {
      console.warn('Failed to add URL analysis to context:', contextErr)
      // Continue - context is best-effort
    }

    logJsonl('url', 'analysis_complete', { 
      url,
      hash: urlHash, 
      analysisChars: result?.analysis?.length || 0 
    })

    return respond.ok({
      success: true,
      output: {
        analysis: result.analysis,
        title: result.title,
        description: result.description,
        url: result.url,
        processedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analysis failed'
    console.error('❌ [URL] Analysis error:', message)
    logJsonl('url', 'error', { message })
    return respond.serverError(message)
  }
}
