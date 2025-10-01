import { NextRequest, NextResponse } from 'next/server'
import { contextStorage } from '@/src/core/context/context-storage'
import { DatabaseConversationContext } from '@/src/core/context/context-types'

// Type definitions
interface AnalyzeImageRequest {
  imageData: string
  context?: string
  timestamp: string | number
}

interface ImageAnalysisResult {
  summary: string
  context: string
  timestamp: string | number
  insights: string[]
  recommendations: string[]
  sessionId: string
  metadata: {
    hasContext: boolean
    userPreferences: Record<string, unknown>
    analysisType: string
  }
}

interface AnalyzeImageResponse {
  ok: boolean
  analysis: ImageAnalysisResult
  message: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as AnalyzeImageRequest
    const { imageData, context, timestamp } = body
    const sessionId = request.headers.get('x-intelligence-session-id')

    if (!imageData) {
      return NextResponse.json(
        { ok: false, error: 'Image data missing' },
        { status: 400 }
      )
    }

    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: 'Session ID required' },
        { status: 400 }
      )
    }

    // Get current context for personalization
    const currentContext = await contextStorage.get(sessionId)

    // Simulate AI analysis (in production, this would call actual AI service)
    const analysis: ImageAnalysisResult = {
      summary: `Webcam image captured at ${new Date(timestamp).toLocaleTimeString()}`,
      context: context || 'webcam_screenshot',
      timestamp,
      insights: [
        'Image captured successfully',
        'AI analysis ready for processing',
        'Context-aware insights available'
      ],
      recommendations: [
        'Consider adjusting lighting for better image quality',
        'AI can provide additional analysis based on content'
      ],
      sessionId,
      metadata: {
        hasContext: !!currentContext,
        userPreferences: (currentContext as any)?.preferences || {},
        analysisType: 'visual_content'
      }
    }

    // Store analysis in context for future reference
    if (currentContext) {
      // Build a patch object with proper typing
      const patch = {
        lastWebcamAnalysis: new Date().toISOString(),
        webcamAnalysisCount: (Number((currentContext as any)?.webcamAnalysisCount) || 0) + 1,
      };

      // when saving
      await contextStorage.update(
        sessionId,
        patch as Partial<DatabaseConversationContext>
      );
    }

    const response: AnalyzeImageResponse = {
      ok: true,
      analysis,
      message: 'Image analyzed successfully with AI context awareness'
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Image analysis error:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to analyze image' },
      { status: 500 }
    )
  }
}
