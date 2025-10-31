'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Bar, BarChart, Area, AreaChart, CartesianGrid, XAxis } from 'recharts'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Users, TrendingUp, Mail, Calendar, Clock, RefreshCw } from 'lucide-react'

interface InteractionAnalyticsData {
  period: string
  summary: {
    total_conversations: number
    total_leads: number
    avg_lead_score: number
    high_score_leads: number
    medium_score_leads: number
    low_score_leads: number
    meetings_booked: number
    emails_sent: number
    conversion_rate: number
    avg_time_to_conversion_hours: number
  }
  daily_trends: Array<{
    date: string
    conversations: number
    leads: number
    avgScore: number
  }>
  engagement: {
    email_engagements: number
    meeting_bookings: number
    high_intent_leads: number
  }
}

const chartConfig = {
  conversations: {
    label: 'Conversations',
    color: 'var(--chart-1)',
  },
  leads: {
    label: 'Leads',
    color: 'var(--chart-2)',
  },
  avgScore: {
    label: 'Avg Score',
    color: 'var(--chart-3)',
  },
} satisfies ChartConfig

export function InteractionAnalyticsSection() {
  const [data, setData] = useState<InteractionAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30d')

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/interaction-analytics?period=${period}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch interaction analytics:', error)
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

  const chartData = data.daily_trends.map((day) => ({
    date: day.date,
    conversations: day.conversations,
    leads: day.leads,
    avgScore: Math.round(day.avgScore),
  }))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="size-6" />
                Interaction Analytics
              </CardTitle>
              <CardDescription>
                Business performance metrics and conversion tracking
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
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.total_leads}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.summary.total_conversations} conversations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.conversion_rate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.summary.meetings_booked} meetings booked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Lead Score</CardTitle>
            <Badge className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.avg_lead_score}/100</div>
            <p className="text-xs text-muted-foreground mt-1">
              High: {data.summary.high_score_leads} | Med: {data.summary.medium_score_leads} | Low: {data.summary.low_score_leads}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time to Convert</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.avg_time_to_conversion_hours > 0
                ? `${Math.round(data.summary.avg_time_to_conversion_hours)}h`
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average time to booking
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Conversations & Leads Trend</CardTitle>
            <CardDescription>Daily interaction volume</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="area-chart-fill-conversations" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-conversations)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-conversations)" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="area-chart-fill-leads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-leads)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-leads)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => {
                      const date = new Date(value)
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
                        indicator="dot"
                      />
                    }
                  />
                  <Area
                    dataKey="conversations"
                    type="natural"
                    fill="url(#area-chart-fill-conversations)"
                    stroke="var(--color-conversations)"
                  />
                  <Area
                    dataKey="leads"
                    type="natural"
                    fill="url(#area-chart-fill-leads)"
                    stroke="var(--color-leads)"
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead Score Distribution</CardTitle>
            <CardDescription>Quality breakdown by score range</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart
                accessibilityLayer
                data={[
                  { category: 'High (70+)', value: data.summary.high_score_leads },
                  { category: 'Medium (50-69)', value: data.summary.medium_score_leads },
                  { category: 'Low (<50)', value: data.summary.low_score_leads },
                ]}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="category"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent />
                  }
                />
                <Bar dataKey="value" fill="var(--color-conversations)" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mail className="size-4" />
              Email Engagements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.engagement.email_engagements}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Emails sent to leads
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="size-4" />
              Meeting Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.engagement.meeting_bookings}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Consultations scheduled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="size-4" />
              High Intent Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.engagement.high_intent_leads}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Leads with score 70+
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

