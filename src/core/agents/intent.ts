import type { Message as ChatMessage } from '@/types/core'

export type IntentSignal = 'BOOKING' | 'EXIT' | 'CONTINUE' | 'VOICE_REQUEST' | 'SCREEN_SHARE_REQUEST' | 'WEBCAM_REQUEST' | 'CHART_REQUEST'

export function preProcessIntent(messages: ChatMessage[]): IntentSignal {
  const lastUserMessage = messages.filter((m) => m.role === 'user').pop()
  if (!lastUserMessage) return 'CONTINUE'
  const content = lastUserMessage.content.toLowerCase().trim()

  // Voice request patterns
  const voicePatterns = [
    /can we talk/i,
    /let'?s talk/i,
    /voice (chat|call|conversation)/i,
    /speak (with|to) you/i,
    /call you/i,
    /phone (call|conversation)/i,
    /audio (chat|call)/i,
    /mic(rophone)?/i,
    /record(ing)?/i,
  ]
  if (voicePatterns.some((p) => p.test(content))) return 'VOICE_REQUEST'

  // Screen share request patterns
  const screenSharePatterns = [
    /show you (my|the)/i,
    /let me show/i,
    /screen share/i,
    /share (my|the) screen/i,
    /see (my|the) screen/i,
    /look at (my|the) screen/i,
    /display/i,
    /presentation/i,
    /demo/i,
    /walkthrough/i,
  ]
  if (screenSharePatterns.some((p) => p.test(content))) return 'SCREEN_SHARE_REQUEST'

  // Webcam request patterns
  const webcamPatterns = [
    /video (chat|call|conversation)/i,
    /see (you|me)/i,
    /face to face/i,
    /camera/i,
    /webcam/i,
    /video call/i,
    /visual/i,
  ]
  if (webcamPatterns.some((p) => p.test(content))) return 'WEBCAM_REQUEST'

  // Chart/visualization request patterns
  const chartPatterns = [
    /create (a|an) (chart|graph|visualization)/i,
    /show (me|us) (a|an) (chart|graph)/i,
    /visualize (the|this) data/i,
    /plot (the|this) data/i,
    /bar chart/i,
    /line chart/i,
    /pie chart/i,
    /graph (of|showing)/i,
    /diagram/i,
  ]
  if (chartPatterns.some((p) => p.test(content))) return 'CHART_REQUEST'

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
