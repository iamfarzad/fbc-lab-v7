"use client"

import React, { useState, useEffect } from 'react'
import { FullscreenVoiceBar } from '@/components/ui/FullscreenVoiceBar'

// Generate simulated audio levels
const generateMockLevels = (): number[] => {
  return Array.from({ length: 5 }, () => 0.2 + Math.random() * 0.8)
}

export default function VoiceLevelTestPage() {
  const [levels, setLevels] = useState<number[]>(generateMockLevels())

  // Update levels periodically for animation
  useEffect(() => {
    const interval = setInterval(() => {
      setLevels(generateMockLevels())
    }, 200)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        <h1 className="text-3xl font-bold text-center mb-8">Voice Level Visualization Test</h1>
        
        {/* Instructions */}
        <div className="bg-card rounded-lg p-6 border mb-8">
          <h2 className="text-xl font-semibold mb-4">About This Test</h2>
          <p className="text-muted-foreground mb-4">
            This page demonstrates voice level visualization using the ElevenLabs Matrix component in VU meter mode.
            The vertical bars represent audio levels and animate in real-time to simulate voice activity.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Fullscreen Version:</strong> Large, centered visualization suitable for full-screen display
            </div>
            <div>
              <strong>Minimized Version:</strong> Compact version suitable for tiles or small spaces
            </div>
          </div>
        </div>

        {/* Unified Voice Bar - Fullscreen Mode */}
        <div className="bg-card rounded-lg p-6 border mb-8">
          <h2 className="text-xl font-semibold mb-4">Fullscreen Voice Visualization</h2>
          <div className="h-64 flex items-center justify-center bg-muted rounded-lg mb-4">
            <FullscreenVoiceBar levels={levels} mode="fullscreen" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            5 vertical bars with real-time animation (updates every 150ms)
          </p>
        </div>

        {/* Unified Voice Bar - Minimized Mode */}
        <div className="bg-card rounded-lg p-6 border mb-8">
          <h2 className="text-xl font-semibold mb-4">Minimized Voice Visualization</h2>
          <div className="flex justify-center gap-8 mb-4">
            <div className="text-center">
              <FullscreenVoiceBar levels={levels} mode="minimized" />
              <p className="text-sm text-muted-foreground mt-2">Tile 1</p>
            </div>
            <div className="text-center">
              <FullscreenVoiceBar levels={levels} mode="minimized" />
              <p className="text-sm text-muted-foreground mt-2">Tile 2</p>
            </div>
            <div className="text-center">
              <FullscreenVoiceBar levels={levels} mode="minimized" />
              <p className="text-sm text-muted-foreground mt-2">Tile 3</p>
            </div>
            <div className="text-center">
              <FullscreenVoiceBar levels={levels} mode="minimized" />
              <p className="text-sm text-muted-foreground mt-2">Tile 4</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Compact 64x64 tiles with 5 vertical bars each (updates every 100ms)
          </p>
        </div>

        {/* Technical Details */}
        <div className="bg-card rounded-lg p-6 border">
          <h2 className="text-xl font-semibold mb-4">Technical Implementation</h2>
          <div className="space-y-4 text-sm">
            <div>
              <strong>Matrix Mode:</strong> <code>vu</code> (VU meter mode)
            </div>
            <div>
              <strong>Configuration:</strong> 5 columns, 7 rows (fullscreen), 5 rows (minimized)
            </div>
            <div>
              <strong>Animation:</strong> Levels array with values 0-1 for each bar height
            </div>
            <div>
              <strong>Colors:</strong> Blue-600 (active), Slate-100/Slate-800 (background)
            </div>
            <div>
              <strong>Performance:</strong> Uses React.memo and optimized rendering
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
