'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface HealthService {
  ok: boolean
  url?: string
  endpoint?: string
  model?: string
  latencyMs?: number
  error?: string
}

interface SystemHealth {
  timestamp: string
  env: string
  services: {
    api: HealthService
    liveApi: HealthService
    websocket: HealthService
  }
}

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <Badge className={cn(ok ? 'bg-emerald-600 hover:bg-emerald-600' : 'bg-red-600 hover:bg-red-600')}>
      {ok ? 'OK' : 'DOWN'}
    </Badge>
  )
}

export function SystemHealthPanel() {
  const [data, setData] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/system-health', { cache: 'no-store' })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Status ${res.status}`)
      }
      const json = await res.json() as SystemHealth
      setData(json)
    } catch (e: any) {
      setError(String(e?.message || e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [load])

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>System Health</CardTitle>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
          {data && (
            <Badge variant="outline">{new Date(data.timestamp).toLocaleTimeString()}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {data && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Environment: {data.env}</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {/* API */}
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Next.js API</div>
                  <StatusBadge ok={data.services.api.ok} />
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Endpoint: {data.services.api.endpoint || '/api/health'}
                </div>
                {typeof data.services.api.latencyMs === 'number' && (
                  <div className="text-sm">Latency: {data.services.api.latencyMs} ms</div>
                )}
                {data.services.api.error && (
                  <div className="text-xs text-destructive">{data.services.api.error}</div>
                )}
              </div>

              {/* Gemini Live API */}
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Gemini Live API</div>
                  <StatusBadge ok={data.services.liveApi.ok} />
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Model: {data.services.liveApi.model}
                </div>
                <div className="text-sm text-muted-foreground">
                  Endpoint: {data.services.liveApi.endpoint}
                </div>
                {typeof data.services.liveApi.latencyMs === 'number' && (
                  <div className="text-sm">Latency: {data.services.liveApi.latencyMs} ms</div>
                )}
                {data.services.liveApi.error && (
                  <div className="text-xs text-destructive">{data.services.liveApi.error}</div>
                )}
              </div>

              {/* WebSocket */}
              <div className="rounded-lg border p-3 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Realtime WebSocket</div>
                  <StatusBadge ok={data.services.websocket.ok} />
                </div>
                <div className="mt-1 text-sm text-muted-foreground break-all">
                  URL: {data.services.websocket.url}
                </div>
                {typeof data.services.websocket.latencyMs === 'number' && (
                  <div className="text-sm">Latency: {data.services.websocket.latencyMs} ms</div>
                )}
                {data.services.websocket.error && (
                  <div className="text-xs text-destructive">{data.services.websocket.error}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


