'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, RefreshCw, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface LogEntry {
  id: string
  timestamp: string
  level: string
  message: string
  service?: string
  source: 'admin' | 'production'
  metadata?: Record<string, unknown>
}

export function LogsSection() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState('all')
  const [level, setLevel] = useState<string>('all')

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('source', source)
      if (level !== 'all') {
        params.set('level', level)
      }

      const response = await fetch(`/api/admin/logs?${params}`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchLogs()
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => void fetchLogs(), 10000)
    return () => clearInterval(interval)
  }, [source, level])

  const getLevelBadge = (level: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      error: 'destructive',
      warn: 'outline',
      info: 'default',
      debug: 'secondary',
    }
    return <Badge variant={variants[level] || 'secondary'}>{level.toUpperCase()}</Badge>
  }

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="size-4 text-red-600" />
      case 'warn':
        return <AlertTriangle className="size-4 text-yellow-600" />
      case 'info':
        return <Info className="size-4 text-blue-600" />
      default:
        return <FileText className="size-4 text-muted-foreground" />
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-6" />
                Production Logs
              </CardTitle>
              <CardDescription>
                Monitor logs from live site in real-time
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="admin">Admin Actions</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => void fetchLogs()}>
                <RefreshCw className={`mr-2 size-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] w-full rounded-md border p-4">
            {loading && logs.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="size-8 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            ) : logs.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No logs found for the selected filters
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 rounded-lg border bg-card p-3 text-sm"
                  >
                    <div className="mt-0.5 shrink-0">
                      {getLevelIcon(log.level)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getLevelBadge(log.level)}
                        {log.service && (
                          <Badge variant="outline">{log.service}</Badge>
                        )}
                        <Badge variant="secondary">{log.source}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="font-mono text-xs break-words">
                        {log.message}
                      </div>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            Show metadata
                          </summary>
                          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>{logs.length} logs</span>
            <span>Auto-refresh: Enabled (10s)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
