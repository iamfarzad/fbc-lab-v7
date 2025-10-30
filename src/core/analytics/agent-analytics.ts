import { getSupabaseService } from '@/lib/supabase'

interface AuditLogRecord {
  event: string
  details?: {
    agent?: string
    stage?: string
    performance?: {
      success?: boolean
      duration?: number
    }
  }
}

export interface AgentAnalytics {
  totalExecutions: number
  successRate: number
  averageDuration: number
  agentBreakdown: Record<string, number>
  stageBreakdown: Record<string, number>
}

export interface StageConversion {
  stage: string
  count: number
  conversionRate?: number
  averageDuration: number
}

export interface ToolAnalytics {
  totalExecutions: number
  successRate: number
  averageDuration: number
  cacheHitRate: number
  toolBreakdown: Record<string, {
    count: number
    successRate: number
    averageDuration: number
  }>
}

export interface SystemHealth {
  errorRate: number
  avgLatency: number
  cacheHitRate: number
  totalSessions: number
}

export class AgentAnalyticsService {
  async getAnalytics(
    sessionId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<AgentAnalytics> {
    const supabase = getSupabaseService()
    
    let query = supabase
      .from('audit_log')
      .select('*')
      .in('event', ['agent_routed', 'agent_execution'])
    
    if (sessionId) {
      query = query.eq('session_id', sessionId)
    }
    
    if (timeRange) {
      query = query
        .gte('timestamp', timeRange.start.toISOString())
        .lte('timestamp', timeRange.end.toISOString())
    }
    
    const { data, error } = await query
    
    if (error || !data) {
      throw new Error(`Failed to fetch analytics: ${error?.message}`)
    }
    
    // Calculate metrics
    const executions = data.filter((log: AuditLogRecord) => log.event === 'agent_execution')
    const totalExecutions = executions.length
    const successCount = executions.filter(
      (log: AuditLogRecord) => log.details?.performance?.success === true
    ).length
    const successRate = totalExecutions > 0 ? successCount / totalExecutions : 0
    
    const durations = executions
      .map((log: AuditLogRecord) => log.details?.performance?.duration)
      .filter((d: unknown) => typeof d === 'number')
    const averageDuration = durations.length > 0 
      ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length 
      : 0
    
    const agentBreakdown: Record<string, number> = {}
    const stageBreakdown: Record<string, number> = {}
    
    data.forEach((log: AuditLogRecord) => {
      const agent = log.details?.agent
      const stage = log.details?.stage
      
      if (agent) {
        agentBreakdown[agent] = (agentBreakdown[agent] || 0) + 1
      }
      if (stage) {
        stageBreakdown[stage] = (stageBreakdown[stage] || 0) + 1
      }
    })
    
    return {
      totalExecutions,
      successRate,
      averageDuration,
      agentBreakdown,
      stageBreakdown
    }
  }

  /**
   * Get stage conversion rates (funnel progression)
   */
  async getStageConversion(
    timeRange?: { start: Date; end: Date }
  ): Promise<StageConversion[]> {
    const supabase = getSupabaseService()
    
    let query = supabase
      .from('audit_log')
      .select('*')
      .eq('event', 'agent_routed')
    
    if (timeRange) {
      query = query
        .gte('timestamp', timeRange.start.toISOString())
        .lte('timestamp', timeRange.end.toISOString())
    }
    
    const { data, error } = await query
    
    if (error || !data) {
      throw new Error(`Failed to fetch stage conversion: ${error?.message}`)
    }
    
    // Group by stage
    const stageGroups: Record<string, { count: number; durations: number[] }> = {}
    
    data.forEach((log: AuditLogRecord) => {
      const stage = log.details?.stage
      if (stage) {
        if (!stageGroups[stage]) {
          stageGroups[stage] = { count: 0, durations: [] }
        }
        stageGroups[stage].count++
        
        // Get execution duration if available from related execution log
        const duration = log.details?.performance?.duration
        if (typeof duration === 'number') {
          stageGroups[stage].durations.push(duration)
        }
      }
    })
    
    // Calculate conversion rates (assuming stages flow: DISCOVERY -> SCORING -> SALES -> CLOSING)
    const stages = ['DISCOVERY', 'SCORING', 'WORKSHOP_PITCH', 'CONSULTING_PITCH', 'CLOSING', 'SUMMARY']
    const stageCounts = stages.map(s => stageGroups[s]?.count || 0)
    const total = stageCounts[0] || 1 // Use DISCOVERY as base
    
    return stages.map((stage, index) => {
      const stageData = stageGroups[stage] || { count: 0, durations: [] }
      const count = stageData.count
      const conversionRate = index === 0 ? 1 : count / total
      const averageDuration = stageData.durations.length > 0
        ? stageData.durations.reduce((a: number, b: number) => a + b, 0) / stageData.durations.length
        : 0
      
      return {
        stage,
        count,
        conversionRate: index === 0 ? 1 : conversionRate,
        averageDuration
      }
    }).filter(s => s.count > 0)
  }
}

export const agentAnalytics = new AgentAnalyticsService()
