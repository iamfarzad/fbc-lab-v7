/**
 * Unified Chat API Endpoint - AI SDK Backend
 * Connects your existing pipeline to AI SDK Tools
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRetryableGemini } from '@/core/ai/retry-model'
import { streamText, generateText } from 'ai'
import { google } from '@ai-sdk/google'

let cachedModel: ReturnType<typeof createRetryableGemini> | null = null

const getModel = () => {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY

  if (!apiKey) {
    throw new Error(
      'Missing Google Generative AI API key. Add GOOGLE_GENERATIVE_AI_API_KEY to your .env.local file and restart the dev server.'
    )
  }

  if (!cachedModel) {
    cachedModel = createRetryableGemini()
  }

  return cachedModel
}

// Node.js runtime for streaming compatibility
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

/**
 * Unified POST handler - AI SDK backend
 */
export async function POST(req: NextRequest) {
  try {
    const reqId = req.headers.get('x-request-id') || crypto.randomUUID()
    const startTime = Date.now()
    console.log('[UNIFIED_AI_SDK] Request:', reqId)

    const body = await req.json()
    const { messages, context, mode = 'standard', stream = true } = body
    const model = getModel()

    // Build system prompt based on mode and context
    let systemPrompt = "You are F.B/c AI, a helpful business assistant."
    
    if (mode === 'admin') {
      systemPrompt = `You are F.B/c AI Admin Assistant, specialized in business intelligence and management.
      
Your capabilities:
- Analyze lead data and provide actionable insights
- Draft professional emails for campaigns
- Suggest meeting scheduling strategies
- Interpret analytics and performance metrics
- Provide business recommendations based on data
- Help with lead scoring and prioritization

Response style: Be concise, actionable, and data-driven.`
    }

    // Add intelligence context if available
    if (context?.intelligenceContext) {
      const intCtx = context.intelligenceContext
      let contextData = '\n\nPERSONALIZED CONTEXT:\n'
      
      if (intCtx.lead) {
        contextData += `User: ${intCtx.lead.name} (${intCtx.lead.email})\n`
      }
      
      if (intCtx.company) {
        contextData += `Company: ${intCtx.company.name || 'Unknown'}\n`
        if (intCtx.company.industry) contextData += `Industry: ${intCtx.company.industry}\n`
        if (intCtx.company.size) contextData += `Size: ${intCtx.company.size}\n`
      }
      
      if (intCtx.person) {
        if (intCtx.person.role) contextData += `Role: ${intCtx.person.role}\n`
        if (intCtx.person.seniority) contextData += `Seniority: ${intCtx.person.seniority}\n`
      }

      systemPrompt += contextData
    }

    // Add multimodal context
    if (context?.multimodalData) {
      let multimodalContext = '\n\nMULTIMODAL INPUT:\n'
      
      if (context.multimodalData.audioData) {
        multimodalContext += `Audio input received (${context.multimodalData.audioData.length} bytes)\n`
      }
      
      if (context.multimodalData.imageData) {
        multimodalContext += `Image input received (${context.multimodalData.imageData.length} bytes)\n`
      }
      
      if (context.multimodalData.videoData) {
        multimodalContext += `Video input received\n`
      }

      systemPrompt += multimodalContext
    }

    // Convert messages to AI SDK format
    const aiMessages = messages.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'assistant' : msg.role,
      content: msg.content
    }))

    // Handle streaming vs non-streaming
    if (stream !== false) {
      // For streaming, use direct Google model (ai-retry doesn't support streaming)
      const streamingModel = google('gemini-1.5-flash')
      
      // Streaming response using AI SDK
      const result = await streamText({
        model: streamingModel,
        system: systemPrompt,
        messages: aiMessages,
        temperature: 0.7,
        onFinish: (result) => {
          console.log('[UNIFIED_AI_SDK] Completed:', {
            reqId,
            tokensUsed: result.usage?.totalTokens || 0,
            finishReason: result.finishReason,
            duration: Date.now() - startTime
          })
        }
      })

      // Convert AI SDK stream to your expected SSE format
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Send meta event with reqId (for compatibility)
            const metaEvent = `event: meta\ndata: ${JSON.stringify({ reqId, type: 'meta' })}\n\n`
            controller.enqueue(encoder.encode(metaEvent))

            let fullContent = ''
            
            // Stream AI SDK response
            for await (const chunk of result.textStream) {
              fullContent += chunk
              
              // Send as unified message format
              const messageData = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: fullContent,
                timestamp: new Date().toISOString(),
                type: 'text',
                metadata: {
                  mode,
                  isStreaming: true,
                  reqId
                }
              }
              
              const eventData = `data: ${JSON.stringify(messageData)}\n\n`
              controller.enqueue(encoder.encode(eventData))
            }

            // Send completion event
            const completionData = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: fullContent,
              timestamp: new Date().toISOString(),
              type: 'text',
              metadata: {
                mode,
                isComplete: true,
                finalChunk: true,
                reqId
              }
            }
            
            const completionEvent = `data: ${JSON.stringify(completionData)}\n\n`
            controller.enqueue(encoder.encode(completionEvent))
            
            controller.close()
          } catch (error) {
            console.error('[UNIFIED_AI_SDK] Stream error:', error)
            controller.error(error)
          }
        }
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
          'x-fbc-endpoint': 'unified-ai-sdk',
          'x-request-id': reqId,
          'X-Chat-Mode': mode,
          'X-Session-Id': context?.sessionId || 'anonymous'
        }
      })

    } else {
      // Non-streaming response
      const result = await generateText({
        model,
        system: systemPrompt,
        messages: aiMessages,
        temperature: 0.7
      })

      return NextResponse.json({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.text,
        timestamp: new Date().toISOString(),
        type: 'text',
        metadata: {
          mode,
          tokensUsed: result.usage?.totalTokens || 0,
          reqId
        }
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'x-fbc-endpoint': 'unified-ai-sdk',
          'x-request-id': reqId
        }
      })
    }

  } catch (error) {
    console.error('[UNIFIED_AI_SDK] Error:', error)

    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = message.includes('GOOGLE_GENERATIVE_AI_API_KEY') ? 503 : 500

    return NextResponse.json(
      {
        error: message,
        resolution:
          message.includes('GOOGLE_GENERATIVE_AI_API_KEY')
            ? 'Create a .env.local file at the project root and set GOOGLE_GENERATIVE_AI_API_KEY before retrying.'
            : undefined,
        timestamp: new Date().toISOString()
      },
      { status }
    )
  }
}

/**
 * GET handler for capabilities and status
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'capabilities':
        return NextResponse.json({
          capabilities: {
            supportsStreaming: true,
            supportsMultimodal: true,
            supportsRealtime: true,
            maxTokens: 8192,
            supportedModes: ['standard', 'realtime', 'admin', 'multimodal']
          },
          provider: 'ai-sdk',
          model: 'gemini-1.5-pro-latest',
          timestamp: new Date().toISOString()
        })

      case 'status':
        return NextResponse.json({
          status: 'operational',
          provider: 'unified-ai-sdk',
          version: '2.0.0',
          backend: 'AI SDK Tools',
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json({
          message: 'Unified Chat API - AI SDK Backend',
          endpoints: {
            POST: '/api/chat/unified - Send chat messages (AI SDK)',
            'GET (capabilities)': '/api/chat/unified?action=capabilities',
            'GET (status)': '/api/chat/unified?action=status'
          },
          supportedModes: ['standard', 'realtime', 'admin', 'multimodal'],
          backend: 'AI SDK Tools',
          timestamp: new Date().toISOString()
        })
    }

  } catch (error) {
    console.error('[UNIFIED_AI_SDK] GET error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process request',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
