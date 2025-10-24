'use client'

import { useState } from 'react'
import { LiveKitRoom } from '@/components/livekit/LiveKitRoom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LiveKitDemoPage() {
  const [roomName, setRoomName] = useState('test-room')
  const [token, setToken] = useState('')
  const [serverUrl, setServerUrl] = useState('wss://fbc-j4spx71a.livekit.cloud')
  const [showRoom, setShowRoom] = useState(false)

  const handleStartDemo = () => {
    if (!token.trim()) {
      alert('Please enter a token')
      return
    }
    setShowRoom(true)
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">LiveKit Demo</h1>
          <p className="text-muted-foreground">
            Test LiveKit integration with your FBC backend
          </p>
        </div>

        {!showRoom ? (
          <Card>
            <CardHeader>
              <CardTitle>LiveKit Configuration</CardTitle>
              <CardDescription>
                Configure your LiveKit room connection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roomName">Room Name</Label>
                <Input
                  id="roomName"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Enter room name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="serverUrl">Server URL</Label>
                <Input
                  id="serverUrl"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="Enter LiveKit server URL"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="token">Token</Label>
                <Input
                  id="token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Enter LiveKit token"
                  type="password"
                />
              </div>
              
              <Button onClick={handleStartDemo} className="w-full">
                Start LiveKit Demo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">LiveKit Room Demo</h2>
              <Button 
                variant="outline" 
                onClick={() => setShowRoom(false)}
              >
                Back to Configuration
              </Button>
            </div>
            
            <LiveKitRoom
              roomName={roomName}
              token={token}
              serverUrl={serverUrl}
            />
          </div>
        )}
      </div>
    </div>
  )
}
