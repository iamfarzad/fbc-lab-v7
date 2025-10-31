import { useState, useEffect, useCallback } from 'react'

interface Stats {
  totalLeads: number
  activeConversations: number
  conversionRate: number
  avgEngagementTime: number
  topAICapabilities: string[]
  recentActivity: number
  avgLeadScore: number
  engagementRate: number
}

interface UseAdminStatsOptions {
  period?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UseAdminStatsReturn {
  stats: Stats | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useAdminStats({
  period = '7d',
  autoRefresh = false,
  refreshInterval = 60000
}: UseAdminStatsOptions = {}): UseAdminStatsReturn {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/stats?period=${period}`, {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status}`)
      }
      const data = await response.json() as Stats
      setStats(data)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch stats')
      setError(error)
      console.error('Failed to fetch admin stats:', error)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    void fetchStats()
  }, [fetchStats])

  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(() => {
      void fetchStats()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchStats])

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  }
}

