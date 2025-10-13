import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import type { AgentContext, ChatMessage } from './types'

/**
 * Proposal Agent - Generates formal consulting proposals
 * 
 * Triggered: User requests quote OR consulting fit > 0.8 + explicit consent
 * Model: gemini-2.5-pro (needs reliability for pricing)
 * Output: Structured JSON for PDF generation
 */
export async function proposalAgent(
  messages: ChatMessage[],
  context: AgentContext
) {
  const { intelligenceContext, conversationFlow } = context

  const systemPrompt = `You are F.B/c Proposal AI - create formal consulting proposals.

LEAD INFORMATION:
${JSON.stringify(intelligenceContext, null, 2)}

DISCOVERY SUMMARY:
${conversationFlow?.evidence ? JSON.stringify(conversationFlow.evidence).substring(0, 1000) : 'None'}

FULL CONVERSATION:
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

YOUR MISSION:
Create a detailed consulting proposal with accurate scope and pricing.

PROPOSAL STRUCTURE:
{
  "executiveSummary": {
    "client": "${intelligenceContext?.company?.name || 'Client'}",
    "industry": "${intelligenceContext?.company?.industry || 'Industry'}",
    "problemStatement": "<Pain points from discovery>",
    "proposedSolution": "<High-level solution overview>"
  },
  "scopeOfWork": {
    "phases": [
      {
        "name": "Discovery & Planning",
        "duration": "2-3 weeks",
        "deliverables": ["Requirements doc", "Technical architecture", "Project roadmap"]
      },
      {
        "name": "Development & Implementation",
        "duration": "8-12 weeks",
        "deliverables": ["Custom AI system", "API integrations", "Testing"]
      },
      {
        "name": "Deployment & Training",
        "duration": "2-3 weeks",
        "deliverables": ["Production deployment", "Team training", "Documentation"]
      },
      {
        "name": "Support & Optimization",
        "duration": "3 months",
        "deliverables": ["Ongoing support", "Performance tuning", "Feature enhancements"]
      }
    ]
  },
  "timeline": {
    "projectStart": "<Calculate based on current date + 2 weeks>",
    "milestones": ["Phase 1 complete", "MVP launch", "Full deployment"],
    "projectCompletion": "<Calculate based on total duration>"
  },
  "investment": {
    "phase1": <Calculate based on complexity>,
    "phase2": <Calculate based on scope>,
    "phase3": <Calculate based on support>,
    "total": <Sum of all phases>,
    "paymentTerms": "50% upfront, 25% at MVP, 25% at completion"
  },
  "roi": {
    "expectedSavings": "<Annual cost savings>",
    "paybackPeriod": "<Months to ROI>",
    "efficiency": "<Productivity gains>"
  }
}

PRICING GUIDELINES:
Base pricing on complexity and company size:

Small project (MVP/POC):
- Startup/Small: $25K - $40K
- Mid-market: $35K - $50K
- Enterprise: $50K - $75K

Medium project (Full implementation):
- Startup/Small: $50K - $75K
- Mid-market: $75K - $125K
- Enterprise: $125K - $200K

Large project (Complex/Multi-system):
- Startup/Small: $75K - $150K
- Mid-market: $150K - $300K
- Enterprise: $300K - $500K+

Adjust based on:
- Pain point severity (high pain = premium justified)
- Timeline urgency (fast = +20%)
- Team size needing training
- Integration complexity

OUTPUT: Valid JSON only, no explanation.`

  const result = await generateText({
    model: google('gemini-2.5-pro'), // Use Pro for pricing accuracy
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Generate the formal consulting proposal based on the conversation and context.' }
    ],
    temperature: 0.3
  })

  // Parse JSON from response
  let proposal
  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      proposal = JSON.parse(jsonMatch[0])
    } else {
      throw new Error('No JSON found in proposal')
    }
  } catch (error) {
    console.error('Failed to parse proposal:', error)
    // Fallback proposal
    proposal = {
      executiveSummary: {
        client: intelligenceContext?.company?.name || 'Client',
        problemStatement: 'Proposal generation failed',
        proposedSolution: 'Custom AI implementation'
      },
      investment: {
        total: 75000,
        paymentTerms: 'To be discussed'
      }
    }
  }

  return {
    output: JSON.stringify(proposal, null, 2),
    agent: 'Proposal Agent',
    model: 'gemini-2.5-pro',
    metadata: {
      stage: 'PROPOSAL' as const,
      proposal,
      estimatedValue: proposal.investment?.total || 0
    }
  }
}

