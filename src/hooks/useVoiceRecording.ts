import { useCallback, useEffect, useRef, useState } from 'react'

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

type RecognitionConstructor = new () => SpeechRecognition

declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor
    webkitSpeechRecognition?: RecognitionConstructor
  }
}

function getRecognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const ctor = (window.SpeechRecognition || window.webkitSpeechRecognition) as RecognitionConstructor | undefined
  return ctor ?? null
}

export function useVoiceRecording() {
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const stopResolverRef = useRef<((value: string) => void) | null>(null)
  const transcriptRef = useRef('')

  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcription, setTranscription] = useState('')
  const [partialTranscript, setPartialTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)

  const ensureRecognition = useCallback(() => {
    const ctor = getRecognitionConstructor()
    if (!ctor) {
      setIsSupported(false)
      setError('Speech recognition is not supported in this browser yet.')
      return null
    }

    setIsSupported(true)

    if (!recognitionRef.current) {
      const recognition = new ctor()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : 'en-US'
      recognitionRef.current = recognition
    }

    return recognitionRef.current
  }, [])

  const cleanupRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null
        recognitionRef.current.onerror = null
        recognitionRef.current.onend = null
        recognitionRef.current.stop()
      } catch (err) {
        // Ignore stop errors during teardown
      }
    }
    recognitionRef.current = null
  }, [])

  const startRecording = useCallback(async () => {
    const recognition = ensureRecognition()
    if (!recognition || isRecording) {
      return
    }

    setError(null)
    setTranscription('')
    transcriptRef.current = ''
    setPartialTranscript('')
    setIsRecording(true)
    setIsTranscribing(true)

    recognition.onresult = (event) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0]?.transcript ?? ''
        } else {
          interimTranscript += result[0]?.transcript ?? ''
        }
      }

      if (finalTranscript) {
        transcriptRef.current += finalTranscript.trim()
        setTranscription(prev => `${prev} ${finalTranscript}`.trim())
      }

      setPartialTranscript(interimTranscript.trim())
    }

    recognition.onerror = (event: RecognitionErrorEvent) => {
      const errorCode = event.error || ''
      const message = errorCode === 'not-allowed'
        ? 'Microphone permission denied.'
        : errorCode === 'no-speech'
          ? 'No speech detected. Please try again.'
        : event.message || 'Voice recognition error.'
      setError(message)
      setIsRecording(false)
      setIsTranscribing(false)
      stopResolverRef.current?.('')
      stopResolverRef.current = null
    }

    recognition.onend = () => {
      setIsRecording(false)
      setIsTranscribing(false)
      setPartialTranscript('')
      if (stopResolverRef.current) {
        stopResolverRef.current(transcriptRef.current.trim())
        stopResolverRef.current = null
      }
    }

    try {
      recognition.start()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start voice recognition.'
      setError(message)
      setIsRecording(false)
      setIsTranscribing(false)
    }
  }, [ensureRecognition, isRecording])

  const stopRecording = useCallback(async (): Promise<string> => {
    const recognition = recognitionRef.current
    if (!recognition || !isRecording) {
      return transcriptRef.current.trim()
    }

    return new Promise((resolve) => {
      stopResolverRef.current = resolve
      try {
        recognition.stop()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to stop voice recognition.'
        setError(message)
        setIsRecording(false)
        setIsTranscribing(false)
        stopResolverRef.current = null
        resolve(transcriptRef.current.trim())
      }
    })
  }, [isRecording])

  useEffect(() => cleanupRecognition, [cleanupRecognition])

  return {
    isRecording,
    isTranscribing,
    transcription,
    partialTranscript,
    error,
    isSupported,
    startRecording,
    stopRecording,
  }
}
