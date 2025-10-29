"use client"

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { fbcPatterns } from '@/lib/elevenlabs-patterns'

export type Frame = number[][]
export type VoiceState = 'connecting' | 'initializing' | 'listening' | 'speaking' | 'thinking' | 'idle'

interface MatrixSVGProps extends React.HTMLAttributes<HTMLDivElement> {
  rows?: number
  cols?: number
  pattern?: Frame
  frames?: Frame[]
  fps?: number
  autoplay?: boolean
  loop?: boolean
  size?: number
  gap?: number
  palette?: {
    on: string
    off: string
  }
  brightness?: number
  ariaLabel?: string
  onFrame?: (index: number) => void
  mode?: 'default' | 'vu' | 'voice-state'
  levels?: number[]
  voiceState?: VoiceState
  audioData?: Uint8Array
}

// Helper function for VU meter
export function vu(rows: number, levels: number[]): Frame {
  const cols = levels.length
  const frame: Frame = Array(rows)
    .fill(null)
    .map(() => Array(cols).fill(0))

  levels.forEach((level, colIndex) => {
    const filledRows = Math.round(level * rows)
    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      if (rows - rowIndex <= filledRows) {
        frame[rowIndex][colIndex] = 1
      }
    }
  })

  return frame
}

// Presets - Imported from existing patterns
export const digits: Frame[] = [
  // 0
  [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  // 1
  [
    [0, 0, 1, 0, 0],
    [0, 1, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
  ],
  // 2
  [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0],
    [1, 1, 1, 1, 1],
  ],
  // 3
  [
    [1, 1, 1, 1, 0],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 1, 0],
    [0, 1, 1, 0, 0],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
  ],
  // 4
  [
    [0, 0, 0, 1, 0],
    [0, 0, 1, 1, 0],
    [0, 1, 0, 1, 0],
    [1, 0, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 1, 0],
  ],
  // 5
  [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 0],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
  ],
  // 6
  [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  // 7
  [
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
  ],
  // 8
  [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  // 9
  [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
]

// Rotating spinner animation (7×7, 12 frames)
export const loader: Frame[] = [
  // Frame 1 - top
  [
    [0, 0, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ],
  // Frame 2 - top-right
  [
    [0, 0, 0, 1, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ],
  // Frame 3 - right-top
  [
    [0, 0, 0, 0, 1, 1, 1],
    [0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ],
  // Frame 4 - right
  [
    [0, 0, 0, 0, 0, 1, 1],
    [0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ],
  // Frame 5 - right-bottom
  [
    [0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ],
  // Frame 6 - bottom-right
  [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 1],
  ],
  // Frame 7 - bottom
  [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [1, 1, 1, 0, 0, 0, 0],
  ],
  // Frame 8 - bottom-left
  [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0],
    [1, 1, 1, 0, 0, 0, 0],
  ],
  // Frame 9 - left-bottom
  [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0],
    [1, 1, 0, 0, 0, 0, 0],
  ],
  // Frame 10 - left
  [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0],
  ],
  // Frame 11 - left-top
  [
    [1, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ],
  // Frame 12 - top-left
  [
    [1, 1, 1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ],
]

// Expanding pulse effect (7×7, 16 frames)
export const pulse: Frame[] = [
  // Frame 1 - center dot
  [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ],
  // Frame 2 - small cross
  [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ],
  // Frame 3 - small diamond
  [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ],
  // Add more frames expanding to full grid and fading
  ...Array(13).fill(null).map((_, index) => {
    const frame: Frame = Array(7).fill(null).map(() => Array(7).fill(1))
    const fadeProgress = index / 13
    return frame.map((row) => row.map((cell) => cell * (1 - fadeProgress)))
  }),
]

// Smooth sine wave animation (7×7, 24 frames)
export const wave: Frame[] = Array.from({ length: 24 }, (_, frameIndex) => {
  const frame: Frame = Array(7)
    .fill(null)
    .map(() => Array(7).fill(0))

  for (let x = 0; x < 7; x++) {
    const phase = (frameIndex / 24) * Math.PI * 2
    const y = Math.round(3 + Math.sin((x / 7) * Math.PI * 2 + phase) * 2)
    if (y >= 0 && y < 7) {
      frame[y][x] = 1
    }
  }

  return frame
})

// Snake traversal pattern (7×7, ~40 frames)
export const snake: Frame[] = (() => {
  const frames: Frame[] = []
  const positions: [number, number][] = []

  // Create snake path
  for (let y = 0; y < 7; y++) {
    if (y % 2 === 0) {
      for (let x = 0; x < 7; x++) {
        positions.push([x, y])
      }
    } else {
      for (let x = 6; x >= 0; x--) {
        positions.push([x, y])
      }
    }
  }

  // Create frames
  for (let i = 0; i < positions.length; i++) {
    const frame: Frame = Array(7)
      .fill(null)
      .map(() => Array(7).fill(0))

    // Draw snake tail
    for (let j = Math.max(0, i - 5); j <= i; j++) {
      const [x, y] = positions[j]
      frame[y][x] = (j - Math.max(0, i - 5)) / 5
    }

    frames.push(frame)
  }

  return frames
})()

// Chevron left arrow (5×5)
export const chevronLeft: Frame = [
  [0, 1, 0, 0, 0],
  [1, 0, 0, 0, 0],
  [1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0],
  [0, 1, 0, 0, 0],
]

// Chevron right arrow (5×5)
export const chevronRight: Frame = [
  [0, 0, 0, 1, 0],
  [0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 1],
  [0, 0, 0, 1, 0],
]

export const MatrixSVG = React.forwardRef<HTMLDivElement, MatrixSVGProps>(({
  rows = 7,
  cols = 7,
  pattern,
  frames,
  fps = 12,
  autoplay = true,
  loop = true,
  size = 4,
  gap = 1,
  palette = {
    on: 'hsl(var(--primary))',
    off: 'hsl(var(--muted))',
  },
  brightness = 1,
  ariaLabel = 'Matrix display',
  onFrame,
  mode = 'default',
  levels = [],
  voiceState,
  audioData,
  className,
  ...props
}, ref) => {
  const [currentFrame, setCurrentFrame] = useState(0)
  const rafRef = useRef<number>()
  const lastTimeRef = useRef<number>(0)
  const accumulatorRef = useRef<number>(0)

  // Audio processing for voice-state mode
  const processLevels = useMemo(() => {
    if (!audioData || !cols) return Array(cols).fill(0)
    
    // Intelligently map frequency bins to columns
    // With fftSize 512, we have 256 frequency bins
    // Map to columns by averaging chunks
    const binsPerColumn = Math.max(1, Math.floor(audioData.length / cols))
    
    return Array(cols).fill(0).map((_, colIndex) => {
      const startIdx = colIndex * binsPerColumn
      const endIdx = Math.min(startIdx + binsPerColumn, audioData.length)
      
      // Average the frequency bins in this chunk for smoother visualization
      let sum = 0
      for (let i = startIdx; i < endIdx; i++) {
        sum += audioData[i] ?? 0
      }
      const avg = sum / (endIdx - startIdx)
      
      return avg / 255 // Normalize to 0-1 range
    })
  }, [audioData, cols])

  // VU meter mode
  const vuPattern = useMemo(() => {
    if (mode === 'vu' && levels.length > 0) {
      return vu(rows, levels)
    }
    return null
  }, [mode, levels, rows])

  // Voice-state mode
  const voiceStatePattern = useMemo(() => {
    if (mode !== 'voice-state' || !voiceState) return null

    const levelsData = processLevels
    let selectedFrames: Frame[] | undefined

    switch (voiceState) {
      case 'connecting':
        selectedFrames = loader
        break
      case 'initializing':
        selectedFrames = pulse
        break
      case 'listening':
        return vu(rows, levelsData)
      case 'speaking':
        selectedFrames = wave
        break
      case 'thinking':
        selectedFrames = snake
        break
      case 'idle':
        selectedFrames = Object.values(fbcPatterns).map(p => p as Frame)
        break
    }

    if (selectedFrames) {
      return selectedFrames[currentFrame % selectedFrames.length]
    }
    return null
  }, [mode, voiceState, processLevels, rows, currentFrame])

  // Get current display pattern
  const displayPattern = useMemo(() => {
    if (vuPattern) return vuPattern
    if (voiceStatePattern) return voiceStatePattern
    if (pattern) return pattern
    if (frames && frames.length > 0) return frames[currentFrame]
    return Array(rows).fill(Array(cols).fill(0))
  }, [vuPattern, voiceStatePattern, pattern, frames, currentFrame, rows, cols])

  // Animation loop with RAF accumulator
  useEffect(() => {
    if (!frames || !autoplay || mode === 'vu' || mode === 'voice-state') {
      // For voice-state, we still animate through frames (loader, pulse, wave, snake, fbcPatterns)
      if (mode === 'voice-state' && voiceState) {
        const animate = (time: number) => {
          if (lastTimeRef.current === 0) {
            lastTimeRef.current = time
          }

          const delta = time - lastTimeRef.current
          lastTimeRef.current = time
          accumulatorRef.current += delta

          const frameDuration = 1000 / fps

          if (accumulatorRef.current >= frameDuration) {
            accumulatorRef.current -= frameDuration
            
            let selectedFrames: Frame[] | undefined
            switch (voiceState) {
              case 'connecting':
                selectedFrames = loader
                break
              case 'initializing':
                selectedFrames = pulse
                break
              case 'speaking':
                selectedFrames = wave
                break
              case 'thinking':
                selectedFrames = snake
                break
              case 'idle':
                selectedFrames = Object.values(fbcPatterns).map(p => p as Frame)
                break
            }

            if (selectedFrames && selectedFrames.length > 0) {
              setCurrentFrame((prev) => {
                const next = (prev + 1) % selectedFrames.length
                if (next === 0 && !loop) {
                  return prev
                }
                onFrame?.(next)
                return next
              })
            }

            rafRef.current = requestAnimationFrame(animate)
          } else {
            rafRef.current = requestAnimationFrame(animate)
          }
        }

        rafRef.current = requestAnimationFrame(animate)
        return () => {
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current)
          }
          lastTimeRef.current = 0
          accumulatorRef.current = 0
        }
      }
      return
    }

    const frameDuration = 1000 / fps

    const animate = (time: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = time
      }

      const delta = time - lastTimeRef.current
      lastTimeRef.current = time
      accumulatorRef.current += delta

      if (accumulatorRef.current >= frameDuration) {
        accumulatorRef.current -= frameDuration
        setCurrentFrame((prev) => {
          const next = (prev + 1) % frames.length
          if (next === 0 && !loop) {
            return prev
          }
          onFrame?.(next)
          return next
        })
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      lastTimeRef.current = 0
      accumulatorRef.current = 0
    }
  }, [frames, fps, autoplay, loop, onFrame, mode, voiceState])

  // Calculate dimensions
  const width = cols * size + (cols - 1) * gap
  const height = rows * size + (rows - 1) * gap

  return (
    <div
      ref={ref}
      role="img"
      aria-label={ariaLabel}
      aria-live={frames ? 'polite' : undefined}
      className={cn('inline-block', className)}
      {...props}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ display: 'block', maxWidth: '100%' }}
      >
        {displayPattern.map((row: number[], rowIndex: number) =>
          row.map((cellBrightness: number, colIndex: number) => {
            const x = colIndex * (size + gap) + size / 2
            const y = rowIndex * (size + gap) + size / 2
            const opacity = Math.max(0, Math.min(1, cellBrightness * brightness))
            const color = opacity > 0.1 ? palette.on : palette.off

            return (
              <circle
                key={`${rowIndex}-${colIndex}`}
                cx={x}
                cy={y}
                r={size / 2}
                fill={color}
                opacity={opacity}
              />
            )
          })
        )}
      </svg>
    </div>
  )
})

MatrixSVG.displayName = 'MatrixSVG'

