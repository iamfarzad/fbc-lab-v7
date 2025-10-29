"use client"

import React, { useEffect, useRef, useState } from 'react'
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

  // Determine voice state
  const getVoiceState = (): VoiceState => {
    if (!isSocketReady) return 'connecting'
    if (isProcessing) return 'thinking'
    if (isRecording) return 'listening'
    if (isSessionActive) return 'speaking'
    return 'idle'
  }

  const voiceState = getVoiceState()

  // Context-aware dimensions based on usage
  const getDimensions = () => {
    switch (variant) {
      case 'minimized':
        // Small compact version for control bar (fits in ~24px height)
        return { rows: 3, cols: 8, size: 2 }
      case 'expanded':
        // Medium version for tile layout (fits in ~90px container)
        return { rows: 6, cols: 16, size: 3 }
      case 'fullscreen':
        // High-resolution version for full-screen display
        return { rows: 24, cols: 64, size: 4 }
      default:
        return { rows: 6, cols: 16, size: 3 }
    }
  }

  const { rows, cols, size } = getDimensions()

  useEffect(() => {
    // If we have a mic stream, attach analyser
    if (!micStream) return
    
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512 // Increased for better frequency resolution matching 64 columns
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
        setAudioData(new Uint8Array(data))
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch (error) {
      console.warn('[FbcMatrixVisualizer] Falling back to simple animation, analyser setup failed', error)
    }
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      try { sourceRef.current?.disconnect() }
      catch (error) {
        console.warn('[FbcMatrixVisualizer] Failed to disconnect source', error)
      }
      try { analyserRef.current?.disconnect() }
      catch (error) {
        console.warn('[FbcMatrixVisualizer] Failed to disconnect analyser', error)
      }
      try { audioCtxRef.current?.close() }
      catch (error) {
        console.warn('[FbcMatrixVisualizer] Failed to close AudioContext', error)
      }
      analyserRef.current = null
      sourceRef.current = null
      audioCtxRef.current = null
    }
  }, [micStream])

  return (
    <div 
      className={cn('flex items-center justify-center overflow-hidden', className)} 
      aria-label="Voice activity"
      style={{
        maxWidth: '100%',
        maxHeight: '100%',
      }}
    >
      <VoiceMatrix
        voiceState={voiceState}
        audioData={audioData || undefined}
        variant="voice"
        rows={rows}
        cols={cols}
        size={size}
        useSVG={true} // Use SVG for crisp rendering at all sizes
      />
    </div>
  )
}
