import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import type { AgentContext, ChatMessage } from './types'
import { PHRASE_BANK } from '@/core/chat/conversation-phrases'

/**
 * Discovery Agent - Systematically qualifies leads through conversation
 * 
 * Covers 6 categories: goals, pain, data, readiness, budget, success
 * Uses conversation flow to steer questions naturally
 * Multimodal-aware: references voice, screen, webcam, uploads
 */
export async function discoveryAgent(
  messages: ChatMessage[],
  context: AgentContext
) {
  const { intelligenceContext, conversationFlow, multimodalContext, voiceActive } = context

  // Build system prompt with all context
  let systemPrompt = `You are F.B/c Discovery AI - a lead qualification specialist.

INTELLIGENCE CONTEXT:
${intelligenceContext?.name ? `Lead: ${intelligenceContext.name}` : ''}
${intelligenceContext?.company?.name ? `Company: ${intelligenceContext.company.name}` : ''}
${intelligenceContext?.company?.industry ? `Industry: ${intelligenceContext.company.industry}` : ''}
${intelligenceContext?.person?.role ? `Role: ${intelligenceContext.person.role}` : ''}

YOUR MISSION:
Systematically discover lead's needs across 6 categories:
1. GOALS - What are they trying to achieve?
2. PAIN - What's broken/frustrating?
3. DATA - Where is their data? How organized?
4. READINESS - Team buy-in? Change management?
5. BUDGET - Timeline? Investment range?
6. SUCCESS - What metrics matter?

CONVERSATION FLOW STATUS:
${conversationFlow ? formatConversationStatus(conversationFlow) : 'Starting discovery'}

MULTIMODAL AWARENESS:`

  if (multimodalContext?.hasRecentImages) {
    systemPrompt += `\n- Screen/webcam active: Reference specific elements naturally`
    if (multimodalContext.recentAnalyses.length > 0) {
      systemPrompt += `\n  Recent analysis: ${multimodalContext.recentAnalyses[0].substring(0, 150)}...`
    }
  }

  if (multimodalContext?.hasRecentUploads) {
    systemPrompt += `\n- Documents uploaded: Reference insights from uploaded docs`
  }

  if (voiceActive) {
    systemPrompt += `\n- Voice active: Keep responses concise for voice playback (2 sentences max)`
  }

  systemPrompt += `

STYLE:
- Sound like a sharp, friendly consultant (no fluff)
- Two sentences max per turn
- Ask ONE focused question at a time
- Mirror user's language and build on latest turn
- Natural integration of multimodal context:
  ✅ GOOD: "I noticed your dashboard shows revenue declining..."
  ❌ BAD: "Based on the screen share tool output..."

NEXT QUESTION:
${conversationFlow?.recommendedNext ? `Focus on: ${conversationFlow.recommendedNext}` : 'Start with goals'}
${conversationFlow?.recommendedNext && PHRASE_BANK[conversationFlow.recommendedNext] 
  ? `Suggested phrasing: "${PHRASE_BANK[conversationFlow.recommendedNext][0]}"` 
  : ''}

${conversationFlow?.shouldOfferRecap 
  ? 'Deliver a two-sentence recap of what you learned, then ask your next question.' 
  : ''}`

  const result = await generateText({
    model: google('gemini-2.5-flash'),
    messages,
    system: systemPrompt,
    temperature: 0.7,
    maxTokens: 500
  })

  return {
    output: result.text,
    agent: 'Discovery Agent',
    model: 'gemini-2.5-flash',
    metadata: {
      stage: 'DISCOVERY',
      categoriesCovered: conversationFlow 
        ? Object.values(conversationFlow.covered).filter(Boolean).length 
        : 0,
      recommendedNext: conversationFlow?.recommendedNext || null,
      multimodalUsed: multimodalContext?.hasRecentImages || multimodalContext?.hasRecentAudio
    }
  }
}

function formatConversationStatus(flow: any): string {
  const categories = ['goals', 'pain', 'data', 'readiness', 'budget', 'success']
  const covered = categories.filter(cat => flow.covered[cat])
  const pending = categories.filter(cat => !flow.covered[cat])
  
  return `
Covered (${covered.length}/6): ${covered.join(', ')}
Pending: ${pending.join(', ')}
Total user turns: ${flow.totalUserTurns || 0}
${flow.recommendedNext ? `Next recommended: ${flow.recommendedNext}` : 'All categories covered'}
`
}
