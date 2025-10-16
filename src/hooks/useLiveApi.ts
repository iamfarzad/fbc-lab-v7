import { useCallback } from 'react'
import { useRealtimeVoice, type UseRealtimeVoiceOptions } from '@/hooks/useRealtimeVoice'

export type UseLiveApiOptions = UseRealtimeVoiceOptions

export function useLiveApi(options: UseLiveApiOptions = {}) {
  // Delegate all real-time responsibilities to the proven hook
  const realtime = useRealtimeVoice(options)

  // One-shot: Explicit screen analysis (HTTP)
  const sendScreenShareMessage = useCallback(
    async (
      imageBase64: string,
      prompt: string,
      opts?: { sessionId?: string; voiceConnectionId?: string; type?: 'screen' | 'document' }
    ): Promise<{ analysis?: string; ok: boolean }> => {
      const body = {
        image: imageBase64.startsWith('data:')
          ? imageBase64
          : `data:image/jpeg;base64,${imageBase64}`,
        type: opts?.type ?? 'screen',
        context: {
          prompt,
          trigger: realtime.isSessionActive ? 'voice' : 'manual',
        },
      }

      const response = await fetch('/api/tools/screen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(opts?.sessionId ? { 'x-intelligence-session-id': opts.sessionId } : {}),
          ...(opts?.voiceConnectionId ? { 'x-voice-connection-id': opts.voiceConnectionId } : {}),
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        return { ok: false, analysis: undefined }
      }
      const data = await response.json().catch(() => ({}))
      const analysis = data?.output?.analysis || data?.analysis
      return { ok: true, analysis }
    },
    [realtime.isSessionActive]
  )

  // One-shot: Webcam snapshot analysis (HTTP)
  const sendWebcamAnalyze = useCallback(
    async (
      blob: Blob,
      opts?: { sessionId?: string; voiceConnectionId?: string }
    ): Promise<{ analysis?: string; ok: boolean }> => {
      const formData = new FormData()
      formData.append('webcamCapture', blob, `webcam-${Date.now()}.jpg`)
      const response = await fetch('/api/tools/webcam', {
        method: 'POST',
        headers: {
          ...(opts?.sessionId ? { 'x-intelligence-session-id': opts.sessionId } : {}),
          ...(opts?.voiceConnectionId ? { 'x-voice-connection-id': opts.voiceConnectionId } : {}),
        },
        body: formData,
      })
      if (!response.ok) return { ok: false }
      const data = await response.json().catch(() => ({}))
      const analysis = data?.analysis || data?.output?.analysis
      return { ok: true, analysis }
    },
    []
  )

  // One-shot: Attachments upload (HTTP)
  const uploadAttachments = useCallback(
    async (files: File[], sessionId: string): Promise<{ attachments?: any[]; prompt?: string; ok: boolean }> => {
      const formData = new FormData()
      formData.append('sessionId', sessionId)
      files.forEach((file) => formData.append('files', file, file.name))

      const response = await fetch('/api/chat/attachments', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) return { ok: false }
      const data = await response.json().catch(() => ({}))
      if (!data?.ok) return { ok: false }
      return { ok: true, attachments: data.attachments, prompt: data.prompt }
    },
    []
  )

  return {
    // Real-time (WebSocket) — pass-through
    ...realtime,

    // One-shot (HTTP)
    sendScreenShareMessage,
    sendWebcamAnalyze,
    uploadAttachments,
  }
}

