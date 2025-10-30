import { google } from '@ai-sdk/google'
import { streamText } from 'ai'
import { z } from 'zod'
import type { AgentContext, ChatMessage } from './types'
import { GEMINI_MODELS } from '@/config/constants'
import { toolExecutor } from '../tools/tool-executor'

/**
 * Closer Agent - Handles objections and final push to booking
 * 
 * Triggered when: Interest shown but no calendar click
 * Uses multimodal experience as proof of capabilities
 */
export async function closerAgent(
  messages: ChatMessage[],
  context: AgentContext
) {
  const { intelligenceContext, multimodalContext } = context

  const systemPrompt = `You are F.B/c Closer AI - handle objections and close the deal.

LEAD PROFILE:
${JSON.stringify(intelligenceContext, null, 2)}

MULTIMODAL EXPERIENCE:
Voice used: ${multimodalContext?.hasRecentAudio ? 'Yes - ' + (context.voiceActive ? 'Currently active' : 'Used earlier') : 'No'}
Screen shared: ${multimodalContext?.hasRecentImages ? 'Yes - They showed us their systems' : 'No'}
Documents uploaded: ${multimodalContext?.hasRecentUploads ? 'Yes - ' + multimodalContext.recentUploads.join(', ') : 'No'}

COMMON OBJECTIONS & RESPONSES:

1. "Too expensive"
   → Show ROI chart breaking down cost over time
   → "This pays for itself in [X months] through [specific savings]"

2. "Need to think about it"
   → Create urgency: "Limited slots", "Other companies in [industry] moving fast"
   → "What specific concerns can I address now?"

3. "Need to talk to team"
   → Offer: "Bring your team to the strategy call - no commitment"
   → Use multimodal proof: "Just like we did with voice/screen in this conversation"

4. "Not sure if it'll work"
   → Reference case studies: "We did this for [similar company], they saw [result]"
   → Use their multimodal experience: "You experienced our AI capabilities firsthand in this chat"

TOOLS AVAILABLE:
- create_chart: Show cost/benefit analysis
- create_calendar_widget: Final CTA - make booking frictionless

CLOSING TACTICS:
- Use the multimodal experience as proof:
  "You've seen what AI can do - we had a voice conversation, I analyzed your screen,
   this is what we build for clients."
- Create FOMO: "Next available slot is [timeframe]"
- Remove friction: "Free 30-min call, no obligation"

STYLE: Confident, direct, use their own experience as the close`

  const tools: any = {
    create_chart: {
      description: 'Show cost vs benefit analysis',
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
          agent: 'Closer Agent',
          inputs: args,
          handler: async () => {
            return {
              type: 'chart',
              title: args.title,
              data: args.data,
              rendered: true
            }
          },
          cacheable: false
        })
        
        if (!result.success) {
          throw new Error(result.error || 'Chart creation failed')
        }
        
        return result.data
      }
    },
    create_calendar_widget: {
      description: 'Embed final booking CTA',
      parameters: z.object({
        title: z.string(),
        description: z.string().optional()
      }),
      execute: async (args: { title: string; description?: string }) => {
        const result = await toolExecutor.execute({
          toolName: 'create_calendar_widget',
          sessionId: context.sessionId || 'anonymous',
          agent: 'Closer Agent',
          inputs: args,
          handler: async () => {
            return {
              type: 'calendar_widget',
              title: args.title,
              description: args.description,
              url: 'https://cal.com/farzad/strategy-call',
              rendered: true
            }
          },
          cacheable: false
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
    agent: 'Closer Agent',
    model: GEMINI_MODELS.DEFAULT_CHAT,
    metadata: {
      stage: 'CLOSING' as const,
      objectionHandled: true,
      multimodalProofUsed: multimodalContext?.hasRecentAudio || multimodalContext?.hasRecentImages
    }
  }
}
