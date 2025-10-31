'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, AlertCircle } from 'lucide-react'
import type { AgentAnalytics, StageConversion, ToolAnalytics, SystemHealth } from '@/core/analytics/agent-analytics'

interface AnalyticsData {
  agents: AgentAnalytics
  tools: ToolAnalytics
  funnel: StageConversion[]
  health: SystemHealth
  timeRange: {
    start: string
    end: string
  }
}

export function AgentAnalyticsPanel() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState('7d')

  const fetchAnalytics = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/analytics?range=${range}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`Failed to fetch analytics: ${response.status} ${errorText}`)
      }
      
      const result = await response.json() as AnalyticsData
      setData(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      // Only show error if it's not a connection refused (server might be starting)
      if (!errorMessage.includes('ERR_CONNECTION_REFUSED') && !errorMessage.includes('Failed to fetch')) {
        setError(errorMessage)
      } else {
        setError('Analytics service temporarily unavailable. Please check server status.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000)
    return () => clearInterval(interval)
  }, [range])

  if (loading && !data) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">Loading analytics...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
          <p className="mt-4 text-sm text-destructive">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const { agents, tools, funnel, health } = data

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-lg font-semibold">Agent Analytics</h3>
          <p className="text-xs text-muted-foreground">
            Performance metrics and system health
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1 text-xs"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <button
            onClick={fetchAnalytics}
            className="rounded-md border border-input bg-background px-2 py-1 text-xs hover:bg-accent"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* System Health Cards */}
      <div className="grid gap-2 grid-cols-4 shrink-0">
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium">Total Executions</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-xl font-bold">{agents.totalExecutions}</div>
            <p className="text-[10px] text-muted-foreground">Agent calls</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-xl font-bold">
              {(agents.successRate * 100).toFixed(1)}%
            </div>
            <p className="text-[10px] text-muted-foreground">
              {agents.totalExecutions > 0
                ? `${Math.round(agents.totalExecutions * agents.successRate)} successful`
                : 'No data'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-xl font-bold">{agents.averageDuration.toFixed(0)}ms</div>
            <p className="text-[10px] text-muted-foreground">Per execution</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium">Error Rate</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className={`text-xl font-bold ${health.errorRate > 0.05 ? 'text-destructive' : ''}`}>
              {(health.errorRate * 100).toFixed(1)}%
            </div>
            <p className="text-[10px] text-muted-foreground">System-wide</p>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section - Grid Layout */}
      <div className="flex-1 grid grid-cols-3 gap-3 overflow-hidden min-h-0">
        {/* Agent Breakdown */}
        <Card className="flex flex-col min-h-0">
          <CardHeader className="pb-2 pt-3 px-3 shrink-0">
            <CardTitle className="text-sm font-medium">Agent Performance</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 flex-1 overflow-y-auto">
            <div className="space-y-1.5">
              {Object.entries(agents.agentBreakdown).map(([agent, count]) => (
                <div key={agent} className="flex items-center justify-between">
                  <span className="text-xs font-medium truncate">{agent}</span>
                  <Badge variant="outline" className="text-[10px]">{count}</Badge>
                </div>
              ))}
              {Object.keys(agents.agentBreakdown).length === 0 && (
                <p className="text-xs text-muted-foreground">No data</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Funnel Visualization */}
        <Card className="flex flex-col min-h-0">
          <CardHeader className="pb-2 pt-3 px-3 shrink-0">
            <CardTitle className="text-sm font-medium">Funnel Progression</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 flex-1 overflow-y-auto">
            <div className="space-y-1.5">
              {funnel.map((stage, index) => (
                <div key={stage.stage} className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium truncate">{stage.stage}</span>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[10px]">{stage.count}</Badge>
                      {index > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          {(stage.conversionRate! * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${(stage.conversionRate! * 100).toFixed(0)}%` }}
                    />
                  </div>
                </div>
              ))}
              {funnel.length === 0 && (
                <p className="text-xs text-muted-foreground">No data</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tool Usage */}
        <Card className="flex flex-col min-h-0">
          <CardHeader className="pb-2 pt-3 px-3 shrink-0">
            <CardTitle className="text-sm font-medium">Tool Usage</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 flex-1 overflow-y-auto">
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-[10px] text-muted-foreground">Total</div>
                  <div className="text-sm font-semibold">{tools.totalExecutions}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">Success</div>
                  <div className="text-sm font-semibold">
                    {(tools.successRate * 100).toFixed(0)}%
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">Cache</div>
                  <div className="text-sm font-semibold">
                    {(tools.cacheHitRate * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
              
              <div className="space-y-1">
                {Object.entries(tools.toolBreakdown).map(([toolName, metrics]) => (
                  <div key={toolName} className="flex items-center justify-between rounded-md border p-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">{toolName}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {metrics.count} · {metrics.averageDuration.toFixed(0)}ms
                      </div>
                    </div>
                    <Badge variant={metrics.successRate > 0.95 ? 'default' : 'destructive'} className="text-[10px] shrink-0">
                      {(metrics.successRate * 100).toFixed(0)}%
                    </Badge>
                  </div>
                ))}
                {Object.keys(tools.toolBreakdown).length === 0 && (
                  <p className="text-xs text-muted-foreground">No data</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

