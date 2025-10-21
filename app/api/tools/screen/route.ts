import { NextRequest } from 'next/server'
import { respond } from '@/lib/api/response'
import { GoogleGenAI } from '@google/genai'
import { createOptimizedConfig } from '@/core/gemini-config-enhanced'
import { selectModelForFeature } from '@/core/model-selector'
import { enforceBudgetAndLog } from '@/core/token-usage-logger'

import { ScreenShareSchema } from '@/core/services/tool-service'
import { recordCapabilityUsed } from '@/core/context/capabilities'
import { multimodalContextManager } from '@/core/context/multimodal-context'
import { APIErrorHandler, rateLimiter, performanceMonitor } from '@/core/api/error-handler'
import { logJsonl } from '@/lib/jsonl-logger'


export async function POST(req: NextRequest) {
  let operationId: string | undefined;
  let estimatedTokens: number | undefined;
  let modelName: string | undefined;
  try {
    // 🚀 Rate Limiting: 20 requests per minute for screen analysis (more conservative than webcam)

    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'

    const isAllowed = rateLimiter.isAllowed(`screen-${clientIP}`, 20, 60 * 1000) // 20 requests per minute


    if (!isAllowed) {
      return APIErrorHandler.createErrorResponse({
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many screen analysis requests. Please wait before trying again.',

        details: 'Rate limit exceeded for screen share API',
        retryable: true,
        statusCode: 429
      })
    }

    // 📊 Performance Monitoring: Start tracking
    operationId = `screen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    performanceMonitor.startOperation(operationId)

    const body = await req.json()
    const validatedData = ScreenShareSchema.parse(body)
    const { image, type, context } = validatedData as any
    const capability = type === 'document' ? 'doc' : type === 'screen' ? 'screenshot' : 'screen'


    const sessionId = req.headers.get('x-intelligence-session-id') || undefined
    const userId = req.headers.get('x-user-id') || undefined

    if (!process.env.GEMINI_API_KEY) {
      logJsonl('screen', 'received', { bytes: image?.length || 0, trigger: context?.trigger || 'unknown', hasImage: Boolean(image) })
      // Return mock response for testing
      const response = { success: true, output: {
        analysis: "Screen analysis completed (mock mode).",
        insights: ["UI elements detected", "Content structure analyzed", "Mock response"],
        imageSize: image.length,
        isBase64: image.startsWith('data:image'),
        processedAt: new Date().toISOString(),
        trigger: context?.trigger || 'manual',
        hasContext: !!(context?.prompt || sessionId),
        mock: true
      }}

      if (sessionId) {
        try {
          await recordCapabilityUsed(String(sessionId), capability, { insights: response.output.insights, imageSize: image.length })

          if (capability === 'screenshot') await recordCapabilityUsed(String(sessionId), 'screenShare', { alias: true })

          // Add visual analysis to multimodal context
          await multimodalContextManager.addVisualAnalysis(
            String(sessionId),
            response.output.analysis,
            type === 'document' ? 'upload' : 'screen',
            image.length,
            image
          )
        } catch {
          // Ignore capability tracking failures in mock mode
        }
      }

      logJsonl('screen', 'analysis_complete', { bytes: image?.length || 0, mock: true, chars: response.output.analysis.length })
      return respond.ok(response)
    }

    if (!image) return respond.badRequest('No image data provided')


    estimatedTokens = 3000 // Fixed value for image analysis
    const modelSelection = selectModelForFeature('image_analysis', 0, true)
    modelName = typeof modelSelection === 'string' ? modelSelection : modelSelection.model;


    if (userId && process.env.NODE_ENV !== 'test') {
      const budgetCheck = await enforceBudgetAndLog(userId ?? 'anonymous', sessionId ?? 'anonymous', 'image_analysis', modelName, estimatedTokens, estimatedTokens * 0.5, true)

      if (!budgetCheck.allowed) return respond.error('Budget limit reached', 429, 'RATE_LIMITED')

    }

    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    let analysisResult = ''

    try {
      // 🔍 ENHANCED SCREEN ANALYSIS PROMPT
      let analysisPrompt = 'Analyze this screen for business insights'

      if (context?.prompt) {
        analysisPrompt += ` with focus on: ${context.prompt}`
      }

      if (context?.trigger === 'manual') {
        analysisPrompt += '. Provide detailed manual analysis.'
      }

      const optimizedConfig = createOptimizedConfig('analysis', { maxOutputTokens: 1024, temperature: 0.3, topP: 0.8, topK: 40 })

      // Ensure required v1beta prefix for model names
      const model = modelName?.startsWith('models/') ? modelName : `models/${modelName}`
      logJsonl('screen', 'received', { bytes: image?.length || 0, trigger: context?.trigger || 'unknown', hasImage: Boolean(image), model })
      const result = await genAI.models.generateContent({
        model,
        config: optimizedConfig,
        contents: [{ role: 'user', parts: [ { text: analysisPrompt }, { inlineData: { mimeType: 'image/jpeg', data: image.split(',')[1] } } ] }],

      })
      analysisResult = result.candidates?.[0]?.content?.parts?.map(p => (p as any).text).filter(Boolean).join(' ') || result.candidates?.[0]?.content?.parts?.[0]?.text || 'Analysis completed'

    } catch (e) {
      console.error('Screen analysis generation failed:', e)
      logJsonl('screen', 'error', { message: e instanceof Error ? e.message : String(e) })
      return respond.serverError('AI analysis failed')

    }

    const response = { success: true, output: {
      analysis: analysisResult,
      insights: ["UI elements detected", "Content structure analyzed"],

      imageSize: image.length,
      isBase64: image.startsWith('data:image'),
      processedAt: new Date().toISOString(),
      trigger: context?.trigger || 'manual',
      hasContext: !!(context?.prompt || sessionId)
    }}
    if (sessionId) {
      try {
        await recordCapabilityUsed(String(sessionId), capability, { insights: response.output.insights, imageSize: image.length })

        if (capability === 'screenshot') await recordCapabilityUsed(String(sessionId), 'screenShare', { alias: true })


        // Add visual analysis to multimodal context
        await multimodalContextManager.addVisualAnalysis(
          String(sessionId),
          analysisResult,
          type === 'document' ? 'upload' : 'screen',
          image.length,
          image
        )
      } catch {
        // Context enrichment is best-effort; ignore downstream errors
      }
    }

    // 📊 Performance Monitoring: Complete successful operation
    performanceMonitor.endOperation(operationId, {
      success: true,
      tokensUsed: estimatedTokens,
      model: modelName
    })

    logJsonl('screen', 'analysis_complete', { bytes: image?.length || 0, chars: analysisResult.length, model: modelName })
    return respond.ok(response)
  } catch (error: unknown) {
    // 📊 Performance Monitoring: Complete failed operation
    if (operationId) {
      const payload: { success: boolean; tokensUsed?: number; model?: string; errorCode?: string } = {

        success: false,
        // only include when defined
        ...(estimatedTokens !== undefined ? { tokensUsed: estimatedTokens } : {}),

        ...(modelName ? { model: modelName } : {}),
        errorCode: String((error as any)?.code ?? 'UNKNOWN_ERROR'),
      };

      performanceMonitor.endOperation(operationId, payload);
    }

    // 🚨 Enhanced Error Handling
    logJsonl('screen', 'error', { message: (error as any)?.message || 'UNKNOWN_ERROR' })
    return APIErrorHandler.createErrorResponse(error)
  }
}
