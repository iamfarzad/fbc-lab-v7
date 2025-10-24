import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import type { ChatMessage } from './types'
import { supabaseService } from '@/core/supabase/client'
import { GEMINI_MODELS } from '@/config/constants'

/**
 * Admin AI Agent - Farzad's business intelligence assistant
 * 
 * Separate from lead funnel - helps analyze conversations and draft follow-ups
 * Has access to: All conversations, lead scores, semantic search
 */
export async function adminAgent(
  messages: ChatMessage[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context: {
    sessionId: string
    adminId?: string
  }
) {
  // Get recent conversations for context
  let recentConversations: any[] = []
  try {
    const { data } = await supabaseService
      .from('conversations')
      .select('id, name, email, summary, lead_score, research_json, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    recentConversations = data || []
  } catch (error) {
    console.warn('Failed to load conversations for admin agent:', error)
  }

  const systemPrompt = `You are F.B/c Admin AI - Farzad Bayat's business intelligence assistant.

YOUR ROLE:
Help Farzad understand leads, draft follow-ups, and prioritize opportunities.

YOU HAVE ACCESS TO:
${recentConversations.length > 0 ? `Recent conversations (${recentConversations.length}):
${recentConversations.map((c, i) => `
${i+1}. ${c.name} (${c.email}) - Score: ${c.lead_score || 'N/A'}/100
   Summary: ${c.summary?.substring(0, 150) || 'No summary'}...
   Date: ${new Date(c.created_at).toLocaleDateString()}
`).join('\n')}` : 'No recent conversations'}

CAPABILITIES:
1. Search conversations: "Show me healthcare leads from last week"
2. Draft emails: "Draft follow-up for [name] mentioning their dashboard"
3. Provide insights: "Which leads mentioned budget above $50K?"
4. Prioritize: "Show high-score leads who haven't booked"

COMMON QUERIES:
- "Show me leads who used screen share" → Filter by multimodal usage
- "Which leads are consulting fit?" → Filter by fit scores
- "Draft email for John" → Generate personalized follow-up
- "Summarize today's conversations" → Aggregate insights

STYLE:
Data-driven, concise, actionable. Provide specific numbers and names.

RESPONSE FORMAT:
If data query: Return structured list with scores/dates
If email draft: Subject + body with personalization
If insight: Summary with key metrics`

  const result = await generateText({
    model: google(GEMINI_MODELS.PRO), // Admin needs reliability
    messages,
    system: systemPrompt,
    temperature: 0.5
  })

  return {
    output: result.text,
    agent: 'Admin AI Agent',
    model: GEMINI_MODELS.PRO,
    metadata: {
      stage: 'ADMIN' as const,
      conversationsAnalyzed: recentConversations.length
    }
  }
}

/**
 * Helper: Search conversations by criteria
 */
export async function searchConversations(query: {
  industry?: string
  minScore?: number
  multimodalUsed?: boolean
  dateRange?: { start: Date; end: Date }
  limit?: number
}): Promise<any[]> {
  try {
    let supabaseQuery = supabaseService
      .from('conversations')
      .select('*')
      .order('lead_score', { ascending: false })

    if (query.minScore) {
      supabaseQuery = supabaseQuery.gte('lead_score', query.minScore)
    }

    if (query.dateRange) {
      supabaseQuery = supabaseQuery
        .gte('created_at', query.dateRange.start.toISOString())
        .lte('created_at', query.dateRange.end.toISOString())
    }

    if (query.limit) {
      supabaseQuery = supabaseQuery.limit(query.limit)
    }

    const { data, error } = await supabaseQuery

    if (error) throw error

    // Filter by industry if specified (from research_json)
    if (query.industry && data) {
      return data.filter((conv: any) => 
        conv.research_json?.company?.industry?.toLowerCase().includes(query.industry!.toLowerCase())
      )
    }

    return data || []

  } catch (error) {
    console.error('Search conversations failed:', error)
    return []
  }
}

/**
 * Helper: Draft follow-up email for a lead
 */
export async function draftFollowUpEmail({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  leadId: _leadId,
  leadName,
  conversationSummary,
  specificMention
}: {
  leadId: string
  leadName: string
  conversationSummary: string
  specificMention?: string
}): Promise<{ subject: string; body: string }> {
  const prompt = `Draft a professional follow-up email for:

Lead: ${leadName}
Conversation Summary: ${conversationSummary}
${specificMention ? `Mention specifically: ${specificMention}` : ''}

Email should:
- Reference specific pain points discussed
- Offer next steps (call, demo, proposal)
- Keep it concise (3-4 sentences)
- Conversational but professional

Output format:
Subject: [subject line]

Body:
[email body]`

  const result = await generateText({
    model: google(GEMINI_MODELS.DEFAULT_CHAT),
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7
  })

  // Parse subject and body
  const lines = result.text.split('\n')
  const subjectLine = lines.find(l => l.startsWith('Subject:'))?.replace('Subject:', '').trim() || 'Follow-up: AI Strategy Discussion'
  const bodyStart = lines.findIndex(l => l.toLowerCase().includes('body:'))
  const body = bodyStart >= 0 ? lines.slice(bodyStart + 1).join('\n').trim() : result.text

  return {
    subject: subjectLine,
    body
  }
}
