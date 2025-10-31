import { useState, useEffect, useCallback } from 'react'

interface Conversation {
  id: string
  name: string | null
  email: string | null
  summary: string | null
  leadScore: number | null
  createdAt: string
}

interface UseAdminConversationsOptions {
  period?: 'last_7_days' | 'last_30_days' | 'last_90_days'
  search?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UseAdminConversationsReturn {
  conversations: Conversation[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useAdminConversations({
  period = 'last_30_days',
  search = '',
  autoRefresh = false,
  refreshInterval = 60000
}: UseAdminConversationsOptions = {}): UseAdminConversationsReturn {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchConversations = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ period })
      if (search) {
        params.append('search', search)
      }
      
      const response = await fetch(`/api/admin/conversations?${params.toString()}`, {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.status}`)
      }
      
      const data = await response.json() as Conversation[]
      setConversations(data)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch conversations')
      setError(error)
      console.error('Failed to fetch admin conversations:', error)
    } finally {
      setLoading(false)
    }
  }, [period, search])

  useEffect(() => {
    void fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(() => {
      void fetchConversations()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchConversations])

  return {
    conversations,
    loading,
    error,
    refetch: fetchConversations
  }
}

