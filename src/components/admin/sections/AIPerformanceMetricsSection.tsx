'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Line, LineChart, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, CartesianGrid, XAxis } from 'recharts'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Zap, TrendingUp, DollarSign, RefreshCw, Activity } from 'lucide-react'

interface AIPerformanceData {
  period: string
  summary: {
    total_requests: number
    total_tokens: number
    total_cost: number
    avg_tokens_per_request: number
    overall_success_rate: number
  }
  model_performance: Record<string, {
    count: number
    total_tokens: number
    total_cost: number
    avg_tokens_per_request: number
    avg_cost_per_request: number
    success_rate: number
    avg_duration: number
  }>
  agent_performance: Record<string, {
    executions: number
    success_rate: number
    avg_duration: number
  }>
  response_quality: {
    avg_tokens_per_response: number
    token_efficiency: number
    overall_success_rate: number
  }
}

const chartConfig = {
  tokens: {
    label: 'Tokens',
    color: 'var(--chart-1)',
  },
  cost: {
    label: 'Cost',
    color: 'var(--chart-2)',
  },
  requests: {
    label: 'Requests',
    color: 'var(--chart-3)',
  },
} satisfies ChartConfig

export function AIPerformanceMetricsSection() {
  const [data, setData] = useState<AIPerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30d')

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/ai-performance?period=${period}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch AI performance metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [period])

  if (loading && !data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="size-8 animate-spin rounded-full border-b-2 border-primary" />
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  // Prepare model performance chart data
  const modelChartData = Object.entries(data.model_performance).map(([model, stats]) => ({
    model: model.split('-')[0] || model, // Shorten model name for display
    requests: stats.count,
    tokens: stats.total_tokens,
    cost: Number(stats.total_cost.toFixed(4)),
    avgTokens: Math.round(stats.avg_tokens_per_request),
  }))

  // Prepare agent performance radar chart data
  const agentNames = Object.keys(data.agent_performance)
  const radarData = agentNames.length > 0
    ? agentNames.map((agent) => {
        const perf = data.agent_performance[agent]
        return {
          agent: agent,
          executions: perf.executions,
          success_rate: perf.success_rate * 100,
          efficiency: Math.min(perf.avg_duration > 0 ? 1000 / perf.avg_duration : 0, 100),
        }
      })
    : []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="size-6" />
                AI Performance Metrics
              </CardTitle>
              <CardDescription>
                Model performance, efficiency, and cost analysis
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <RefreshCw
                className={`size-4 cursor-pointer ${loading ? 'animate-spin' : ''}`}
                onClick={() => void fetchData()}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.total_requests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.summary.avg_tokens_per_request.toLocaleString()} avg tokens/request
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.summary.total_cost.toFixed(4)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.summary.total_tokens.toLocaleString()} total tokens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(data.summary.overall_success_rate * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Overall performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Token Efficiency</CardTitle>
            <Zap className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(data.response_quality.token_efficiency * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Output efficiency ratio
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {modelChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Model Performance</CardTitle>
              <CardDescription>Requests, tokens, and cost by model</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <LineChart data={modelChartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="model"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        valueFormatter={(value: unknown, name: string): React.ReactNode => {
                          if (name === 'cost') {
                            return `$${Number(value).toFixed(4)}`
                          }
                          if (name === 'tokens') {
                            return Number(value).toLocaleString()
                          }
                          return String(value)
                        }}
                      />
                    }
                  />
                  <Line
                    dataKey="requests"
                    type="monotone"
                    stroke="var(--color-requests)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    dataKey="tokens"
                    type="monotone"
                    stroke="var(--color-tokens)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {radarData.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Agent Performance</CardTitle>
              <CardDescription>Execution metrics by agent</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="agent" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar
                    name="Performance"
                    dataKey="success_rate"
                    stroke="var(--color-requests)"
                    fill="var(--color-requests)"
                    fillOpacity={0.6}
                  />
                  <Radar
                    name="Efficiency"
                    dataKey="efficiency"
                    stroke="var(--color-tokens)"
                    fill="var(--color-tokens)"
                    fillOpacity={0.4}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        valueFormatter={(value: unknown, name: string): React.ReactNode => {
                          if (name === 'success_rate') {
                            return `${Number(value).toFixed(1)}%`
                          }
                          if (name === 'efficiency') {
                            return `${Number(value).toFixed(1)}`
                          }
                          return String(value)
                        }}
                      />
                    }
                  />
                </RadarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Agent Performance</CardTitle>
              <CardDescription>Execution metrics by agent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No agent performance data available
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Model Breakdown */}
      {Object.keys(data.model_performance).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Model Breakdown</CardTitle>
            <CardDescription>Detailed performance by model</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(data.model_performance).map(([model, stats]) => (
                <div key={model} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{model}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {stats.count.toLocaleString()} requests • {stats.total_tokens.toLocaleString()} tokens
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        ${stats.total_cost.toFixed(4)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ${stats.avg_cost_per_request.toFixed(6)}/request
                      </div>
                    </div>
                    <Badge variant={stats.success_rate >= 0.95 ? 'default' : 'secondary'}>
                      {(stats.success_rate * 100).toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent Breakdown */}
      {Object.keys(data.agent_performance).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Agent Performance</CardTitle>
            <CardDescription>Execution statistics by agent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(data.agent_performance).map(([agent, stats]) => (
                <div key={agent} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{agent}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {stats.executions.toLocaleString()} executions
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {stats.avg_duration > 0 ? `${stats.avg_duration.toFixed(2)}s` : 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground">Avg duration</div>
                    </div>
                    <Badge variant={stats.success_rate >= 0.95 ? 'default' : 'secondary'}>
                      {(stats.success_rate * 100).toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
