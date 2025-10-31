import { useEffect, useRef, useState } from 'react'

export interface UseAudioAnalyzerOptions {
  /** Number of frequency bins to output. Default: 120 */
  binCount?: number
  /** FFT size for frequency analysis. Default: 512 */
  fftSize?: number
  /** Smoothing time constant (0.0 to 1.0). Default: 0.6 */
  smoothingTimeConstant?: number
  /** Throttle updates to this many per second. Default: 30 (30fps) */
  updateRate?: number
}

/**
 * Custom hook for analyzing audio from a MediaStream
 * 
 * Returns normalized frequency levels (0-1) across configurable bins
 * 
 * @param stream - MediaStream from microphone or audio source
 * @param options - Configuration options
 * @returns Array of normalized audio levels (0-1)
 * 
 * @example
 * const audioLevels = useAudioAnalyzer(micStream, { binCount: 120, updateRate: 30 })
 */
export function useAudioAnalyzer(
  stream: MediaStream | null | undefined,
  options: UseAudioAnalyzerOptions = {}
): number[] {
  const {
    binCount = 120,
    fftSize = 512,
    smoothingTimeConstant = 0.6,
    updateRate = 30,
  } = options

  const [audioLevels, setAudioLevels] = useState<number[]>(() => Array(binCount).fill(0))
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastUpdateRef = useRef<number>(0)

  useEffect(() => {
    // Cleanup previous animation loop
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    // Cleanup previous audio nodes
    try {
      sourceRef.current?.disconnect()
    } catch {}
    try {
      analyserRef.current?.disconnect()
    } catch {}
    try {
      audioCtxRef.current?.close()
    } catch {}

    analyserRef.current = null
    sourceRef.current = null
    audioCtxRef.current = null

    // If no stream, reset audio levels
    if (!stream) {
      setAudioLevels(Array(binCount).fill(0))
      return
    }

    try {
      // Create audio context and analyser
      const AudioContextCtor = window.AudioContext || 
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      
      if (!AudioContextCtor) return

      const ctx = new AudioContextCtor()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = fftSize
      analyser.smoothingTimeConstant = smoothingTimeConstant

      const source = ctx.createMediaStreamSource(stream)
      source.connect(analyser)

      audioCtxRef.current = ctx
      analyserRef.current = analyser
      sourceRef.current = source

      const data = new Uint8Array(analyser.frequencyBinCount)
      const minTimeBetweenUpdates = 1000 / updateRate

      // Animation loop with throttling
      const tick = (currentTime: number) => {
        if (!analyserRef.current) return

        // Throttle updates based on time elapsed
        const timeSinceLastUpdate = currentTime - lastUpdateRef.current
        if (timeSinceLastUpdate >= minTimeBetweenUpdates) {
          analyserRef.current.getByteFrequencyData(data)

          // Map FFT to bins (normalized 0-1)
          const next = new Array(binCount).fill(0)
          for (let i = 0; i < binCount; i++) {
            const start = Math.floor((i / binCount) * data.length)
            const end = Math.floor(((i + 1) / binCount) * data.length)
            let sum = 0
            for (let j = start; j < end; j++) sum += data[j]
            const avg = sum / Math.max(1, end - start)
            next[i] = avg / 255
          }

          setAudioLevels(next)
          lastUpdateRef.current = currentTime
        }

        rafRef.current = requestAnimationFrame(tick)
      }

      rafRef.current = requestAnimationFrame(tick)
    } catch (error) {
      // Ignore analyser setup errors (e.g., browser not supported)
      console.warn('[useAudioAnalyzer] Failed to setup audio analyser:', error)
      setAudioLevels(Array(binCount).fill(0))
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      try {
        sourceRef.current?.disconnect()
      } catch {}
      try {
        analyserRef.current?.disconnect()
      } catch {}
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close()
      }
      analyserRef.current = null
      sourceRef.current = null
      audioCtxRef.current = null
    }
  }, [stream, binCount, fftSize, smoothingTimeConstant, updateRate])

  return audioLevels
}

