import { NextRequest, NextResponse } from 'next/server'
import { adminAuthMiddleware } from '@/app/api-utils/auth'
import { adminRateLimit } from '@/app/api-utils/rate-limiting'
import { supabaseService } from '@/src/core/supabase/client'

export async function GET(request: NextRequest) {
  const hasSupabaseEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  if (!hasSupabaseEnv) {
    return NextResponse.json({ disabled: true, message: 'Admin features require Supabase configuration' })
  }

  const rateLimitResult = adminRateLimit(request)
  if (rateLimitResult) {
    return rateLimitResult
  }

  const authResult = await adminAuthMiddleware(request)
  if (authResult) {
    return authResult
  }

  const supabase = supabaseService
  if (!supabase || typeof (supabase as any)?.from !== 'function') {
    return NextResponse.json(
      {
        disabled: true,
        message: 'Supabase service client unavailable',
        totals: {
          totalLeads: 0,
          conversionRate: 0,
          engagementRate: 0,
          avgLeadScore: 0
        }
      },
      { status: 503 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '7d'

    const now = new Date()
    const daysBack = period === '1d' ? 1 : period === '30d' ? 30 : period === '90d' ? 90 : 7
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)

    const { data, error } = await (supabase as any)
      .from('lead_summaries')
      .select('*')
      .gte('created_at', startDate.toISOString())

    if (error) {
      console.error('Admin stats Supabase error:', error)
      return NextResponse.json({ error: 'Failed to retrieve admin statistics' }, { status: 500 })
    }

    type LeadRecord = {
      lead_score: number | null
      ai_capabilities_shown: string[] | null
    }

    const leadRows = (data ?? []) as LeadRecord[]
    const totalLeads = leadRows.length

    const qualifiedLeads = leadRows.filter((lead) => (lead.lead_score ?? 0) >= 7).length
    const conversionRate = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0

    const leadsWithAI = leadRows.filter(
      (lead) => Array.isArray(lead.ai_capabilities_shown) && lead.ai_capabilities_shown.length > 0
    ).length
    const engagementRate = totalLeads > 0 ? Math.round((leadsWithAI / totalLeads) * 100) : 0

    const avgLeadScore = totalLeads > 0
      ? Math.round((leadRows.reduce((sum, lead) => sum + (lead.lead_score ?? 0), 0) / totalLeads) * 10) / 10
      : 0

    const capabilityCounts = new Map<string, number>()
    leadRows.forEach((lead) => {
      lead.ai_capabilities_shown?.forEach((capability) => {
        capabilityCounts.set(capability, (capabilityCounts.get(capability) || 0) + 1)
      })
    })

    const topAICapabilities = Array.from(capabilityCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([capability]) => capability)

    return NextResponse.json({
      totalLeads,
      activeConversations: 0,
      conversionRate,
      avgEngagementTime: Math.round(avgLeadScore * 2),
      topAICapabilities,
      recentActivity: totalLeads,
      totalTokenCost: 0,
      scheduledMeetings: 0,
      avgLeadScore,
      engagementRate
    })
  } catch (error) {
    console.error('Admin stats handler error:', error)
    return NextResponse.json({ error: 'Failed to retrieve admin statistics' }, { status: 500 })
  }
}
