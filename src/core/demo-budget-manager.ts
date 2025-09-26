// Demo budget management for free tier users
export type DemoFeature =
  | 'chat_messages'
  | 'image_analysis'
  | 'screenshot_analysis'
  | 'document_analysis'
  | 'voice_sessions'

export interface DemoAccessCheck {
  allowed: boolean
  remaining: number
  limit: number
  resetAt?: Date
}

export async function checkDemoAccess(
  sessionId: string,
  feature: DemoFeature,
  tokens: number
): Promise<DemoAccessCheck> {
  // Simple demo limits - in production this would be more sophisticated
  const limits = {
    chat_messages: { limit: 50, resetHours: 24 },
    image_analysis: { limit: 10, resetHours: 24 },
    screenshot_analysis: { limit: 10, resetHours: 24 },
    document_analysis: { limit: 5, resetHours: 24 },
    voice_sessions: { limit: 5, resetHours: 24 }
  }

  const config = limits[feature]
  if (!config) {
    return { allowed: true, remaining: 999, limit: 1000 }
  }

  // In production, this would check actual usage from database
  // For now, return mock response
  return {
    allowed: true,
    remaining: config.limit,
    limit: config.limit
  }
}

export async function recordDemoUsage(
  sessionId: string,
  feature: DemoFeature,
  tokens: number
): Promise<void> {
  // In production, this would record usage to database
  console.log(`Demo usage recorded: ${feature} - ${tokens} tokens for session ${sessionId}`)
}