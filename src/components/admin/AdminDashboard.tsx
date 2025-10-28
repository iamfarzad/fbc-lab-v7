'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { Message as ChatMessage } from '@/types/core'
import { MessageContent } from "@/components/ai-elements/core/message";
import { Response } from "@/components/ai-elements/core/response";
import {
  Brain,
  Download,
  Home,
  Mail,
  Server,
  TrendingUp,
  Users,
  Zap,
  MessageSquare,
  Send,
  RefreshCw,
  FileText
} from 'lucide-react'
import Link from 'next/link'

const navigationItems = [
  { id: 'overview', label: 'Overview', icon: Home, description: 'System overview and key metrics' },
  { id: 'logs', label: 'Logs', icon: FileText, description: 'Production log monitoring', isExternal: true, href: '/admin/logs' },
  { id: 'api-tester', label: 'API Tester', icon: Zap, description: 'Test all API endpoints' },
  { id: 'admin-chat', label: 'Admin Chat', icon: MessageSquare, description: 'Chat with full system context' },
  { id: 'leads', label: 'Leads', icon: Users, description: 'Lead management and scoring' },
  { id: 'conversations', label: 'Conversations', icon: Mail, description: 'View all conversations' },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp, description: 'Business performance insights' },
  { id: 'system-health', label: 'System Health', icon: Server, description: 'Real-time system monitoring' }
] as const

type NavigationItemId = (typeof navigationItems)[number]['id']

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

interface Conversation {
  id: string
  name: string | null
  email: string | null
  summary: string | null
  leadScore: number | null
  createdAt: string
}

const API_ENDPOINTS = [
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

export function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<NavigationItemId>('overview')
  const [stats, setStats] = useState<Stats | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  // API Tester state
  const [selectedEndpoint, setSelectedEndpoint] = useState(API_ENDPOINTS[0].endpoints[0])
  const [apiParams, setApiParams] = useState<Record<string, string>>({})
  const [apiResponse, setApiResponse] = useState('')
  
  // Admin Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  useEffect(() => {
    if (activeSection === 'overview') {
      void fetchStats()
    } else if (activeSection === 'conversations') {
      void fetchConversations()
    }
  }, [activeSection])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/stats?period=7d')
      if (response.ok) {
        const data = await response.json() as Stats
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchConversations = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/conversations?period=last_30_days')
      if (response.ok) {
        const data = await response.json() as Conversation[]
        setConversations(data)
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      setLoading(false)
    }
  }

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

  const sendAdminChatMessage = async () => {
    if (!chatInput.trim()) return

    const userMessage: ChatMessage = { 
      id: crypto.randomUUID(),
      role: 'user', 
      content: chatInput,
      timestamp: new Date()
    }
    setChatMessages(prev => [...prev, userMessage])
    setChatInput('')
    setChatLoading(true)

    try {
      // Build system context with all available data
      const systemContext = {
        stats,
        conversations: conversations.slice(0, 10), // Recent conversations
        availableEndpoints: API_ENDPOINTS,
        timestamp: new Date().toISOString()
      }

      const response = await fetch('/api/chat/unified', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-query': 'true'
        },
        credentials: 'include',
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are F.B/c AI Admin Assistant. You have full access to system data and API endpoints. Current system context: ${JSON.stringify(systemContext, null, 2)}`
            },
            ...chatMessages,
            userMessage
          ],
          context: {
            sessionId: 'admin-session',
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        const assistantMessage: ChatMessage = { 
          id: crypto.randomUUID(),
          role: 'assistant', 
          content: data.content || data.message || 'Response received',
          timestamp: new Date()
        }
        setChatMessages(prev => [...prev, assistantMessage])
      } else {
        setChatMessages(prev => [...prev, { 
          id: crypto.randomUUID(),
          role: 'assistant', 
          content: 'Error: Failed to get response from admin chat endpoint',
          timestamp: new Date()
        }])
      }
    } catch (error) {
      setChatMessages(prev => [...prev, { 
        id: crypto.randomUUID(),
        role: 'assistant', 
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      }])
    } finally {
      setChatLoading(false)
    }
  }

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalLeads ?? 0}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.conversionRate ?? 0}%</div>
            <p className="text-xs text-muted-foreground">Qualified leads</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Lead Score</CardTitle>
            <Brain className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgLeadScore ?? 0}/10</div>
            <p className="text-xs text-muted-foreground">AI-powered scoring</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <Zap className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.engagementRate ?? 0}%</div>
            <p className="text-xs text-muted-foreground">With AI features</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top AI Capabilities Used</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {stats?.topAICapabilities?.map((cap) => (
              <Badge key={cap} variant="secondary">
                {cap}
              </Badge>
            )) ?? <p className="text-muted-foreground">No data available</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
              System Healthy
            </Badge>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
              AI Online
            </Badge>
            <Badge variant="outline" className="border-orange-200 text-orange-800 dark:border-orange-800 dark:text-orange-300">
              DB Connected
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderApiTester = () => (
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

  const renderAdminChat = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin Chat - Full System Context</CardTitle>
          <p className="text-sm text-muted-foreground">
            Chat with AI that has access to all API endpoints, visitor data, stats, and system information
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-[500px] overflow-y-auto rounded-lg border bg-muted/30 p-4 space-y-4">
            {chatMessages.length === 0 && (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="mx-auto mb-2 size-12" />
                  <p>Start a conversation to query system data, test endpoints, or analyze visitor behavior</p>
                </div>
              </div>
            )}
            
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={cn(
                "rounded-lg p-4",
                msg.role === 'user' 
                  ? "bg-primary text-primary-foreground ml-auto max-w-[80%]" 
                  : "bg-card max-w-[80%]"
              )}>
                <div className="mb-1 text-xs font-semibold opacity-70">
                  {msg.role === 'user' ? 'You' : 'F.B/c AI'}
                </div>
                <MessageContent>
                  <Response className="whitespace-pre-wrap text-sm">{msg.content}</Response>
                </MessageContent>
              </div>
            ))}
            
            {chatLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="size-4 animate-spin" />
                <span className="text-sm">F.B/c AI is thinking...</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Ask about stats, visitors, endpoints, or anything else..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void sendAdminChatMessage()
                }
              }}
              disabled={chatLoading}
            />
            <Button onClick={() => void sendAdminChatMessage()} disabled={chatLoading || !chatInput.trim()}>
              <Send className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderConversations = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Recent Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            {conversations
              .filter(conv => 
                !searchTerm || 
                conv.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                conv.email?.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((conv) => (
                <div key={conv.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold">{conv.name ?? 'Anonymous'}</h4>
                      <p className="text-sm text-muted-foreground">{conv.email ?? 'No email'}</p>
                      {conv.summary && (
                        <p className="mt-2 text-sm">{conv.summary}</p>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {new Date(conv.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {conv.leadScore !== null && (
                      <Badge variant={conv.leadScore >= 7 ? 'default' : 'secondary'}>
                        Score: {conv.leadScore}/10
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            
            {conversations.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                No conversations found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return renderOverview()
      case 'api-tester':
        return renderApiTester()
      case 'admin-chat':
        return renderAdminChat()
      case 'conversations':
        return renderConversations()
      default:
        return (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Coming soon
            </CardContent>
          </Card>
        )
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl p-6">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <header className="border-b border-border p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">Admin Dashboard</h2>
                <p className="mt-1 text-muted-foreground">System overview and management</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  if (activeSection === 'overview') void fetchStats()
                  if (activeSection === 'conversations') void fetchConversations()
                }}>
                  <RefreshCw className="mr-2 size-4" />
                  Refresh
                </Button>
                <Button variant="default" size="sm">
                  <Download className="mr-2 size-4" />
                  Export
                </Button>
              </div>
            </div>
            <nav className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {navigationItems.map((item) => {
                const Icon = item.icon
                const isActive = activeSection === item.id
                
                // External link (separate page)
                if ('isExternal' in item && item.isExternal && 'href' in item) {
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={cn(
                        "flex items-center rounded-lg border px-4 py-3 text-left transition hover:border-primary hover:bg-primary/5",
                        "border-border bg-background text-foreground"
                      )}
                    >
                      <Icon className="mr-3 size-5" />
                      <div>
                        <div className="font-semibold">{item.label}</div>
                        <div className="text-sm text-muted-foreground">{item.description}</div>
                      </div>
                    </Link>
                  )
                }
                
                // Internal section
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      "flex items-center rounded-lg border px-4 py-3 text-left transition hover:border-primary hover:bg-primary/5",
                      isActive 
                        ? "border-primary bg-primary/10 text-primary" 
                        : "border-border bg-background text-foreground"
                    )}
                  >
                    <Icon className="mr-3 size-5" />
                    <div>
                      <div className="font-semibold">{item.label}</div>
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                    </div>
                  </button>
                )
              })}
            </nav>
          </header>
          <div className="p-6">{renderSection()}</div>
        </div>
      </div>
    </div>
  )
}
