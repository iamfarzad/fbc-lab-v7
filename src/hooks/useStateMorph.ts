import { useEffect, useState } from 'react'

export interface UseStateMorphOptions {
  /** Duration of morph transition in milliseconds. Default: 1000ms */
  duration?: number
  /** Steps per frame for morph progress. Higher = faster. Default: 0.05 */
  stepSize?: number
}

export interface UseStateMorphReturn<T> {
  /** Morph progress value from 0 (start) to 1 (complete) */
  progress: number
  /** Previous state value (before current transition) */
  prevState: T
}

/**
 * Custom hook for smooth transitions between states with morphing animation
 * 
 * @param currentState - Current state value (any type, compared by reference)
 * @param options - Configuration options
 * @returns Object with morph progress and previous state
 * 
 * @example
 * const { progress, prevState } = useStateMorph(voiceState, { duration: 500 })
 */
export function useStateMorph<T>(
  currentState: T,
  options: UseStateMorphOptions = {}
): UseStateMorphReturn<T> {
  const { duration = 1000, stepSize = 0.05 } = options
  const [morphProgress, setMorphProgress] = useState(1)
  const [prevState, setPrevState] = useState(currentState)

  // Detect state changes and trigger morph
  useEffect(() => {
    if (prevState !== currentState) {
      setPrevState(currentState)
      setMorphProgress(0)
    }
  }, [currentState, prevState])

  // Animate morph progress from 0 to 1
  useEffect(() => {
    if (morphProgress < 1) {
      const id = requestAnimationFrame(() => {
        setMorphProgress((m) => Math.min(1, m + stepSize))
      })
      return () => cancelAnimationFrame(id)
    }
    return undefined
  }, [morphProgress, stepSize, duration])

  return { progress: morphProgress, prevState }
}

