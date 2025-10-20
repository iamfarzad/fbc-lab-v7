'use client'

import { Matrix, Orb, MicSelector, VoicePicker, ShimmeringText } from '@/components/ui'
import { useSimulatedAudio } from '@/hooks/useElevenLabsAudio'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff } from 'lucide-react'

export function FullVoiceInterfaceDemo() {
  const [isActive, setIsActive] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [, setSelectedDevice] = useState<string>('')
  const [selectedVoice, setSelectedVoice] = useState<string>('')
  
  const { levels, volume } = useSimulatedAudio(isActive, 60)
  
  const handleToggle = () => {
    if (isActive) {
      setIsActive(false)
      setIsProcessing(false)
    } else {
      setIsActive(true)
      // Simulate processing after 2 seconds
      setTimeout(() => {
        setIsProcessing(true)
        setTimeout(() => {
          setIsProcessing(false)
        }, 3000)
      }, 2000)
    }
  }
  
  const agentState = isProcessing ? 'thinking' : isActive ? 'talking' : null
  
  return (
    <div className="space-y-8">
      {/* Full voice interface simulation */}
      <div className="bg-muted/30 rounded-lg p-8 space-y-8">
        {/* Top: Hybrid Visualization */}
        <div className="flex items-center justify-center">
          <div className="space-y-6">
            {/* Main Orb */}
            <Orb
              agentState={agentState}
              manualInput={volume}
              manualOutput={volume}
              volumeMode="manual"
              className="w-48 h-48 mx-auto"
            />
            
            {/* Matrix VU Meter below */}
            <Matrix
              rows={7}
              cols={24}
              mode="vu"
              levels={levels}
              size={8}
              gap={2}
              palette={{
                on: "hsl(var(--primary))",
                off: "hsl(var(--muted-foreground) / 0.2)"
              }}
            />
            
            {/* Status text with shimmer */}
            {isProcessing && (
              <ShimmeringText 
                text="Processing your voice..." 
                className="text-center text-muted-foreground"
                duration={2}
              />
            )}
          </div>
        </div>
        
        {/* Middle: Simulated AI Response */}
        {isActive && !isProcessing && (
          <div className="bg-background/50 rounded-lg p-6 border">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">AI Response:</div>
              <div className="text-foreground">
                "I understand you're interested in the ElevenLabs UI components. 
                The Matrix component provides excellent real-time audio visualization, 
                while the Orb offers immersive 3D feedback. Together, they create 
                a powerful multimodal interface."
              </div>
            </div>
          </div>
        )}
        
        {/* Bottom: Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <MicSelector 
                onValueChange={setSelectedDevice}
                className="w-full"
              />
            </div>
            <div className="flex-1">
              <VoicePicker
                voices={[
                  { voiceId: 'default', name: 'F.B/c Default' },
                  { voiceId: 'professional', name: 'Professional' },
                  { voiceId: 'friendly', name: 'Friendly' }
                ]}
                value={selectedVoice}
                onValueChange={setSelectedVoice}
                className="w-full"
              />
            </div>
          </div>
          
          <Button
            onClick={handleToggle}
            size="lg"
            variant={isActive ? 'destructive' : 'default'}
            className="w-full"
          >
            {isActive ? (
              <>
                <MicOff className="mr-2 h-5 w-5" />
                Stop Voice
              </>
            ) : (
              <>
                <Mic className="mr-2 h-5 w-5" />
                Start Voice
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Feature highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
            <Orb agentState={null} className="w-8 h-8" />
          </div>
          <h4 className="font-semibold">3D Audio Sphere</h4>
          <p className="text-sm text-muted-foreground">
            Immersive visual feedback with volume-based animation
          </p>
        </div>
        
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
            <Matrix rows={5} cols={5} frames={undefined} size={6} />
          </div>
          <h4 className="font-semibold">Real-time VU Meter</h4>
          <p className="text-sm text-muted-foreground">
            Live frequency visualization with 24 bands
          </p>
        </div>
        
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
            <ShimmeringText text="..." className="text-2xl" />
          </div>
          <h4 className="font-semibold">Smart Status</h4>
          <p className="text-sm text-muted-foreground">
            Animated text feedback for all states
          </p>
        </div>
      </div>
    </div>
  )
}
