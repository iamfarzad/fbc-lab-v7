import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import type { ChatMessage } from './types'
import { supabaseService } from '@/core/supabase/client'

/**
 * Admin AI Agent - Farzad's business intelligence assistant
 * 
 * Separate from lead funnel - helps analyze conversations and draft follow-ups
 * Has access to: All conversations, lead scores, semantic search
 */
export async function adminAgent(
  messages: ChatMessage[],
  context: {
    sessionId: string
    adminId?: string
  }
) {
  // Get recent conversations for context with timeout protection
  let recentConversations: any[] = []
  let dbStatus = 'unknown'
  
  try {
    // Add timeout protection for Supabase query
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database query timeout after 5 seconds')), 5000)
    })
    
    const queryPromise = supabaseService
      .from('conversations')
      .select('id, name, email, summary, lead_score, research_json, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    const { data } = await Promise.race([queryPromise, timeoutPromise]) as any
    recentConversations = data || []
    dbStatus = 'connected'
    
  } catch (error) {
    console.warn('Failed to load conversations for admin agent:', error)
    dbStatus = 'failed'
    
    // Provide mock data when database fails
    recentConversations = [
      {
        id: 'mock-1',
        name: 'John Doe',
        email: 'john@example.com',
        summary: 'Interested in AI dashboard solutions',
        lead_score: 85,
        research_json: null,
        created_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
      },
      {
        id: 'mock-2',
        name: 'Jane Smith',
        email: 'jane@company.com',
        summary: 'Exploring workflow automation',
        lead_score: 92,
        research_json: null,
        created_at: new Date(Date.now() - 172800000).toISOString() // 2 days ago
      }
    ]
  }

  const systemPrompt = `You are F.B/c Admin AI - Farzad Bayat's business intelligence assistant.

YOUR ROLE:
Help Farzad understand leads, draft follow-ups, and prioritize opportunities.

DATABASE STATUS: ${dbStatus === 'connected' ? '✅ Connected to live database' : '⚠️ Using sample data (database unavailable)'}

YOU HAVE ACCESS TO:
${recentConversations.length > 0 ? `Recent conversations (${recentConversations.length}):
${recentConversations.map((c, i) => `
${i+1}. ${c.name} (${c.email}) - Score: ${c.lead_score || 'N/A'}/100
   Summary: ${c.summary?.substring(0, 150) || 'No summary'}...
   Date: ${new Date(c.created_at).toLocaleDateString()}
`).join('\n')}` : 'No recent conversations'}

${dbStatus === 'failed' ? `
NOTE: Database connection failed - showing sample data.
You can still provide insights and draft emails based on the sample conversations above.
` : ''}

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
    model: google('gemini-2.5-pro'), // Admin needs reliability
    messages,
    system: systemPrompt,
    temperature: 0.5
  })

  return {
    output: result.text,
    agent: 'Admin AI Agent',
    model: 'gemini-2.5-pro',
    metadata: {
      stage: 'ADMIN' as const,
      conversationsAnalyzed: recentConversations.length,
      databaseStatus: dbStatus,
      usingMockData: dbStatus === 'failed'
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
  leadId,
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
    model: google('gemini-2.5-flash'),
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
