'use client'

import { Matrix, Orb } from '@/components/ui'
import { useSimulatedAudio } from '@/hooks/useElevenLabsAudio'
import { useState } from 'react'

export function VisualizationComparison() {
  const [isActive, setIsActive] = useState(true)
  const { levels, volume } = useSimulatedAudio(isActive, 100)
  
  return (
    <div className="space-y-12">
      {/* Controls */}
      <div className="flex justify-center gap-4">
        <button
          onClick={() => setIsActive(!isActive)}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            isActive 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          {isActive ? 'Stop Simulation' : 'Start Simulation'}
        </button>
      </div>
      
      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Matrix VU Meter */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-center">Matrix VU Meter</h3>
          <div className="bg-muted/30 rounded-lg p-8 flex justify-center">
            <Matrix
              rows={7}
              cols={12}
              mode="vu"
              levels={levels}
              size={12}
              gap={2}
              palette={{
                on: "hsl(var(--primary))",
                off: "hsl(var(--muted-foreground) / 0.3)"
              }}
            />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Real-time frequency visualization with 12 bands
          </p>
        </div>
        
        {/* Orb 3D Visualization */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-center">Orb 3D Sphere</h3>
          <div className="bg-muted/30 rounded-lg p-8 flex justify-center">
            <Orb
              agentState={isActive ? 'talking' : null}
              manualInput={volume}
              manualOutput={volume}
              volumeMode="manual"
              className="w-32 h-32"
            />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            3D audio sphere with volume-based animation
          </p>
        </div>
        
        {/* Hybrid Combination */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-center">Hybrid View</h3>
          <div className="bg-muted/30 rounded-lg p-8 space-y-4">
            <div className="flex justify-center">
              <Orb
                agentState={isActive ? 'talking' : null}
                manualInput={volume}
                manualOutput={volume}
                volumeMode="manual"
                className="w-24 h-24"
              />
            </div>
            <Matrix
              rows={5}
              cols={12}
              mode="vu"
              levels={levels}
              size={8}
              gap={1}
              palette={{
                on: "hsl(var(--primary))",
                off: "hsl(var(--muted-foreground) / 0.2)"
              }}
            />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Orb + Matrix combined for rich feedback
          </p>
        </div>
      </div>
      
      {/* Performance comparison */}
      <div className="bg-muted/20 rounded-lg p-6">
        <h4 className="text-lg font-semibold mb-4">Performance Comparison</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="font-mono text-2xl font-bold text-primary">60 FPS</div>
            <div className="text-muted-foreground">Matrix VU Meter</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-2xl font-bold text-primary">60 FPS</div>
            <div className="text-muted-foreground">Orb 3D</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-2xl font-bold text-primary">60 FPS</div>
            <div className="text-muted-foreground">Hybrid View</div>
          </div>
        </div>
      </div>
    </div>
  )
}
