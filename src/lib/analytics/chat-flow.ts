import type { ConversationCategory, CategoryInsight } from '@/components/chat/hooks/useConversationFlow'

export interface ConversationMilestone extends CategoryInsight {
  sessionId: string
  category: ConversationCategory
  elapsedMs: number | null
}

export function logConversationMilestone(milestone: ConversationMilestone) {
  const payload = {
    sessionId: milestone.sessionId,
    category: milestone.category,
    turnIndex: milestone.firstTurnIndex,
    elapsedMs: milestone.elapsedMs,
    timestamp: milestone.firstTimestamp,
  }

  if (typeof window !== 'undefined' && navigator.sendBeacon) {
    try {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
      navigator.sendBeacon('/api/analytics/chat-flow', blob)
      return
    } catch {
      // fall through to console log
    }
  }

  // eslint-disable-next-line no-console
  console.debug('[ChatFlow][Milestone]', payload)
}
