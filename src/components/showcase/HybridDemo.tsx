'use client'

import { Matrix, Orb } from '@/components/ui'
import { useSimulatedAudio } from '@/hooks/useElevenLabsAudio'
import { useState } from 'react'

export function HybridDemo() {
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
          {isActive ? 'Stop Animation' : 'Start Animation'}
        </button>
      </div>
      
      {/* Hybrid compositions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Orb with Matrix Ring */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-center">Orb with Matrix Ring</h3>
          <div className="bg-muted/30 rounded-lg p-8 flex justify-center">
            <div className="relative w-64 h-64">
              {/* Center Orb */}
              <Orb
                agentState={isActive ? 'talking' : null}
                manualInput={volume}
                manualOutput={volume}
                volumeMode="manual"
                className="absolute inset-8 z-10"
              />
              
              {/* Surrounding Matrix ring */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="grid grid-cols-4 gap-2">
                  {Array(16).fill(0).map((_, i) => (
                    <Matrix
                      key={i}
                      rows={3}
                      cols={3}
                      mode="vu"
                      levels={[levels[i % levels.length]]}
                      size={6}
                      gap={1}
                      palette={{
                        on: "hsl(var(--primary))",
                        off: "hsl(var(--muted-foreground) / 0.2)"
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Orb center with Matrix cells forming a ring
          </p>
        </div>
        
        {/* Stacked Layout */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-center">Stacked Layout</h3>
          <div className="bg-muted/30 rounded-lg p-8 space-y-6">
            {/* Orb on top */}
            <div className="flex justify-center">
              <Orb
                agentState={isActive ? 'talking' : null}
                manualInput={volume}
                manualOutput={volume}
                volumeMode="manual"
                className="w-32 h-32"
              />
            </div>
            
            {/* Matrix below */}
            <Matrix
              rows={7}
              cols={20}
              mode="vu"
              levels={levels}
              size={8}
              gap={2}
              palette={{
                on: "hsl(var(--primary))",
                off: "hsl(var(--muted-foreground) / 0.3)"
              }}
            />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Orb above, Matrix VU meter below
          </p>
        </div>
      </div>
      
      {/* Matrix forming Orb shape */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-center">Matrix Orb Shape</h3>
        <div className="bg-muted/30 rounded-lg p-8 flex justify-center">
          <div className="w-64 h-64 relative">
            {/* Generate circular matrix cells */}
            {Array(24).fill(0).map((_, i) => {
              const angle = (i / 24) * 2 * Math.PI
              const radius = 80
              const x = 128 + Math.cos(angle) * radius - 12
              const y = 128 + Math.sin(angle) * radius - 12
              const level = levels[Math.floor(i / 2) % levels.length]
              
              return (
                <Matrix
                  key={i}
                  rows={3}
                  cols={3}
                  mode="vu"
                  levels={[level]}
                  size={8}
                  gap={1}
                  style={{
                    position: 'absolute',
                    left: x,
                    top: y,
                    opacity: level
                  }}
                  palette={{
                    on: "hsl(var(--primary))",
                    off: "transparent"
                  }}
                />
              )
            })}
          </div>
        </div>
        <p className="text-sm text-muted-foreground text-center">
          Matrix cells arranged in circular pattern forming Orb shape
        </p>
      </div>
      
      {/* Performance note */}
      <div className="bg-muted/20 rounded-lg p-6 text-center">
        <h4 className="text-lg font-semibold mb-2">Hybrid Performance</h4>
        <p className="text-sm text-muted-foreground">
          All hybrid compositions maintain 60 FPS with optimized rendering
        </p>
      </div>
    </div>
  )
}
