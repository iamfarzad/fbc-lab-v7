'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Copy, ExternalLink, Terminal, CheckCircle, AlertCircle } from 'lucide-react'

export default function LiveKitTestPage() {
  const [copied, setCopied] = useState<string | null>(null)

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  const sandboxInfo = {
    sandboxId: 'fbclab-28xjmo',
    region: 'us-east-1',
    status: 'active'
  }

  const setupSteps = [
    {
      id: 'install-cli',
      title: 'Install LiveKit CLI',
      command: 'brew install livekit-cli',
      description: 'Install the LiveKit CLI using Homebrew'
    },
    {
      id: 'bootstrap-app',
      title: 'Bootstrap App from Template',
      command: `lk app create --sandbox ${sandboxInfo.sandboxId}`,
      description: 'Create a new app from the LiveKit template'
    },
    {
      id: 'launch-app',
      title: 'Launch Application',
      command: 'lk app start',
      description: 'Start the local development server'
    }
  ]

  const testFeatures = [
    {
      name: 'Real-time Audio/Video',
      description: 'Test WebRTC connections and media streaming',
      status: 'ready'
    },
    {
      name: 'Screen Sharing',
      description: 'Test screen capture and sharing capabilities',
      status: 'ready'
    },
    {
      name: 'Gemini AI Integration',
      description: 'Test Gemini-powered features and responses',
      status: 'ready'
    },
    {
      name: 'Multi-participant',
      description: 'Test multiple user connections',
      status: 'ready'
    }
  ]

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">LiveKit Sandbox Test</h1>
          <p className="text-muted-foreground">
            Test and interact with your LiveKit sandbox application
          </p>
        </div>

        {/* Sandbox Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Sandbox Information
            </CardTitle>
            <CardDescription>
              Your LiveKit sandbox environment details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Sandbox ID
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm">
                    {sandboxInfo.sandboxId}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(sandboxInfo.sandboxId, 'sandbox-id')}
                  >
                    {copied === 'sandbox-id' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Region
                </label>
                <Badge variant="secondary">{sandboxInfo.region}</Badge>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Status
                </label>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  {sandboxInfo.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Setup Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
            <CardDescription>
              Follow these steps to set up your LiveKit sandbox app locally
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {setupSteps.map((step, index) => (
              <div key={step.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-sm font-medium">
                    {index + 1}
                  </span>
                  <h3 className="font-medium">{step.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground ml-8">
                  {step.description}
                </p>
                <div className="ml-8 flex items-center gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono">
                    {step.command}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(step.command, step.id)}
                  >
                    {copied === step.id ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Test Features */}
        <Card>
          <CardHeader>
            <CardTitle>Test Features</CardTitle>
            <CardDescription>
              Available features to test in your LiveKit sandbox
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {testFeatures.map((feature) => (
                <div key={feature.name} className="flex items-start gap-3 p-4 border rounded-lg">
                  <div className="flex-shrink-0">
                    {feature.status === 'ready' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-medium">{feature.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Gemini Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Gemini AI Configuration</CardTitle>
            <CardDescription>
              Configure Gemini AI for your LiveKit sandbox
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Environment Variables
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm">
                    GEMINI_API_KEY=your_gemini_api_key_here
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard('GEMINI_API_KEY=your_gemini_api_key_here', 'gemini-key')}
                  >
                    {copied === 'gemini-key' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm">
                    GEMINI_MODEL=gemini-2.5-flash-native-audio-preview-09-2025
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard('GEMINI_MODEL=gemini-2.5-flash-native-audio-preview-09-2025', 'gemini-model')}
                  >
                    {copied === 'gemini-model' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Gemini Integration Notes</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Use Gemini 2.5 Flash with native audio support</li>
                <li>• Configure your API key in environment variables</li>
                <li>• Test real-time voice interactions with Gemini</li>
                <li>• Leverage Gemini's multimodal capabilities</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common actions for testing your LiveKit sandbox
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Open Sandbox Dashboard
              </Button>
              <Button variant="outline" className="gap-2">
                <Terminal className="h-4 w-4" />
                View Documentation
              </Button>
              <Button variant="outline" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Run Health Check
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Documentation Links */}
        <Card>
          <CardHeader>
            <CardTitle>Documentation & Resources</CardTitle>
            <CardDescription>
              Helpful links for working with LiveKit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Getting Started</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• <a href="#" className="text-primary hover:underline">LiveKit Documentation</a></li>
                  <li>• <a href="#" className="text-primary hover:underline">CLI Reference</a></li>
                  <li>• <a href="#" className="text-primary hover:underline">SDK Guides</a></li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Examples & Templates</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• <a href="#" className="text-primary hover:underline">React Examples</a></li>
                  <li>• <a href="#" className="text-primary hover:underline">Next.js Templates</a></li>
                  <li>• <a href="#" className="text-primary hover:underline">Gemini AI Integration</a></li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
