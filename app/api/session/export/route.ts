import { NextRequest } from 'next/server'
import { respond } from '@/lib/api/response'
import { multimodalContextManager } from '@/core/context/multimodal-context'
import { logJsonl } from '@/src/lib/jsonl-logger'
import { GoogleGenAI } from '@google/genai'
import { getResolvedGeminiApiKey } from '@/config/env'
import { GEMINI_MODELS } from '@/config/constants'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sessionId, format = 'json' } = body
    
    if (!sessionId) {
      return respond.badRequest('Session ID required')
    }

    console.log('📄 Exporting session:', { sessionId, format })
    logJsonl('session_export', 'received', { sessionId, format })

    // Get full context for the session
    const context = await multimodalContextManager.getContext(sessionId)
    if (!context) {
      return respond.notFound('Session not found')
    }

    // Generate AI summary if requested
    let aiSummary = ''
    if (format === 'pdf' || format === 'both') {
      try {
        const apiKey = getResolvedGeminiApiKey()
        const genAI = new GoogleGenAI({ apiKey })
        
        const conversationText = context.conversationHistory
          .map(entry => `${entry.role}: ${entry.content}`)
          .join('\n\n')

        const result = await genAI.models.generateContent({
          model: `models/${GEMINI_MODELS.DEFAULT_MULTIMODAL}`,
          contents: [{
            role: 'user',
            parts: [{
              text: `Create a comprehensive business consultation summary from this conversation:

${conversationText}

Please provide:
1. Executive Summary (2-3 paragraphs)
2. Key Business Insights
3. Recommendations
4. Next Steps
5. Potential Consulting Opportunities

Format as a professional business document.`
            }]
          }]
        })

        aiSummary = result.text || ''
      } catch (err) {
        console.warn('Failed to generate AI summary:', err)
        aiSummary = 'AI summary generation failed'
      }
    }

    // Prepare export data
    const exportData = {
      sessionId,
      exportedAt: new Date().toISOString(),
      leadContext: context.leadContext,
      conversationHistory: context.conversationHistory,
      visualContext: context.visualContext,
      audioContext: context.audioContext,
      uploadContext: context.uploadContext,
      metadata: context.metadata,
      aiSummary: aiSummary || undefined,
      conversationTurns: context.conversationTurns || []
    }

    if (format === 'json') {
      return respond.ok(exportData)
    }

    if (format === 'pdf' || format === 'both') {
      // For now, return the data with a flag indicating PDF generation is needed
      // In a full implementation, you'd use a PDF generation library like puppeteer
      return respond.ok({
        ...exportData,
        pdfGeneration: {
          status: 'pending',
          message: 'PDF generation requires client-side implementation with a PDF library'
        }
      })
    }

    return respond.badRequest('Invalid format. Use "json", "pdf", or "both"')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Export failed'
    console.error('❌ [Session Export] Error:', message)
    logJsonl('session_export', 'error', { message })
    return respond.serverError(message)
  }
}
