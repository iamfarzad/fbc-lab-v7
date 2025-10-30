import { google } from '@ai-sdk/google'
import { streamText } from 'ai'
import { z } from 'zod'
import type { AgentContext, ChatMessage } from './types'
import { GEMINI_MODELS } from '@/config/constants'
import { toolExecutor } from '../tools/tool-executor'

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
      }),
      execute: async (args: { title: string; data: Array<{ label: string; value: number }> }) => {
        const result = await toolExecutor.execute({
          toolName: 'create_chart',
          sessionId: context.sessionId || 'anonymous',
          agent: 'Consulting Sales Agent',
          inputs: args,
          handler: async () => {
            // Tool logic: Create chart visualization
            return {
              type: 'chart',
              title: args.title,
              data: args.data,
              rendered: true
            }
          },
          cacheable: false // Charts are dynamic
        })
        
        if (!result.success) {
          throw new Error(result.error || 'Chart creation failed')
        }
        
        return result.data
      }
    },
    create_calendar_widget: {
      description: 'Embed calendar booking for strategy call with Farzad',
      parameters: z.object({
        title: z.string(),
        description: z.string().optional()
      }),
      execute: async (args: { title: string; description?: string }) => {
        const result = await toolExecutor.execute({
          toolName: 'create_calendar_widget',
          sessionId: context.sessionId || 'anonymous',
          agent: 'Consulting Sales Agent',
          inputs: args,
          handler: async () => {
            // Tool logic: Create calendar widget
            return {
              type: 'calendar_widget',
              title: args.title,
              description: args.description,
              url: 'https://cal.com/farzad/strategy-call',
              rendered: true
            }
          },
          cacheable: false // Calendar widgets are dynamic
        })
        
        if (!result.success) {
          throw new Error(result.error || 'Calendar widget creation failed')
        }
        
        return result.data
      }
    }
  }

  const result = await streamText({
    model: google(GEMINI_MODELS.DEFAULT_CHAT),
    messages,
    system: systemPrompt,
    tools,
    temperature: 0.7
  })

  // Convert stream to text
  let fullText = ''
  for await (const chunk of result.textStream) {
    fullText += chunk
  }

  return {
    output: fullText,
    agent: 'Consulting Sales Agent',
    model: GEMINI_MODELS.DEFAULT_CHAT,
    metadata: {
      stage: 'CONSULTING_PITCH' as const,
      pitchDelivered: true,
      multimodalReferenced: multimodalContext?.hasRecentImages || false
    }
  }
}
