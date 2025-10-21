import { useEffect } from 'react'
import { toast } from 'sonner'
import { blobToBase64 } from '@/lib/utils'
import type { VoiceContextUpdate } from '@/hooks/useRealtimeVoice'

type SnapshotSetter = (snapshot: { analysis: string; imageData?: string; capturedAt: number }) => void

interface ScreenShareOptions {
  isScreenSharing: boolean
  stream: MediaStream | null
  sessionId: string | null
  isVoiceSessionActive: boolean
  sendRealtimeInput?: ((chunks: Array<{ mimeType: string; data: string }>) => void)
  sendContextUpdate?: ((update: VoiceContextUpdate) => void)
  voiceConnectionId?: string
  setLastScreenSnapshot: SnapshotSetter
  setScreenThumbnail: (thumbnail: string | null) => void
  hasNotifiedCapture: boolean
  setHasNotifiedCapture: (value: boolean) => void
}

export function useScreenShareSnapshots({
  isScreenSharing,
  stream,
  sessionId,
  isVoiceSessionActive,
  sendRealtimeInput,
  sendContextUpdate,
  voiceConnectionId,
  setLastScreenSnapshot,
  setScreenThumbnail,
  hasNotifiedCapture,
  setHasNotifiedCapture,
}: ScreenShareOptions) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!isScreenSharing || !stream || !sessionId) return

    const video = document.createElement('video')
    video.srcObject = stream
    video.muted = true

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      toast.error('Failed to initialize screen capture')
      return
    }

    let ready = false
    let cancelled = false
    let isUploading = false

    const configureCanvas = () => {
      const width = video.videoWidth || 1280
      const height = video.videoHeight || 720
      const maxWidth = 1280
      const scale = width > maxWidth ? maxWidth / width : 1
      canvas.width = Math.floor(width * scale) || 1280
      canvas.height = Math.floor(height * scale) || 720
      ready = true
    }

    const CAPTURE_INTERVAL_MS = 500
    const THUMBNAIL_INTERVAL_MS = 2000
    const ANALYSIS_INTERVAL_MS = 4000
    let captureIntervalId: number | null = null
    let thumbnailIntervalId: number | null = null
    let lastAnalysisAt = 0

    const runScreenAnalysis = async (imageDataUrl: string, capturedAt: number, source: 'stream' | 'legacy') => {
      try {
        const response = await fetch('/api/tools/screen', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-intelligence-session-id': sessionId,
            ...(voiceConnectionId ? { 'x-voice-connection-id': voiceConnectionId } : {}),
          },
          body: JSON.stringify({
            image: imageDataUrl,
            type: 'screen',
            context: {
              trigger: isVoiceSessionActive ? 'voice' : 'manual',
              prompt: isVoiceSessionActive
                ? 'Provide a concise summary aligned with the current voice conversation.'
                : 'Analyze this screen and provide key insights.',
            },
          }),
        })

        if (!response.ok) {
          console.error('Screen analysis request failed with status', response.status)
          return
        }

        const data = await response.json().catch(() => null)
        const analysis = data?.output?.analysis || data?.analysis
        if (!analysis) return

        setLastScreenSnapshot({ analysis, imageData: imageDataUrl, capturedAt })
        console.log('📸 Screen captured and analyzed', {
          trigger: isVoiceSessionActive ? 'voice' : 'manual',
          analysisLength: analysis.length,
          timestamp: new Date(capturedAt).toLocaleTimeString(),
        })

        if (!hasNotifiedCapture) {
          toast.success(source === 'stream'
            ? 'Screen sharing active - streaming frames continuously'
            : 'Screen sharing active - capturing regularly')
          setHasNotifiedCapture(true)
        }

        if (typeof sendContextUpdate === 'function') {
          sendContextUpdate({
            sessionId,
            modality: 'screen',
            analysis,
            imageData: imageDataUrl,
            capturedAt,
            metadata: {
              source: source === 'stream' ? 'screen_share_stream' : 'screen_capture',
              connectionId: voiceConnectionId,
            },
          })
        }
      } catch (err) {
        console.error('❌ Failed to analyze screen frame:', err)
      }
    }

    const captureFrame = async () => {
      if (cancelled || !ready || isUploading) return
      if (video.readyState < 2) return

      isUploading = true
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/jpeg', 0.7)
        )
        if (!blob) {
          isUploading = false
          return
        }

        const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
        const capturedAt = Date.now()
    const shouldAnalyze = capturedAt - lastAnalysisAt >= ANALYSIS_INTERVAL_MS
    const hasRealtimeInput = typeof sendRealtimeInput === 'function' && isVoiceSessionActive

        if (hasRealtimeInput) {
          try {
            const base64Data = await blobToBase64(blob)
            sendRealtimeInput?.([{
              mimeType: 'image/jpeg',
              data: base64Data,
            }])
            console.log('📺 Screen frame streamed to Live API')
          } catch (err) {
            console.error('❌ Failed to stream screen frame:', err)
          }
        }

        if (hasRealtimeInput && !hasNotifiedCapture) {
          setLastScreenSnapshot({
            analysis: 'Screen frame captured - awaiting analysis...',
            imageData: dataUrl,
            capturedAt,
          })
        }

        if (!hasRealtimeInput || shouldAnalyze) {
          lastAnalysisAt = capturedAt
          await runScreenAnalysis(dataUrl, capturedAt, hasRealtimeInput ? 'stream' : 'legacy')
        }
      } catch (err) {
        console.error('Screen share capture failed:', err)
      } finally {
        isUploading = false
      }
    }

    const handleLoadedMetadata = () => {
      configureCanvas()
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    if (video.readyState >= 1) {
      configureCanvas()
    }

    const updateThumbnail = () => {
      if (cancelled || !ready) return
      if (video.readyState < 2) return
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.5)
        setScreenThumbnail(thumbnailUrl)
      } catch (err) {
        console.debug('Thumbnail update skipped:', err)
      }
    }

    const startDelay = setTimeout(() => {
      captureIntervalId = window.setInterval(captureFrame, CAPTURE_INTERVAL_MS)
      thumbnailIntervalId = window.setInterval(updateThumbnail, THUMBNAIL_INTERVAL_MS)
      void captureFrame()
      updateThumbnail()
    }, 1000)

    return () => {
      cancelled = true
      clearTimeout(startDelay)
      if (captureIntervalId) window.clearInterval(captureIntervalId)
      if (thumbnailIntervalId) window.clearInterval(thumbnailIntervalId)
      video.pause()
      video.srcObject = null
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      setScreenThumbnail(null)
      setHasNotifiedCapture(false)
    }
  }, [
    isScreenSharing,
    stream,
    sessionId,
    isVoiceSessionActive,
    sendRealtimeInput,
    sendContextUpdate,
    voiceConnectionId,
    hasNotifiedCapture,
    setHasNotifiedCapture,
    setLastScreenSnapshot,
    setScreenThumbnail,
  ])
}
