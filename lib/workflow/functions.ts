import { WorkflowContext, WorkflowResult } from './engine'

export interface WorkflowFunction {
  name: string
  handler: (context: WorkflowContext) => Promise<WorkflowResult>
  timeout?: number
}

export const workflowFunctions: WorkflowFunction[] = [
  {
    name: 'receive-multimodal-input',
    handler: async (context: WorkflowContext) => {
      console.log('[WORKFLOW_FUNCTION] Receiving multimodal input for session:', context.sessionId)
      
      return {
        output: 'Input received',
        agent: 'Input Handler',
        metadata: {
          stage: 'INPUT_RECEIVED',
          messageCount: context.messages.length,
          hasMultimodal: context.multimodalContext.hasRecentImages || context.multimodalContext.hasRecentAudio
        }
      }
    },
    timeout: 30
  },
  
  {
    name: 'load-conversation-context',
    handler: async (context: WorkflowContext) => {
      console.log('[WORKFLOW_FUNCTION] Loading conversation context for session:', context.sessionId)
      
      try {
        const { multimodalContextManager } = await import('@/core/context/multimodal-context')
        const conversationContext = await multimodalContextManager.getConversationContext(
          context.sessionId,
          context.multimodalContext.hasRecentImages,
          context.multimodalContext.hasRecentAudio
        )
        
        return {
          output: 'Context loaded',
          agent: 'Context Loader',
          metadata: {
            stage: 'CONTEXT_LOADED',
            conversationLength: conversationContext.conversationHistory.length,
            hasVisualContext: conversationContext.visualContext.length > 0,
            hasAudioContext: conversationContext.audioContext.length > 0
          }
        }
      } catch (error) {
        console.error('[WORKFLOW_FUNCTION] Failed to load context:', error)
        return {
          output: 'Context load failed',
          agent: 'Context Loader',
          metadata: {
            stage: 'CONTEXT_LOADED',
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }
    },
    timeout: 60
  },
  
  {
    name: 'determine-funnel-stage',
    handler: async (context: WorkflowContext) => {
      console.log('[WORKFLOW_FUNCTION] Determining funnel stage for session:', context.sessionId)
      
      const { conversationFlow, intelligenceContext } = context
      
      // Admin queries
      if (context.requestId.includes('admin')) {
        return {
          output: 'Admin stage determined',
          agent: 'Stage Determiner',
          metadata: { stage: 'ADMIN' }
        }
      }
      
      // Discovery phase - if less than 4 categories covered
      if (!conversationFlow || Object.values(conversationFlow.covered || {}).filter(Boolean).length < 4) {
        return {
          output: 'Discovery stage determined',
          agent: 'Stage Determiner',
          metadata: { stage: 'DISCOVERY' }
        }
      }
      
      // Scoring phase - 4+ categories covered, but no fit score yet
      if (!intelligenceContext?.fitScore) {
        return {
          output: 'Scoring stage determined',
          agent: 'Stage Determiner',
          metadata: { stage: 'SCORING' }
        }
      }
      
      // Closing phase - pitch delivered but no booking
      if (intelligenceContext.pitchDelivered && !intelligenceContext.calendarBooked) {
        return {
          output: 'Closing stage determined',
          agent: 'Stage Determiner',
          metadata: { stage: 'CLOSING' }
        }
      }
      
      // Sales pitch phase - fit determined
      const { workshop, consulting } = intelligenceContext.fitScore || {}
      if (workshop > consulting && workshop > 0.7) {
        return {
          output: 'Workshop pitch stage determined',
          agent: 'Stage Determiner',
          metadata: { stage: 'WORKSHOP_PITCH' }
        }
      }
      if (consulting > workshop && consulting > 0.7) {
        return {
          output: 'Consulting pitch stage determined',
          agent: 'Stage Determiner',
          metadata: { stage: 'CONSULTING_PITCH' }
        }
      }
      
      // Default back to discovery
      return {
        output: 'Default discovery stage determined',
        agent: 'Stage Determiner',
        metadata: { stage: 'DISCOVERY' }
      }
    },
    timeout: 30
  },
  
  {
    name: 'update-conversation-context',
    handler: async (context: WorkflowContext) => {
      console.log('[WORKFLOW_FUNCTION] Updating conversation context for session:', context.sessionId)
      
      try {
        const { multimodalContextManager } = await import('@/core/context/multimodal-context')
        
        // Add user message
        const lastUserMessage = context.messages.filter(m => m.role === 'user').pop()
        if (lastUserMessage) {
          await multimodalContextManager.addConversationTurn(context.sessionId, {
            role: 'user',
            text: lastUserMessage.content,
            isFinal: true,
            modality: lastUserMessage.modality || 'text'
          })
        }
        
        return {
          output: 'Context updated',
          agent: 'Context Updater',
          metadata: {
            stage: 'CONTEXT_UPDATED',
            userMessageAdded: !!lastUserMessage
          }
        }
      } catch (error) {
        console.error('[WORKFLOW_FUNCTION] Failed to update context:', error)
        return {
          output: 'Context update failed',
          agent: 'Context Updater',
          metadata: {
            stage: 'CONTEXT_UPDATED',
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }
    },
    timeout: 30
  },
  
  {
    name: 'send-response-to-client',
    handler: async (context: WorkflowContext) => {
      console.log('[WORKFLOW_FUNCTION] Sending response to client for session:', context.sessionId)
      
      return {
        output: 'Response sent',
        agent: 'Response Sender',
        metadata: {
          stage: 'RESPONSE_SENT',
          sessionId: context.sessionId
        }
      }
    },
    timeout: 30
  }
]

export function getWorkflowFunction(name: string): WorkflowFunction | undefined {
  return workflowFunctions.find(fn => fn.name === name)
}