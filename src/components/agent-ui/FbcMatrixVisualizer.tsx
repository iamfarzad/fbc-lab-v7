"use client"

import { useEffect, useRef, useState, useMemo } from 'react'
import { useLiveApi } from '@/hooks/useLiveApi'
import { VoiceMatrix, type VoiceState } from '@/components/ui/VoiceMatrix'
import { cn } from '@/lib/utils'

interface FbcMatrixVisualizerProps {
  className?: string
  variant?: 'minimized' | 'expanded' | 'fullscreen'
}

export function FbcMatrixVisualizer({ 
  className,
  variant = 'expanded'
}: FbcMatrixVisualizerProps) {
  const { micStream, isRecording, isProcessing, isSessionActive, isSocketReady } = useLiveApi()
  const [audioData, setAudioData] = useState<Uint8Array | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const smoothedDataRef = useRef<Uint8Array | null>(null)

  // Determine voice state with smooth transitions
  const voiceState = useMemo((): VoiceState => {
    if (!isSocketReady) return 'connecting'
    if (isProcessing) return 'thinking'
    if (isRecording) return 'listening'
    if (isSessionActive) return 'speaking'
    return 'idle'
  }, [isSocketReady, isProcessing, isRecording, isSessionActive])

  // Optimized dimensions for better visual quality
  const { rows, cols, size } = useMemo(() => {
    switch (variant) {
      case 'minimized':
        return { rows: 4, cols: 12, size: 2 }
      case 'expanded':
        // Higher resolution for smoother animation
        return { rows: 10, cols: 24, size: 3 }
      case 'fullscreen':
        return { rows: 24, cols: 64, size: 4 }
      default:
        return { rows: 10, cols: 24, size: 3 }
    }
  }, [variant])

  // Audio processing with better smoothing
  useEffect(() => {
    if (!micStream) {
      setAudioData(null)
      return
    }
    
    try {
      const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextClass) {
        throw new Error('AudioContext not supported')
      }
      const ctx = new AudioContextClass()
      const analyser = ctx.createAnalyser()
      // Higher FFT size for better frequency resolution
      analyser.fftSize = 1024
      // Lower smoothing for more responsive visualization
      analyser.smoothingTimeConstant = 0.3
      const source = ctx.createMediaStreamSource(micStream)
      source.connect(analyser)

      audioCtxRef.current = ctx
      analyserRef.current = analyser
      sourceRef.current = source

      const bufferLength = analyser.frequencyBinCount
      const data = new Uint8Array(bufferLength)
      smoothedDataRef.current = new Uint8Array(bufferLength)

      // Smooth audio processing loop at 60fps
      const tick = () => {
        if (!analyserRef.current || !smoothedDataRef.current) return
        
        analyserRef.current.getByteFrequencyData(data)
        
        // Apply exponential smoothing for fluid motion
        const smoothingFactor = 0.15
        for (let i = 0; i < bufferLength; i++) {
          const current = data[i] || 0
          const previous = smoothedDataRef.current[i] || 0
          smoothedDataRef.current[i] = previous + (current - previous) * smoothingFactor
        }
        
        setAudioData(new Uint8Array(smoothedDataRef.current))
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch (error) {
      console.warn('[FbcMatrixVisualizer] Audio analyser setup failed', error)
      setAudioData(null)
    }
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      try { sourceRef.current?.disconnect() }
      catch {
        // Ignore cleanup errors
      }
      try { analyserRef.current?.disconnect() }
      catch {
        // Ignore cleanup errors
      }
      try { audioCtxRef.current?.close() }
      catch {
        // Ignore cleanup errors
      }
      analyserRef.current = null
      sourceRef.current = null
      audioCtxRef.current = null
      smoothedDataRef.current = null
    }
  }, [micStream])

  return (
    <div 
      className={cn(
        'flex items-center justify-center overflow-hidden w-full h-full',
        'transition-opacity duration-300',
        className
      )}
      role="img"
      aria-label={`Voice activity: ${voiceState}`}
    >
      <VoiceMatrix
        voiceState={voiceState}
        audioData={audioData || undefined}
        variant="voice"
        rows={rows}
        cols={cols}
        size={size}
        useSVG={true}
      />
    </div>
  )
}
