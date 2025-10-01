// NOTE: This file defines a single export below. Do not duplicate the hook.
// 🚨 DEPRECATED: This is now a compatibility shim for useUnifiedChat
// TODO: Remove after deprecation window (2-3 days)

import { useUnifiedChat } from './useUnifiedChat'
import { useState, useCallback, useRef } from 'react'

export interface IntelligenceContext {
  lead: { email: string; name: string }
  company?: {
    name: string
    size: string
    domain: string
    summary: string
    website: string
    industry: string
    linkedin: string
  }
  person?: {
    role: string
    company: string
    fullName: string
    seniority: string
    profileUrl: string
  }
  role?: string
  roleConfidence?: number
  intent?: { type: string; confidence: number; slots: unknown }
  capabilities: string[]
}

export function useConversationalIntelligence() {
  // 🚨 DEPRECATED SHIM: This now uses useUnifiedChat internally
  console.warn('⚠️ useConversationalIntelligence is DEPRECATED. Using useUnifiedChat internally.')

  const [context, setContext] = useState<IntelligenceContext | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastSessionIdRef = useRef<string | null>(null)

  // Use unified chat internally
  const unifiedChat = useUnifiedChat({
    mode: 'standard',
    sessionId: lastSessionIdRef.current || undefined,
    onMessage: (message: any) => {
      // Handle incoming messages if needed
      console.log('Unified chat message:', message)
    }
  } as any)
  void unifiedChat

  // Multimodal state tracking
  const [activeModalities, setActiveModalities] = useState<{
    voice: boolean
    webcam: boolean
    screen: boolean
    text: boolean
  }>({
    voice: false,
    webcam: false,
    screen: false,
    text: true // Text is always available
  })

  const getSessionId = useCallback(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('intelligence-session-id')
  }, [])

  /**
   * Fetch context using unified chat system
   */
  const fetchContext = useCallback(
    async (
      sessionId: string,
      opts?: { force?: boolean; ttlMs?: number }
    ): Promise<void> => {
      if (!sessionId) return
      void opts

      setIsLoading(true)
      setError(null)

      try {
        // Use unified chat to get intelligence context
        const reqId = (self.crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
        console.log('[UNIFIED]['+reqId+'] sending');
        const response = await fetch('/api/chat/unified', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-request-id': reqId
          },
          cache: 'no-store',
          next: { revalidate: 0 },
          body: JSON.stringify({
            messages: [{
              id: crypto.randomUUID(),
              role: 'user',
              content: 'Get current intelligence context for this session',
              timestamp: new Date(),
              type: 'text'
            }],
            context: { sessionId },
            mode: 'standard'
          })
        })

        if (response.ok) {
          const data = await response.json()
          // Extract context from response
          setContext(data.context || null)
        }
      } catch (e) {
        console.error('Intelligence context fetch error:', e)
        setError(e instanceof Error ? e.message : 'Failed to fetch context')
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const fetchContextFromLocalSession = useCallback(async () => {
    const sessionId = getSessionId()
    if (sessionId) {
      await fetchContext(sessionId)
    }
  }, [getSessionId, fetchContext])

  const clearContextCache = useCallback(() => {
    setContext(null)
    setError(null)
  }, [])

  const generatePersonalizedGreeting = useCallback(() => {
    if (!context) return 'Hello! How can I help you today?'

    const { lead, company, person } = context
    const name = person?.fullName || lead.name
    const companyName = company?.name || person?.company

    if (companyName) {
      return `Hello ${name}! I see you're from ${companyName}. How can I help you with your business needs today?`
    }

    return `Hello ${name}! How can I help you today?`
  }, [context])

  const updateMultimodalCapabilities = useCallback(
    async (sessionId: string, capabilities: string[]): Promise<void> => {
      try {
        // Use unified chat to update capabilities
        const reqId = (self.crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
        console.log('[UNIFIED]['+reqId+'] sending');
        await fetch('/api/chat/unified', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-request-id': reqId
          },
          cache: 'no-store',
          next: { revalidate: 0 },
          body: JSON.stringify({
            messages: [{
              id: crypto.randomUUID(),
              role: 'user',
              content: `Update multimodal capabilities: ${capabilities.join(', ')}`,
              timestamp: new Date(),
              type: 'text'
            }],
            context: { sessionId },
            mode: 'standard'
          })
        })
      } catch (e) {
        console.error('Failed to update multimodal capabilities:', e)
      }
    },
    []
  )

  // Multimodal state management
  const setModalityActive = useCallback((modality: keyof typeof activeModalities, active: boolean) => {
    setActiveModalities(prev => ({ ...prev, [modality]: active }))
  }, [])

  const getMultimodalStatus = useCallback(() => {
    return {
      ...activeModalities,
      totalActive: Object.values(activeModalities).filter(Boolean).length
    }
  }, [activeModalities])

  // Real-time voice integration using unified chat
  const sendRealtimeVoice = useCallback(async (audioData: string, sessionId: string) => {
    try {
      const reqId = (self.crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
      console.log('[UNIFIED]['+reqId+'] sending');
      const response = await fetch('/api/chat/unified', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': reqId
        },
        cache: 'no-store',
        next: { revalidate: 0 },
        body: JSON.stringify({
          messages: [{
            id: crypto.randomUUID(),
            role: 'user',
            content: 'Voice input received',
            timestamp: new Date(),
            type: 'text'
          }],
          context: {
            sessionId,
            multimodalData: {
              audioData,
              mimeType: 'audio/pcm;rate=16000'
            }
          },
          mode: 'realtime'
        })
      })
      return response.ok
    } catch (e) {
      console.error('Realtime voice send error:', e)
      return false
    }
  }, [])

  const initializeRealtimeVoice = useCallback(async (sessionId: string) => {
    try {
      const reqId = (self.crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
      console.log('[UNIFIED]['+reqId+'] sending');
      const response = await fetch('/api/chat/unified', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': reqId
        },
        cache: 'no-store',
        next: { revalidate: 0 },
        body: JSON.stringify({
          messages: [{
            id: crypto.randomUUID(),
            role: 'user',
            content: 'Initialize real-time voice session',
            timestamp: new Date(),
            type: 'text'
          }],
          context: { sessionId },
          mode: 'realtime'
        })
      })
      return response.ok
    } catch (e) {
      console.error('Realtime voice init error:', e)
      return false
    }
  }, [])

  const endRealtimeVoice = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch('/api/chat/unified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            id: crypto.randomUUID(),
            role: 'user',
            content: 'End real-time voice session',
            timestamp: new Date(),
            type: 'text'
          }],
          context: { sessionId },
          mode: 'realtime'
        })
      })
      return response.ok
    } catch (e) {
      console.error('Realtime voice end error:', e)
      return false
    }
  }, [])

  return {
    context,
    isLoading,
    error,
    getSessionId,
    fetchContext,
    fetchContextFromLocalSession,
    clearContextCache,
    generatePersonalizedGreeting,
    updateMultimodalCapabilities,
    // Multimodal state management
    activeModalities,
    setModalityActive,
    getMultimodalStatus,
    // Real-time voice integration
    sendRealtimeVoice,
    initializeRealtimeVoice,
    endRealtimeVoice
  }
}
