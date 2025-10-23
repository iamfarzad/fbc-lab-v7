import type { Message as ChatMessage } from '@/types/core'

export type IntentSignal = 'BOOKING' | 'EXIT' | 'CONTINUE'

export function preProcessIntent(messages: ChatMessage[]): IntentSignal {
  const lastUserMessage = messages.filter((m) => m.role === 'user').pop()
  if (!lastUserMessage) return 'CONTINUE'
  const content = lastUserMessage.content.toLowerCase().trim()

  const bookingPatterns = [
    /let'?s (just )?book/i,
    /schedule (a|the) (call|meeting|workshop)/i,
    /set up (a|the) (call|meeting)/i,
    /book (a|the) (call|meeting|workshop)/i,
    /calendar/i,
    /when can we/i,
  ]
  if (bookingPatterns.some((p) => p.test(content))) return 'BOOKING'

  const exitPatterns = [
    /let'?s wrap/i,
    /move on/i,
    /that'?s enough/i,
    /stop asking/i,
    /wrap it up(?!.*talk|.*speak|.*call|.*meeting)/i, // Only if not followed by talk/speak/call/meeting
    /move forward/i,
    /for fuck'?s sake/i,
    /this is ridiculous/i,
    /enough already/i,
  ]
  if (exitPatterns.some((p) => p.test(content))) return 'EXIT'

  return 'CONTINUE'
}
