import { useMemo } from 'react'
import type { Frame } from '@/components/ui/matrix-svg'
import type { VoiceState } from '@/lib/orb-patterns'
import { getStateIntensity } from '@/lib/orb-patterns'
import { easeInOutCubic } from '@/lib/orb-utils'

export interface UseOrbPatternOptions {
  /** Number of rows in the grid */
  rows: number
  /** Number of columns in the grid */
  cols: number
  /** Current frame number for animation */
  frame: number
  /** Current voice state */
  voiceState: VoiceState
  /** Previous voice state for transitions */
  prevVoiceState: VoiceState
  /** Morph progress (0 to 1) */
  morphProgress: number
  /** Audio levels array for reactive patterns */
  audioLevels?: number[]
}

/**
 * Custom hook for generating orb patterns
 * 
 * Creates a radial pattern that morphs between voice states
 * 
 * @param options - Configuration options
 * @returns Frame array (2D grid of intensity values 0-1)
 * 
 * @example
 * const pattern = useOrbPattern({
 *   rows: 40,
 *   cols: 60,
 *   frame: currentFrame,
 *   voiceState: currentState,
 *   prevVoiceState: prevState,
 *   morphProgress: 0.5,
 *   audioLevels: levels
 * })
 */
export function useOrbPattern(options: UseOrbPatternOptions): Frame {
  const { rows, cols, frame, voiceState, prevVoiceState, morphProgress, audioLevels } = options

  return useMemo(() => {
    const centerX = cols / 2
    const centerY = rows / 2
    const out: Frame = Array.from({ length: rows }, () => Array(cols).fill(0))

    const time = frame * 0.05
    const morph = easeInOutCubic(morphProgress)

    // Generate pattern for each cell
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dx = c - centerX
        const dy = r - centerY
        const dist = Math.hypot(dx, dy)
        const angle = Math.atan2(dy, dx)

        // Get intensity for previous and current states
        const prevI = getStateIntensity({
          state: prevVoiceState,
          dx,
          dy,
          dist,
          angle,
          time,
          audioLevels,
        })

        const currI = getStateIntensity({
          state: voiceState,
          dx,
          dy,
          dist,
          angle,
          time,
          audioLevels,
        })

        // Interpolate between states
        const val = prevI * (1 - morph) + currI * morph
        out[r][c] = Math.min(1, Math.max(0, val))
      }
    }

    return out
  }, [rows, cols, frame, morphProgress, prevVoiceState, voiceState, audioLevels])
}

