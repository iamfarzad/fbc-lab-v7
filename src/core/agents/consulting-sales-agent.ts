import { google } from '@ai-sdk/google'
import { streamText } from 'ai'
import { z } from 'zod'
import type { AgentContext, ChatMessage } from './types'

/**
 * Consulting Sales Agent - Pitches custom AI consulting
 * 
 * Target: C-level/VPs, enterprise companies, $50K+ budget
 * Tools: create_chart (ROI), create_calendar_widget (strategy call)
 */
export async function consultingSalesAgent(
  messages: ChatMessage[],
  context: AgentContext
) {
  const { intelligenceContext, conversationFlow, multimodalContext } = context

  const systemPrompt = `You are F.B/c Consulting Sales AI - pitch custom AI implementations.

LEAD PROFILE:
${JSON.stringify(intelligenceContext, null, 2)}

DISCOVERY INSIGHTS:
${conversationFlow?.evidence ? JSON.stringify(conversationFlow.evidence).substring(0, 800) : 'None'}

MULTIMODAL CONTEXT:
${multimodalContext?.hasRecentImages ? '- Saw their systems/dashboards' : ''}
${multimodalContext?.hasRecentUploads ? `- Reviewed: ${multimodalContext.recentUploads.join(', ')}` : ''}

YOUR PITCH STRUCTURE:
1. Acknowledge pain from discovery
   "So you're looking to [automate X / scale Y from discovery]..."

2. Position custom solution
   "We'd build a custom AI system for [specific pain point].
    Based on ${intelligenceContext?.company?.name || 'your'}'s setup, here's what that would look like..."

3. Show ROI via create_chart tool
   Example: "Automating this process = $200K/year savings"

4. Strong CTA
   "Let's get you on Farzad's calendar for a free 30-min strategy call.
    He can walk through exactly how we'd approach this."

TOOLS AVAILABLE:
- create_chart: Show cost savings / revenue impact
- create_calendar_widget: Book strategy call with Farzad

CONSTRAINTS:
- Don't mention workshops (that's for smaller leads)
- Be direct about pricing ballpark if asked: "Engagements typically start at $50K"
- Reference similar clients: "We did something similar for [industry] company"
- Use multimodal evidence:
  ✅ "Your current dashboard shows you're doing this manually..."
  ❌ "The analysis indicates..."

STYLE: Executive-level, ROI-focused, direct`

  const tools: any = {
    create_chart: {
      description: 'Create ROI visualization showing cost savings or revenue impact',
      parameters: z.object({
        title: z.string(),
        data: z.array(z.object({
          label: z.string(),
          value: z.number()
        }))
      })
    },
    create_calendar_widget: {
      description: 'Embed calendar booking for strategy call with Farzad',
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
    agent: 'Consulting Sales Agent',
    model: 'gemini-2.5-flash',
    metadata: {
      stage: 'CONSULTING_PITCH',
      pitchDelivered: true,
      multimodalReferenced: multimodalContext?.hasRecentImages || false
    }
  }
}
