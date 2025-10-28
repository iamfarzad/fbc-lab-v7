import { NextRequest } from 'next/server'
import { respond } from '@/lib/api/response'
// import { WorkflowEngine } from '@/lib/workflow/engine'
import { logJsonl } from '@/lib/jsonl-logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface WorkflowTriggerRequest {
  sessionId: string
  messages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp?: string
    modality?: 'text' | 'voice' | 'image'
  }>
  multimodalContext?: {
    hasRecentImages: boolean
    hasRecentAudio: boolean
    hasRecentUploads: boolean
    recentAnalyses: string[]
    recentUploads: string[]
  }
  intelligenceContext?: any
  conversationFlow?: any
  voiceActive?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const reqId = request.headers.get('x-request-id') || crypto.randomUUID()
    const startTime = Date.now()
    
    console.log('[WORKFLOW_TRIGGER] Request received:', reqId)
    
    const body: WorkflowTriggerRequest = await request.json()
    const {
      sessionId,
      messages,
      multimodalContext,
      intelligenceContext,
      conversationFlow,
      voiceActive
    } = body
    
    if (!sessionId || !messages || messages.length === 0) {
      return respond.badRequest('Missing required fields: sessionId and messages')
    }
    
    // Initialize workflow engine
    // const workflow = new WorkflowEngine('fbc-sales-funnel')
    
    // Execute workflow
    // const result = await workflow.execute({...})
    
    // Basic signal logging to help workflow diagnostics
    const lastUserMessage = messages.slice().reverse().find((m) => m.role === 'user')
    if (lastUserMessage) {
      console.log('[WORKFLOW_TRIGGER] Last user input:', {
        sessionId,
        messagePreview: lastUserMessage.content.slice(0, 120),
        modality: lastUserMessage.modality ?? 'text'
      })
    }
    
    if (conversationFlow || intelligenceContext || multimodalContext) {
      console.log('[WORKFLOW_TRIGGER] Context snapshot', {
        sessionId,
        hasConversationFlow: Boolean(conversationFlow),
        hasIntelligenceContext: Boolean(intelligenceContext),
        multimodalSignals: multimodalContext
          ? {
              hasRecentImages: multimodalContext.hasRecentImages,
              hasRecentAudio: multimodalContext.hasRecentAudio,
              recentAnalyses: multimodalContext.recentAnalyses?.length ?? 0
            }
          : null,
        voiceActive: Boolean(voiceActive)
      })
    }
    
    const duration = Date.now() - startTime
    console.log('[WORKFLOW_TRIGGER] Completed:', { reqId, duration })
    
    // Log workflow execution
    try {
      await logJsonl('workflow', 'execution_complete', {
        sessionId,
        requestId: reqId,
        agent: 'Test Agent',
        stage: 'TEST',
        duration,
        success: true,
        contextFlags: {
          hasConversationFlow: Boolean(conversationFlow),
          hasIntelligenceContext: Boolean(intelligenceContext),
          voiceActive: Boolean(voiceActive)
        }
      })
    } catch (logErr) {
      console.warn('[WORKFLOW_TRIGGER] Failed to log execution:', logErr)
    }
    
    return respond.ok({
      output: 'Workflow execution completed',
      agent: 'Test Agent',
      metadata: {
        stage: 'TEST',
        contextFlags: {
          hasConversationFlow: Boolean(conversationFlow),
          hasIntelligenceContext: Boolean(intelligenceContext),
          voiceActive: Boolean(voiceActive)
        }
      },
      requestId: reqId,
      duration
    })
    
  } catch (error) {
    console.error('[WORKFLOW_TRIGGER] Error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Workflow execution failed'
    
    try {
      await logJsonl('workflow', 'execution_error', {
        error: errorMessage,
        requestId: request.headers.get('x-request-id') || 'unknown'
      })
    } catch (logErr) {
      console.warn('[WORKFLOW_TRIGGER] Failed to log error:', logErr)
    }
    
    return respond.error(errorMessage, 500, 'WORKFLOW_ERROR')
  }
}
