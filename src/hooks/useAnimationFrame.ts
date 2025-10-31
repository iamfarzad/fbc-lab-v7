import { useEffect, useRef, useState } from 'react'

export interface UseAnimationFrameOptions {
  /** Frame rate in frames per second. Default: 20 */
  fps?: number
  /** Whether to start animation immediately. Default: true */
  autoplay?: boolean
}

/**
 * Custom hook for managing animation frame counter with configurable FPS
 * 
 * @param options - Configuration options
 * @returns Current frame number (0 to 9999, then wraps)
 * 
 * @example
 * const frame = useAnimationFrame({ fps: 30 })
 */
export function useAnimationFrame(options: UseAnimationFrameOptions = {}) {
  const { fps = 20, autoplay = true } = options
  const [frame, setFrame] = useState(0)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (!autoplay) return

    const intervalMs = Math.round(1000 / fps)
    
    intervalRef.current = window.setInterval(() => {
      setFrame((f) => (f + 1) % 10000)
    }, intervalMs)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [fps, autoplay])

  return frame
}

