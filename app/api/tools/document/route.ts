import { NextRequest } from 'next/server'
import { respond } from '@/lib/api/response'
import { GoogleGenAI } from '@google/genai'
import { createCachedFunction, CACHE_TTL } from '@/src/lib/ai-cache'
import { GEMINI_MODELS } from '@/config/constants'
import { getResolvedGeminiApiKey } from '@/config/env'
import { logJsonl } from '@/src/lib/jsonl-logger'
import { createHash } from 'crypto'
import { multimodalContextManager } from '@/core/context/multimodal-context'

// Create a cached function for document analysis (1 hour TTL)
const cachedAnalyzeDocument = createCachedFunction(
  async (_documentHash: string, content: string, filename: string, mimeType: string) => {
    // If no API key, return a mock analysis to avoid 500s in dev/demo
    if (!process.env.GEMINI_API_KEY) {
      return {
        analysis: `Document analysis (mock): Processed ${filename} (${mimeType}). Ready to assist with document-related questions.`,
        summary: `Mock summary of ${filename}`,
        pages: 1
      }
    }

    try {
      // Normalize API key for @google/genai
      const apiKey = getResolvedGeminiApiKey()
      const genAI = new GoogleGenAI({ apiKey })
      
      // Use appropriate model for document analysis
      const model = process.env.DOCUMENT_MODEL || `models/${GEMINI_MODELS.DEFAULT_MULTIMODAL}`
      
      const result = await genAI.models.generateContent({
        model,
        contents: [{
          role: 'user',
          parts: [
            { 
              text: `Analyze this document for business insights and key information. 
              Document: ${filename} (${mimeType})
              
              Provide:
              1. A comprehensive analysis of the content
              2. A brief summary (2-3 sentences)
              3. Key insights relevant to business consulting
              4. Any action items or recommendations
              
              Focus on practical business value and consulting opportunities.`
            },
            { inlineData: { data: content, mimeType } }
          ]
        }]
      })

      const text = result.text || ''
      
      // Extract summary from analysis (first 2-3 sentences)
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
      const summary = sentences.slice(0, 2).join('. ').trim() + '.'
      
      // Estimate pages (rough approximation)
      const pages = Math.max(1, Math.ceil(text.length / 2000))
      
      return { 
        analysis: text,
        summary,
        pages
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown analysis error'
      throw new Error(`Document analysis failed: ${message}`)
    }
  },
  {
    ttl: CACHE_TTL.DOCUMENT || 3600, // 1 hour
    keyPrefix: 'document:',
    keyGenerator: (documentHash) => documentHash
  }
)

// Generate a consistent hash for document content
function generateDocumentHash(content: string, filename: string): string {
  return createHash('sha256').update(content + filename).digest('hex').substring(0, 16)
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('document') as File
    if (!file) {
      logJsonl('document', 'missing_file')
      return respond.badRequest('No document provided')
    }

    const sessionId = req.headers.get('x-intelligence-session-id')
    if (!sessionId) {
      return respond.badRequest('Session ID required')
    }

    // Convert file to base64 for analysis
    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = buffer.toString('base64')
    const mimeType = file.type || 'application/octet-stream'
    
    // Generate hash for caching
    const documentHash = generateDocumentHash(base64, file.name)

    console.log('📄 Analyzing document:', { filename: file.name, mimeType, size: file.size })
    logJsonl('document', 'received', { 
      filename: file.name, 
      mimeType, 
      size: file.size,
      hash: documentHash 
    })

    // Use cached analysis
    const result = await cachedAnalyzeDocument(documentHash, base64, file.name, mimeType)
    
    // Add to multimodal context
    try {
      await multimodalContextManager.addUploadEntry(sessionId, {
        id: crypto.randomUUID(),
        filename: file.name,
        mimeType,
        size: file.size,
        analysis: result.analysis,
        summary: result.summary,
        dataUrl: `data:${mimeType};base64,${base64}`,
        pages: result.pages
      })
      
      console.log('✅ Document added to multimodal context')
    } catch (contextErr) {
      console.warn('Failed to add document to context:', contextErr)
      // Continue - context is best-effort
    }

    logJsonl('document', 'analysis_complete', { 
      filename: file.name,
      analysisChars: result.analysis?.length || 0,
      summaryChars: result.summary?.length || 0,
      pages: result.pages
    })

    return respond.ok({
      success: true,
      output: {
        analysis: result.analysis,
        summary: result.summary,
        pages: result.pages,
        filename: file.name,
        mimeType,
        size: file.size,
        processedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analysis failed'
    console.error('❌ [Document] Analysis error:', message)
    logJsonl('document', 'error', { message })
    return respond.serverError(message)
  }
}
