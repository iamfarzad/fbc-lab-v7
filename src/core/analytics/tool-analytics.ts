import { getSupabaseService } from '@/lib/supabase'
import type { ToolAnalytics } from './agent-analytics'

interface AuditLogRecord {
  event: string
  details?: {
    toolName?: string
    cached?: boolean
    performance?: {
      success?: boolean
      duration?: number
    }
  }
}

export class ToolAnalyticsService {
  async getToolAnalytics(
    timeRange?: { start: Date; end: Date }
  ): Promise<ToolAnalytics> {
    const supabase = getSupabaseService()
    
    let query = supabase
      .from('audit_log')
      .select('*')
      .eq('event', 'tool_executed')
    
    if (timeRange) {
      query = query
        .gte('timestamp', timeRange.start.toISOString())
        .lte('timestamp', timeRange.end.toISOString())
    }
    
    const { data, error } = await query
    
    if (error || !data) {
      throw new Error(`Failed to fetch tool analytics: ${error?.message}`)
    }
    
    const totalExecutions = data.length
    const successCount = data.filter(
      (log: AuditLogRecord) => log.details?.performance?.success === true
    ).length
    const successRate = totalExecutions > 0 ? successCount / totalExecutions : 0
    
    const durations = data
      .map((log: AuditLogRecord) => log.details?.performance?.duration)
      .filter((d: unknown) => typeof d === 'number')
    const averageDuration = durations.length > 0
      ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length
      : 0
    
    const cachedCount = data.filter(
      (log: AuditLogRecord) => log.details?.cached === true
    ).length
    const cacheHitRate = totalExecutions > 0 ? cachedCount / totalExecutions : 0
    
    // Tool breakdown
    const toolBreakdown: Record<string, {
      count: number
      successes: number
      durations: number[]
    }> = {}
    
    data.forEach((log: AuditLogRecord) => {
      const toolName = log.details?.toolName
      if (toolName) {
        if (!toolBreakdown[toolName]) {
          toolBreakdown[toolName] = { count: 0, successes: 0, durations: [] }
        }
        toolBreakdown[toolName].count++
        
        if (log.details?.performance?.success === true) {
          toolBreakdown[toolName].successes++
        }
        
        const duration = log.details?.performance?.duration
        if (typeof duration === 'number') {
          toolBreakdown[toolName].durations.push(duration)
        }
      }
    })
    
    // Calculate per-tool metrics
    const toolMetrics: Record<string, {
      count: number
      successRate: number
      averageDuration: number
    }> = {}
    
    Object.entries(toolBreakdown).forEach(([toolName, data]) => {
      toolMetrics[toolName] = {
        count: data.count,
        successRate: data.count > 0 ? data.successes / data.count : 0,
        averageDuration: data.durations.length > 0
          ? data.durations.reduce((a, b) => a + b, 0) / data.durations.length
          : 0
      }
    })
    
    return {
      totalExecutions,
      successRate,
      averageDuration,
      cacheHitRate,
      toolBreakdown: toolMetrics
    }
  }
}

export const toolAnalytics = new ToolAnalyticsService()

