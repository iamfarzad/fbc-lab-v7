// Utility functions and hooks for bar visualizer
// Moved from bar-visualizer.tsx to fix fast refresh warnings

import { useEffect, useMemo, useRef, useState } from "react"

export type AgentState =
  | "connecting"
  | "initializing"
  | "listening"
  | "speaking"
  | "thinking"

type AnimationState =
  | "connecting"
  | "initializing"
  | "listening"
  | "speaking"
  | "thinking"
  | undefined

export interface AudioVolumeOptions {
  fftSize?: number
  smoothingTimeConstant?: number
  minDecibels?: number
  maxDecibels?: number
}

export function useAudioVolume(
  mediaStream?: MediaStream | null,
  options: AudioVolumeOptions = {}
) {
  // Extract options as primitives to prevent object recreation
  const fftSize = options.fftSize ?? 256
  const smoothingTimeConstant = options.smoothingTimeConstant ?? 0.8
  const minDecibels = options.minDecibels ?? -90
  const maxDecibels = options.maxDecibels ?? -10

  const [volume, setVolume] = useState(0)
  const volumeRef = useRef(0)
  const frameId = useRef<number | undefined>(undefined)
  const lastUpdateTime = useRef<number>(0)
  const UPDATE_THROTTLE = 50

  useEffect(() => {
    if (frameId.current) {
      cancelAnimationFrame(frameId.current)
      frameId.current = undefined
    }

    if (!mediaStream) {
      setVolume(0)
      volumeRef.current = 0
      return
    }

    const audioContext = new AudioContext()
    const analyser = audioContext.createAnalyser()
    const source = audioContext.createMediaStreamSource(mediaStream)

    analyser.fftSize = fftSize
    analyser.smoothingTimeConstant = smoothingTimeConstant
    analyser.minDecibels = minDecibels
    analyser.maxDecibels = maxDecibels

    source.connect(analyser)

    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    const updateVolume = (timestamp: number) => {
      if (timestamp - lastUpdateTime.current < UPDATE_THROTTLE) {
        frameId.current = requestAnimationFrame(updateVolume)
        return
      }

      analyser.getByteFrequencyData(dataArray)
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
      const normalizedVolume = average / 255
      
      // Only update if changed significantly
      if (Math.abs(normalizedVolume - volumeRef.current) > 0.02) {
        volumeRef.current = normalizedVolume
        setVolume(normalizedVolume)
      }

      lastUpdateTime.current = timestamp
      frameId.current = requestAnimationFrame(updateVolume)
    }

    frameId.current = requestAnimationFrame(updateVolume)

    return () => {
      if (frameId.current) {
        cancelAnimationFrame(frameId.current)
      }
      audioContext.close()
    }
  }, [mediaStream, fftSize, smoothingTimeConstant, minDecibels, maxDecibels])

  return { volume, volumeRef }
}

export interface MultiBandVolumeOptions {
  bands?: number
  loPass?: number
  hiPass?: number
  updateInterval?: number
  analyserOptions?: AudioVolumeOptions
}

const multibandDefaults: MultiBandVolumeOptions = {
  bands: 8,
  loPass: 0.1,
  hiPass: 0.8,
  updateInterval: 50,
  analyserOptions: {
    fftSize: 1024,
    smoothingTimeConstant: 0.8,
    minDecibels: -90,
    maxDecibels: -10,
  },
}

export function useMultibandVolume(
  mediaStream?: MediaStream | null,
  options: MultiBandVolumeOptions = {}
) {
  // Extract options as primitives to prevent object recreation
  const bands = options.bands ?? multibandDefaults.bands
  const fftSize = options.analyserOptions?.fftSize ?? multibandDefaults.analyserOptions?.fftSize ?? 1024
  const smoothingTimeConstant = options.analyserOptions?.smoothingTimeConstant ?? multibandDefaults.analyserOptions?.smoothingTimeConstant ?? 0.8
  const minDecibels = options.analyserOptions?.minDecibels ?? multibandDefaults.analyserOptions?.minDecibels ?? -90
  const maxDecibels = options.analyserOptions?.maxDecibels ?? multibandDefaults.analyserOptions?.maxDecibels ?? -10

  const [frequencyBands, setFrequencyBands] = useState<number[]>(() =>
    new Array(bands).fill(0)
  )
  const bandsRef = useRef<number[]>(new Array(bands).fill(0))
  const frameId = useRef<number | undefined>(undefined)
  const lastUpdateTime = useRef<number>(0)
  const UPDATE_THROTTLE = 50 // ms

  useEffect(() => {
    // Cancel any existing animation
    if (frameId.current) {
      cancelAnimationFrame(frameId.current)
      frameId.current = undefined
    }

    if (!mediaStream) {
      const emptyBands = new Array(bands).fill(0)
      setFrequencyBands(emptyBands)
      bandsRef.current = emptyBands
      return
    }

    const audioContext = new AudioContext()
    const analyser = audioContext.createAnalyser()
    const source = audioContext.createMediaStreamSource(mediaStream)

    analyser.fftSize = fftSize
    analyser.smoothingTimeConstant = smoothingTimeConstant
    analyser.minDecibels = minDecibels
    analyser.maxDecibels = maxDecibels

    source.connect(analyser)

    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    const bufferLength = analyser.frequencyBinCount

    const updateBands = (timestamp: number) => {
      // Throttle updates
      if (timestamp - lastUpdateTime.current < UPDATE_THROTTLE) {
        frameId.current = requestAnimationFrame(updateBands)
        return
      }

      analyser.getByteFrequencyData(dataArray)
      
      const newBands = new Array(bands).fill(0)
      const bandSize = Math.floor(bufferLength / bands!)
      
      for (let i = 0; i < bands!; i++) {
        const start = i * bandSize
        const end = Math.min(start + bandSize, bufferLength)
        let sum = 0
        
        for (let j = start; j < end; j++) {
          sum += dataArray[j]
        }
        
        newBands[i] = sum / (end - start) / 255
      }
      
      // Only update state if bands changed significantly
      let hasChanged = false
      for (let i = 0; i < bands!; i++) {
        if (Math.abs(newBands[i] - bandsRef.current[i]) > 0.02) {
          hasChanged = true
          break
        }
      }

      if (hasChanged) {
        bandsRef.current = newBands
        setFrequencyBands(newBands)
      }

      lastUpdateTime.current = timestamp
      frameId.current = requestAnimationFrame(updateBands)
    }

    frameId.current = requestAnimationFrame(updateBands)

    return () => {
      if (frameId.current) {
        cancelAnimationFrame(frameId.current)
      }
      audioContext.close()
    }
  }, [mediaStream, bands, fftSize, smoothingTimeConstant, minDecibels, maxDecibels])

  return { frequencyBands, bandsRef }
}


// Memoize sequence generators
const generateConnectingSequenceBar = (columns: number): number[][] => {
  const seq = []
  for (let x = 0; x < columns; x++) {
    seq.push([x, columns - 1 - x])
  }
  return seq
}

const generateListeningSequenceBar = (columns: number): number[][] => {
  const center = Math.floor(columns / 2)
  const noIndex = -1
  return [[center], [noIndex]]
}

export const useBarAnimator = (
  state: AnimationState,
  columns: number,
  interval: number
): number[] => {
  const indexRef = useRef(0)
  const [currentFrame, setCurrentFrame] = useState<number[]>([])
  const animationFrameId = useRef<number | null>(null)
  const lastFrameIndex = useRef(-1)

  // Memoize sequence generation
  const sequence = useMemo(() => {
    if (state === "thinking" || state === "listening") {
      return generateListeningSequenceBar(columns)
    } else if (state === "connecting" || state === "initializing") {
      return generateConnectingSequenceBar(columns)
    } else if (state === undefined || state === "speaking") {
      return [new Array(columns).fill(0).map((_, idx) => idx)]
    } else {
      return [[]]
    }
  }, [state, columns])

  // Initialize frame when sequence changes
  useEffect(() => {
    indexRef.current = 0
    lastFrameIndex.current = -1
    setCurrentFrame(sequence[0] || [])
  }, [sequence])

  // Run animation loop
  useEffect(() => {
    // Cleanup existing animation
    if (animationFrameId.current !== null) {
      cancelAnimationFrame(animationFrameId.current)
    }

    let startTime = performance.now()

    const animate = (time: DOMHighResTimeStamp) => {
      const timeElapsed = time - startTime

      if (timeElapsed >= interval) {
        const newIndex = (indexRef.current + 1) % sequence.length
        
        // Only update state if index actually changed
        if (newIndex !== lastFrameIndex.current) {
          indexRef.current = newIndex
          lastFrameIndex.current = newIndex
          setCurrentFrame(sequence[newIndex] || [])
        }
        
        startTime = time
      }

      animationFrameId.current = requestAnimationFrame(animate)
    }

    animationFrameId.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current)
        animationFrameId.current = null
      }
    }
  }, [interval, sequence])

  return currentFrame
}
