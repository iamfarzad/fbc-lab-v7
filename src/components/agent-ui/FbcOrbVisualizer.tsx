"use client"

import { useMemo } from 'react'
import { MatrixSVG } from '@/components/ui/matrix-svg'
import { useLiveApi } from '@/hooks/useLiveApi'
import { cn } from '@/lib/utils'
import type { VoiceState } from '@/lib/orb-patterns'
import { useAnimationFrame } from '@/hooks/useAnimationFrame'
import { useStateMorph } from '@/hooks/useStateMorph'
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer'
import { useOrbPattern } from '@/hooks/useOrbPattern'
import { OrbRings } from './orb/OrbRings'

export interface FbcOrbVisualizerProps {
  className?: string
  rows?: number
  cols?: number
  size?: number
  gap?: number
  paletteOn?: string
  paletteOff?: string
}

export function FbcOrbVisualizer({
  className,
  rows = 40,
  cols = 60,
  size = 3,
  gap = 1.2,
  paletteOn = 'hsl(var(--foreground))', // Match dark gray text/icons from layout
  paletteOff = 'transparent'
}: FbcOrbVisualizerProps) {
  const { micStream, isRecording, isProcessing, isSessionActive, isSocketReady } = useLiveApi()

  // Determine voice state from runtime flags
  const voiceState: VoiceState = useMemo(() => {
    if (!isSocketReady) return 'connecting'
    if (isProcessing) return 'thinking'
    if (isRecording) return 'listening'
    if (isSessionActive) return 'speaking'
    return 'idle'
  }, [isSocketReady, isProcessing, isRecording, isSessionActive])

  // Custom hooks for optimized state management
  const frame = useAnimationFrame({ fps: 20 })
  const { progress: morphProgress, prevState: prevVoiceState } = useStateMorph(voiceState)
  const audioLevels = useAudioAnalyzer(micStream, {
    binCount: 120,
    updateRate: 30,
  })

  // Generate orb pattern using custom hook
  const pattern = useOrbPattern({
    rows,
    cols,
    frame,
    voiceState,
    prevVoiceState,
    morphProgress,
    audioLevels,
  })

  const isActive = voiceState === 'listening' || voiceState === 'speaking'

  return (
    <div
      className={cn(
        'relative flex items-center justify-center',
        className
      )}
      role="img"
      aria-label={`Voice orb visualizer: ${voiceState}`}
    >
      <MatrixSVG
        rows={rows}
        cols={cols}
        pattern={pattern}
        size={size}
        gap={gap}
        palette={{ on: paletteOn, off: paletteOff }}
        brightness={1.0}
        ariaLabel="Radial voice visualizer"
      />
      <OrbRings
        isActive={isActive}
        frame={frame}
        cols={cols}
        rows={rows}
        size={size}
        gap={gap}
      />
    </div>
  )
}
