'use client'

import { VideoConference } from '@livekit/components-react'
import { Chat } from '@livekit/components-react'
import { AudioConference } from '@livekit/components-react'
import { VoiceAssistantControlBar } from '@livekit/components-react'

export function AgentInterface() {
  return (
    <div className="min-h-screen bg-background">
      {/* Main Video Conference Interface */}
      <VideoConference
        data-lk-theme="default"
        style={{ height: '100vh' }}
      >
        {/* Chat Sidebar */}
        <div className="flex h-full">
          <div className="flex-1">
            {/* Video/Audio Conference Area */}
            <AudioConference />
          </div>
          
          {/* Chat Panel */}
          <div className="w-80 border-l bg-card">
            <Chat />
          </div>
        </div>
        
        {/* Control Bar */}
        <VoiceAssistantControlBar />
      </VideoConference>
    </div>
  )
}
