"use client"

import React, { useState, useEffect } from 'react'
import { Matrix } from './matrix'
import { cn } from '@/lib/utils'

interface FullscreenVoiceBarProps {
  levels?: number[]
  className?: string
  mode?: 'fullscreen' | 'minimized'
}

export const FullscreenVoiceBar = React.forwardRef<HTMLDivElement, FullscreenVoiceBarProps>(({
  levels,
  className,
  mode = 'fullscreen',
  ...props
}, ref) => {
  const isFullscreen = mode === 'fullscreen'
  
  // Default levels based on mode
  const defaultLevels = isFullscreen 
    ? [0.85, 0.7, 0.6, 0.45, 0.35]
    : [0.9, 0.6, 0.7, 0.45, 0.2]
  
  const [animatedLevels, setAnimatedLevels] = useState(levels || defaultLevels)

  // Animate levels for demo purposes
  useEffect(() => {
    const intervalTime = isFullscreen ? 150 : 100
    const interval = setInterval(() => {
      setAnimatedLevels(Array.from({ length: 5 }, () => 0.2 + Math.random() * 0.8))
    }, intervalTime)

    return () => clearInterval(interval)
  }, [isFullscreen])

  // Configuration based on mode
  const matrixConfig = {
    rows: isFullscreen ? 7 : 5,
    cols: 5,
    size: isFullscreen ? 48 : 12,
    gap: isFullscreen ? 8 : 2,
    palette: {
      on: 'hsl(221, 83%, 53%)', // Blue-600
      off: isFullscreen ? 'hsl(214, 32%, 91%)' : 'hsl(215, 25%, 27%)' // Slate-100 or Slate-800
    }
  }

  const containerClass = isFullscreen
    ? 'fixed inset-0 flex items-center justify-center bg-slate-100'
    : 'w-16 h-16 flex items-center justify-center bg-slate-800 rounded-lg'

  const matrixComponent = (
    <Matrix
      rows={matrixConfig.rows}
      cols={matrixConfig.cols}
      mode="vu"
      levels={animatedLevels}
      size={matrixConfig.size}
      gap={matrixConfig.gap}
      palette={matrixConfig.palette}
      className="w-full h-full"
      ariaLabel={isFullscreen ? "Voice level visualization with 5 vertical bars" : "Voice mini bars"}
    />
  )

  const innerWrapper = isFullscreen
    ? <div className="w-full max-w-2xl mx-auto p-8">{matrixComponent}</div>
    : matrixComponent

  return (
    <div 
      ref={ref}
      className={cn(containerClass, className)}
      {...props}
    >
      {innerWrapper}
    </div>
  )
})

FullscreenVoiceBar.displayName = 'FullscreenVoiceBar'
