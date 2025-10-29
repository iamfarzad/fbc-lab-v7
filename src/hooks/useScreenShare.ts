import { useState, useCallback, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { blobToBase64 } from '@/lib/utils'
import type { VoiceContextUpdate } from './useRealtimeVoice'

export interface UseScreenShareOptions {
  onCapture?: (blob: Blob, imageData?: string) => void
  onAnalysis?: (analysis: string, imageData: string, capturedAt: number) => void
  captureInterval?: number // Auto-capture interval in ms
  enableAutoCapture?: boolean
  maxDimension?: number // Max width/height for compression
  quality?: number // JPEG quality 0-1
  sessionId?: string
  voiceConnectionId?: string
  requireVoiceSession?: boolean // only capture when voice active
  sendRealtimeInput?: (chunks: Array<{ mimeType: string; data: string }>) => void
  sendContextUpdate?: (update: VoiceContextUpdate) => void
}

export interface ScreenShareCapture {
  blob: Blob
  imageData?: string
  timestamp: number
  metadata?: {
    width: number
    height: number
  }
}

interface ScreenShareMetrics {
  captureCount: number
  failedCaptures: number
  avgCaptureTime: number
}

export function useScreenShare(options: UseScreenShareOptions = {}) {
  const {
    onCapture,
    onAnalysis,
    captureInterval = 4000, // 4 seconds for analysis
    enableAutoCapture = false,
    maxDimension = 1280,
    quality = 0.7,
    sessionId,
    voiceConnectionId,
    requireVoiceSession = false,
    sendRealtimeInput,
    sendContextUpdate,
  } = options

  const [isActive, setIsActive] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Refs for resource management
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const autoCaptureTimerRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const metricsRef = useRef<ScreenShareMetrics>({
    captureCount: 0,
    failedCaptures: 0,
    avgCaptureTime: 0,
  })
  const lastAnalysisAtRef = useRef(0)
  const ANALYSIS_INTERVAL_MS = 4000

  // Initialize canvas (reused across captures to prevent memory leaks)
  useEffect(() => {
    if (typeof document !== 'undefined' && !canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
    }
    return () => {
      canvasRef.current = null
    }
  }, [])

  // Stop screen share and cleanup resources
  const stopScreenShare = useCallback(() => {
    // Stop auto-capture if running
    if (autoCaptureTimerRef.current) {
      clearInterval(autoCaptureTimerRef.current)
      autoCaptureTimerRef.current = null
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    setStream(null)
    setIsActive(false)
    setError(null)
  }, [])

  // Start screen share
  const startScreenShare = useCallback(async () => {
    if (isInitializing) {
      console.log('Screen share initialization already in progress')
      return
    }

    setIsInitializing(true)
    setError(null)

    try {
      // Pre-checks before requesting screen share
      if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
        const msg = 'Screen sharing is not supported in this browser'
        setError(msg)
        setIsInitializing(false)
        toast.error(msg)
        throw new Error(msg)
      }

      if (!navigator.mediaDevices.getDisplayMedia) {
        const msg = 'Screen sharing API is not available. Please use a modern browser.'
        setError(msg)
        setIsInitializing(false)
        toast.error(msg)
        throw new Error(msg)
      }

      // Check if we're in a secure context (required for getDisplayMedia)
      if (!window.isSecureContext) {
        const msg = 'Screen sharing requires a secure connection (HTTPS). Please access this page via HTTPS.'
        setError(msg)
        setIsInitializing(false)
        toast.error(msg)
        throw new Error(msg)
      }

      // Stop existing stream if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }

      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      }

      console.log('🖥️ [useScreenShare] Requesting screen capture with constraints:', constraints)
      const mediaStream = await navigator.mediaDevices.getDisplayMedia(constraints)
      console.log('🖥️ [useScreenShare] Screen capture success, stream tracks:', mediaStream.getTracks().length)

      // Set up track ended listener
      mediaStream.getTracks().forEach(track => {
        track.addEventListener('ended', () => {
          console.log('Screen share track ended')
          stopScreenShare()
        })
      })

      streamRef.current = mediaStream
      setStream(mediaStream)
      setIsActive(true)
      setIsInitializing(false)
      console.log('🖥️ [useScreenShare] Screen share started successfully')

      return mediaStream
    } catch (err) {
      let message = 'Unable to access screen share'
      
      if (err instanceof Error) {
        const errorName = err.name || ''
        const errorMessage = err.message || ''
        
        // Provide user-friendly error messages
        if (errorName === 'NotAllowedError' || errorMessage.toLowerCase().includes('permission')) {
          message = 'Screen sharing permission was denied. Please allow screen sharing in your browser settings and try again.'
        } else if (errorName === 'NotSupportedError' || errorMessage.toLowerCase().includes('not supported')) {
          message = 'Screen sharing is not supported in this browser or environment.'
        } else if (errorName === 'NotFoundError' || errorMessage.toLowerCase().includes('not found')) {
          message = 'No screen sharing source available. Please check your system settings.'
        } else if (errorName === 'AbortError' || errorMessage.toLowerCase().includes('abort')) {
          message = 'Screen sharing request was cancelled.'
        } else {
          message = errorMessage || message
        }
      }
      
      setError(message)
      setIsActive(false)
      setIsInitializing(false)
      toast.error(message)
      console.error('🖥️ [useScreenShare] Screen share error:', err)
      throw err
    }
  }, [isInitializing, stopScreenShare])

  // Toggle screen share on/off
  const toggleScreenShare = useCallback(async () => {
    console.log('🖥️ [useScreenShare] toggleScreenShare called', { isActive, isInitializing })
    if (isInitializing) {
      console.log('🖥️ [useScreenShare] Initialization in progress, ignoring toggle request.')
      return
    }
    if (isActive) {
      console.log('🖥️ [useScreenShare] Screen share is active, stopping...')
      stopScreenShare()
    } else {
      console.log('🖥️ [useScreenShare] Screen share is inactive, starting...')
      await startScreenShare()
    }
  }, [isActive, isInitializing, startScreenShare, stopScreenShare])

  // Upload frame to backend for analysis
  const uploadToBackend = useCallback(async (
    _blob: Blob,
    imageData: string,
    sessionId: string,
    voiceConnectionId?: string
  ): Promise<{ analysis?: string } | null> => {
    try {
      const response = await fetch('/api/tools/screen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-intelligence-session-id': sessionId,
          ...(voiceConnectionId ? { 'x-voice-connection-id': voiceConnectionId } : {}),
        },
        body: JSON.stringify({
          image: imageData,
          type: 'screen',
          context: {
            trigger: voiceConnectionId ? 'voice' : 'manual',
            prompt: voiceConnectionId
              ? 'Provide a concise summary aligned with the current voice conversation.'
              : 'Analyze this screen and provide key insights.',
          },
        }),
      })

      if (response.ok) {
        const data = await response.json().catch(() => null)
        return data?.output || data
      }
      return null
    } catch (err) {
      console.error('Screen share upload failed:', err)
      return null
    }
  }, [])

  // Capture frame from screen share stream
  const captureFrame = useCallback(async (): Promise<ScreenShareCapture | null> => {
    const canvas = canvasRef.current

    if (!canvas || !streamRef.current) {
      metricsRef.current.failedCaptures++
      return null
    }

    // Create a video element to capture the current frame
    const video = document.createElement('video')
    video.srcObject = streamRef.current
    video.muted = true
    video.playsInline = true
    
    // Wait for video to be ready
    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => {
        video.play().then(() => resolve()).catch(() => resolve())
      }
    })

    if (video.readyState < 2) {
      console.debug('Video not ready for capture (readyState:', video.readyState, ')')
      metricsRef.current.failedCaptures++
      return null
    }

    const startTime = performance.now()

    try {
      // Get video dimensions
      const videoWidth = video.videoWidth
      const videoHeight = video.videoHeight

      if (videoWidth === 0 || videoHeight === 0) {
        console.warn('Video dimensions are zero')
        metricsRef.current.failedCaptures++
        return null
      }

      // Calculate scaled dimensions (max dimension limit)
      let width = videoWidth
      let height = videoHeight
      
      if (maxDimension && (width > maxDimension || height > maxDimension)) {
        const scale = maxDimension / Math.max(width, height)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }

      // Set canvas size
      canvas.width = width
      canvas.height = height

      // Draw video frame to canvas
      const ctx = canvas.getContext('2d', { alpha: false })
      if (!ctx) {
        throw new Error('Failed to get canvas context')
      }

      ctx.drawImage(video, 0, 0, width, height)

      // Convert to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', quality)
      })

      if (!blob) {
        throw new Error('Failed to create blob from canvas')
      }

      // Create data URL for transmission
      const imageData = canvas.toDataURL('image/jpeg', quality)

      // Update metrics
      const captureTime = performance.now() - startTime
      const metrics = metricsRef.current
      metrics.captureCount++
      metrics.avgCaptureTime = 
        (metrics.avgCaptureTime * (metrics.captureCount - 1) + captureTime) / 
        metrics.captureCount

      const capture: ScreenShareCapture = {
        blob,
        imageData,
        timestamp: Date.now(),
        metadata: {
          width,
          height,
        },
      }

      // Call capture callback if provided
      onCapture?.(blob, imageData)

      let analysisText: string | null = null
      const now = Date.now()
      const shouldAnalyze = Boolean(sessionId) && (now - lastAnalysisAtRef.current >= ANALYSIS_INTERVAL_MS)

      // Send frame via sendRealtimeInput for continuous streaming
      if (sendRealtimeInput) {
        try {
          const base64Data = await blobToBase64(blob)
          sendRealtimeInput([{
            mimeType: 'image/jpeg',
            data: base64Data,
          }])
          console.log('📺 Screen frame streamed to Live API')
        } catch (err) {
          console.error('❌ Failed to stream screen frame:', err)
        }
      }

      if (sessionId && shouldAnalyze) {
        const result = await uploadToBackend(blob, imageData, sessionId, voiceConnectionId)
        if (result?.analysis) {
          lastAnalysisAtRef.current = now
          analysisText = result.analysis
          onAnalysis?.(result.analysis, imageData, capture.timestamp)
        }
      }

      if (analysisText && typeof sendContextUpdate === 'function') {
        try {
          sendContextUpdate({
            sessionId,
            modality: 'screen',
            analysis: analysisText,
            imageData,
            capturedAt: capture.timestamp,
            metadata: {
              source: sendRealtimeInput ? 'screen_share_stream' : 'screen_capture',
              connectionId: voiceConnectionId,
            },
          })
        } catch (contextErr) {
          console.warn('⚠️ Failed to push screen share context update:', contextErr)
        }
      }

      // Debug logging
      console.log('🖥️ Screen share capture:', {
        dimensions: `${capture.metadata?.width ?? 0}x${capture.metadata?.height ?? 0}`,
        blobSize: `${Math.round(capture.blob.size / 1024)}KB`,
        timestamp: capture.timestamp,
      })

      return capture
    } catch (err) {
      console.error('Screen share capture failed:', err)
      metricsRef.current.failedCaptures++
      return null
    }
  }, [
    maxDimension,
    quality,
    onCapture,
    sessionId,
    voiceConnectionId,
    onAnalysis,
    uploadToBackend,
    sendContextUpdate,
    sendRealtimeInput,
  ])

  // Auto-capture setup
  useEffect(() => {
    const shouldCapture = enableAutoCapture && isActive && 
      (!requireVoiceSession || (sessionId && voiceConnectionId))
    
    if (shouldCapture) {
      console.log(`Starting auto-capture every ${captureInterval}ms`)
      
      const startDelay = setTimeout(() => {
        autoCaptureTimerRef.current = window.setInterval(() => {
          void captureFrame()
        }, captureInterval)
      }, 1000) // 1 second delay for stream to be ready
      
      return () => {
        clearTimeout(startDelay)
        if (autoCaptureTimerRef.current) {
          clearInterval(autoCaptureTimerRef.current)
          autoCaptureTimerRef.current = null
        }
      }
    }

    if (!shouldCapture) {
      if (autoCaptureTimerRef.current) {
        clearInterval(autoCaptureTimerRef.current)
        autoCaptureTimerRef.current = null
      }
    }
    return undefined
  }, [enableAutoCapture, isActive, captureInterval, captureFrame, requireVoiceSession, sessionId, voiceConnectionId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScreenShare()
    }
  }, [stopScreenShare])

  // Get screen share metrics
  const getMetrics = useCallback(() => {
    return {
      ...metricsRef.current,
      avgCaptureTime: Math.round(metricsRef.current.avgCaptureTime * 10) / 10,
    }
  }, [])

  return {
    isActive,
    isInitializing,
    stream,
    error,
    startScreenShare,
    stopScreenShare,
    toggleScreenShare,
    captureFrame,
    uploadToBackend,
    getMetrics,
  }
}
