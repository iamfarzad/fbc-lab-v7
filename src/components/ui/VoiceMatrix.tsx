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

// Voice-specific themes with improved contrast
const VOICE_THEMES = {
  voice: {
    on: 'hsl(var(--primary))', // Full opacity for maximum visibility
    off: 'hsl(var(--muted-foreground) / 0.2)' // Slightly more visible for better contrast
  },
  agents: {
    on: 'hsl(var(--accent))',
    off: 'hsl(var(--muted-foreground) / 0.15)'
  },
  status: {
    on: 'hsl(var(--accent))',
    off: 'hsl(var(--muted-foreground) / 0.15)'
  },
  data: {
    on: 'hsl(var(--primary))',
    off: 'hsl(var(--muted-foreground) / 0.15)'
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
        brightness={variant === 'voice' ? 1.1 : 1.0} // Slight brightness boost
        className={cn(
          'transition-all duration-300 ease-out', // Smoother transitions
          variant === 'voice' && 'drop-shadow-[0_0_12px_hsl(var(--primary)/0.4)]',
          variant === 'agents' && 'drop-shadow-[0_0_8px_hsl(var(--accent)/0.3)]',
          className
        )}
        aria-label={`Voice status: ${voiceState}`}
        {...props}
      />
  )
})

VoiceMatrix.displayName = 'VoiceMatrix'
