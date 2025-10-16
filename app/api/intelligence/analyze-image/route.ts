import { NextRequest } from 'next/server'
import { respond } from '@/lib/api/response'
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
      return respond.badRequest('Image data missing')
    }

    if (!sessionId) {
      return respond.badRequest('Session ID required')
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

    return respond.ok(response)

  } catch (error) {
    console.error('Image analysis error:', error)
    return respond.serverError('Failed to analyze image')
  }
}
