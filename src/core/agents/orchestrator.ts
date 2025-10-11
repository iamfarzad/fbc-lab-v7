import type { AgentContext, ChatMessage, AgentResult, FunnelStage } from './types'
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

  // Determine funnel stage
  const stage = determineFunnelStage({
    conversationFlow: context.conversationFlow,
    intelligenceContext: context.intelligenceContext,
    trigger
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
 * Determine which funnel stage the conversation is in
 */
function determineFunnelStage({
  conversationFlow,
  intelligenceContext,
  trigger
}: {
  conversationFlow?: any
  intelligenceContext?: any
  trigger?: string
}): FunnelStage {
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

  // Sales pitch phase - fit determined
  const { workshop, consulting } = intelligenceContext.fitScore
  if (workshop > consulting && workshop > 0.7) {
    return 'WORKSHOP_PITCH'
  }
  if (consulting > workshop && consulting > 0.7) {
    return 'CONSULTING_PITCH'
  }

  // Closing phase - pitch delivered but no booking
  if (intelligenceContext.pitchDelivered && !intelligenceContext.calendarBooked) {
    return 'CLOSING'
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
