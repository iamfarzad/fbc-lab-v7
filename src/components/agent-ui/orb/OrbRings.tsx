"use client"

import { useMemo } from 'react'

export interface OrbRingsProps {
  /** Whether rings should be visible */
  isActive: boolean
  /** Current frame for animation */
  frame: number
  /** Number of columns in grid */
  cols: number
  /** Number of rows in grid */
  rows: number
  /** Cell size */
  size: number
  /** Gap between cells */
  gap: number
}

/**
 * Animated SVG rings overlay for the orb visualizer
 * Shows pulsing rings when voice is active (listening or speaking)
 */
export function OrbRings({ isActive, frame, cols, rows, size, gap }: OrbRingsProps) {
  const ringProps = useMemo(() => {
    if (!isActive) return null

    const centerX = (cols * size + (cols - 1) * gap) / 2
    const centerY = (rows * size + (rows - 1) * gap) / 2
    const time = frame * 0.05
    
    // Animated ring radii
    const ringRadius1 = (18 + Math.sin(time * 0.7) * 2) * (size + gap)
    const ringRadius2 = (28 + Math.sin(time * 0.5 + 1) * 2) * (size + gap)

    return {
      centerX,
      centerY,
      ringRadius1,
      ringRadius2,
      viewBox: `0 0 ${cols * size + (cols - 1) * gap} ${rows * size + (rows - 1) * gap}`,
    }
  }, [isActive, frame, cols, rows, size, gap])

  if (!ringProps) return null

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-10"
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
      viewBox={ringProps.viewBox}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <circle
        cx={ringProps.centerX}
        cy={ringProps.centerY}
        r={ringProps.ringRadius1}
        fill="none"
        stroke="hsl(var(--accent))"
        strokeWidth="1"
        opacity="0.5"
      />
      <circle
        cx={ringProps.centerX}
        cy={ringProps.centerY}
        r={ringProps.ringRadius2}
        fill="none"
        stroke="hsl(var(--accent))"
        strokeWidth="1"
        opacity="0.4"
      />
    </svg>
  )
}

