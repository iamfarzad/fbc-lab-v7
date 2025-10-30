import type { AgentContext, ChatMessage, AgentResult, FunnelStage } from './types'
import { preProcessIntent } from './intent'
import { multimodalContextManager } from '@/core/context/multimodal-context'
import { usageLimiter } from '@/lib/usage-limits'
import { discoveryAgent } from './discovery-agent'
import { scoringAgent } from './scoring-agent'
import { workshopSalesAgent } from './workshop-sales-agent'
import { consultingSalesAgent } from './consulting-sales-agent'
import { closerAgent } from './closer-agent'
import { summaryAgent } from './summary-agent'
import { proposalAgent } from './proposal-agent'
import { adminAgent } from './admin-agent'
import { retargetingAgent } from './retargeting-agent'

/**
 * Multi-Agent Orchestrator - Routes conversations to specialized agents
 * 
 * Uses funnel stage determination to select the right agent
 * Preserves full multimodal context across handoffs
 * Tracks usage limits and enforces quotas
 */
export async function routeToAgent({
  messages,
  context,
  trigger = 'chat'
}: {
  messages: ChatMessage[]
  context: AgentContext
  trigger?: 'chat' | 'voice' | 'conversation_end' | 'admin' | 'proposal_request'
}): Promise<AgentResult> {
  
  // CRITICAL FIX: Pre-process intent before routing
  const intentSignal = preProcessIntent(messages);
  if (intentSignal === 'BOOKING') {
    const immediate: AgentResult = {
      output: "Absolutely! I'll send you our calendar link. What time zone are you in?",
      agent: 'Discovery Agent (Booking Mode)',
      metadata: {
        stage: 'BOOKING_REQUESTED' as FunnelStage,
        triggerBooking: true,
        action: 'show_calendar_widget',
      },
    }
    return immediate
  }
  
  if (intentSignal === 'EXIT') {
    context.stage = 'FORCE_EXIT' as FunnelStage;
    return summaryAgent(messages, context);
  }
  
  // Handle conversation end (archive before generating summary)
  if (trigger === 'conversation_end' && context.sessionId) {
    try {
      console.log(`🏁 Conversation end triggered for ${context.sessionId}`)
      
      // 1. Archive multimodal context to Supabase (critical for PDF)
      await multimodalContextManager.archiveConversation(context.sessionId)
      console.log('✅ Context archived before summary generation')
      
      // 2. Generate summary with full context (will load from Supabase)
      const multimodalData = await multimodalContextManager.prepareChatContext(
        context.sessionId,
        true, // include visual
        true  // include audio
      )
      
      const enhancedContext: AgentContext = {
        ...context,
        multimodalContext: multimodalData.multimodalContext,
        stage: 'SUMMARY'
      }
      
      const result = await summaryAgent(messages, enhancedContext)
      
      console.log('✅ Summary generated - client will generate PDF')
      return result
    } catch (error) {
      console.error('Conversation end handling failed:', error)
      throw error
    }
  }
  
  // Check usage limits first (except for summary/admin)
  if (trigger === 'chat' || trigger === 'voice') {
    if (context.sessionId) {
      const limitCheck = await usageLimiter.checkLimit(context.sessionId, 'message')
      if (!limitCheck.allowed) {
        return {
          output: `I've reached the conversation limit for this session. ${limitCheck.reason}\n\nLet me send you a summary of what we discussed so far.`,
          agent: 'System',
          metadata: {
            type: 'limit_reached',
            reason: limitCheck.reason
          }
        }
      }
    }
  }

  // Get multimodal context
  let multimodalContext
  if (context.sessionId) {
    try {
      const multimodalData = await multimodalContextManager.prepareChatContext(
        context.sessionId,
        true, // include visual
        trigger === 'voice' // include audio if voice
      )
      multimodalContext = multimodalData.multimodalContext
    } catch (error) {
      console.warn('Failed to load multimodal context:', error)
      multimodalContext = {
        hasRecentImages: false,
        hasRecentAudio: false,
        hasRecentUploads: false,
        recentAnalyses: [],
        recentUploads: []
      }
    }
  }

  // Merge provided multimodalContext from incoming request context when present.
  // This ensures E2E runs (and clients) can supply context even if storage misses.
  if (context.multimodalContext) {
    const provided = context.multimodalContext
    multimodalContext = {
      hasRecentImages: Boolean((multimodalContext?.hasRecentImages || provided.hasRecentImages)),
      hasRecentAudio: Boolean((multimodalContext?.hasRecentAudio || provided.hasRecentAudio)),
      hasRecentUploads: Boolean((multimodalContext?.hasRecentUploads || provided.hasRecentUploads)),
      recentAnalyses: [
        ...(multimodalContext?.recentAnalyses ?? []),
        ...(provided.recentAnalyses ?? []),
      ],
      recentUploads: [
        ...(multimodalContext?.recentUploads ?? []),
        ...(provided.recentUploads ?? []),
      ],
    }
  }

  // Determine funnel stage
  const stage = determineFunnelStage({
    conversationFlow: context.conversationFlow,
    intelligenceContext: context.intelligenceContext,
    trigger,
    override: undefined
  })

  // Build enhanced context for agent
  const enhancedContext: AgentContext = {
    ...context,
    multimodalContext,
    stage
  }

  // Route to appropriate agent
  let result: AgentResult

  try {
    switch (stage) {
      case 'DISCOVERY':
        result = await discoveryAgent(messages, enhancedContext)
        break

      case 'SCORING':
        result = await scoringAgent(messages, enhancedContext)
        // Update intelligence context with scores
        if (result.metadata?.leadScore && context.intelligenceContext) {
          context.intelligenceContext.leadScore = result.metadata.leadScore
          context.intelligenceContext.fitScore = result.metadata.fitScore
        }
        // After scoring, immediately route to sales
        const nextStage = determineFunnelStage({
          conversationFlow: context.conversationFlow,
          intelligenceContext: context.intelligenceContext,
          trigger
        })
        if (nextStage !== 'SCORING') {
          // Re-route to sales agent
          return routeToAgent({ messages, context: { ...context, stage: nextStage }, trigger })
        }
        break

      case 'WORKSHOP_PITCH':
        result = await workshopSalesAgent(messages, enhancedContext)
        break

      case 'CONSULTING_PITCH':
        result = await consultingSalesAgent(messages, enhancedContext)
        break

      case 'CLOSING':
        result = await closerAgent(messages, enhancedContext)
        break

      case 'SUMMARY':
        result = await summaryAgent(messages, enhancedContext)
        break

      case 'PROPOSAL':
        result = await proposalAgent(messages, enhancedContext)
        break

      case 'ADMIN':
        result = await adminAgent(messages, {
          sessionId: context.sessionId || 'admin',
          adminId: context.intelligenceContext?.email
        })
        break

      case 'RETARGETING':
        // Retargeting is typically triggered by scheduled jobs, not chat
        // But we support it here for completeness
        result = await retargetingAgent({
          leadContext: context.intelligenceContext,
          conversationSummary: messages.map(m => m.content).join('\n'),
          scenario: 'no_booking_high_score'
        })
        break

      case 'BOOKING_REQUESTED':
        {
          const booking: AgentResult = {
            output: "Perfect! I'll open our calendar. Pick a time that works for you.",
            agent: 'Booking Agent',
            metadata: {
              stage: 'BOOKING_REQUESTED' as FunnelStage,
              triggerBooking: true,
              action: 'show_calendar_widget',
            },
          }
          result = booking
        }
        break

      case 'FORCE_EXIT':
        result = await summaryAgent(messages, enhancedContext)
        break

      default:
        // Fallback to discovery
        result = await discoveryAgent(messages, enhancedContext)
    }

    // Track usage
    if (context.sessionId && (trigger === 'chat' || trigger === 'voice')) {
      await usageLimiter.trackUsage(context.sessionId, 'message')
    }

    // Add metadata
    result.metadata = {
      ...result.metadata,
      stage,
      multimodalUsed: multimodalContext?.hasRecentImages || multimodalContext?.hasRecentAudio || false
    }

    // PERSIST AGENT RESULTS (NEW)
    if (context.sessionId && context.sessionId !== 'anonymous') {
      try {
        const { agentPersistence } = await import('./agent-persistence')
        await agentPersistence.persistAgentResult(
          context.sessionId,
          result,
          enhancedContext
        )
        console.log(`✅ Agent result persisted: ${result.agent}`)
      } catch (error) {
        console.error('Agent persistence error (non-fatal):', error)
        // Continue - don't block user experience
      }
    }

    return result

  } catch (error) {
    console.error('[Orchestrator] Agent failed:', error)
    return {
      output: 'I encountered an error processing your request. Let me try again.',
      agent: 'Error Handler',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        stage
      }
    }
  }
}

/**
 * Pre-process user intent before routing
 */
// preProcessIntent moved to './intent' for testability

/**
 * Determine which funnel stage the conversation is in
 */
function determineFunnelStage({
  conversationFlow,
  intelligenceContext,
  trigger,
  override
}: {
  conversationFlow?: any
  intelligenceContext?: any
  trigger?: string
  override?: FunnelStage
}): FunnelStage {
  // Override takes precedence
  if (override) return override;
  // Admin queries
  if (trigger === 'admin') return 'ADMIN'

  // Conversation ended
  if (trigger === 'conversation_end') return 'SUMMARY'

  // Explicit proposal request
  if (trigger === 'proposal_request') return 'PROPOSAL'

  // Scheduled retargeting
  if (trigger === 'retargeting') return 'RETARGETING'

  // Discovery phase - if less than 4 categories covered
  if (!conversationFlow || Object.values(conversationFlow.covered).filter(Boolean).length < 4) {
    return 'DISCOVERY'
  }

  // Scoring phase - 4+ categories covered, but no fit score yet
  if (!intelligenceContext?.fitScore) {
    return 'SCORING'
  }

  // Closing phase - pitch delivered but no booking (check this FIRST)
  if (intelligenceContext.pitchDelivered && !intelligenceContext.calendarBooked) {
    return 'CLOSING'
  }

  // Sales pitch phase - fit determined
  const { workshop, consulting } = intelligenceContext.fitScore
  if (workshop > consulting && workshop > 0.7) {
    return 'WORKSHOP_PITCH'
  }
  if (consulting > workshop && consulting > 0.7) {
    return 'CONSULTING_PITCH'
  }

  // If fit scores are low or equal, stay in discovery
  if (workshop < 0.7 && consulting < 0.7) {
    return 'DISCOVERY'
  }

  // Default back to discovery
  return 'DISCOVERY'
}

/**
 * Get current funnel stage for a session (read-only)
 */
export function getCurrentStage(context: AgentContext): FunnelStage {
  return determineFunnelStage({
    conversationFlow: context.conversationFlow,
    intelligenceContext: context.intelligenceContext
  })
}
