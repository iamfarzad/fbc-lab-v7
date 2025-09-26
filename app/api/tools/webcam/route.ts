import { NextRequest, NextResponse } from 'next/server'
import { WebcamCaptureSchema } from '@/src/core/services/tool-service'

import { recordCapabilityUsed } from '@/src/core/context/capabilities'
import { GoogleGenAI } from '@google/genai'
import { createOptimizedConfig } from '@/src/core/gemini-config-enhanced'
import { selectModelForFeature } from '@/src/core/model-selector'
import { estimateTokens } from '@/src/core/models'
import { enforceBudgetAndLog } from '@/src/core/token-usage-logger'

import { multimodalContextManager } from '@/src/core/context/multimodal-context'
import { APIErrorHandler, rateLimiter, performanceMonitor } from '@/src/core/api/error-handler'


export async function POST(req: NextRequest) {
  let operationId: string | undefined;
  let estimatedTokens: number | undefined;
  let modelName: string | undefined;
  try {
    // 🚀 Rate Limiting: 30 requests per minute for webcam analysis
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'

    const isAllowed = rateLimiter.isAllowed(`webcam-${clientIP}`, 30, 60 * 1000) // 30 requests per minute


    if (!isAllowed) {
      return APIErrorHandler.createErrorResponse({
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many webcam analysis requests. Please wait before trying again.',

        details: 'Rate limit exceeded for webcam API',
        retryable: true,
        statusCode: 429
      })
    }

    // 📊 Performance Monitoring: Start tracking
    operationId = `webcam-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const metrics = performanceMonitor.startOperation(operationId)

    const body = await req.json()
    const validatedData = WebcamCaptureSchema.parse(body)
    const { image, type, context } = validatedData as any
    const sessionId = req.headers.get('x-intelligence-session-id') || undefined
    const userId = req.headers.get('x-user-id') || undefined

    if (!process.env.GEMINI_API_KEY) {
      // Return mock response for testing
      const response = { success: true, output: {
        analysis: "Webcam image analysis completed (mock mode).",
        insights: ["Image captured", "Basic analysis performed", "Mock response"],
        imageSize: image.length,
        isBase64: image.startsWith('data:image'),
        processedAt: new Date().toISOString(),
        trigger: context?.trigger || 'manual',
        hasContext: !!(context?.prompt || sessionId),
        mock: true
      }}

      if (sessionId) {
        try {
          await recordCapabilityUsed(String(sessionId), 'image', { insights: response.output.insights, imageSize: image.length, type: type || 'webcam' })

          // Add visual analysis to multimodal context
          await multimodalContextManager.addVisualAnalysis(
            String(sessionId),
            response.output.analysis,
            type || 'webcam',
            image.length,
            image
          )
        } catch {}
      }

      return NextResponse.json(response, { status: 200 })
    }

    if (!image) return NextResponse.json({ ok: false, error: 'No image data provided' }, { status: 400 })


    // Determine mime type and base64 payload
    const isDataUrl = image.startsWith('data:')
    const mimeMatch = isDataUrl ? image.substring(5, image.indexOf(';')) : 'image/jpeg'

    const mimeType = mimeMatch || 'image/jpeg'
    const base64Data = isDataUrl ? image.split(',')[1] : image

    // Budget and access checks
    estimatedTokens = 3000 // Fixed value for image analysis
    const modelSelection = selectModelForFeature('image_analysis', 0)
    modelName = typeof modelSelection === 'string' ? modelSelection : modelSelection.model;




    if (userId && process.env.NODE_ENV !== 'test') {
      const budgetCheck = await enforceBudgetAndLog(userId, sessionId, 'image_analysis', modelName, estimatedTokens, estimatedTokens * 0.5, true)

      if (!budgetCheck.allowed) return NextResponse.json({ ok: false, error: 'Budget limit reached' }, { status: 429 })

    }

    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    let analysisResult = ''
    try {
      // 🔍 ENHANCED CONTEXT-AWARE ANALYSIS
      let analysisPrompt = 'Analyze this webcam image and provide business insights:'

      if (context?.prompt) {
        analysisPrompt += ` ${context.prompt}`
      }

      if (context?.trigger === 'manual') {
        analysisPrompt += ' Provide detailed insights for this manual analysis.'
      }

      const optimizedConfig = createOptimizedConfig('analysis', { maxOutputTokens: 1024, temperature: 0.3, topP: 0.8, topK: 40 })

      const result = await genAI.models.generateContent({
        model: modelName,
        config: optimizedConfig,
        contents: [{ role: 'user', parts: [ { text: analysisPrompt }, { inlineData: { mimeType, data: base64Data } } ] }],

      })
      analysisResult = result.candidates?.[0]?.content?.parts?.map(p => (p as any).text).filter(Boolean).join(' ') || result.candidates?.[0]?.content?.parts?.[0]?.text || 'Analysis completed'

    } catch (e) {
      return NextResponse.json({ ok: false, error: 'AI analysis failed' }, { status: 500 })

    }

    const response = { success: true, output: {
      analysis: analysisResult,
      insights: ["Objects and context analyzed", "Business relevance extracted"],

      imageSize: image.length,
      isBase64: image.startsWith('data:image'),
      processedAt: new Date().toISOString(),
      trigger: context?.trigger || 'manual',
      hasContext: !!(context?.prompt || sessionId)
    }}
    if (sessionId) {
      try {
        await recordCapabilityUsed(String(sessionId), 'image', { insights: response.output.insights, imageSize: image.length, type: type || 'webcam' })


        // Add visual analysis to multimodal context
        await multimodalContextManager.addVisualAnalysis(
          String(sessionId),
          analysisResult,
          type || 'webcam',
          image.length,
          image
        )
      } catch {}
    }

    // 📊 Performance Monitoring: Complete successful operation
    performanceMonitor.endOperation(operationId, {
      success: true,
      tokensUsed: estimatedTokens,
      model: modelName
    })

    return NextResponse.json(response, { status: 200 })
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
    return APIErrorHandler.createErrorResponse(error)
  }
}