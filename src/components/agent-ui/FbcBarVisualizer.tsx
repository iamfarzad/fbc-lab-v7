'use client';

import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useLiveApi } from '@/hooks/useLiveApi'

interface FbcBarVisualizerProps {
  barCount?: number
  className?: string
}

export function FbcBarVisualizer({ barCount = 5, className }: FbcBarVisualizerProps) {
  const { micStream, isRecording, isProcessing } = useLiveApi()
  const [levels, setLevels] = useState<number[]>(() => Array.from({ length: barCount }, () => 0))
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const binIndexes = useMemo(() => {
    return Array.from({ length: barCount }, (_, i) => i)
  }, [barCount])

  useEffect(() => {
    // If we have a mic stream, attach analyser
    if (!micStream) return
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.7
      const source = ctx.createMediaStreamSource(micStream)
      source.connect(analyser)

      audioCtxRef.current = ctx
      analyserRef.current = analyser
      sourceRef.current = source

      const data = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        if (!analyserRef.current) return
        analyserRef.current.getByteFrequencyData(data)
        // Map bins to a small set of bars
        const seg = Math.floor(data.length / barCount) || 1
        const next = binIndexes.map((i) => {
          const start = i * seg
          let sum = 0
          for (let j = 0; j < seg; j++) sum += data[start + j] || 0
          const avg = sum / seg
          return Math.min(1, avg / 255)
        })
        setLevels(next)
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch {
      // If attaching analyser fails, fall back to simple animation below
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      try { sourceRef.current?.disconnect() } catch {}
      try { analyserRef.current?.disconnect() } catch {}
      try { audioCtxRef.current?.close() } catch {}
      analyserRef.current = null
      sourceRef.current = null
      audioCtxRef.current = null
    }
  }, [micStream, barCount, binIndexes])

  const active = isRecording || isProcessing

  return (
    <div className={cn('flex items-center justify-center gap-1', className)} aria-label="Voice activity">
      {Array.from({ length: barCount }).map((_, i) => {
        const level = levels[i] || (active ? 0.3 + 0.2 * Math.sin((Date.now() / 200 + i) % (2 * Math.PI)) : 0.08)
        const px = Math.round(8 + level * 24)
        return (
          <div
            key={i}
            className="w-2 rounded-full bg-foreground/80 transition-[height] duration-100 ease-linear"
            style={{ height: px }}
          />
        )
      })}
    </div>
  )
}

