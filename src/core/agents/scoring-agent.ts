import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import type { AgentContext, ChatMessage } from './types'

/**
 * Scoring Agent - Calculates lead score (0-100) and fit scores
 * 
 * Base scoring: role, company, conversation quality, budget signals
 * Multimodal bonuses: voice (+10), screen (+15), webcam (+5), uploads (+10)
 */
export async function scoringAgent(
  _messages: ChatMessage[],
  context: AgentContext
) {
  const { intelligenceContext, conversationFlow, multimodalContext } = context

  const systemPrompt = `You are F.B/c Scoring AI - calculate lead scores.

LEAD INTELLIGENCE:
${JSON.stringify(intelligenceContext, null, 2)}

CONVERSATION DATA:
Categories covered: ${conversationFlow ? Object.values(conversationFlow.covered).filter(Boolean).length : 0}/6
User turns: ${conversationFlow?.totalUserTurns || 0}
Evidence: ${conversationFlow?.evidence ? JSON.stringify(conversationFlow.evidence).substring(0, 500) : 'None'}

MULTIMODAL ENGAGEMENT:
Voice used: ${multimodalContext?.hasRecentAudio ? 'Yes' : 'No'}
Screen shared: ${multimodalContext?.hasRecentImages ? 'Yes' : 'No'}
Documents uploaded: ${multimodalContext?.hasRecentUploads ? 'Yes' : 'No'}

SCORING CRITERIA:

1. Role Seniority (30 points max):
   - C-level/Founder: 30
   - VP/Director: 20
   - Manager: 10
   - Individual contributor: 5

2. Company Signals (25 points max):
   - Enterprise (500+ employees): 25
   - Mid-market (50-500): 15
   - Small (10-50): 10
   - Startup (<10): 5

3. Conversation Quality (25 points max):
   - All 6 categories covered: 25
   - 4-5 categories: 15
   - 2-3 categories: 10
   - 1 category: 5

4. Budget Signals (20 points max):
   - Explicit budget mentioned: 20
   - Timeline urgency (Q1/Q2): 15
   - Just exploring: 5

MULTIMODAL BONUSES:
- Voice used: +10 points (commitment signal)
- Screen shared: +15 points (HIGH INTENT - showing pain points)
- Webcam shown: +5 points (comfort/trust)
- Documents uploaded: +10 points (prepared/serious)

FIT SCORING (0.0 - 1.0):

Workshop fit indicators:
- Manager/Team Lead role (not C-level)
- Mid-size company (50-500 employees)
- Mentions: "training", "teach team", "upskilling", "workshop"
- Budget range: $5K-$15K signals

Consulting fit indicators:
- C-level/VP role
- Enterprise or well-funded startup
- Mentions: "custom build", "implementation", "integrate", "scale"
- Budget range: $50K+ signals

OUTPUT REQUIRED (JSON only, no explanation):
{
  "leadScore": <number 0-100>,
  "fitScore": {
    "workshop": <number 0.0-1.0>,
    "consulting": <number 0.0-1.0>
  },
  "reasoning": "<one sentence explanation>"
}`

  const result = await generateText({
    model: google('gemini-2.5-flash'),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Calculate the lead score and fit scores based on the provided context.' }
    ],
    temperature: 0.3
  })

  // Parse JSON from response
  let scores
  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      scores = JSON.parse(jsonMatch[0])
    } else {
      // Fallback scores
      scores = {
        leadScore: 50,
        fitScore: { workshop: 0.5, consulting: 0.5 },
        reasoning: 'Could not parse scores'
      }
    }
  } catch (error) {
    console.error('Failed to parse scoring result:', error)
    scores = {
      leadScore: 50,
      fitScore: { workshop: 0.5, consulting: 0.5 },
      reasoning: 'Parsing error'
    }
  }

  return {
    output: `Lead Score: ${scores.leadScore}/100\nWorkshop Fit: ${(scores.fitScore.workshop * 100).toFixed(0)}%\nConsulting Fit: ${(scores.fitScore.consulting * 100).toFixed(0)}%\n\n${scores.reasoning}`,
    agent: 'Scoring Agent',
    model: 'gemini-2.5-flash',
    metadata: {
      stage: 'SCORING' as const,
      leadScore: scores.leadScore,
      fitScore: scores.fitScore,
      reasoning: scores.reasoning
    }
  }
}
