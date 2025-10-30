"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { MatrixSVG } from '@/components/ui/matrix-svg'
import { useLiveApi } from '@/hooks/useLiveApi'
import { cn } from '@/lib/utils'
import type { Frame } from '@/components/ui/matrix-svg'

type VoiceState = 'idle' | 'connecting' | 'initializing' | 'listening' | 'speaking' | 'thinking'

export interface FbcOrbVisualizerProps {
  className?: string
  rows?: number
  cols?: number
  size?: number
  gap?: number
  paletteOn?: string
  paletteOff?: string
}

export function FbcOrbVisualizer({
  className,
  rows = 40,
  cols = 60,
  size = 3,
  gap = 1.2,
  paletteOn = 'hsl(var(--foreground))', // Match dark gray text/icons from layout
  paletteOff = 'transparent'
}: FbcOrbVisualizerProps) {
  const { micStream, isRecording, isProcessing, isSessionActive, isSocketReady } = useLiveApi()

  // Determine voice state from runtime flags
  const voiceState: VoiceState = useMemo(() => {
    if (!isSocketReady) return 'connecting'
    if (isProcessing) return 'thinking'
    if (isRecording) return 'listening'
    if (isSessionActive) return 'speaking'
    return 'idle'
  }, [isSocketReady, isProcessing, isRecording, isSessionActive])

  const [audioLevels, setAudioLevels] = useState<number[]>(() => Array(120).fill(0))
  const [prevVoiceState, setPrevVoiceState] = useState<VoiceState>(voiceState)
  const [morphProgress, setMorphProgress] = useState(1)
  const [frame, setFrame] = useState(0)

  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const rafRef = useRef<number | null>(null)

  // Animation frame counter
  useEffect(() => {
    const id = setInterval(() => setFrame(f => (f + 1) % 10000), 50)
    return () => clearInterval(id)
  }, [])

  // Track voice state changes and trigger morph
  useEffect(() => {
    if (prevVoiceState !== voiceState) {
      setPrevVoiceState(voiceState)
      setMorphProgress(0)
    }
  }, [voiceState, prevVoiceState])

  // Morphing animation
  useEffect(() => {
    if (morphProgress < 1) {
      const id = requestAnimationFrame(() => setMorphProgress(m => Math.min(1, m + 0.05)))
      return () => cancelAnimationFrame(id)
    }
    return
  }, [morphProgress])

  // Audio analysis from mic stream
  useEffect(() => {
    if (rafRef.current) { 
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    try { sourceRef.current?.disconnect() } catch {}
    try { analyserRef.current?.disconnect() } catch {}
    try { audioCtxRef.current?.close() } catch {}
    analyserRef.current = null
    sourceRef.current = null
    audioCtxRef.current = null

    if (!micStream) {
      setAudioLevels(Array(120).fill(0))
      return
    }

    try {
      const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextCtor) return

      const ctx = new AudioContextCtor()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.6

      const source = ctx.createMediaStreamSource(micStream)
      source.connect(analyser)

      audioCtxRef.current = ctx
      analyserRef.current = analyser
      sourceRef.current = source

      const data = new Uint8Array(analyser.frequencyBinCount)

      const tick = () => {
        if (!analyserRef.current) return
        analyserRef.current.getByteFrequencyData(data)

        // Map FFT to 120 bins (normalized 0..1)
        const N = 120
        const next = new Array(N).fill(0)
        for (let i = 0; i < N; i++) {
          const start = Math.floor((i / N) * data.length)
          const end = Math.floor(((i + 1) / N) * data.length)
          let sum = 0
          for (let j = start; j < end; j++) sum += data[j]
          const avg = sum / Math.max(1, end - start)
          next[i] = avg / 255
        }
        setAudioLevels(next)
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch {
      // Ignore analyser setup errors
      setAudioLevels(Array(120).fill(0))
    }

    return () => {
      if (rafRef.current) { 
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      try { sourceRef.current?.disconnect() } catch {}
      try { analyserRef.current?.disconnect() } catch {}
      try { audioCtxRef.current?.close() } catch {}
      analyserRef.current = null
      sourceRef.current = null
      audioCtxRef.current = null
    }
  }, [micStream])

  // Generate radial orb pattern
  const pattern = useMemo((): Frame => {
    const centerX = cols / 2
    const centerY = rows / 2
    const out: Frame = Array.from({ length: rows }, () => Array(cols).fill(0))

    const time = frame * 0.05
    const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
    const morph = easeInOutCubic(morphProgress)

    const getStateIntensity = (state: VoiceState, _dx: number, _dy: number, dist: number, angle: number) => {
      let intensity = 0

      if (state === 'connecting') {
        // Spinning radar sweep
        const sweep = (angle + Math.PI) / (Math.PI * 2)
        const rotation = (time * 0.5) % 1
        const sweepDist = Math.min(Math.abs(sweep - rotation), 1 - Math.abs(sweep - rotation))
        if (sweepDist < 0.1) intensity = Math.max(0, 1 - dist / 30) * (1 - sweepDist / 0.1)
      } else if (state === 'initializing') {
        // Spiral emergence
        const spiralAngle = angle + dist * 0.3 - time * 0.3
        const spiralWave = Math.sin(spiralAngle * 3) * 0.5 + 0.5
        if (dist < 35) intensity = spiralWave * (1 - dist / 35) * 0.7
      } else if (state === 'listening') {
        // Breathing circles with concentric ripples
        const ripple = Math.sin(dist * 0.25 - time * 0.8) * 0.4 + 0.5
        const pulse = Math.sin(time * 0.6) * 0.2 + 0.4
        if (dist < 35) intensity = ripple * pulse * (1 - dist / 40) * 0.7
      } else if (state === 'speaking') {
        // Audio-reactive radial bursts
        const audioCol = Math.floor(((angle + Math.PI) / (Math.PI * 2)) * 120) % 120
        const level = audioLevels[audioCol] || 0
        const burst = Math.sin(dist * 0.3 - time * 1.5 + level * 4) * 0.4 + 0.5
        const segments = 16
        const segAngle = ((angle + Math.PI) % (Math.PI * 2 / segments)) * segments
        const segIntensity = Math.sin(segAngle * segments / 2) * 0.25 + 0.65
        if (dist < 30 && dist > 5) intensity = burst * segIntensity * (0.4 + level * 0.6) * 0.8
      } else if (state === 'thinking') {
        // Slow rotating mandala
        const petals = 8
        const petal = Math.sin(angle * petals + time * 0.3) * 0.5 + 0.5
        const rings = Math.sin(dist * 0.5 - time * 0.2) * 0.5 + 0.5
        if (dist < 30) intensity = petal * rings * (1 - dist / 35) * 0.6
      } else if (state === 'idle') {
        // Minimal static circle
        if (Math.abs(dist - 15) < 1) intensity = 0.3
      }

      return intensity
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dx = c - centerX
        const dy = r - centerY
        const dist = Math.hypot(dx, dy)
        const angle = Math.atan2(dy, dx)

        const prevI = getStateIntensity(prevVoiceState, dx, dy, dist, angle)
        const currI = getStateIntensity(voiceState, dx, dy, dist, angle)
        const val = prevI * (1 - morph) + currI * morph

        out[r][c] = Math.min(1, Math.max(0, val))
      }
    }

    return out
  }, [rows, cols, frame, morphProgress, prevVoiceState, voiceState])

  const isActive = voiceState === 'listening' || voiceState === 'speaking'
  const time = frame * 0.05
  const ringRadius1 = 18 + Math.sin(time * 0.7) * 2
  const ringRadius2 = 28 + Math.sin(time * 0.5 + 1) * 2

  return (
    <div
      className={cn(
        'relative flex items-center justify-center',
        className
      )}
      role="img"
      aria-label={`Voice orb visualizer: ${voiceState}`}
    >
      <MatrixSVG
        rows={rows}
        cols={cols}
        pattern={pattern}
        size={size}
        gap={gap}
        palette={{ on: paletteOn, off: paletteOff }}
        brightness={1.0}
        ariaLabel="Radial voice visualizer"
      />
      {isActive && (
        <svg
          className="absolute inset-0 pointer-events-none z-10"
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
          viewBox={`0 0 ${cols * size + (cols - 1) * gap} ${rows * size + (rows - 1) * gap}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <circle
            cx={(cols * size + (cols - 1) * gap) / 2}
            cy={(rows * size + (rows - 1) * gap) / 2}
            r={ringRadius1 * (size + gap)}
            fill="none"
            stroke="hsl(var(--accent))"
            strokeWidth="1"
            opacity="0.5"
          />
          <circle
            cx={(cols * size + (cols - 1) * gap) / 2}
            cy={(rows * size + (rows - 1) * gap) / 2}
            r={ringRadius2 * (size + gap)}
            fill="none"
            stroke="hsl(var(--accent))"
            strokeWidth="1"
            opacity="0.4"
          />
        </svg>
      )}
    </div>
  )
}
