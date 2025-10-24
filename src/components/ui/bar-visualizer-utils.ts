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
  const [volume, setVolume] = useState(0)
  const volumeRef = useRef(0)
  const frameId = useRef<number | undefined>(undefined)

  // Memoize options to prevent unnecessary re-renders
  const memoizedOptions = useMemo(
    () => options,
    [options]
  )

  useEffect(() => {
    if (!mediaStream) {
      setVolume(0)
      volumeRef.current = 0
      return
    }

    const audioContext = new AudioContext()
    const analyser = audioContext.createAnalyser()
    const source = audioContext.createMediaStreamSource(mediaStream)

    analyser.fftSize = memoizedOptions.fftSize ?? 256
    analyser.smoothingTimeConstant = memoizedOptions.smoothingTimeConstant ?? 0.8
    analyser.minDecibels = memoizedOptions.minDecibels ?? -90
    analyser.maxDecibels = memoizedOptions.maxDecibels ?? -10

    source.connect(analyser)

    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    const updateVolume = () => {
      analyser.getByteFrequencyData(dataArray)
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
      const normalizedVolume = average / 255
      
      setVolume(normalizedVolume)
      volumeRef.current = normalizedVolume
      
      frameId.current = requestAnimationFrame(updateVolume)
    }

    updateVolume()

    return () => {
      if (frameId.current) {
        cancelAnimationFrame(frameId.current)
      }
      audioContext.close()
    }
  }, [mediaStream, memoizedOptions])

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
  const opts = useMemo(
    () => ({ ...multibandDefaults, ...options }),
    [options]
  )

  const [frequencyBands, setFrequencyBands] = useState<number[]>(() =>
    new Array(opts.bands).fill(0)
  )
  const bandsRef = useRef<number[]>(new Array(opts.bands).fill(0))
  const frameId = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!mediaStream) {
      setFrequencyBands(new Array(opts.bands).fill(0))
      bandsRef.current = new Array(opts.bands).fill(0)
      return
    }

    const audioContext = new AudioContext()
    const analyser = audioContext.createAnalyser()
    const source = audioContext.createMediaStreamSource(mediaStream)

    analyser.fftSize = opts.analyserOptions?.fftSize ?? 1024
    analyser.smoothingTimeConstant = opts.analyserOptions?.smoothingTimeConstant ?? 0.8
    analyser.minDecibels = opts.analyserOptions?.minDecibels ?? -90
    analyser.maxDecibels = opts.analyserOptions?.maxDecibels ?? -10

    source.connect(analyser)

    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    const bufferLength = analyser.frequencyBinCount

    const updateBands = () => {
      analyser.getByteFrequencyData(dataArray)
      
      const newBands = new Array(opts.bands || 8).fill(0)
      const bandSize = Math.floor(bufferLength / (opts.bands || 8))
      
      for (let i = 0; i < (opts.bands || 8); i++) {
        const start = i * bandSize
        const end = Math.min(start + bandSize, bufferLength)
        let sum = 0
        
        for (let j = start; j < end; j++) {
          sum += dataArray[j]
        }
        
        newBands[i] = sum / (end - start) / 255
      }
      
      setFrequencyBands(newBands)
      bandsRef.current = newBands
      
      frameId.current = requestAnimationFrame(updateBands)
    }

    updateBands()

    return () => {
      if (frameId.current) {
        cancelAnimationFrame(frameId.current)
      }
      audioContext.close()
    }
  }, [mediaStream, opts])

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

  useEffect(() => {
    indexRef.current = 0
    setCurrentFrame(sequence[0] || [])
  }, [sequence])

  useEffect(() => {
    let startTime = performance.now()

    const animate = (time: DOMHighResTimeStamp) => {
      const timeElapsed = time - startTime

      if (timeElapsed >= interval) {
        indexRef.current = (indexRef.current + 1) % sequence.length
        setCurrentFrame(sequence[indexRef.current] || [])
        startTime = time
      }

      animationFrameId.current = requestAnimationFrame(animate)
    }

    animationFrameId.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current)
      }
    }
  }, [interval, sequence])

  return currentFrame
}
