import { NextRequest } from 'next/server'
import { respond } from '@/lib/api/response'
import { adminAuthMiddleware } from '@/app/api-utils/auth'
import { adminRateLimit } from '@/app/api-utils/rate-limiting'
import { getTokenUsageByDateRange } from '@/src/core/token-usage-logger'
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
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d'
    const model = searchParams.get('model') || undefined

    // Calculate date range
    const now = new Date()
    let startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // Default 30 days

    if (period === '7d') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (period === '90d') {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    } else if (period === '1y') {
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    }

    // Get aggregated data by date
    const dailyUsage = await getTokenUsageByDateRange(startDate, now, model)

    // Get summary statistics
    const supabase = ensureSupabase()
    
    let summaryQuery = supabase
      .from('token_usage_log')
      .select('total_tokens, cost, model, input_tokens, output_tokens')
      .gte('timestamp', startDate.toISOString())

    if (model) {
      summaryQuery = summaryQuery.eq('model', model)
    }

    const { data: allEntries, error } = await summaryQuery

    if (error) {
      console.error('Error fetching token usage summary:', error)
      return respond.ok({
        dailyUsage,
        summary: {
          total_tokens: 0,
          total_cost: 0,
          total_sessions: 0,
          avg_cost_per_session: 0,
          by_model: {}
        }
      })
    }

    // Calculate summary
    const summary = {
      total_tokens: 0,
      total_cost: 0,
      total_sessions: new Set<string>(),
      avg_cost_per_session: 0,
      by_model: {} as Record<string, { tokens: number; cost: number; count: number }>
    }

    allEntries?.forEach((entry: any) => {
      const tokens = entry.total_tokens || 0
      const cost = Number(entry.cost || 0)
      
      summary.total_tokens += tokens
      summary.total_cost += cost

      if (entry.model) {
        if (!summary.by_model[entry.model]) {
          summary.by_model[entry.model] = { tokens: 0, cost: 0, count: 0 }
        }
        summary.by_model[entry.model].tokens += tokens
        summary.by_model[entry.model].cost += cost
        summary.by_model[entry.model].count += 1
      }
    })

    summary.avg_cost_per_session = summary.total_cost / Math.max(1, allEntries?.length || 1)

    return respond.ok({
      period,
      start_date: startDate.toISOString(),
      end_date: now.toISOString(),
      dailyUsage,
      summary: {
        total_tokens: summary.total_tokens,
        total_cost: summary.total_cost,
        total_entries: allEntries?.length || 0,
        avg_cost_per_entry: summary.avg_cost_per_session,
        by_model: summary.by_model
      }
    })
  } catch (error) {
    console.error('Token costs error:', error)
    return respond.serverError('Failed to fetch token costs')
  }
}

