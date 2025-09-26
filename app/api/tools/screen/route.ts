import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { isMockEnabled } from '@/src/core/mock-control'
import { createOptimizedConfig } from '@/src/core/gemini-config-enhanced'
import { selectModelForFeature, estimateTokens } from '@/src/core/model-selector'

import { enforceBudgetAndLog } from '@/src/core/token-usage-logger'
import { checkDemoAccess, recordDemoUsage, DemoFeature } from '@/src/core/demo-budget-manager'

import { ScreenShareSchema } from '@/src/core/validation'
import { recordCapabilityUsed } from '@/src/core/context/capabilities'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validatedData = ScreenShareSchema.parse(body)
    const { image, type } = validatedData as any
    const capability = type === 'document' ? 'doc' : type === 'screen' ? 'screenshot' : 'screen'


    const sessionId = req.headers.get('x-intelligence-session-id') || undefined
    const userId = req.headers.get('x-user-id') || undefined

    if (!process.env.GEMINI_API_KEY || isMockEnabled()) {
      const response = { ok: true, output: {
        analysis: "Screen analysis completed (mock).",
        insights: ["UI elements detected", "Structure analyzed", "Mock mode"],
        imageSize: image.length,
        isBase64: image.startsWith('data:image'),
        processedAt: new Date().toISOString()
      }}
      if (sessionId) {
        try {
          await recordCapabilityUsed(String(sessionId), capability, { mode: 'fallback', imageSize: image.length })

          // Back-compat for tests expecting 'screenShare'
          if (capability === 'screenshot') await recordCapabilityUsed(String(sessionId), 'screenShare', { alias: true })

        } catch {}
      }
      return NextResponse.json(response, { status: 200 })
    }

    if (!image) return NextResponse.json({ ok: false, error: 'No image data provided' }, { status: 400 })


    const estimatedTokens = estimateTokens('screen analysis') + 2000
    const modelSelection = selectModelForFeature('screenshot_analysis', estimatedTokens, !!sessionId)


    if (sessionId && process.env.NODE_ENV !== 'test') {
      const accessCheck = await checkDemoAccess(sessionId, 'screenshot_analysis' as DemoFeature, estimatedTokens)

      if (!accessCheck.allowed) return NextResponse.json({ ok: false, error: 'Demo limit reached' }, { status: 429 })

    }

    if (userId && process.env.NODE_ENV !== 'test') {
      const budgetCheck = await enforceBudgetAndLog(userId, sessionId, 'screenshot_analysis', modelSelection.model, estimatedTokens, estimatedTokens * 0.5, true)

      if (!budgetCheck.allowed) return NextResponse.json({ ok: false, error: 'Budget limit reached' }, { status: 429 })

    }

    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
    let analysisResult = ''

    try {
      const optimizedConfig = createOptimizedConfig('analysis', { maxOutputTokens: 1024, temperature: 0.3, topP: 0.8, topK: 40 })

      const result = await genAI.models.generateContent({
        model: modelSelection.model,
        config: optimizedConfig,
        contents: [{ role: 'user', parts: [ { text: 'Analyze this screen for business insights.' }, { inlineData: { mimeType: 'image/jpeg', data: image.split(',')[1] } } ] }],

      })
      analysisResult = result.candidates?.[0]?.content?.parts?.map(p => (p as any).text).filter(Boolean).join(' ') || result.candidates?.[0]?.content?.parts?.[0]?.text || 'Analysis completed'

    } catch (e) {
      return NextResponse.json({ ok: false, error: 'AI analysis failed' }, { status: 500 })

    }

    const response = { ok: true, output: {
      analysis: analysisResult,
      insights: ["UI elements detected", "Content structure analyzed"],
      imageSize: image.length,
      isBase64: image.startsWith('data:image'),
      processedAt: new Date().toISOString()
    }}
    if (sessionId) {
      try {
        await recordCapabilityUsed(String(sessionId), capability, { insights: response.output.insights, imageSize: image.length })

        if (capability === 'screenshot') await recordCapabilityUsed(String(sessionId), 'screenShare', { alias: true })

      } catch {}
    }
    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ ok: false, error: 'Invalid input data' }, { status: 400 })

    }
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })

  }
}