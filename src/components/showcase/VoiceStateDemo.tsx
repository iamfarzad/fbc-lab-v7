'use client'

import { Matrix, Orb } from '@/components/ui'
import { loader, pulse, wave } from '@/components/ui/matrix'
import { useSimulatedAudio } from '@/hooks/useElevenLabsAudio'
import { useState, useEffect } from 'react'

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking'

export function VoiceStateDemo() {
  const [currentState, setCurrentState] = useState<VoiceState>('idle')
  const { levels, volume } = useSimulatedAudio(currentState !== 'idle', 80)
  
  // Auto-cycle through states for demo
  useEffect(() => {
    const states: VoiceState[] = ['idle', 'listening', 'processing', 'speaking']
    let currentIndex = 0
    
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % states.length
      setCurrentState(states[currentIndex])
    }, 3000)
    
    return () => clearInterval(interval)
  }, [])
  
  const stateConfig = {
    idle: {
      matrixFrames: undefined,
      matrixMode: 'default' as const,
      orbState: null,
      description: 'Ready to listen',
      color: 'text-muted-foreground'
    },
    listening: {
      matrixFrames: wave,
      matrixMode: 'default' as const,
      orbState: 'listening' as const,
      description: 'Listening to your voice',
      color: 'text-blue-500'
    },
    processing: {
      matrixFrames: pulse,
      matrixMode: 'default' as const,
      orbState: 'thinking' as const,
      description: 'Processing your request',
      color: 'text-yellow-500'
    },
    speaking: {
      matrixFrames: undefined,
      matrixMode: 'vu' as const,
      orbState: 'talking' as const,
      description: 'AI is responding',
      color: 'text-green-500'
    }
  }
  
  const config = stateConfig[currentState]
  
  return (
    <div className="space-y-8">
      {/* State indicator */}
      <div className="text-center">
        <div className={`text-2xl font-bold ${config.color} mb-2`}>
          {currentState.toUpperCase()}
        </div>
        <div className="text-muted-foreground">
          {config.description}
        </div>
      </div>
      
      {/* Main visualization */}
      <div className="flex justify-center">
        <div className="bg-muted/30 rounded-lg p-12 space-y-8">
          {/* Orb */}
          <div className="flex justify-center">
            <Orb
              agentState={config.orbState}
              manualInput={currentState === 'speaking' ? volume : 0}
              manualOutput={currentState === 'speaking' ? volume : 0}
              volumeMode="manual"
              className="w-48 h-48"
            />
          </div>
          
          {/* Matrix */}
          <div className="flex justify-center">
            {config.matrixMode === 'vu' ? (
              <Matrix
                rows={7}
                cols={16}
                mode="vu"
                levels={levels}
                size={10}
                gap={2}
                palette={{
                  on: "hsl(var(--primary))",
                  off: "hsl(var(--muted-foreground) / 0.3)"
                }}
              />
            ) : config.matrixFrames ? (
              <Matrix
                rows={7}
                cols={7}
                frames={config.matrixFrames}
                fps={16}
                size={12}
                gap={2}
                palette={{
                  on: "hsl(var(--primary))",
                  off: "hsl(var(--muted-foreground) / 0.3)"
                }}
              />
            ) : (
              <Matrix
                rows={7}
                cols={7}
                frames={loader}
                fps={12}
                size={12}
                gap={2}
                palette={{
                  on: "hsl(var(--muted-foreground) / 0.5)",
                  off: "hsl(var(--muted-foreground) / 0.1)"
                }}
              />
            )}
          </div>
        </div>
      </div>
      
      {/* State descriptions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(stateConfig).map(([state, stateConfig]) => (
          <div
            key={state}
            className={`p-4 rounded-lg border-2 transition-colors ${
              currentState === state
                ? 'border-primary bg-primary/5'
                : 'border-muted bg-muted/20'
            }`}
          >
            <div className={`font-semibold ${stateConfig.color} mb-2`}>
              {state.toUpperCase()}
            </div>
            <div className="text-sm text-muted-foreground">
              {stateConfig.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
