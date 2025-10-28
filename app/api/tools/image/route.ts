import { NextRequest } from 'next/server'
import { respond } from '@/lib/api/response'
import { GoogleGenAI } from '@google/genai'
import { createCachedFunction, CACHE_TTL } from '@/src/lib/ai-cache'
import { GEMINI_MODELS } from '@/config/constants'
import { getResolvedGeminiApiKey } from '@/config/env'
import { logJsonl } from '@/src/lib/jsonl-logger'
import { createHash } from 'crypto'
import { multimodalContextManager } from '@/core/context/multimodal-context'

// Create a cached function for image analysis (30 min TTL)
const cachedAnalyzeImage = createCachedFunction(
  async (_imageHash: string, base64: string, mimeType: string) => {
    // If no API key, return a mock analysis to avoid 500s in dev/demo
    if (!process.env.GEMINI_API_KEY) {
      return {
        analysis: 'Image analysis (mock): Detected visual content. Ready to assist with image-related questions.'
      }
    }

    try {
      // Normalize API key for @google/genai
      const apiKey = getResolvedGeminiApiKey()
      const genAI = new GoogleGenAI({ apiKey })
      
      // Use appropriate model for image analysis
      const model = process.env.IMAGE_MODEL || `models/${GEMINI_MODELS.DEFAULT_MULTIMODAL}`
      
      const result = await genAI.models.generateContent({
        model,
        contents: [{
          role: 'user',
          parts: [
            { 
              text: 'Describe exactly what you see in this image. Include objects, people, text, colors, setting, and any visible details. Be factual and specific without inferring business context or making assumptions.'
            },
            { inlineData: { data: base64, mimeType } }
          ]
        }]
      })

      const text = result.text || ''
      return { analysis: text }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown analysis error'
      throw new Error(`Image analysis failed: ${message}`)
    }
  },
  {
    ttl: CACHE_TTL.VISION, // 30 minutes
    keyPrefix: 'image:',
    keyGenerator: (imageHash) => imageHash
  }
)

// Generate a consistent hash for image content
function generateImageHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex').substring(0, 16)
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('image') as File
    if (!file) {
      logJsonl('image', 'missing_file')
      return respond.badRequest('No image provided')
    }

    const sessionId = req.headers.get('x-intelligence-session-id')
    if (!sessionId) {
      return respond.badRequest('Session ID required')
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = buffer.toString('base64')
    const mimeType = file.type || 'image/png'
    
    // Generate hash for caching
    const imageHash = generateImageHash(buffer)

    console.log('🖼️ Analyzing image with hash:', imageHash)
    logJsonl('image', 'received', { 
      filename: file.name,
      hash: imageHash, 
      bytes: buffer.byteLength, 
      mimeType 
    })

    // Use cached analysis
    const result = await cachedAnalyzeImage(imageHash, base64, mimeType)
    
    // Add to multimodal context
    try {
      await multimodalContextManager.addVisualAnalysis(
        sessionId,
        result.analysis,
        'upload',
        buffer.byteLength,
        `data:${mimeType};base64,${base64}`
      )
      
      console.log('✅ Image added to multimodal context')
    } catch (contextErr) {
      console.warn('Failed to add image to context:', contextErr)
      // Continue - context is best-effort
    }

    logJsonl('image', 'analysis_complete', { 
      hash: imageHash, 
      analysisChars: result?.analysis?.length || 0 
    })

    return respond.ok({
      success: true,
      output: {
        analysis: result.analysis,
        filename: file.name,
        mimeType,
        size: file.size,
        processedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analysis failed'
    console.error('❌ [Image] Analysis error:', message)
    logJsonl('image', 'error', { message })
    return respond.serverError(message)
  }
}
