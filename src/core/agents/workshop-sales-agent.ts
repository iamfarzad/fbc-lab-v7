import { google } from '@ai-sdk/google'
import { streamText } from 'ai'
import { z } from 'zod'
import type { AgentContext, ChatMessage } from './types'

/**
 * Workshop Sales Agent - Pitches in-person AI workshops
 * 
 * Target: Mid-size companies, team leads/managers, $5K-$15K budget
 * Tools: create_chart (ROI), create_calendar_widget (booking)
 */
export async function workshopSalesAgent(
  messages: ChatMessage[],
  context: AgentContext
) {
  const { intelligenceContext, conversationFlow, multimodalContext } = context

  const systemPrompt = `You are F.B/c Workshop Sales AI - pitch hands-on AI workshops.

LEAD PROFILE:
${JSON.stringify(intelligenceContext, null, 2)}

DISCOVERY INSIGHTS:
${conversationFlow?.evidence ? JSON.stringify(conversationFlow.evidence).substring(0, 800) : 'None'}

MULTIMODAL CONTEXT:
${multimodalContext?.hasRecentImages ? '- Saw their screen/dashboard' : ''}
${multimodalContext?.hasRecentUploads ? '- Reviewed their documents' : ''}

YOUR PITCH STRUCTURE:
1. Acknowledge pain from discovery
   "So you mentioned your team struggles with [X from discovery]..."

2. Position workshop as solution
   "We run hands-on AI workshops where your team learns to [solve X].
    For ${intelligenceContext?.company?.industry || 'your industry'}, we focus on [specific use case]."

3. Show ROI via create_chart tool
   Example: "Training 10 people = $50K in productivity gains over 6 months"

4. Soft CTA
   "Want to see if a workshop makes sense? I can send you details and available dates."

TOOLS AVAILABLE:
- create_chart: Show ROI visualization
- create_calendar_widget: Embed booking when they show interest

CONSTRAINTS:
- Don't mention consulting (that's a different product)
- Keep pricing vague until they book call
- Create urgency: "Next workshop is in [timeframe], spots are limited"
- Reference multimodal moments naturally:
  ✅ "When you showed me your Excel dashboard, I noticed..."
  ❌ "Based on screen share analysis..."

STYLE: Conversational, no fluff, focus on value`

  const tools: any = {
    create_chart: {
      description: 'Create ROI visualization showing workshop value',
      parameters: z.object({
        title: z.string(),
        data: z.array(z.object({
          label: z.string(),
          value: z.number()
        }))
      })
    },
    create_calendar_widget: {
      description: 'Embed calendar booking widget when lead shows interest',
      parameters: z.object({
        title: z.string(),
        description: z.string().optional()
      })
    }
  }

  const result = await streamText({
    model: google('gemini-2.5-flash'),
    messages,
    system: systemPrompt,
    tools,
    temperature: 0.7,
    maxTokens: 600
  })

  // Convert stream to text
  let fullText = ''
  for await (const chunk of result.textStream) {
    fullText += chunk
  }

  return {
    output: fullText,
    agent: 'Workshop Sales Agent',
    model: 'gemini-2.5-flash',
    metadata: {
      stage: 'WORKSHOP_PITCH',
      pitchDelivered: true,
      multimodalReferenced: multimodalContext?.hasRecentImages || false
    }
  }
}
