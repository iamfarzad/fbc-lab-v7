"use client"

import React from 'react'
import { Matrix, type VoiceState as MatrixVoiceState } from './matrix'
import { MatrixSVG } from './matrix-svg'
import { cn } from '@/lib/utils'

// Re-export VoiceState type
export type VoiceState = MatrixVoiceState

interface VoiceMatrixProps {
  voiceState?: VoiceState
  audioData?: Uint8Array
  rows?: number
  cols?: number
  size?: number
  className?: string
  variant?: 'voice' | 'agents' | 'status' | 'data'
  useSVG?: boolean
}

// Voice-specific themes for different contexts
const VOICE_THEMES = {
  voice: {
    on: 'hsl(var(--primary) / 0.9)',
    off: 'hsl(var(--muted) / 0.15)'
  },
  agents: {
    on: 'hsl(var(--accent) / 0.85)',
    off: 'hsl(var(--secondary) / 0.1)'
  },
  status: {
    on: 'hsl(var(--accent) / 0.8)',
    off: 'hsl(var(--muted) / 0.1)'
  },
  data: {
    on: 'hsl(var(--primary) / 0.8)',
    off: 'hsl(var(--muted) / 0.1)'
  }
} as const

export const VoiceMatrix = React.forwardRef<HTMLDivElement, VoiceMatrixProps>(({
  voiceState = 'idle',
  audioData,
  rows = 24,
  cols = 64,
  size = 4,
  className,
  variant = 'voice',
  useSVG = true, // Default to SVG for crisp rendering
  ...props
}, ref) => {
  // Determine palette based on variant
  const palette = VOICE_THEMES[variant] || VOICE_THEMES.voice

  // Choose component based on useSVG flag
  const Component = useSVG ? MatrixSVG : Matrix

  return (
      <Component
        ref={ref}
        rows={rows}
        cols={cols}
        mode="voice-state"
        voiceState={voiceState}
        audioData={audioData}
        size={size}
        palette={palette}
        brightness={variant === 'voice' ? 1.2 : 1.0} // Extra brightness for voice
        className={cn(
          'transition-all duration-200',
          variant === 'voice' && 'drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]',
          variant === 'agents' && 'drop-shadow-[0_0_6px_rgba(168,85,247,0.25)]',
          className
        )}
        aria-label={`Voice status: ${voiceState}`}
        {...props}
      />
  )
})

VoiceMatrix.displayName = 'VoiceMatrix'
