"use client"

import React from 'react'
import { Matrix } from './matrix'
import { MatrixSVG } from './matrix-svg'
import { cn } from '@/lib/utils'
import type { VoiceState } from '@/lib/orb-patterns'

export type { VoiceState }

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
    on: 'hsl(var(--accent))', // Use bright orange accent for maximum visibility
    off: 'hsl(var(--muted-foreground) / 0.15)' // Reduced opacity for better contrast
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
        brightness={variant === 'voice' ? 1.3 : 1.0} // Increased brightness for better visibility
        className={cn(
          'transition-all duration-300 ease-out', // Smoother transitions
          variant === 'voice' && 'drop-shadow-[0_0_16px_hsl(var(--accent)/0.5)]',
          variant === 'agents' && 'drop-shadow-[0_0_8px_hsl(var(--accent)/0.3)]',
          className
        )}
        aria-label={`Voice status: ${voiceState}`}
        {...props}
      />
  )
})

VoiceMatrix.displayName = 'VoiceMatrix'
