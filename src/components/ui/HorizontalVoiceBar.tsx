"use client"

import React, { useState, useEffect } from 'react'
import { Matrix } from './matrix'
import { cn } from '@/lib/utils'

interface HorizontalVoiceBarProps {
  levels?: number[]
  className?: string
}

export const HorizontalVoiceBar = React.forwardRef<HTMLDivElement, HorizontalVoiceBarProps>(({
  levels = [0.9, 0.7, 0.6, 0.4, 0.3],
  className,
  ...props
}, ref) => {
  const [animatedLevels, setAnimatedLevels] = useState(levels)

  // Animate levels for demo purposes
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedLevels([
        0.2 + Math.random() * 0.8,
        0.2 + Math.random() * 0.8,
        0.2 + Math.random() * 0.8,
        0.2 + Math.random() * 0.8,
        0.2 + Math.random() * 0.8,
      ])
    }, 150)

    return () => clearInterval(interval)
  }, [])

  return (
    <div 
      ref={ref}
      className={cn(
        'w-full h-32 flex items-center justify-center bg-slate-100',
        className
      )}
      {...props}
    >
      <div className="w-full max-w-4xl mx-auto p-8">
        <Matrix
          rows={5}           // Use 5 rows for horizontal layout
          cols={5}             // 5 columns for horizontal nodes
          mode="vu"            // VU meter mode for vertical bars
          levels={animatedLevels}
          size={24}             // Smaller dots for horizontal layout
          gap={4}              // Tighter gaps
          palette={{
            on: 'hsl(221, 83%, 53%)', // Blue-600
            off: 'hsl(214, 32%, 91%)',   // Slate-100
          }}
          className="w-full h-full"
          style={{
            transform: 'rotate(-90deg)', // Rotate 90 degrees to make bars horizontal
            transformOrigin: 'center left' // Center rotation point
          }}
          ariaLabel="Horizontal voice level visualization with 5 bars"
        />
      </div>
    </div>
  )
})

HorizontalVoiceBar.displayName = 'HorizontalVoiceBar'
