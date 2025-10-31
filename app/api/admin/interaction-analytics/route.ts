import { NextRequest } from 'next/server'
import { respond } from '@/lib/api/response'
import { adminAuthMiddleware } from '@/app/api-utils/auth'
import { adminRateLimit } from '@/app/api-utils/rate-limiting'
import { supabaseService } from '@/src/core/supabase/client'

function ensureSupabase() {
  const supabase = supabaseService
  if (!supabase || typeof (supabase as any)?.from !== 'function') {
    throw new Error('Supabase service client unavailable. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  }
  return supabase
}

export async function GET(request: NextRequest) {
  const hasSupabaseEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  if (!hasSupabaseEnv) {
    return respond.ok({ disabled: true, message: 'Admin features require Supabase configuration' })
  }

  const rateLimitResult = adminRateLimit(request)
  if (rateLimitResult) {
    return rateLimitResult
  }

  const authResult = await adminAuthMiddleware(request)
  if (authResult) {
    return authResult
  }

  try {
    const supabase = ensureSupabase()
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d'

    // Calculate date range
    const now = new Date()
    let startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    if (period === '7d') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (period === '90d') {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    } else if (period === '1y') {
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    }

    // Get conversations data
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .gte('created_at', startDate.toISOString())

    if (convError) {
      console.error('Error fetching conversations:', convError)
      return respond.serverError('Failed to fetch interaction analytics')
    }

    // Calculate business metrics
    const totalConversations = conversations?.length || 0
    const totalLeads = new Set(conversations?.map((c: any) => c.email).filter(Boolean)).size
    
    // Lead score distribution
    const leadScores = conversations?.map((c: any) => c.lead_score).filter((score: any) => score !== null) || []
    const avgLeadScore = leadScores.length > 0
      ? leadScores.reduce((sum: number, score: number) => sum + score, 0) / leadScores.length
      : 0

    const highScoreLeads = leadScores.filter((score: number) => score >= 70).length
    const mediumScoreLeads = leadScores.filter((score: number) => score >= 50 && score < 70).length
    const lowScoreLeads = leadScores.filter((score: number) => score < 50).length

    // Conversion metrics (meetings booked, emails sent)
    const { count: meetingsCount } = await supabase
      .from('meetings')
      .select('*', { count: 'exact', head: true })
      .gte('scheduled_at', startDate.toISOString())
      .eq('status', 'scheduled')

    const { count: emailsSent } = await supabase
      .from('email_campaigns')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
      .eq('status', 'sent')

    // Daily trends
    const dailyTrends: Record<string, { conversations: number; leads: number; avgScore: number }> = {}
    conversations?.forEach((conv: any) => {
      const date = new Date(conv.created_at).toISOString().split('T')[0]
      if (!dailyTrends[date]) {
        dailyTrends[date] = { conversations: 0, leads: 0, avgScore: 0 }
      }
      dailyTrends[date].conversations += 1
      if (conv.lead_score) {
        dailyTrends[date].avgScore = (dailyTrends[date].avgScore + conv.lead_score) / 2
      }
    })

    // Engagement by channel (multimodal)
    const emailEngagements = conversations?.filter((c: any) => c.email_status === 'sent').length || 0

    // Time to conversion (if meetings exist)
    let avgTimeToConversion = 0
    if (meetingsCount && meetingsCount > 0) {
      const { data: meetings } = await supabase
        .from('meetings')
        .select('scheduled_at, conversation_id')
        .gte('scheduled_at', startDate.toISOString())
      
      if (meetings && meetings.length > 0) {
        const conversionTimes: number[] = []
        for (const meeting of meetings) {
          if (meeting.conversation_id) {
            const { data: conv } = await supabase
              .from('conversations')
              .select('created_at')
              .eq('id', meeting.conversation_id)
              .single()
            
            if (conv?.created_at) {
              const timeDiff = new Date(meeting.scheduled_at).getTime() - new Date(conv.created_at).getTime()
              conversionTimes.push(timeDiff / (1000 * 60 * 60)) // Convert to hours
            }
          }
        }
        
        if (conversionTimes.length > 0) {
          avgTimeToConversion = conversionTimes.reduce((a, b) => a + b, 0) / conversionTimes.length
        }
      }
    }

    return respond.ok({
      period,
      start_date: startDate.toISOString(),
      end_date: now.toISOString(),
      summary: {
        total_conversations: totalConversations,
        total_leads: totalLeads,
        avg_lead_score: Math.round(avgLeadScore * 10) / 10,
        high_score_leads: highScoreLeads,
        medium_score_leads: mediumScoreLeads,
        low_score_leads: lowScoreLeads,
        meetings_booked: meetingsCount || 0,
        emails_sent: emailsSent || 0,
        conversion_rate: totalConversations > 0 ? ((meetingsCount || 0) / totalConversations) * 100 : 0,
        avg_time_to_conversion_hours: Math.round(avgTimeToConversion * 10) / 10,
      },
      daily_trends: Object.entries(dailyTrends)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, metrics]) => ({
          date,
          ...metrics,
        })),
      engagement: {
        email_engagements: emailEngagements,
        meeting_bookings: meetingsCount || 0,
        high_intent_leads: highScoreLeads,
      },
    })
  } catch (error) {
    console.error('Interaction analytics error:', error)
    return respond.serverError('Failed to fetch interaction analytics')
  }
}

