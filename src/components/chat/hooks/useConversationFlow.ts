import { useMemo } from 'react'
import type { UnifiedMessage } from '@/core/chat/unified-types'

export type ConversationCategory =
  | 'goals'
  | 'pain'
  | 'data'
  | 'readiness'
  | 'budget'
  | 'success'

export interface ConversationFlowState {
  covered: Record<ConversationCategory, boolean>
  recommendedNext: ConversationCategory | null
  evidence: Partial<Record<ConversationCategory, string[]>>
  insights: Partial<Record<ConversationCategory, CategoryInsight>>
  coverageOrder: Array<CategoryInsight & { category: ConversationCategory }>
  totalUserTurns: number
  firstUserTimestamp: number | null
  latestUserTimestamp: number | null
  shouldOfferRecap: boolean
}

export interface CategoryInsight {
  firstTurnIndex: number
  firstMessageId: string
  firstTimestamp: number | null
}

export const CONVERSATION_CATEGORIES: ConversationCategory[] = [
  'goals',
  'pain',
  'data',
  'readiness',
  'budget',
  'success',
]

const CATEGORY_PATTERNS: Record<ConversationCategory, RegExp[]> = {
  goals: [
    /goal/i,
    /objectiv/i,
    /aim/i,
    /looking to/i,
    /plan to/i,
  ],
  pain: [
    /pain/i,
    /struggl/i,
    /problem/i,
    /issue/i,
    /bottleneck/i,
    /frustrat/i,
  ],
  data: [
    /data/i,
    /spreadsheet/i,
    /csv/i,
    /crm/i,
    /database/i,
    /report/i,
  ],
  readiness: [
    /team/i,
    /buy-in/i,
    /adopt/i,
    /workflow/i,
    /change/i,
    /champion/i,
  ],
  budget: [
    /budget/i,
    /cost/i,
    /price/i,
    /invest/i,
    /spend/i,
    /timeline/i,
    /quarter/i,
    /q1|q2|q3|q4/i,
  ],
  success: [
    /success/i,
    /metric/i,
    /measure/i,
    /roi/i,
    /kpi/i,
    /result/i,
    /outcome/i,
  ],
}

export function useConversationFlow(messages: UnifiedMessage[]): ConversationFlowState {
  return useMemo(() => {
    const covered: Record<ConversationCategory, boolean> = {
      goals: false,
      pain: false,
      data: false,
      readiness: false,
      budget: false,
      success: false,
    }

    const evidence: Partial<Record<ConversationCategory, string[]>> = {}
    const insights: Partial<Record<ConversationCategory, CategoryInsight>> = {}
    const coverageOrder: Array<CategoryInsight & { category: ConversationCategory }> = []

    const userMessages = messages.filter((message) => message.role === 'user')

    const firstUserTimestamp = userMessages.length > 0
      ? toMillis(userMessages[0].timestamp)
      : null
    const latestUserTimestamp = userMessages.length > 0
      ? toMillis(userMessages[userMessages.length - 1].timestamp)
      : null

    userMessages.forEach((message, turnIndex) => {
      const content = message.content.toLowerCase()

      for (const category of CONVERSATION_CATEGORIES) {
        if (covered[category]) continue

        const matchesCategory = CATEGORY_PATTERNS[category].some((pattern) => pattern.test(content))
        if (matchesCategory) {
          covered[category] = true
          if (!evidence[category]) {
            evidence[category] = []
          }
          evidence[category]!.push(message.content)

          const insight: CategoryInsight = {
            firstTurnIndex: turnIndex,
            firstMessageId: message.id,
            firstTimestamp: toMillis(message.timestamp),
          }
          insights[category] = insight
          coverageOrder.push({ category, ...insight })
        }
      }
    })

    const recommendedNext = CONVERSATION_CATEGORIES.find((category) => !covered[category]) ?? null

    const shouldOfferRecap = userMessages.length >= 6

    return {
      covered,
      recommendedNext,
      evidence,
      insights,
      coverageOrder,
      totalUserTurns: userMessages.length,
      firstUserTimestamp,
      latestUserTimestamp,
      shouldOfferRecap,
    }
  }, [messages])
}

function toMillis(timestamp: Date | string | number | undefined): number | null {
  if (!timestamp) return null
  if (timestamp instanceof Date) return timestamp.getTime()
  if (typeof timestamp === 'number') return timestamp
  const parsed = Date.parse(timestamp)
  return Number.isNaN(parsed) ? null : parsed
}
