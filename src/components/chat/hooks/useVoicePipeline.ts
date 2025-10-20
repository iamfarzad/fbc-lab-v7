import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useLiveApi } from '@/hooks/useLiveApi'

type Snapshot = {
  analysis: string
  imageData?: string
  capturedAt: number
}

interface VoicePipelineOptions {
  sessionId: string
  setListening: (listening: boolean) => void
  appendVoiceUserMessage: (text: string) => void
  updatePartialUserTranscript: (text: string) => void
  appendVoiceAssistantChunk: (text: string) => void
  finalizeVoiceAssistantMessage: (payload?: { error?: string }) => void
  lastScreenSnapshot: Snapshot | null
  lastWebcamSnapshot: Snapshot | null
}

type ScreenAnalyzer = ((prompt: string) => void | Promise<void>) | null

export function useVoicePipeline({
  sessionId,
  setListening,
  appendVoiceUserMessage,
  updatePartialUserTranscript,
  appendVoiceAssistantChunk,
  finalizeVoiceAssistantMessage,
  lastScreenSnapshot,
  lastWebcamSnapshot,
}: VoicePipelineOptions) {
  const [aiSpeechTranscript, setAiSpeechTranscript] = useState('')
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const screenAnalyzerRef = useRef<ScreenAnalyzer>(null)
  const audioHookRef = useRef<ReturnType<typeof useLiveApi> | null>(null)

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current)
      }
    }
  }, [])

  const handleVoiceSessionState = useCallback((state: { active: boolean; isProcessing?: boolean }) => {
    setListening(state.active || Boolean(state.isProcessing))
    if (!state.active && !state.isProcessing) {
      finalizeVoiceAssistantMessage()
    }
  }, [finalizeVoiceAssistantMessage, setListening])

  const handleVoicePartialTranscript = useCallback((text: string) => {
    updatePartialUserTranscript(text)
    console.log('🎤 Partial transcript:', text)
  }, [updatePartialUserTranscript])

  const handleVoiceFinalTranscript = useCallback((text: string) => {
    console.log('🎤 Final transcript:', text)
    appendVoiceUserMessage(text)

    import('@/core/context/multimodal-context').then(({ multimodalContextManager }) => {
      multimodalContextManager.addVoiceTranscript(sessionId, text, 'user', true)
        .then(() => console.log('✅ Voice transcript stored'))
        .catch(err => console.error('❌ Failed to store voice context:', err))
    })

    try {
      screenAnalyzerRef.current?.(text)
    } catch (err) {
      console.warn('Screen analyzer failed:', err)
    }
  }, [appendVoiceUserMessage, sessionId])

  const handleVoiceAssistantText = useCallback((text: string) => {
    console.log('🤖 Assistant chunk:', text)
    appendVoiceAssistantChunk(text)

    import('@/core/context/multimodal-context').then(({ multimodalContextManager }) => {
      multimodalContextManager.addVoiceTranscript(sessionId, text, 'assistant', true)
        .catch((err: unknown) => console.error('❌ Failed to store assistant voice:', err))
    }).catch((err) => {
      console.warn('⚠️ Multimodal context unavailable:', err)
    })
  }, [appendVoiceAssistantChunk, sessionId])

  const handleVoiceOutputTranscript = useCallback((text: string, isFinal: boolean) => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current)
    }
    setAiSpeechTranscript(text)
    if (isFinal) {
      resetTimerRef.current = setTimeout(() => setAiSpeechTranscript(''), 3000)
    }
  }, [])

  const handleVoiceTurnComplete = useCallback(() => {
    finalizeVoiceAssistantMessage()
  }, [finalizeVoiceAssistantMessage])

  const handleVoiceInterrupted = useCallback(() => {
    console.log('🔇 Voice interrupted')
    finalizeVoiceAssistantMessage()
  }, [finalizeVoiceAssistantMessage])

  const handleVoiceToolCall = useCallback(async (toolCall: any) => {
    if (toolCall?.handledByServer || toolCall?.handledBy === 'server') {
      console.info('🛠️ Voice tool call handled server-side; skipping client execution.')
      return
    }
    const functionCalls: any[] = Array.isArray(toolCall?.functionCalls) ? toolCall.functionCalls : []
    if (functionCalls.length === 0) return

    const names = functionCalls.map((fc) => fc?.name ?? 'tool').join(', ')
    toast.info(`Running ${names}…`, { id: 'voice-tool-call' })

    const parseArgs = (raw: unknown): Record<string, unknown> => {
      if (!raw) return {}
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw) as Record<string, unknown>
        } catch {
          return {}
        }
      }
      if (typeof raw === 'object') return raw as Record<string, unknown>
      return {}
    }

    const responses: Array<{ id: string; name: string; response: { json: any } }> = []

    for (const call of functionCalls) {
      const name: string = typeof call?.name === 'string' ? call.name : 'unknown_tool'
      const id: string = typeof call?.id === 'string' ? call.id : crypto.randomUUID()
      const args = parseArgs(call?.args)

      try {
        let resultPayload: Record<string, unknown> = {}

        if (name === 'search_web') {
          const query = typeof args?.query === 'string' ? args.query.trim() : ''
          const urls = Array.isArray(args?.urls) ? args.urls.filter((u): u is string => typeof u === 'string') : undefined
          if (!query) {
            throw new Error('Missing query for web search.')
          }

          const response = await fetch('/api/tools/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, urls }),
          })

          if (!response.ok) {
            const text = await response.text().catch(() => 'Web search failed.')
            throw new Error(text || `Web search failed with status ${response.status}`)
          }

          const data = await response.json()
          resultPayload = {
            summary: data?.result?.summary ?? data?.result?.text ?? '',
            citations: data?.result?.citations ?? [],
            urlsUsed: data?.result?.urlsUsed ?? [],
          }
        } else if (name === 'capture_screen_snapshot') {
          if (!lastScreenSnapshot) {
            throw new Error('No recent screen share captured yet.')
          }
          const summaryOnly = Boolean(args?.summaryOnly)
          resultPayload = {
            analysis: lastScreenSnapshot.analysis,
            capturedAt: lastScreenSnapshot.capturedAt,
            imageAvailable: Boolean(!summaryOnly && lastScreenSnapshot.imageData),
            imageData: summaryOnly ? undefined : lastScreenSnapshot.imageData,
          }
        } else if (name === 'capture_webcam_snapshot') {
          if (!lastWebcamSnapshot) {
            throw new Error('No recent webcam capture available yet.')
          }
          const summaryOnly = Boolean(args?.summaryOnly)
          resultPayload = {
            analysis: lastWebcamSnapshot.analysis,
            capturedAt: lastWebcamSnapshot.capturedAt,
            imageAvailable: false,
            imageData: summaryOnly ? undefined : undefined,
          }
        } else {
          throw new Error(`Unsupported tool: ${name}`)
        }

        responses.push({
          id,
          name,
          response: { json: { success: true, result: resultPayload } },
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Tool execution failed.'
        responses.push({
          id,
          name,
          response: { json: { success: false, error: message } },
        })
      }
    }

    const hook = audioHookRef.current
    if (!hook) return
    hook.sendToolResult(responses)
  }, [lastScreenSnapshot, lastWebcamSnapshot])

  const handleVoiceToolResult = useCallback((result: any) => {
    console.log('🛠️ Voice tool result:', result)
    const payload = result?.payload ?? result
    const errorMessage: string | undefined =
      typeof payload?.error === 'string' ? payload.error : undefined

    if (errorMessage) {
      toast.error(errorMessage, { id: 'voice-tool-call' })
      return
    }

    const responses = Array.isArray(payload?.responses) ? payload.responses : []
    const failedResponse = responses.find((item: any) => item?.response?.json?.success === false)
    if (failedResponse) {
      const failureMessage =
        typeof failedResponse.response?.json?.error === 'string'
          ? failedResponse.response.json.error
          : 'Tool execution failed.'
      toast.error(failureMessage, { id: 'voice-tool-call' })
      return
    }

    toast.success('Tool result ready.', { id: 'voice-tool-call' })
  }, [])

  const handleVoiceError = useCallback((message: string) => {
    finalizeVoiceAssistantMessage({ error: message })
  }, [finalizeVoiceAssistantMessage])

  const audioHook = useLiveApi({
    onSessionStateChange: handleVoiceSessionState,
    onPartialTranscript: handleVoicePartialTranscript,
    onFinalTranscript: handleVoiceFinalTranscript,
    onAssistantText: handleVoiceAssistantText,
    onOutputTranscript: handleVoiceOutputTranscript,
    onTurnComplete: handleVoiceTurnComplete,
    onInterrupted: handleVoiceInterrupted,
    onSetupComplete: () => {},
    onToolCall: handleVoiceToolCall,
    onToolResult: handleVoiceToolResult,
    onError: handleVoiceError,
  })
  audioHookRef.current = audioHook

  const toggleVoiceSession = useCallback(async () => {
    const hook = audioHookRef.current
    if (!hook) {
      console.error('🎤 Audio hook ref not available')
      return
    }
    if (hook.isSessionActive) {
      await hook.stopSession()
    } else {
      await hook.startSession({ sessionId })
    }
  }, [sessionId])

  const voiceConnectionId = audioHook.session?.connectionId ?? undefined

  const visualizerState = useMemo(() => {
    if (!audioHook.isSocketReady) return 'connecting' as const
    if (audioHook.isProcessing && !audioHook.isRecording) return 'initializing' as const
    if (audioHook.isRecording) return 'listening' as const
    return (audioHook.modelReplies?.length ?? 0) > 0 ? ('speaking' as const) : ('thinking' as const)
  }, [audioHook.isSocketReady, audioHook.isProcessing, audioHook.isRecording, audioHook.modelReplies])

  const registerScreenAnalyzer = useCallback((fn: ScreenAnalyzer) => {
    screenAnalyzerRef.current = fn || null
  }, [])

  return {
    audio: audioHook,
    toggleVoiceSession,
    aiSpeechTranscript,
    voiceConnectionId,
    visualizerState,
    registerScreenAnalyzer,
  }
}
