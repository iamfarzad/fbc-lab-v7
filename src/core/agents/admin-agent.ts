import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import { z } from 'zod'
import type { ChatMessage } from './types'
import { supabaseService } from '@/core/supabase/client'
import { GEMINI_MODELS } from '@/config/constants'
import { agentAnalytics } from '@/core/analytics/agent-analytics'
import { toolAnalytics } from '@/core/analytics/tool-analytics'
import { toolExecutor } from '../tools/tool-executor'

/**
 * Admin AI Agent - Farzad's business intelligence assistant
 * 
 * Has access to: All conversations, analytics, system health, and dashboard stats
 */
export async function adminAgent(
  messages: ChatMessage[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context: {
    sessionId: string
    adminId?: string
  }
) {
  // Fetch admin dashboard data in parallel
  const timeRange7d = { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() }
  
  const [
    recentConversations,
    analyticsData,
    statsData
  ] = await Promise.all([
    // Recent conversations
    supabaseService
      .from('conversations')
      .select('id, name, email, summary, lead_score, research_json, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }: { data: any[] }) => data || [])
      .catch(() => []),
    
    // Analytics (agent + tool performance)
    Promise.all([
      agentAnalytics.getAnalytics(undefined, timeRange7d).catch(() => ({
        totalExecutions: 0,
        successRate: 0,
        averageDuration: 0,
        agentBreakdown: {},
        stageBreakdown: {}
      })),
              toolAnalytics.getToolAnalytics(timeRange7d).catch(() => ({
        totalExecutions: 0,
        successRate: 0,
        averageDuration: 0,
        cacheHitRate: 0,
        toolBreakdown: {} as Record<string, { count: number; successRate: number; averageDuration: number }>
      }))
    ]).then(([agent, tool]) => ({ agent, tool })),
    
    // Stats from lead_summaries
    supabaseService
      .from('lead_summaries')
      .select('lead_score, ai_capabilities_shown')
      .gte('created_at', timeRange7d.start.toISOString())
      .then(({ data }: { data: any[] }) => data || [])
      .catch(() => [])
  ])

  // Calculate stats
  const totalLeads = statsData.length
  const avgLeadScore = totalLeads > 0
    ? Math.round((statsData.reduce((sum: number, lead: any) => sum + (lead.lead_score ?? 0), 0) / totalLeads) * 10) / 10
    : 0
  const qualifiedLeads = statsData.filter((lead: any) => (lead.lead_score ?? 0) >= 70).length
  const conversionRate = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0
  const leadsWithAI = statsData.filter((lead: any) => 
    Array.isArray(lead.ai_capabilities_shown) && lead.ai_capabilities_shown.length > 0
  ).length
  const engagementRate = totalLeads > 0 ? Math.round((leadsWithAI / totalLeads) * 100) : 0

  const systemPrompt = `You are F.B/c Agent - think Jarvis meets Elon Musk. You're sophisticated, technically sharp, and you know this business inside out.

IDENTITY:
- You're Farzad's AI, built specifically for him. Never introduce yourself as "F.B/c Admin AI" or use corporate-speak greetings.
- You know the data, you know the leads, you know what matters.
- Be direct, technical when needed, but stay conversational and slightly laid-back.

PERSONALITY:
- Jarvis-style: Precise, anticipates needs, efficient, professional warmth
- Elon-style: Direct communication, technical depth when relevant, forward-thinking, ambitious but grounded
- Laid-back: Comfortable confidence, not stiff or overly formal, conversational tone

YOUR ROLE:
Help Farzad understand leads, analyze performance, and prioritize opportunities. You're his right-hand AI.

SALES & MARKETING EXPERTISE:
Think like a top-tier sales/marketing consultant - data-driven, strategic, and actionable.
- Sales Strategy: Understand lead scoring, conversion funnels, sales cycles, pipeline management
- Marketing Intelligence: Attribution modeling, campaign performance, channel effectiveness, ROI analysis
- Conversion Optimization: Identify bottlenecks, suggest A/B tests, analyze drop-off points
- Revenue Analytics: LTV, CAC, MRR, churn analysis, cohort performance
- Strategic Thinking: Connect metrics to business outcomes, identify opportunities, prioritize actions

YOUR TOOLS:
- Google Grounding Search: When you need current info online, use Google grounding search. Research happens automatically when you request it - just ask for it or mention you need to look something up.
- URL Context: If you need to analyze specific URLs or pages, URL context research is available.
- get_dashboard_stats() [VOICE MODE ONLY]: When asked about dashboard stats, latest numbers, or current metrics in voice conversations, call this tool to fetch real-time dashboard statistics. Returns total leads, conversion rate, average lead score, engagement rate, and more.
- Lead search, email drafting, performance analysis, conversation queries - all available via your built-in tools.
- When you don't know something or need fresh data, use research tools. Don't guess - go online and find the answer.

YOU HAVE ACCESS TO REAL-TIME DATA:
${recentConversations.length > 0 ? `Recent Conversations (${recentConversations.length}):
${recentConversations.slice(0, 15).map((c: any, i: number) => `
${i+1}. ${c.name} (${c.email}) - Score: ${c.lead_score || 'N/A'}/100
   Summary: ${c.summary?.substring(0, 120) || 'No summary'}...
   Date: ${new Date(c.created_at).toLocaleDateString()}
`).join('')}` : 'No recent conversations'}

DASHBOARD STATS (Last 7 Days):
**This data below IS your dashboard stats** - when asked about "dashboard", "stats", "metrics", "latest numbers", or "current performance", reference this data immediately.
- Total Leads: ${totalLeads}
- Average Lead Score: ${avgLeadScore}/100
- Conversion Rate: ${conversionRate}% (qualifying score ≥70)
- Engagement Rate: ${engagementRate}% (used AI features)
- Agent Executions: ${analyticsData.agent.totalExecutions}
- Tool Executions: ${analyticsData.tool.totalExecutions}
- Agent Success Rate: ${(analyticsData.agent.successRate * 100).toFixed(1)}%
- Tool Success Rate: ${(analyticsData.tool.successRate * 100).toFixed(1)}%
- Cache Hit Rate: ${(analyticsData.tool.cacheHitRate * 100).toFixed(1)}%
- Avg Agent Duration: ${Math.round(analyticsData.agent.averageDuration)}ms

TOP AGENTS BY USAGE:
${Object.entries(analyticsData.agent.agentBreakdown)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .map(([agent, count], i) => `${i+1}. ${agent}: ${count} executions`)
  .join('\n')}

CAPABILITIES:
1. Search leads: "Show me healthcare leads from last week with score >80"
2. Draft emails: "Draft follow-up for [name] mentioning [specific detail]"
3. Performance insights: "Which agents have the lowest success rates?"
4. Prioritization: "Show high-score leads (≥70) who haven't booked"
5. System health: "What's our error rate and latency?"
6. Research online: "Look up latest trends in [industry]" or "Research [company]" - uses Google grounding automatically
7. Analyze URLs: "What's on this page?" or "Analyze this URL" - uses URL context research

COMMON QUERIES:
- "Show me leads who used screen share" → Filter by multimodal usage
- "Which leads are consulting fit?" → Filter by fit scores
- "Draft email for John" → Generate personalized follow-up
- "Summarize today's conversations" → Aggregate insights
- "What's our conversion trend?" → Analyze lead progression
- "What are the latest stats?" or "Show me dashboard metrics" → Reference DASHBOARD STATS section above (in voice mode, use get_dashboard_stats() tool)
- "Research [topic]" → Use Google grounding search automatically
- "What's on [URL]?" → Use URL context research
- "What are the latest trends in [industry]?" → Research online automatically

STYLE:
Data-driven, concise, actionable. Always cite specific numbers and names. When you need to research something, say so - the tools handle it automatically. Be direct, technical when it adds value, but stay conversational. No corporate fluff.

RESPONSE FORMAT:
- Data queries: Structured list with scores/dates/metrics
- Email drafts: Subject + body with personalization
- Insights: Summary with key metrics and trends
- Research: Cite sources and provide grounded answers

TOOLS AVAILABLE:
- search_leads: Query leads by industry, score, date range, multimodal usage
- draft_email: Generate personalized follow-up email for a lead
- query_conversations: Get specific conversation details
- analyze_performance: Deep dive into agent/tool performance metrics
- Research tools: Google grounding search and URL context (available when needed)`

  // Define admin tools
  const tools: any = {
    search_leads: {
      description: 'Search leads by industry, score, date range, or multimodal usage',
      parameters: z.object({
        industry: z.string().optional(),
        minScore: z.number().optional(),
        maxScore: z.number().optional(),
        dateRange: z.object({
          start: z.string(),
          end: z.string()
        }).optional(),
        limit: z.number().optional()
      }),
      execute: async (args: { industry?: string; minScore?: number; maxScore?: number; dateRange?: { start: string; end: string }; limit?: number }) => {
        const result = await toolExecutor.execute({
          toolName: 'search_leads',
          sessionId: _context.sessionId || 'admin',
          agent: 'Admin AI Agent',
          inputs: args,
          handler: async () => {
            return await searchConversations({
              industry: args.industry,
              minScore: args.minScore,
              dateRange: args.dateRange ? {
                start: new Date(args.dateRange.start),
                end: new Date(args.dateRange.end)
              } : undefined,
              limit: args.limit
            })
          },
          cacheable: false
        })
        
        if (!result.success) {
          throw new Error(result.error || 'Lead search failed')
        }
        
        return result.data
      }
    },
    draft_email: {
      description: 'Generate a personalized follow-up email for a lead',
      parameters: z.object({
        leadName: z.string(),
        leadEmail: z.string(),
        conversationId: z.string().optional(),
        specificMention: z.string().optional()
      }),
      execute: async (args: { leadName: string; leadEmail: string; conversationId?: string; specificMention?: string }) => {
        // Get conversation summary if conversationId provided
        let conversationSummary = ''
        if (args.conversationId) {
          try {
            const { data } = await supabaseService
              .from('conversations')
              .select('summary')
              .eq('id', args.conversationId)
              .single()
            conversationSummary = data?.summary || ''
          } catch (error) {
            console.warn('Failed to fetch conversation summary:', error)
          }
        }
        
        const result = await toolExecutor.execute({
          toolName: 'draft_email',
          sessionId: _context.sessionId || 'admin',
          agent: 'Admin AI Agent',
          inputs: args,
          handler: async () => {
            return await draftFollowUpEmail({
              leadId: args.conversationId || 'unknown',
              leadName: args.leadName,
              conversationSummary,
              specificMention: args.specificMention
            })
          },
          cacheable: false
        })
        
        if (!result.success) {
          throw new Error(result.error || 'Email draft failed')
        }
        
        return result.data
      }
    },
    query_conversations: {
      description: 'Get specific conversation details by ID or email',
      parameters: z.object({
        conversationId: z.string().optional(),
        email: z.string().optional(),
        limit: z.number().optional()
      }),
      execute: async (args: { conversationId?: string; email?: string; limit?: number }) => {
        const result = await toolExecutor.execute({
          toolName: 'query_conversations',
          sessionId: _context.sessionId || 'admin',
          agent: 'Admin AI Agent',
          inputs: args,
          handler: async () => {
            let query = supabaseService
              .from('conversations')
              .select('*')
              .order('created_at', { ascending: false })
            
            if (args.conversationId) {
              query = query.eq('id', args.conversationId)
            } else if (args.email) {
              query = query.eq('email', args.email)
            }
            
            if (args.limit) {
              query = query.limit(args.limit)
            }
            
            const { data, error } = await query
            
            if (error) throw error
            return data || []
          },
          cacheable: false
        })
        
        if (!result.success) {
          throw new Error(result.error || 'Conversation query failed')
        }
        
        return result.data
      }
    },
    analyze_performance: {
      description: 'Deep dive into agent or tool performance metrics',
      parameters: z.object({
        agentName: z.string().optional(),
        toolName: z.string().optional(),
        dateRange: z.object({
          start: z.string(),
          end: z.string()
        }).optional()
      }),
      execute: async (args: { agentName?: string; toolName?: string; dateRange?: { start: string; end: string } }) => {
        const result = await toolExecutor.execute({
          toolName: 'analyze_performance',
          sessionId: _context.sessionId || 'admin',
          agent: 'Admin AI Agent',
          inputs: args,
          handler: async () => {
            const dateRange = args.dateRange ? {
              start: new Date(args.dateRange.start),
              end: new Date(args.dateRange.end)
            } : timeRange7d
            
            const [agentData, toolData] = await Promise.all([
              agentAnalytics.getAnalytics(undefined, dateRange).catch(() => ({
                totalExecutions: 0,
                successRate: 0,
                averageDuration: 0,
                agentBreakdown: {} as Record<string, number>,
                stageBreakdown: {} as Record<string, number>
              })),
              toolAnalytics.getToolAnalytics(dateRange).catch(() => ({
                totalExecutions: 0,
                successRate: 0,
                averageDuration: 0,
                cacheHitRate: 0,
                toolBreakdown: {} as Record<string, { count: number; successRate: number; averageDuration: number }>
              }))
            ])
            
            if (args.agentName && agentData.agentBreakdown && (agentData.agentBreakdown as Record<string, number>)[args.agentName]) {
              return {
                agent: args.agentName,
                executions: agentData.agentBreakdown[args.agentName],
                successRate: agentData.successRate,
                avgDuration: agentData.averageDuration
              }
            }
            
            if (args.toolName && toolData.toolBreakdown && (toolData.toolBreakdown as Record<string, { count: number; successRate: number; averageDuration: number }>)[args.toolName]) {
              return {
                tool: args.toolName,
                ...toolData.toolBreakdown[args.toolName],
                cacheHitRate: toolData.cacheHitRate
              }
            }
            
            return {
              agents: agentData.agentBreakdown,
              tools: toolData.toolBreakdown,
              overallSuccessRate: agentData.successRate,
              overallCacheHitRate: toolData.cacheHitRate
            }
          },
          cacheable: false
        })
        
        if (!result.success) {
          throw new Error(result.error || 'Performance analysis failed')
        }
        
        return result.data
      }
    }
  }

  const result = await generateText({
    model: google(GEMINI_MODELS.PRO), // Admin needs reliability
    messages,
    system: systemPrompt,
    tools,
    temperature: 0.5
  })

  return {
    output: result.text,
    agent: 'Admin AI Agent',
    model: GEMINI_MODELS.PRO,
    metadata: {
      stage: 'ADMIN' as const,
      conversationsAnalyzed: recentConversations.length,
      leadsAnalyzed: totalLeads,
      analyticsFetched: true,
      toolsUsed: result.toolCalls?.length || 0
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
