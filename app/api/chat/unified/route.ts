/**
 * Unified Chat API Endpoint - AI SDK Backend
 * Connects your existing pipeline to AI SDK Tools
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRetryableGemini } from '@/core/ai/retry-model'
import { streamText, generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { multimodalContextManager } from '@/src/core/context/multimodal-context'
import { GoogleGroundingProvider } from '@/src/core/intelligence/providers/search/google-grounding'
import { ContextStorage } from '@/src/core/context/context-storage'

// Type definitions
interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface IntelligenceContext {
  lead?: { name: string; email: string }
  company?: { name: string; industry?: string; size?: string }
  person?: { role?: string; seniority?: string }
}

interface MultimodalData {
  audioData?: Uint8Array
  imageData?: Uint8Array
  videoData?: boolean
}

interface ChatContext {
  intelligenceContext?: IntelligenceContext
  sessionId?: string
  multimodalData?: MultimodalData
  enhancedResearch?: boolean // Enable enhanced grounding research
}

interface ChatRequestBody {
  messages: ChatMessage[]
  context?: ChatContext
  mode?: 'standard' | 'admin' | 'realtime' | 'multimodal'
  stream?: boolean
}

// ChatResponse interface removed - not used in this file

interface MultimodalContextResult {
  multimodalContext: {
    hasRecentImages: boolean
  }
  systemPrompt: string
}

let cachedModel: ReturnType<typeof createRetryableGemini> | null = null
const contextStorage = new ContextStorage()
const groundingProvider = new GoogleGroundingProvider()

const getModel = () => {
  const apiKey = process.env.GEMINI_API_KEY
  const googleApiKey = process.env.GOOGLE_API_KEY
  const googleGenApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY

  console.log('[DEBUG] Environment variables:', {
    GEMINI_API_KEY: apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET',
    GOOGLE_API_KEY: googleApiKey ? `${googleApiKey.substring(0, 10)}...` : 'NOT SET',
    GOOGLE_GENERATIVE_AI_API_KEY: googleGenApiKey ? `${googleGenApiKey.substring(0, 10)}...` : 'NOT SET'
  })

  if (!apiKey) {
    throw new Error(
      'Missing Google Generative AI API key. Add GEMINI_API_KEY to your .env.local file and restart the dev server.'
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

    const body = await req.json() as ChatRequestBody
    const { messages, context, mode = 'standard', stream = true } = body
    const model = getModel()

    // Build system prompt based on mode and context
    let systemPrompt = `You are F.B/c AI, the intelligent assistant for Farzad Bayat's AI consulting practice.

MISSION: "Helping organizations navigate the AI landscape through strategic consulting, hands-on workshops, and practical implementation guidance."

PERSONALITY:
- Strategic & Insightful: Provide actionable business intelligence
- Professional yet approachable: Expert guidance with warm engagement
- Context-aware: Use research data to personalize every interaction
- Progressive: Guide users through 16 AI capabilities systematically
- Mission-driven: Always connect responses to business value and AI strategy

CORE CAPABILITIES (Progressive Discovery):
1. ROI Analysis - Calculate AI investment returns
2. Document Analysis - Process and understand documents
3. Image Analysis - Visual content understanding
4. Screenshot Capture - Screen content analysis
5. Voice Integration - Audio conversations and processing
6. Screen Sharing - Real-time screen collaboration
7. Webcam Integration - Video conversations and analysis
8. Translation - Multi-language communication
9. Web Search - Research and information gathering
10. URL Context - Website content analysis
11. Lead Research - Company and person intelligence
12. Meeting Scheduling - Calendar and booking integration
13. PDF Export - Generate strategy summaries
14. Calculator - Mathematical and financial computations
15. Code Analysis - Programming and development support
16. Video to App - Video content transformation

RESPONSE STYLE:
- Always connect to business outcomes and strategic value
- Use company/person research to personalize responses
- Guide users progressively through capabilities based on context
- Reference specific industries and roles when known
- End with actionable next steps or capability suggestions`
    
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
      const intCtx: IntelligenceContext = context.intelligenceContext
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

    // Add enhanced research context (combines search grounding + URL context)
    let enhancedResearchContext = ''
    let researchMetadata = null
    if (context?.enhancedResearch !== false && context?.sessionId) {
      try {
        // Get current context for research
        const currentContext = await contextStorage.get(context.sessionId)
        const researchContext = {
          email: currentContext?.email,
          company: (currentContext?.company_context as any)?.name,
          industry: (currentContext?.company_context as any)?.industry,
          previousUrls: [] // Could be expanded to track conversation URLs
        }

        // Get the latest user message for research
        const latestMessage = messages[messages.length - 1]
        if (latestMessage?.role === 'user') {
          console.log('🔍 Performing enhanced research for query:', latestMessage.content)

          const researchResult = await groundingProvider.comprehensiveResearch(
            latestMessage.content,
            researchContext
          )

          researchMetadata = {
            query: latestMessage.content,
            urlsUsed: researchResult.urlsUsed,
            citationCount: researchResult.allCitations.length,
            searchGroundingUsed: researchResult.searchGrounding.citations.length,
            urlContextUsed: researchResult.urlContext.length
          }

          enhancedResearchContext = `
ENHANCED RESEARCH CONTEXT (Automatically Generated):
Query: ${latestMessage.content}

${researchResult.combinedAnswer}

Sources Used (${researchResult.urlsUsed.length} URLs analyzed):
${researchResult.urlsUsed.map((url, i) => `${i + 1}. ${url}`).join('\n')}

Citations: ${researchResult.allCitations.length} sources processed
`
          console.log(`✅ Enhanced research completed: ${researchResult.allCitations.length} citations from ${researchResult.urlsUsed.length} URLs`)
        }
      } catch (error) {
        console.warn('Enhanced research failed:', error)
        researchMetadata = { error: 'Enhanced research failed' }
        // Continue without enhanced context
      }
    }

    if (enhancedResearchContext) {
      systemPrompt += '\n\n' + enhancedResearchContext
    }

    // Add multimodal context from conversation history
    if (context?.sessionId) {
      try {
        const multimodalContext: MultimodalContextResult = await multimodalContextManager.prepareChatContext(context.sessionId, true, false)

        if (multimodalContext.multimodalContext.hasRecentImages) {
          systemPrompt += '\n\n' + multimodalContext.systemPrompt
        }
      } catch (error) {
        console.warn('Failed to load multimodal context:', error)
      }
    }

    // Add multimodal context from direct input
    if (context?.multimodalData) {
      const multimodalData: MultimodalData = context.multimodalData
      let multimodalContextText = '\n\nMULTIMODAL INPUT:\n'

      if (multimodalData.audioData) {
        multimodalContextText += `Audio input received (${multimodalData.audioData.length} bytes)\n`
      }

      if (multimodalData.imageData) {
        multimodalContextText += `Image input received (${multimodalData.imageData.length} bytes)\n`
      }

      if (multimodalData.videoData) {
        multimodalContextText += `Video input received\n`
      }

      systemPrompt += multimodalContextText
    }

    // Convert messages to AI SDK format and validate
    const aiMessages = messages
      .filter((msg: ChatMessage) => msg.content && msg.content.trim().length > 0)
      .map((msg: ChatMessage) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }))

    // Ensure we have at least one message
    if (aiMessages.length === 0) {
      return NextResponse.json({ 
        error: 'No valid messages provided. Please ensure messages have content.' 
      }, { status: 400 })
    }

    // Handle streaming vs non-streaming
    if (stream !== false) {
      // For streaming, use direct Google model (ai-retry doesn't support streaming)
      const apiKey = process.env.GEMINI_API_KEY
      const googleApiKey = process.env.GOOGLE_API_KEY
      const googleGenApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
      
      console.log('[DEBUG] Streaming environment variables:', {
        GEMINI_API_KEY: apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET',
        GOOGLE_API_KEY: googleApiKey ? `${googleApiKey.substring(0, 10)}...` : 'NOT SET',
        GOOGLE_GENERATIVE_AI_API_KEY: googleGenApiKey ? `${googleGenApiKey.substring(0, 10)}...` : 'NOT SET'
      })
      
      if (!apiKey) {
        throw new Error('Missing GEMINI_API_KEY environment variable')
      }
      const streamingModel = google('gemini-2.5-flash')
      
      // Streaming response using AI SDK
      const result = streamText({
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
            const messageId = crypto.randomUUID() // Stable ID across chunks
            
            // Stream AI SDK response
            for await (const chunk of result.textStream) {
              fullContent += chunk
              
              // Send as unified message format with stable ID
              const messageData = {
                id: messageId,
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

            // Send completion event with same ID
            const completionData = {
              id: messageId,
              role: 'assistant',
              content: fullContent,
              timestamp: new Date().toISOString(),
              type: 'text',
              metadata: {
                mode,
                isComplete: true,
                finalChunk: true,
                reqId,
                research: researchMetadata
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
          'X-Session-Id': context?.sessionId || 'anonymous',
          'X-Enhanced-Research': researchMetadata ? 'true' : 'false'
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
          reqId,
          research: researchMetadata
        }
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'x-fbc-endpoint': 'unified-ai-sdk',
          'x-request-id': reqId,
          'X-Enhanced-Research': researchMetadata ? 'true' : 'false'
        }
      })
    }

  } catch (error) {
    console.error('[UNIFIED_AI_SDK] Error:', error)

    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = message.includes('GEMINI_API_KEY') ? 503 : 500

    return NextResponse.json(
      {
        error: message,
        resolution:
          message.includes('GEMINI_API_KEY')
            ? 'Create a .env.local file at the project root and set GEMINI_API_KEY before retrying.'
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
export function GET(req: NextRequest) {
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
          model: 'gemini-2.5-pro',
          timestamp: new Date().toISOString()
        })

      case 'status':
        return NextResponse.json({
          status: 'operational',
          provider: 'unified-ai-sdk',
          version: '2.0.1',
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
