import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import type { AgentContext, ChatMessage } from './types'
import { multimodalContextManager } from '@/core/context/multimodal-context'

/**
 * Summary Agent - Analyzes full conversation and generates PDF summary
 * 
 * Triggered when: Conversation ends (goodbye, timeout, limits reached)
 * Analyzes: Full multimodal context + conversation flow + intelligence
 * Output: Structured JSON for PDF generation
 */
export async function summaryAgent(
  messages: ChatMessage[],
  context: AgentContext
) {
  const { sessionId, intelligenceContext, conversationFlow } = context

  // Get full multimodal context
  const multimodalData = await multimodalContextManager.getConversationContext(
    sessionId!,
    true,
    true
  )

  const systemPrompt = `You are F.B/c Summary AI - create executive summaries of discovery conversations.

LEAD INFORMATION:
${JSON.stringify(intelligenceContext, null, 2)}

FULL CONVERSATION:
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

DISCOVERY COVERAGE:
${conversationFlow ? formatDiscoveryStatus(conversationFlow) : 'N/A'}

MULTIMODAL INTERACTION DATA:
Total messages: ${multimodalData.summary.totalMessages}
Modalities used: ${multimodalData.summary.modalitiesUsed.join(', ')}
Voice transcripts: ${multimodalData.audioContext.length} items
Screen/webcam captures: ${multimodalData.visualContext.length} items
Documents uploaded: ${multimodalData.uploadContext.length} items

Recent visual analyses:
${multimodalData.visualContext.map((v, i) => `${i+1}. ${v.analysis.substring(0, 200)}...`).join('\n')}

Recent uploads:
${multimodalData.uploadContext.map((u, i) => `${i+1}. ${u.filename}: ${u.analysis.substring(0, 150)}...`).join('\n')}

YOUR MISSION:
Create a structured summary for the lead to share with stakeholders.

OUTPUT REQUIRED (JSON only):
{
  "executiveSummary": "<2-3 sentences covering what was discussed>",
  "multimodalInteractionSummary": {
    "voice": "<if used: duration and key topics>",
    "screenShare": "<if used: what was shown>",
    "documentsReviewed": ["<filename: key insight>"],
    "engagementScore": "<High/Medium/Low based on multimodal usage>"
  },
  "keyFindings": {
    "goals": "<from discovery>",
    "painPoints": ["<prioritized list>"],
    "currentSituation": "<what they're doing now>",
    "dataReality": "<where their data lives>",
    "teamReadiness": "<change management signals>",
    "budgetSignals": "<timeline and investment indicators>"
  },
  "recommendedSolution": "workshop" | "consulting",
  "solutionRationale": "<why this solution fits>",
  "expectedROI": "<specific outcome projection>",
  "pricingBallpark": "<e.g. $5K-$15K or $50K-$150K>",
  "nextSteps": "<primary CTA: book call, secondary: reply with questions>"
}

TONE: Professional but conversational. This is a valuable document they'll share internally.`

  const result = await generateText({
    model: google('gemini-2.5-pro'), // Use Pro for reliability
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Generate the conversation summary based on all provided context.' }
    ],
    temperature: 0.3
  })

  // Parse JSON from response
  let summary
  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      summary = JSON.parse(jsonMatch[0])
    } else {
      throw new Error('No JSON found in summary')
    }
  } catch (error) {
    console.error('Failed to parse summary:', error)
    // Fallback summary
    summary = {
      executiveSummary: 'Conversation summary generation failed',
      keyFindings: {},
      recommendedSolution: intelligenceContext?.fitScore?.consulting > intelligenceContext?.fitScore?.workshop ? 'consulting' : 'workshop'
    }
  }

  return {
    output: JSON.stringify(summary, null, 2),
    agent: 'Summary Agent',
    model: 'gemini-2.5-pro',
    metadata: {
      stage: 'SUMMARY' as const,
      summary,
      multimodalEngagement: {
        voice: multimodalData.audioContext.length > 0,
        visual: multimodalData.visualContext.length > 0,
        uploads: multimodalData.uploadContext.length > 0
      }
    }
  }
}

function formatDiscoveryStatus(flow: any): string {
  const categories = ['goals', 'pain', 'data', 'readiness', 'budget', 'success']
  return categories.map(cat => 
    `${cat}: ${flow.covered[cat] ? '✅ Covered' : '❌ Not covered'}`
  ).join('\n')
}

