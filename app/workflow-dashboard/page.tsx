'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Play, BarChart3, Settings, Activity } from 'lucide-react'

interface WorkflowTestResult {
  success: boolean
  result: {
    output: string
    agent: string
    metadata: {
      stage: string
      [key: string]: any
    }
  }
  message: string
}

interface WorkflowStats {
  totalExecutions: number
  successRate: number
  averageDuration: number
  agentDistribution: Record<string, number>
  stageDistribution: Record<string, number>
}

export default function WorkflowDashboard() {
  const [testResult, setTestResult] = useState<WorkflowTestResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [testMessage, setTestMessage] = useState('Hello, I need help with AI implementation')
  const [sessionId, setSessionId] = useState('test-session-' + Date.now())
  const [stats, setStats] = useState<WorkflowStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runWorkflowTest = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/workflow/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          message: testMessage
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Workflow test failed')
      }
      
      setTestResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      // TODO: Implement stats endpoint
      setStats({
        totalExecutions: 0,
        successRate: 0,
        averageDuration: 0,
        agentDistribution: {},
        stageDistribution: {}
      })
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflow Dashboard</h1>
          <p className="text-muted-foreground">
            Test and monitor the F.B/c sales funnel workflow
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Workflow System
        </Badge>
      </div>

      <Tabs defaultValue="test" className="space-y-4">
        <TabsList>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Test Workflow
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Statistics
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Test</CardTitle>
              <CardDescription>
                Test the workflow system with custom messages and session data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sessionId">Session ID</Label>
                  <Input
                    id="sessionId"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    placeholder="test-session-123"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testMessage">Test Message</Label>
                  <Input
                    id="testMessage"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Enter test message..."
                  />
                </div>
              </div>
              
              <Button 
                onClick={runWorkflowTest} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running Workflow...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Test
                  </>
                )}
              </Button>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {testResult && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Test Result
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Agent</Label>
                        <p className="text-sm text-muted-foreground">
                          {testResult.result.agent}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Stage</Label>
                        <Badge variant="outline">
                          {testResult.result.metadata.stage}
                        </Badge>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Response</Label>
                      <Textarea
                        value={testResult.result.output}
                        readOnly
                        className="mt-1 min-h-[100px]"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Metadata</Label>
                      <pre className="mt-1 p-3 bg-muted rounded-md text-xs overflow-auto">
                        {JSON.stringify(testResult.result.metadata, null, 2)}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Statistics</CardTitle>
              <CardDescription>
                Monitor workflow performance and usage patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{stats.totalExecutions}</div>
                    <div className="text-sm text-muted-foreground">Total Executions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{stats.successRate}%</div>
                    <div className="text-sm text-muted-foreground">Success Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{stats.averageDuration}ms</div>
                    <div className="text-sm text-muted-foreground">Avg Duration</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {Object.keys(stats.agentDistribution).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Active Agents</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading statistics...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Settings</CardTitle>
              <CardDescription>
                Configure workflow behavior and parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Workflow settings will be available in a future update.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}