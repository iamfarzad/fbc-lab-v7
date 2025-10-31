'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Send } from 'lucide-react'

interface ApiEndpoint {
  name: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  params: string[]
}

interface ApiCategory {
  category: string
  endpoints: ApiEndpoint[]
}

const API_ENDPOINTS: ApiCategory[] = [
  {
    category: 'Admin',
    endpoints: [
      { name: 'Stats', method: 'GET', path: '/api/admin/stats', params: ['period'] },
      { name: 'Sessions', method: 'GET', path: '/api/admin/sessions', params: ['adminId'] },
      { name: 'Conversations', method: 'GET', path: '/api/admin/conversations', params: ['search', 'period'] },
      { name: 'Fly.io Usage', method: 'GET', path: '/api/admin/flyio/usage', params: [] },
      { name: 'Fly.io Settings', method: 'POST', path: '/api/admin/flyio/settings', params: ['monthlyBudget'] }
    ]
  },
  {
    category: 'Chat',
    endpoints: [
      { name: 'Unified Chat', method: 'POST', path: '/api/chat/unified', params: ['mode', 'messages', 'sessionId'] },
      { name: 'Attachments', method: 'POST', path: '/api/chat/attachments', params: [] },
      { name: 'Transcribe', method: 'POST', path: '/api/chat/transcribe', params: [] }
    ]
  },
  {
    category: 'Intelligence',
    endpoints: [
      { name: 'Analyze Image', method: 'POST', path: '/api/intelligence/analyze-image', params: ['image'] },
      { name: 'Context', method: 'POST', path: '/api/intelligence/context', params: ['messages'] },
      { name: 'Education', method: 'POST', path: '/api/intelligence/education', params: ['question'] },
      { name: 'Intent', method: 'POST', path: '/api/intelligence/intent', params: ['message'] },
      { name: 'Lead Research', method: 'POST', path: '/api/intelligence/lead-research', params: ['name', 'email'] },
      { name: 'Session Init', method: 'POST', path: '/api/intelligence/session-init', params: ['sessionId'] },
      { name: 'Suggestions', method: 'POST', path: '/api/intelligence/suggestions', params: ['context'] }
    ]
  },
  {
    category: 'Analytics',
    endpoints: [
      { name: 'Chat Flow', method: 'POST', path: '/api/analytics/chat-flow', params: ['event', 'sessionId'] },
      { name: 'Error', method: 'POST', path: '/api/analytics/error', params: ['error', 'sessionId'] },
      { name: 'Safety', method: 'POST', path: '/api/analytics/safety', params: ['incident', 'sessionId'] }
    ]
  },
  {
    category: 'Tools',
    endpoints: [
      { name: 'Screen', method: 'POST', path: '/api/tools/screen', params: ['action'] },
      { name: 'Search', method: 'POST', path: '/api/tools/search', params: ['query'] },
      { name: 'Webcam', method: 'POST', path: '/api/tools/webcam', params: ['action'] }
    ]
  },
  {
    category: 'System',
    endpoints: [
      { name: 'Health', method: 'GET', path: '/api/health', params: [] },
      { name: 'Export Summary', method: 'POST', path: '/api/export-summary', params: ['sessionId'] }
    ]
  }
]

export function ApiTesterSection() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint>(API_ENDPOINTS[0].endpoints[0])
  const [apiParams, setApiParams] = useState<Record<string, string>>({})
  const [apiResponse, setApiResponse] = useState('')
  const [loading, setLoading] = useState(false)

  const testApiEndpoint = async () => {
    setLoading(true)
    setApiResponse('')
    
    try {
      const url = new URL(selectedEndpoint.path, window.location.origin)
      
      // Add query params for GET requests
      if (selectedEndpoint.method === 'GET') {
        Object.entries(apiParams).forEach(([key, value]) => {
          if (value) url.searchParams.append(key, value)
        })
      }

      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      }

      // Add body for POST requests
      if (selectedEndpoint.method === 'POST') {
        options.body = JSON.stringify(apiParams)
      }

      const response = await fetch(url.toString(), options)
      const data = await response.json()
      
      setApiResponse(JSON.stringify(data, null, 2))
    } catch (error) {
      setApiResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Endpoint Tester</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Select Endpoint</Label>
            <div className="mt-2 space-y-2">
              {API_ENDPOINTS.map((category) => (
                <div key={category.category}>
                  <h3 className="mb-2 font-semibold text-sm">{category.category}</h3>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {category.endpoints.map((endpoint) => (
                      <Button
                        key={endpoint.path}
                        variant={selectedEndpoint.path === endpoint.path ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setSelectedEndpoint(endpoint)
                          setApiParams({})
                          setApiResponse('')
                        }}
                        className="justify-start"
                      >
                        <Badge variant="outline" className="mr-2">{endpoint.method}</Badge>
                        {endpoint.name}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border bg-muted p-4">
            <div className="mb-2 flex items-center gap-2">
              <Badge>{selectedEndpoint.method}</Badge>
              <code className="text-sm">{selectedEndpoint.path}</code>
            </div>
            
            {selectedEndpoint.params.length > 0 && (
              <div className="mt-4 space-y-2">
                <Label>Parameters</Label>
                {selectedEndpoint.params.map((param) => (
                  <div key={param}>
                    <Label className="text-xs">{param}</Label>
                    <Input
                      placeholder={`Enter ${param}`}
                      value={apiParams[param] ?? ''}
                      onChange={(e) => setApiParams({ ...apiParams, [param]: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                ))}
              </div>
            )}

            <Button 
              onClick={() => void testApiEndpoint()} 
              disabled={loading}
              className="mt-4 w-full"
            >
              {loading ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
              Test Endpoint
            </Button>
          </div>

          {apiResponse && (
            <div>
              <Label>Response</Label>
              <Textarea
                value={apiResponse}
                readOnly
                className="mt-2 font-mono text-xs"
                rows={20}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

