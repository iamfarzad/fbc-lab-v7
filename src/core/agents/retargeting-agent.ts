import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import type { AgentContext } from './types'

/**
 * Retargeting Agent - Automated follow-up email generation
 * 
 * Triggered: Scheduled jobs (email failed, no booking, etc.)
 * Generates personalized follow-up emails based on lead data
 */
export async function retargetingAgent({
  leadContext,
  conversationSummary,
  scenario
}: {
  leadContext: any
  conversationSummary: string
  scenario: 'email_failed' | 'no_booking_high_score' | 'no_booking_low_score' | 'proposal_sent'
}) {
  const systemPrompt = `You are F.B/c Retargeting AI - generate follow-up emails.

LEAD INFORMATION:
${JSON.stringify(leadContext, null, 2)}

CONVERSATION SUMMARY:
${conversationSummary}

SCENARIO: ${scenario}

EMAIL GUIDELINES BY SCENARIO:

1. email_failed (retry with slight variation):
   - Same core message
   - Different subject line
   - Add urgency: "Following up..."

2. no_booking_high_score (high-intent lead, needs nudge):
   - Reference specific pain points discussed
   - Create urgency: "Limited slots", "Other companies in [industry] moving"
   - Strong CTA: "Book a free 30-min call this week"
   - Mention multimodal experience if applicable

3. no_booking_low_score (nurture campaign):
   - Soft touch, value-add content
   - "Thought you'd find this case study relevant..."
   - Monthly check-in, no hard sell
   - Keep door open for future

4. proposal_sent (follow-up after proposal):
   - "I sent over the proposal - any questions?"
   - Address common concerns proactively
   - Offer: "Want to hop on a quick call to discuss?"

PERSONALIZATION:
- Use their name and company
- Reference specific things discussed (screen share, pain points)
- Match their communication style (formal vs casual)

OUTPUT FORMAT:
{
  "subject": "Email subject line",
  "body": "Email body with personalization",
  "cta": "Primary call-to-action",
  "timing": "when to send (immediate, 3 days, 1 week, etc.)"
}

TONE: Professional but warm. This is Farzad reaching out, not a marketing bot.`

  const result = await generateText({
    model: google('gemini-2.5-flash'),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate a ${scenario} follow-up email for this lead.` }
    ],
    temperature: 0.7
  })

  // Parse JSON from response
  let email
  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      email = JSON.parse(jsonMatch[0])
    } else {
      throw new Error('No JSON found in email')
    }
  } catch (error) {
    console.error('Failed to parse retargeting email:', error)
    // Fallback email
    email = {
      subject: 'Following up on our AI conversation',
      body: `Hi ${leadContext.name || 'there'},\n\nI wanted to follow up on our recent conversation about AI strategy.\n\nLet me know if you'd like to continue the discussion.\n\nBest,\nFarzad`,
      cta: 'Reply to this email',
      timing: 'immediate'
    }
  }

  return {
    output: JSON.stringify(email, null, 2),
    agent: 'Retargeting Agent',
    model: 'gemini-2.5-flash',
    metadata: {
      stage: 'RETARGETING' as const,
      scenario,
      email,
      scheduledFor: calculateSendTime(scenario)
    }
  }
}

function calculateSendTime(scenario: string): string {
  const now = new Date()
  
  switch (scenario) {
    case 'email_failed':
      // Retry in 1 hour
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString()
    
    case 'no_booking_high_score':
      // Follow up in 3 days
      return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()
    
    case 'no_booking_low_score':
      // Nurture in 1 week
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    
    case 'proposal_sent':
      // Follow up in 2 days
      return new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString()
    
    default:
      return now.toISOString()
  }
}
