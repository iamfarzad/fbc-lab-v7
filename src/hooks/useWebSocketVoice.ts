import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { toast } from 'sonner'

export type VoiceSession = {
  connectionId: string
  languageCode?: string
  voiceName?: string
  mock?: boolean
}

type QueuedAudioItem = {
  data: string
  mimeType: string
}

type LiveServerEvent =
  | { type: 'connected'; payload: { connectionId: string } }
  | { type: 'session_started'; payload: { connectionId: string; languageCode?: string; voiceName?: string; mock?: boolean } }
  | { type: 'session_closed'; payload?: { reason?: string } }
  | { type: 'input_transcript'; payload: { text: string; final?: boolean } }
  | { type: 'model_text'; payload: { text: string } }
  | { type: 'text'; payload: { content: string } }
  | { type: 'audio'; payload: { audioData: string; mimeType?: string } }
  | { type: 'heartbeat'; payload?: { timestamp: number } }
  | { type: 'turn_complete' }
  | { type: 'error'; payload: { message: string; detail?: unknown } }

function ensureAudioContext(audioContextRef: MutableRefObject<AudioContext | null>) {
  if (typeof window === 'undefined') return null

  if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext
    audioContextRef.current = new Ctor({ sampleRate: 24000 })
  }

  if (audioContextRef.current?.state === 'suspended') {
    void audioContextRef.current.resume()
  }

  return audioContextRef.current
}

function base64ToFloat32(base64: string, sampleRateHint: number) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const dataView = new DataView(bytes.buffer)
  const float32 = new Float32Array(bytes.length / 2)
  for (let i = 0; i < bytes.length; i += 2) {
    float32[i / 2] = dataView.getInt16(i, true) / 32768
  }

  return { float32, sampleRate: sampleRateHint }
}

export function useWebSocketVoice() {
  const [session, setSession] = useState<VoiceSession | null>(null)
  const [isSocketReady, setSocketReady] = useState(false)
  const [isSessionActive, setSessionActive] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [partialTranscript, setPartialTranscript] = useState('')
  const [modelReplies, setModelReplies] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const audioQueueRef = useRef<QueuedAudioItem[]>([])
  const isPlayingRef = useRef(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const connectionIdRef = useRef<string | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Voice Activity Detection (VAD) refs
  const vadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastAudioTimeRef = useRef<number>(0)
  const isUserSpeakingRef = useRef<boolean>(false)
  const VAD_SILENCE_TIMEOUT = 2500 // 2.5 seconds of silence before TURN_COMPLETE

  // Session state refs to handle race conditions
  const isSessionActiveRef = useRef<boolean>(false)
  const pendingAudioBufferRef = useRef<ArrayBuffer[]>([])
  const sessionStartResolveRef = useRef<(() => void) | null>(null)
  const sessionStartRejectRef = useRef<((error: Error) => void) | null>(null)

  const serverUrl = useMemo(() => {
    if (typeof window === 'undefined') return undefined
    const envUrl = process.env.NEXT_PUBLIC_LIVE_SERVER_URL
    if (envUrl) return envUrl
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const host = window.location.host
    return `${protocol}://${host.replace(/:\d+$/, '')}:${process.env.NEXT_PUBLIC_LIVE_SERVER_PORT ?? '3001'}`
  }, [])

  const resetState = useCallback((opts?: { soft?: boolean }) => {
    if (!opts?.soft) {
      setSession(null)
      connectionIdRef.current = null
    }
    setSessionActive(false)
    setIsProcessing(false)
    setPartialTranscript('')
    audioQueueRef.current = []
    isPlayingRef.current = false

    // Clear VAD timers
    if (vadTimeoutRef.current) {
      clearTimeout(vadTimeoutRef.current)
      vadTimeoutRef.current = null
    }
    isUserSpeakingRef.current = false
    lastAudioTimeRef.current = 0

    // Clear session state refs
    isSessionActiveRef.current = false
    pendingAudioBufferRef.current = []
    sessionStartResolveRef.current = null
    sessionStartRejectRef.current = null
  }, [])

  const playNextAudio = useCallback(async () => {
    if (isPlayingRef.current) return
    const next = audioQueueRef.current.shift()
    if (!next) return

    const context = ensureAudioContext(audioContextRef)
    if (!context) return

    try {
      isPlayingRef.current = true
      const rate = next.mimeType?.includes('rate=16000') ? 16000 : 24000
      const { float32, sampleRate } = base64ToFloat32(next.data, rate)
      const audioBuffer = context.createBuffer(1, float32.length, sampleRate)
      audioBuffer.copyToChannel(float32, 0, 0)
      const source = context.createBufferSource()
      source.buffer = audioBuffer
      source.connect(context.destination)
      source.onended = () => {
        isPlayingRef.current = false
        playNextAudio()
      }
      source.start()
    } catch (err) {
      console.error('Failed to play audio chunk', err)
      isPlayingRef.current = false
      playNextAudio()
    }
  }, [])

  const enqueueAudio = useCallback((chunk: QueuedAudioItem) => {
    audioQueueRef.current.push(chunk)
    void playNextAudio()
  }, [playNextAudio])

  const sendMessage = useCallback((message: Record<string, unknown>) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify(message))
  }, [])

  const resetVADTimeout = useCallback(() => {
    if (vadTimeoutRef.current) {
      clearTimeout(vadTimeoutRef.current)
    }
    vadTimeoutRef.current = setTimeout(() => {
      if (isUserSpeakingRef.current && isSessionActive && !isProcessing) {
        console.log('🔇 VAD: User stopped speaking, sending TURN_COMPLETE')
        isUserSpeakingRef.current = false
        sendMessage({ type: 'TURN_COMPLETE' })
        setIsProcessing(true)
      }
    }, VAD_SILENCE_TIMEOUT)
  }, [isSessionActive, isProcessing, sendMessage])

  const onUserAudioDetected = useCallback(() => {
    const now = Date.now()
    lastAudioTimeRef.current = now
    isUserSpeakingRef.current = true
    resetVADTimeout()
  }, [resetVADTimeout])

  const arrayBufferToBase64 = useCallback((buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i += 1) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }, [])

  const sendAudioChunk = useCallback((chunk: ArrayBuffer, mimeType: string) => {
    if (!chunk || !mimeType) return

    // Check if session is logically active (either React state or ref)
    const sessionActive = isSessionActive || isSessionActiveRef.current

    if (!sessionActive) {
      // Buffer audio until session becomes active
      pendingAudioBufferRef.current.push(chunk)
      console.log('🔊 Buffering audio chunk, total buffered:', pendingAudioBufferRef.current.length)
      return
    }

    // Trigger VAD detection
    onUserAudioDetected()

    const base64 = arrayBufferToBase64(chunk)
    sendMessage({
      type: 'user_audio',
      payload: {
        audioData: base64,
        mimeType,
      },
    })
    setIsProcessing(true)
  }, [arrayBufferToBase64, isSessionActive, onUserAudioDetected, sendMessage])

  const handleServerEvent = useCallback((event: LiveServerEvent) => {
    switch (event.type) {
      case 'connected': {
        connectionIdRef.current = event.payload.connectionId
        setSocketReady(true)
        break
      }
      case 'session_started': {
        setSession({
          connectionId: event.payload.connectionId,
          languageCode: event.payload.languageCode,
          voiceName: event.payload.voiceName,
          mock: event.payload.mock,
        })
        setSessionActive(true)
        isSessionActiveRef.current = true
        setIsProcessing(false)
        setError(null)

        // Process any buffered audio data now that session is active
        if (pendingAudioBufferRef.current.length > 0) {
          console.log('🔊 Processing buffered audio data:', pendingAudioBufferRef.current.length, 'chunks')
          pendingAudioBufferRef.current.forEach((buffer, index) => {
            setTimeout(() => {
              sendAudioChunk(buffer, `audio/pcm;rate=16000`)
            }, index * 10) // Small delay between chunks to avoid overwhelming
          })
          pendingAudioBufferRef.current = []
        }

        // Resolve session start promise if it exists
        if (sessionStartResolveRef.current) {
          sessionStartResolveRef.current()
          sessionStartResolveRef.current = null
          sessionStartRejectRef.current = null
        }
        break
      }
      case 'session_closed': {
        setSessionActive(false)
        isSessionActiveRef.current = false
        break
      }
      case 'input_transcript': {
        if (event.payload.final) {
          setTranscript((prev) => (prev ? `${prev}\n${event.payload.text}` : event.payload.text))
          setPartialTranscript('')
        } else {
          setPartialTranscript(event.payload.text)
        }
        break
      }
      case 'model_text':
      case 'text': {
        const text = 'content' in event.payload ? event.payload.content : event.payload.text
        if (text) {
          setModelReplies((prev) => [...prev, text])
        }
        break
      }
      case 'audio': {
        enqueueAudio({
          data: event.payload.audioData,
          mimeType: event.payload.mimeType ?? 'audio/pcm;rate=24000',
        })
        break
      }
      case 'heartbeat': {
        // Server heartbeat - respond with client heartbeat for bidirectional keepalive
        sendMessage({ type: 'heartbeat_ack', timestamp: Date.now() })
        break
      }
      case 'turn_complete': {
        setIsProcessing(false)
        break
      }
      case 'error': {
        const message = event.payload?.message ?? 'Voice session error'
        setError(message)
        toast.error(message)
        setIsProcessing(false)

        if (sessionStartRejectRef.current) {
          sessionStartRejectRef.current(new Error(message))
          sessionStartResolveRef.current = null
          sessionStartRejectRef.current = null
        }
        break
      }
    }
  }, [enqueueAudio, sendAudioChunk, sendMessage])

  const connectWebSocket = useCallback(() => {
    if (!serverUrl || wsRef.current) return

    try {
      const socket = new WebSocket(serverUrl)
      wsRef.current = socket

      socket.onopen = () => {
        setSocketReady(true)
        setError(null)
      }

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as LiveServerEvent
          handleServerEvent(data)
        } catch (err) {
          console.error('Failed to parse voice server event', err)
        }
      }

      socket.onerror = (err) => {
        console.error('WebSocket error', err)
        setError('WebSocket error')
      }

      socket.onclose = () => {
        wsRef.current = null
        setSocketReady(false)
        resetState({ soft: true })
        if (!reconnectTimerRef.current) {
          reconnectTimerRef.current = setTimeout(() => {
            reconnectTimerRef.current = null
            connectWebSocket()
          }, 1500)
        }
      }
    } catch (err) {
      console.error('Failed to connect to live server', err)
      setError('Failed to connect to live server')
    }
  }, [handleServerEvent, resetState, serverUrl])

  // Sync session active ref with state
  useEffect(() => {
    isSessionActiveRef.current = isSessionActive
  }, [isSessionActive])

  useEffect(() => {
    connectWebSocket()
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [connectWebSocket])
  const startSession = useCallback(async (opts?: { languageCode?: string; voiceName?: string }) => {
    console.log('🔊 [useWebSocketVoice] startSession called', { isSocketReady, session, opts })

    if (!isSocketReady || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('🔊 [useWebSocketVoice] Voice server not ready')
      toast.error('Voice server not ready')
      return
    }

    if (isSessionActiveRef.current) {
      console.log('🔊 [useWebSocketVoice] Session already active, skipping new start request')
      return
    }

    if (sessionStartResolveRef.current || sessionStartRejectRef.current) {
      console.warn('🔊 [useWebSocketVoice] Session start already in progress')
      return
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null

    try {
      console.log('🔊 [useWebSocketVoice] Starting voice session...')
      setIsProcessing(true)

      const startPromise = new Promise<void>((resolve, reject) => {
        sessionStartResolveRef.current = () => {
          if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutId = null
          }
          sessionStartResolveRef.current = null
          sessionStartRejectRef.current = null
          resolve()
        }

        sessionStartRejectRef.current = (error: Error) => {
          if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutId = null
          }
          sessionStartResolveRef.current = null
          sessionStartRejectRef.current = null
          reject(error)
        }
      })

      timeoutId = setTimeout(() => {
        if (sessionStartRejectRef.current) {
          sessionStartRejectRef.current(new Error('Session start timeout'))
        }
      }, 10_000)

      sendMessage({
        type: 'start',
        payload: {
          languageCode: opts?.languageCode,
          voiceName: opts?.voiceName,
        },
      })

      await startPromise
      console.log('🔊 [useWebSocketVoice] Voice session started successfully')

    } catch (error) {
      console.error('🔊 [useWebSocketVoice] Failed to start voice session:', error)
      setError(error instanceof Error ? error.message : 'Failed to start voice session')
      toast.error(error instanceof Error ? error.message : 'Failed to start voice session')
      setIsProcessing(false)
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      sessionStartResolveRef.current = null
      sessionStartRejectRef.current = null
    }
  }, [isSocketReady, sendMessage, session])

  const stopSession = useCallback(() => {
    // Prevent multiple calls to stopSession
    if (!isSessionActive && !isProcessing) return

    sendMessage({ type: 'TURN_COMPLETE' })
    setSessionActive(false)
    setIsProcessing(false)
  }, [sendMessage, isSessionActive, isProcessing])

  const value = useMemo(() => ({
    session,
    isSocketReady,
    isSessionActive,
    isProcessing,
    transcript,
    partialTranscript,
    modelReplies,
    error,
    startSession,
    stopSession,
    sendAudioChunk,
  }), [
    error,
    isProcessing,
    isSessionActive,
    isSocketReady,
    modelReplies,
    partialTranscript,
    session,
    sendAudioChunk,
    startSession,
    stopSession,
    transcript,
  ])

  return value
}
