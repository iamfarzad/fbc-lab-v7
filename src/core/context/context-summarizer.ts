import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import { GEMINI_MODELS, CONTEXT_CONFIG } from '@/config/constants'
import type { ConversationEntry } from './context-types'

/**
 * Summarize a window of conversation entries to reduce token usage
 * Used for long discovery calls (100+ messages) that exceed context windows
 */
export async function summarizeConversationWindow(
  entries: ConversationEntry[],
  windowSize: number = CONTEXT_CONFIG.SUMMARIZE_THRESHOLD
): Promise<string> {
  if (entries.length <= windowSize) {
    return '' // No summarization needed
  }

  const entriesToSummarize = entries.slice(0, -windowSize)

  if (entriesToSummarize.length === 0) {
    return ''
  }

  const prompt = `Summarize this business consulting conversation concisely for internal context retention.

${entriesToSummarize.map(e => {
  const speaker = e.metadata?.speaker || 'unknown'
  return `[${e.modality}] ${speaker}: ${e.content}`
}).join('\n')}

Focus on:
- Business problems and pain points discussed
- Solutions and recommendations proposed
- Decisions made or deferred
- Action items mentioned
- Technical requirements or constraints
- Budget or timeline considerations

Keep summary under 500 words, be specific and actionable.`

  try {
    const { text } = await generateText({
      model: google(GEMINI_MODELS.DEFAULT_FAST), // Use fast model for summarization
      prompt,
      temperature: 0.3 // Lower temperature for factual summarization
    })

    console.log(`✅ Summarized ${entriesToSummarize.length} messages into ${text.length} characters`)
    return text
  } catch (err) {
    console.error('Failed to summarize conversation window:', err)
    // Return empty string - summarization is non-critical
    return ''
  }
}

/**
 * Check if conversation needs summarization
 */
export function shouldSummarize(conversationLength: number): boolean {
  return conversationLength > 0 && conversationLength % CONTEXT_CONFIG.SUMMARIZE_THRESHOLD === 0
}

/**
 * Extract existing summaries from conversation history
 */
export function extractSummaries(entries: ConversationEntry[]): string[] {
  return entries
    .filter(e => e.metadata?.type === 'summary')
    .map(e => e.content.replace('[CONTEXT SUMMARY] ', ''))
}

/**
 * Get recent non-summary messages for AI prompt
 */
export function getRecentMessages(entries: ConversationEntry[], limit: number = 30): ConversationEntry[] {
  return entries
    .filter(e => e.metadata?.type !== 'summary')
    .slice(-limit)
}

