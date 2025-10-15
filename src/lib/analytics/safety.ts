type SafetyCategory = 'legal' | 'hr' | 'medical' | 'financial' | 'sensitive-data'

const SAFETY_PATTERNS: Record<SafetyCategory, RegExp[]> = {
  legal: [
    /lawsuit/i,
    /legal advice/i,
    /contract dispute/i,
    /sue/i,
    /regulation/i,
  ],
  hr: [
    /harassment/i,
    /terminate/i,
    /disciplinary/i,
    /immigration/i,
    /employee issue/i,
  ],
  medical: [
    /depression/i,
    /anxiety/i,
    /diagnos/i,
    /clinical/i,
    /mental health/i,
    /self-harm/i,
  ],
  financial: [
    /invest/i,
    /tax advice/i,
    /crypto/i,
    /stock tip/i,
    /financial advice/i,
  ],
  'sensitive-data': [
    /social security/i,
    /password/i,
    /credit card/i,
    /ssn/i,
  ],
}

export type SafetyEventPayload = {
  sessionId: string
  category: SafetyCategory
  messageId: string
  messageSnippet: string
  timestamp: number
}

export function detectSafetyCategory(text: string): SafetyCategory | null {
  for (const [category, patterns] of Object.entries(SAFETY_PATTERNS) as Array<[SafetyCategory, RegExp[]]>) {
    if (patterns.some((pattern) => pattern.test(text))) {
      return category
    }
  }
  return null
}

export function logSafetyEvent(payload: SafetyEventPayload) {
  if (typeof window !== 'undefined' && navigator.sendBeacon) {
    try {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
      navigator.sendBeacon('/api/analytics/safety', blob)
      return
    } catch {
      // fallthrough
    }
  }

   
  console.debug('[Safety][Event]', payload)
}
