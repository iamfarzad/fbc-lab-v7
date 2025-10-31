'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { DollarSign, TrendingUp, TrendingDown, Activity, Zap, RefreshCw } from 'lucide-react'

interface DailyUsage {
  date: string
  total_tokens: number
  total_cost: number
  model?: string
}

interface TokenCostsData {
  period: string
  start_date: string
  end_date: string
  daily_usage: DailyUsage[]
  summary: {
    total_tokens: number
    total_cost: number
    total_entries: number
    avg_cost_per_entry: number
    by_model: Record<string, { tokens: number; cost: number; count: number }>
  }
}

const chartConfig = {
  cost: {
    label: 'Cost',
    color: 'var(--chart-1)',
  },
  tokens: {
    label: 'Tokens',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig

export function TokenCostAnalyticsSection() {
  const [data, setData] = useState<TokenCostsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30d')
  const [selectedModel, setSelectedModel] = useState<string>('all')

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('period', period)
      if (selectedModel !== 'all') {
        params.set('model', selectedModel)
      }

      const response = await fetch(`/api/admin/token-costs?${params}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch token costs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [period, selectedModel])

  const formatCost = (cost: number) => {
    if (cost < 0.01) {
      return `$${(cost * 1000).toFixed(2)}`
    }
    return `$${cost.toFixed(4)}`
  }

  const chartData = data?.daily_usage.map(day => ({
    date: day.date,
    cost: day.total_cost,
    tokens: day.total_tokens / 1000, // Convert to thousands for readability
  })) || []

  const modelData = data?.summary.by_model
    ? Object.entries(data.summary.by_model).map(([model, stats]) => ({
        model: model.split('/').pop() || model, // Shorten model names
        cost: stats.cost,
        tokens: stats.tokens / 1000,
        count: stats.count,
      }))
    : []

  // Calculate trend
  const costChange = chartData.length > 1
    ? chartData[chartData.length - 1].cost - chartData[chartData.length - 2].cost
    : 0
  const prevCost = chartData.length > 1 ? chartData[chartData.length - 2].cost : 0
  const costChangePercent = prevCost > 0 ? (costChange / prevCost) * 100 : 0

  if (loading && !data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="size-8 animate-spin rounded-full border-b-2 border-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="size-6" />
                Token Cost Analytics
              </CardTitle>
              <CardDescription>
                Track AI token usage and costs over time
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
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All models" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All models</SelectItem>
                  {data?.summary.by_model && Object.keys(data.summary.by_model).map((model) => (
                    <SelectItem key={model} value={model}>
                      {model.split('/').pop() || model}
                    </SelectItem>
                  ))}
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data ? formatCost(data.summary.total_cost) : '$0.0000'}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              {costChange >= 0 ? (
                <TrendingUp className="size-3 text-green-600" />
              ) : (
                <TrendingDown className="size-3 text-red-600" />
              )}
              {Math.abs(costChangePercent).toFixed(1)}% from previous day
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Activity className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data ? data.summary.total_tokens.toLocaleString() : '0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {data?.summary.total_entries || 0} entries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost/Entry</CardTitle>
            <Zap className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data ? formatCost(data.summary.avg_cost_per_entry) : '$0.0000'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Per API call</p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Trend</CardTitle>
          <CardDescription>Daily token costs over time</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="area-chart-fill-cost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-cost)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-cost)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  }}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => {
                        return new Date(value as string | number | Date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      }}
                      valueFormatter={(value) => formatCost(Number(value))}
                      indicator="dot"
                    />
                  }
                />
                <Area
                  dataKey="cost"
                  type="natural"
                  fill="url(#area-chart-fill-cost)"
                  stroke="var(--color-cost)"
                />
              </AreaChart>
            </ChartContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No data available for the selected period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage by Model */}
      {modelData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cost by Model</CardTitle>
            <CardDescription>Token costs broken down by AI model</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart
                accessibilityLayer
                data={modelData}
                margin={{
                  left: 12,
                  right: 12,
                }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="model"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => value.substring(0, 15)}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      valueFormatter={(value) => formatCost(Number(value))}
                    />
                  }
                />
                <Bar dataKey="cost" fill="var(--color-cost)" />
              </BarChart>
            </ChartContainer>

            <div className="mt-6 space-y-3">
              {modelData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{item.model}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {item.count} requests
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCost(item.cost)}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.tokens.toFixed(0)}k tokens
                    </div>
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

