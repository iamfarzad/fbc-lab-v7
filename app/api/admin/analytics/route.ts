import { NextRequest, NextResponse } from 'next/server'
import { agentAnalytics } from '@/core/analytics/agent-analytics'
import { toolAnalytics } from '@/core/analytics/tool-analytics'
import type { SystemHealth } from '@/core/analytics/agent-analytics'

/**
 * Parse time range string (e.g., "7d", "30d", "1h") to Date range
 */
function parseTimeRange(range: string): { start: Date; end: Date } {
  const end = new Date()
  const start = new Date()
  
  const match = range.match(/^(\d+)([dhms])$/)
  if (!match) {
    // Default to 7 days
    start.setDate(start.getDate() - 7)
    return { start, end }
  }
  
  const [, amount, unit] = match
  const num = parseInt(amount, 10)
  
  switch (unit) {
    case 'h':
      start.setHours(start.getHours() - num)
      break
    case 'd':
      start.setDate(start.getDate() - num)
      break
    case 'm':
      start.setMonth(start.getMonth() - num)
      break
    case 's':
      start.setSeconds(start.getSeconds() - num)
      break
    default:
      start.setDate(start.getDate() - 7)
  }
  
  return { start, end }
}

/**
 * Calculate system health metrics
 */
function calculateSystemHealth(
  agentData: Awaited<ReturnType<typeof agentAnalytics.getAnalytics>>,
  toolData: Awaited<ReturnType<typeof toolAnalytics.getToolAnalytics>>
): SystemHealth {
  const errorRate = 1 - agentData.successRate
  const avgLatency = agentData.averageDuration
  const cacheHitRate = toolData.cacheHitRate
  
  // Estimate total sessions from unique session_ids in agent executions
  // This is approximate - for exact count, would need separate query
  const totalSessions = Math.max(
    agentData.totalExecutions / 3, // Approximate: ~3 executions per session
    Object.keys(agentData.agentBreakdown).length
  )
  
  return {
    errorRate,
    avgLatency,
    cacheHitRate,
    totalSessions: Math.round(totalSessions)
  }
}

/**
 * GET /api/admin/analytics
 * 
 * Returns analytics data for agent performance, tool usage, funnel progression, and system health
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '7d'
    
    const timeRange = parseTimeRange(range)
    
    // Fetch all analytics in parallel
    const [agentData, toolData, stageConversion] = await Promise.all([
      agentAnalytics.getAnalytics(undefined, timeRange),
      toolAnalytics.getToolAnalytics(timeRange),
      agentAnalytics.getStageConversion(timeRange)
    ])
    
    // Calculate system health
    const health = calculateSystemHealth(agentData, toolData)
    
    return NextResponse.json({
      agents: agentData,
      tools: toolData,
      funnel: stageConversion,
      health,
      timeRange: {
        start: timeRange.start.toISOString(),
        end: timeRange.end.toISOString()
      }
    })
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}

