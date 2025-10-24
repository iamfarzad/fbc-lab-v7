'use client'

// eslint-disable-next-line react-refresh/only-export-components
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader, PageShell } from '@/components/page-shell'
import { RefreshCw, Pause, Play, Download } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface LogEntry {
  id: string
  service: string
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  timestamp: string
  meta?: any
  created_at: string
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [serviceFilter, setServiceFilter] = useState<string>('all')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const verifyAccess = async () => {
      try {
        const response = await fetch('/api/admin/stats', {
          credentials: 'include'
        })

        if (response.ok) {
          setIsAuthenticated(true)
        } else {
          router.push('/admin/login')
        }
      } catch (error) {
        console.error('Admin auth check failed', error)
        router.push('/admin/login')
      }
    }

    void verifyAccess()
  }, [router])

  const fetchLogs = async () => {
    try {
      let query = supabase
        .from('logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100)

      if (serviceFilter !== 'all') {
        query = query.eq('service', serviceFilter)
      }
      if (levelFilter !== 'all') {
        query = query.eq('level', levelFilter)
      }
      if (searchTerm) {
        query = query.ilike('message', `%${searchTerm}%`)
      }

      const { data, error } = await query
      
      if (error) {
        console.error('Error fetching logs:', error)
      } else if (data) {
        setLogs(data)
      }
      
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch logs:', error)
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthenticated) return

    void fetchLogs()
    
    if (autoRefresh) {
      const interval = setInterval(() => {
        void fetchLogs()
      }, 3000) // Refresh every 3s
      return () => clearInterval(interval)
    }
    return undefined
  }, [serviceFilter, levelFilter, searchTerm, autoRefresh, isAuthenticated, fetchLogs])

  const exportLogs = () => {
    const dataStr = JSON.stringify(logs, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `logs-${new Date().toISOString()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const levelColors: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> = {
    error: 'destructive',
    warn: 'default',
    info: 'secondary',
    debug: 'outline'
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <PageShell>
      <PageHeader
        title="Production Logs"
        subtitle="Monitor logs from live site in real-time"
      />
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Live Log Stream</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh ? (
                  <>
                    <Pause className="mr-2 size-4" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="mr-2 size-4" />
                    Resume
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void fetchLogs()}
                disabled={loading}
              >
                <RefreshCw className={`mr-2 size-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportLogs}
                disabled={logs.length === 0}
              >
                <Download className="mr-2 size-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap gap-2">
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Services" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                <SelectItem value="browser">Browser</SelectItem>
                <SelectItem value="websocket">WebSocket</SelectItem>
                <SelectItem value="nextjs">Next.js</SelectItem>
                <SelectItem value="gemini">Gemini</SelectItem>
                <SelectItem value="supabase">Supabase</SelectItem>
                <SelectItem value="resend">Resend</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="error">Errors</SelectItem>
                <SelectItem value="warn">Warnings</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Logs Display */}
          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No logs found. Try adjusting your filters or wait for new logs.
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-2 flex-wrap">
                    <Badge variant={levelColors[log.level] || 'default'}>
                      {log.level.toUpperCase()}
                    </Badge>
                    <Badge variant="outline">{log.service}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2 break-words">{log.message}</div>
                  {log.meta && Object.keys(log.meta).length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                        View metadata
                      </summary>
                      <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.meta, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  )
}

