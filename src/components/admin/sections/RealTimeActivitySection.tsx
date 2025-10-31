'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Activity, Play, Square, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ActivityEvent {
  id: string
  timestamp: string
  type: 'api_call' | 'conversation' | 'tool_execution' | 'error' | 'system'
  message: string
  details?: Record<string, unknown>
}

export function RealTimeActivitySection() {
  const [activities, setActivities] = useState<ActivityEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const connect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    setError(null)
    setIsConnected(true)

    const eventSource = new EventSource('/api/admin/real-time-activity', {
      withCredentials: true,
    })

    eventSource.onopen = () => {
      setIsConnected(true)
      setError(null)
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'connected') {
          console.log('Connected to real-time activity stream')
        } else if (data.type === 'activity') {
          setActivities((prev) => {
            // Add new activity, keep only last 200
            const updated = [data.data, ...prev].slice(0, 200)
            return updated
          })

          // Auto-scroll to top (newest)
          setTimeout(() => {
            if (scrollAreaRef.current) {
              const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
              if (viewport) {
                viewport.scrollTop = 0
              }
            }
          }, 50)
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err)
      }
    }

    eventSource.onerror = (err) => {
      console.error('SSE error:', err)
      setIsConnected(false)
      setError('Connection lost. Click connect to retry.')
      eventSource.close()
    }

    eventSourceRef.current = eventSource
  }

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsConnected(false)
  }

  // Fetch initial activities
  const fetchInitialActivities = async () => {
    try {
      const response = await fetch('/api/admin/real-time-activity?limit=50')
      if (response.ok) {
        const data = await response.json()
        setActivities(data.activities || [])
      }
    } catch (err) {
      console.error('Failed to fetch initial activities:', err)
    }
  }

  useEffect(() => {
    void fetchInitialActivities()

    return () => {
      disconnect()
    }
  }, [])

  const getActivityBadgeVariant = (type: ActivityEvent['type']): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (type) {
      case 'error':
        return 'destructive'
      case 'api_call':
        return 'default'
      case 'conversation':
        return 'secondary'
      case 'tool_execution':
        return 'outline'
      case 'system':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="size-6" />
                Real-Time Activity Monitor
              </CardTitle>
              <CardDescription>
                Live system activity feed
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isConnected ? 'default' : 'secondary'}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
              {!isConnected ? (
                <Button variant="outline" size="sm" onClick={connect}>
                  <Play className="mr-2 size-4" />
                  Connect
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={disconnect}>
                  <Square className="mr-2 size-4" />
                  Disconnect
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => void fetchInitialActivities()}>
                <RefreshCw className="mr-2 size-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <ScrollArea className="h-[600px] w-full rounded-md border" ref={scrollAreaRef}>
            <div className="space-y-2 p-4">
              {activities.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No activity yet. Click Connect to start monitoring.
                </div>
              ) : (
                activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 rounded-lg border bg-card p-3 text-sm"
                  >
                    <Badge variant={getActivityBadgeVariant(activity.type)} className="shrink-0">
                      {activity.type.replace('_', ' ')}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{activity.message}</div>
                      {activity.details && Object.keys(activity.details).length > 0 && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {JSON.stringify(activity.details, null, 2).substring(0, 100)}
                          {JSON.stringify(activity.details).length > 100 ? '...' : ''}
                        </div>
                      )}
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>{activities.length} activities</span>
            <span>Auto-refresh: {isConnected ? 'Enabled' : 'Disabled'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

