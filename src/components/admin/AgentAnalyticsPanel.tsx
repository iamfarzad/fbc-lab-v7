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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold">Agent Analytics</h3>
          <p className="text-sm text-muted-foreground">
            Performance metrics and system health
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <button
            onClick={fetchAnalytics}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* System Health Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agents.totalExecutions}</div>
            <p className="text-xs text-muted-foreground">Agent calls</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(agents.successRate * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {agents.totalExecutions > 0
                ? `${Math.round(agents.totalExecutions * agents.successRate)} successful`
                : 'No data'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agents.averageDuration.toFixed(0)}ms</div>
            <p className="text-xs text-muted-foreground">Per agent execution</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${health.errorRate > 0.05 ? 'text-destructive' : ''}`}>
              {(health.errorRate * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">System-wide</p>
          </CardContent>
        </Card>
      </div>

      {/* Agent Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(agents.agentBreakdown).map(([agent, count]) => (
              <div key={agent} className="flex items-center justify-between">
                <span className="text-sm font-medium">{agent}</span>
                <Badge variant="outline">{count} executions</Badge>
              </div>
            ))}
            {Object.keys(agents.agentBreakdown).length === 0 && (
              <p className="text-sm text-muted-foreground">No agent data available</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Funnel Progression</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {funnel.map((stage, index) => (
              <div key={stage.stage} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{stage.stage}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{stage.count} sessions</Badge>
                    {index > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {(stage.conversionRate! * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${(stage.conversionRate! * 100).toFixed(0)}%` }}
                  />
                </div>
              </div>
            ))}
            {funnel.length === 0 && (
              <p className="text-sm text-muted-foreground">No funnel data available</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tool Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Tool Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Total Calls</div>
                <div className="text-lg font-semibold">{tools.totalExecutions}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Success Rate</div>
                <div className="text-lg font-semibold">
                  {(tools.successRate * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Cache Hit Rate</div>
                <div className="text-lg font-semibold">
                  {(tools.cacheHitRate * 100).toFixed(1)}%
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              {Object.entries(tools.toolBreakdown).map(([toolName, metrics]) => (
                <div key={toolName} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="font-medium">{toolName}</div>
                    <div className="text-xs text-muted-foreground">
                      {metrics.count} calls · {metrics.averageDuration.toFixed(0)}ms avg
                    </div>
                  </div>
                  <Badge variant={metrics.successRate > 0.95 ? 'default' : 'destructive'}>
                    {(metrics.successRate * 100).toFixed(0)}%
                  </Badge>
                </div>
              ))}
              {Object.keys(tools.toolBreakdown).length === 0 && (
                <p className="text-sm text-muted-foreground">No tool usage data available</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

