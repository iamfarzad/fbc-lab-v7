"use client"

import React, { useState, useEffect } from 'react'
import { VoiceMatrix } from '@/components/ui/VoiceMatrix'
import { AgentMatrix } from '@/components/ui/AgentMatrix'
import type { VoiceState } from '@/components/ui/matrix'
import type { AgentStatus } from '@/components/ui/AgentMatrix'

// Simulate audio data
const generateMockAudioData = (): Uint8Array => {
  const data = new Uint8Array(1024)
  for (let i = 0; i < data.length; i++) {
    // Generate sine wave with some noise
    const time = Date.now() / 1000
    const frequency = 440 + Math.sin(time) * 100 // Varying frequency
    const amplitude = 128 + Math.sin(i * frequency / 44100 * Math.PI * 2) * 64
    data[i] = amplitude + (Math.random() - 0.5) * 20 // Add noise
  }
  return data
}

export default function MatrixTestPage() {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [audioData, setAudioData] = useState<Uint8Array>()
  const [agentStates, setAgentStates] = useState<AgentStatus[]>([
    'idle',
    'idle',
    'idle',
    'idle',
  ])

  // Generate mock audio data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (voiceState === 'speaking' || voiceState === 'listening') {
        setAudioData(generateMockAudioData())
      } else {
        setAudioData(undefined)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [voiceState])

  // Cycle through voice states
  useEffect(() => {
    const states: VoiceState[] = ['idle', 'connecting', 'initializing', 'listening', 'speaking', 'thinking']
    let index = 0

    const interval = setInterval(() => {
      index = (index + 1) % states.length
      setVoiceState(states[index])
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  // Update agent states periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setAgentStates([
        Math.random() < 0.7 ? 'active' : 'idle',
        Math.random() < 0.5 ? 'processing' : 'idle',
        Math.random() < 0.3 ? 'error' : 'active',
        Math.random() < 0.2 ? 'processing' : 'offline',
      ] as const)
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-center mb-8">Matrix Visualizer Test</h1>
        
        {/* Voice Matrix Test */}
        <div className="bg-card rounded-lg p-6 border">
          <h2 className="text-xl font-semibold mb-4">Voice Matrix - {voiceState}</h2>
          <div className="flex items-center justify-center mb-4">
            <VoiceMatrix 
              voiceState={voiceState} 
              audioData={audioData}
              variant="voice"
            />
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {(['idle', 'connecting', 'initializing', 'listening', 'speaking', 'thinking'] as VoiceState[]).map(state => (
              <button
                key={state}
                type="button"
                onClick={() => setVoiceState(state)}
                className={`px-3 py-1 rounded text-sm ${
                  voiceState === state 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-secondary text-secondary-foreground'
                }`}
              >
                {state}
              </button>
            ))}
          </div>
        </div>

        {/* Agent Matrix Test */}
        <div className="bg-card rounded-lg p-6 border">
          <h2 className="text-xl font-semibold mb-4">Agent Matrix</h2>
          <div className="flex items-center justify-center mb-4">
            <AgentMatrix agents={agentStates} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Agent 1: {agentStates[0]}</div>
            <div>Agent 2: {agentStates[1]}</div>
            <div>Agent 3: {agentStates[2]}</div>
            <div>Agent 4: {agentStates[3]}</div>
          </div>
        </div>

        {/* Theme Variants */}
        <div className="bg-card rounded-lg p-6 border">
          <h2 className="text-xl font-semibold mb-4">Theme Variants</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <VoiceMatrix voiceState="speaking" variant="voice" />
              <p className="text-sm mt-2">Voice</p>
            </div>
            <div className="text-center">
              <VoiceMatrix voiceState="speaking" variant="agents" />
              <p className="text-sm mt-2">Agents</p>
            </div>
            <div className="text-center">
              <VoiceMatrix voiceState="thinking" variant="status" />
              <p className="text-sm mt-2">Status</p>
            </div>
            <div className="text-center">
              <VoiceMatrix voiceState="listening" variant="data" />
              <p className="text-sm mt-2">Data</p>
            </div>
          </div>
        </div>

        {/* Size Variants */}
        <div className="bg-card rounded-lg p-6 border">
          <h2 className="text-xl font-semibold mb-4">Size Variants</h2>
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="text-center">
              <VoiceMatrix voiceState="speaking" size={2} />
              <p className="text-sm mt-2">2px</p>
            </div>
            <div className="text-center">
              <VoiceMatrix voiceState="speaking" size={4} />
              <p className="text-sm mt-2">4px</p>
            </div>
            <div className="text-center">
              <VoiceMatrix voiceState="speaking" size={6} />
              <p className="text-sm mt-2">6px</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
