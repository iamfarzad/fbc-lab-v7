"use client"

import React from 'react'
import { FullscreenVoiceBar } from './FullscreenVoiceBar'

interface MinimizedVoiceBarProps {
  levels?: number[]
  className?: string
}

export const MinimizedVoiceBar = React.forwardRef<HTMLDivElement, MinimizedVoiceBarProps>((props, ref) => {
  return <FullscreenVoiceBar {...props} ref={ref} mode="minimized" />
})

MinimizedVoiceBar.displayName = 'MinimizedVoiceBar'
