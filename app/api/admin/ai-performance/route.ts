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
    }

    // Get token usage data
    const { data: tokenUsage, error: tokenError } = await supabase
      .from('token_usage_log')
      .select('*')
      .gte('timestamp', startDate.toISOString())

    if (tokenError) {
      console.error('Error fetching token usage:', tokenError)
    }

    // Get agent execution data from audit log
    const { data: agentExecutions, error: agentError } = await supabase
      .from('audit_log')
      .select('*')
      .eq('event', 'agent_execution')
      .gte('timestamp', startDate.toISOString())

    if (agentError) {
      console.error('Error fetching agent executions:', agentError)
    }

    // Calculate model performance metrics
    const modelStats: Record<string, {
      count: number
      total_tokens: number
      total_cost: number
      avg_tokens_per_request: number
      avg_cost_per_request: number
      success_rate: number
      avg_duration: number
    }> = {}

    tokenUsage?.forEach((entry: any) => {
      const model = entry.model || 'unknown'
      if (!modelStats[model]) {
        modelStats[model] = {
          count: 0,
          total_tokens: 0,
          total_cost: 0,
          avg_tokens_per_request: 0,
          avg_cost_per_request: 0,
          success_rate: 1,
          avg_duration: 0,
        }
      }
      modelStats[model].count += 1
      modelStats[model].total_tokens += entry.total_tokens || 0
      modelStats[model].total_cost += Number(entry.cost || 0)
    })

    // Calculate averages
    Object.keys(modelStats).forEach((model) => {
      const stats = modelStats[model]
      stats.avg_tokens_per_request = stats.count > 0 ? stats.total_tokens / stats.count : 0
      stats.avg_cost_per_request = stats.count > 0 ? stats.total_cost / stats.count : 0
    })

    // Agent performance metrics
    const agentPerformance: Record<string, {
      executions: number
      success_rate: number
      avg_duration: number
    }> = {}

    agentExecutions?.forEach((log: any) => {
      const agent = log.details?.agent || 'unknown'
      if (!agentPerformance[agent]) {
        agentPerformance[agent] = {
          executions: 0,
          success_rate: 0,
          avg_duration: 0,
        }
      }
      agentPerformance[agent].executions += 1
      const success = log.details?.performance?.success ?? true
      const duration = log.details?.performance?.duration || 0
      
      // Calculate running averages
      const current = agentPerformance[agent]
      const newSuccessRate = (current.success_rate * (current.executions - 1) + (success ? 1 : 0)) / current.executions
      const newAvgDuration = (current.avg_duration * (current.executions - 1) + duration) / current.executions
      
      agentPerformance[agent].success_rate = newSuccessRate
      agentPerformance[agent].avg_duration = newAvgDuration
    })

    // Response quality metrics (based on token efficiency and success rate)
    const responseQuality = {
      avg_tokens_per_response: tokenUsage && tokenUsage.length > 0
        ? tokenUsage.reduce((sum: number, e: any) => sum + (e.output_tokens || 0), 0) / tokenUsage.length
        : 0,
      token_efficiency: tokenUsage && tokenUsage.length > 0
        ? tokenUsage.reduce((sum: number, e: any) => sum + (e.output_tokens || 0) / (e.total_tokens || 1), 0) / tokenUsage.length
        : 0,
      overall_success_rate: agentExecutions && agentExecutions.length > 0
        ? agentExecutions.filter((e: any) => e.details?.performance?.success !== false).length / agentExecutions.length
        : 1,
    }

    return respond.ok({
      period,
      start_date: startDate.toISOString(),
      end_date: now.toISOString(),
      model_performance: modelStats,
      agent_performance: agentPerformance,
      response_quality: responseQuality,
      summary: {
        total_requests: tokenUsage?.length || 0,
        total_tokens: tokenUsage?.reduce((sum: number, e: any) => sum + (e.total_tokens || 0), 0) || 0,
        total_cost: tokenUsage?.reduce((sum: number, e: any) => sum + Number(e.cost || 0), 0) || 0,
        avg_tokens_per_request: responseQuality.avg_tokens_per_response,
        overall_success_rate: responseQuality.overall_success_rate,
      },
    })
  } catch (error) {
    console.error('AI performance error:', error)
    return respond.serverError('Failed to fetch AI performance metrics')
  }
}

