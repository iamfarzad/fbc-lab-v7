"use client"

import React from 'react'
import { VoiceMatrix } from './VoiceMatrix'
import { AgentMatrix, type AgentStatus } from './AgentMatrix'
import { useRealtimeVoice } from '@/hooks/useRealtimeVoice'
import { cn } from '@/lib/utils'

// Example component showing real-time voice visualization
export function VoiceVisualizationExample() {
  const {
    isSessionActive,
    isProcessing,
    isRecording,
    isSocketReady,
    error
  } = useRealtimeVoice()

  // Determine voice state based on session status
  const getVoiceState = () => {
    if (error) return 'idle'
    if (!isSocketReady) return 'connecting'
    if (isProcessing) return 'initializing'
    if (isRecording) return 'listening'
    if (isSessionActive) return 'speaking'
    return 'thinking'
  }

  const voiceState = getVoiceState()

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h3 className="text-lg font-semibold">Voice Status Visualization</h3>
      
      <VoiceMatrix
        voiceState={voiceState}
        variant="voice"
        className="transition-all duration-300"
      />
      
      <div className="text-sm text-muted-foreground text-center">
        State: {voiceState} | Recording: {isRecording ? 'Yes' : 'No'} | Session: {isSessionActive ? 'Active' : 'Inactive'}
      </div>
    </div>
  )
}

// Example component showing multi-agent status
export function AgentStatusExample() {
  const [agentStatuses, setAgentStatuses] = React.useState<AgentStatus[]>([
    'active',
    'processing', 
    'idle',
    'idle',
    'processing',
    'active',
    'error'
  ])

  // Simulate agent status changes
  React.useEffect(() => {
    const interval = setInterval(() => {
      setAgentStatuses(prev => 
        prev.map(() => {
          // Random status changes for demonstration
          const rand = Math.random()
          if (rand < 0.1) return 'error'
          if (rand < 0.3) return 'processing'
          if (rand < 0.6) return 'active'
          if (rand < 0.9) return 'idle'
          return 'offline'
        })
      )
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h3 className="text-lg font-semibold">Agent Status Matrix</h3>
      
      <AgentMatrix
        agents={agentStatuses}
        variant="expanded"
        size={4}
        className="transition-all duration-500"
      />
      
      <div className="text-sm text-muted-foreground text-center">
        {agentStatuses.filter(s => s === 'active').length} active | 
        {agentStatuses.filter(s => s === 'processing').length} processing | 
        {agentStatuses.filter(s => s === 'idle').length} idle | 
        {agentStatuses.filter(s => s === 'error').length} errors
      </div>
    </div>
  )
}

// Example showing all Matrix variants
export function MatrixVariantShowcase() {
  const voiceStates = ['connecting', 'initializing', 'listening', 'speaking', 'thinking', 'idle'] as const
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 p-4">
      <h3 className="col-span-full text-lg font-semibold text-center">Matrix Variants</h3>
      
      {voiceStates.map((state) => (
        <div key={state} className="flex flex-col items-center gap-2">
          <VoiceMatrix
            voiceState={state}
            variant="voice"
            className="border rounded-lg p-2"
          />
          <span className="text-xs text-muted-foreground capitalize">{state}</span>
        </div>
      ))}
      
      {/* Theme variants */}
      {['voice', 'agents', 'status', 'data'].map((variant) => (
        <div key={variant} className="flex flex-col items-center gap-2">
          <VoiceMatrix
            voiceState="speaking"
            variant={variant as any}
            className="border rounded-lg p-2"
          />
          <span className="text-xs text-muted-foreground capitalize">{variant} theme</span>
        </div>
      ))}
    </div>
  )
}

// Performance-optimized real-time audio visualization
export function AudioReactiveExample() {
  const [audioData, setAudioData] = React.useState<Uint8Array | null>(null)
  const [isSimulating, setIsSimulating] = React.useState(false)

  // Simulate audio data for demonstration
  React.useEffect(() => {
    if (!isSimulating) return

    const interval = setInterval(() => {
      const mockAudioData = new Uint8Array(1024)
      
      // Generate realistic audio frequency data
      for (let i = 0; i < mockAudioData.length; i++) {
        // Mix multiple frequency components
        const baseFreq = Math.sin((i / mockAudioData.length) * Math.PI * 2 * 4) * 50 + 128
        const midFreq = Math.sin((i / mockAudioData.length) * Math.PI * 2 * 8) * 30 + 128
        const highFreq = Math.sin((i / mockAudioData.length) * Math.PI * 2 * 16) * 20 + 128
        const noise = (Math.random() - 0.5) * 10
        
        mockAudioData[i] = Math.floor((baseFreq + midFreq + highFreq + noise) / 3)
      }
      
      setAudioData(mockAudioData)
    }, 50) // 20 FPS update rate

    return () => clearInterval(interval)
  }, [isSimulating])

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h3 className="text-lg font-semibold">Audio-Reactive Visualization</h3>
      
      <VoiceMatrix
        voiceState="listening"
        audioData={audioData || undefined}
        variant="voice"
        className="transition-all duration-75"
      />
      
      <button
        type="button"
        onClick={() => setIsSimulating(!isSimulating)}
        className={cn(
          "px-4 py-2 rounded-md text-sm font-medium transition-colors",
          isSimulating 
            ? "bg-red-500 text-white hover:bg-red-600" 
            : "bg-blue-500 text-white hover:bg-blue-600"
        )}
      >
        {isSimulating ? 'Stop Simulation' : 'Start Audio Simulation'}
      </button>
      
      <div className="text-sm text-muted-foreground text-center">
        {isSimulating ? 'Simulating real-time audio data' : 'Click to start audio simulation'}
      </div>
    </div>
  )
}
