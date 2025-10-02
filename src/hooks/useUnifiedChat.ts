import { useState, useCallback, useRef, useEffect, useMemo } from 'react'

import {
  type UnifiedMessage,
  type UnifiedChatOptions,
  type UnifiedChatReturn,
  type UnifiedChatRequest,
  type UnifiedContext
} from '@/core/chat/unified-types'
import {
  UNIFIED_CHAT_STORE_ID,
  syncUnifiedChatStoreState,
  resetUnifiedChatStore
} from '@/core/chat/state/unified-chat-store'

interface StreamRunOptions {
  assistantId?: string | null
  requestId?: string
}

function normaliseStreamMessage(
  data: unknown,
  fallbackId?: string | null
): UnifiedMessage | null {
  if (!data || typeof data !== 'object') return null
  const payload = data as Record<string, unknown>
  if (payload.type === 'meta') return null

  const metadata = typeof payload.metadata === 'object' && payload.metadata
    ? { ...(payload.metadata as Record<string, unknown>) }
    : {}

  if (typeof payload.isComplete === 'boolean' && !metadata.isComplete) {
    metadata.isComplete = payload.isComplete
  }

  const id = typeof payload.id === 'string' && payload.id.length > 0
    ? payload.id
    : fallbackId || crypto.randomUUID()

  const validTypes: UnifiedMessage['type'][] = ['text', 'tool', 'multimodal', 'meta']
  const messageType = typeof payload.type === 'string' && validTypes.includes(payload.type as any)
    ? (payload.type as UnifiedMessage['type'])
    : 'text'

  return {
    id,
    role: payload.role === 'user' ? 'user' : 'assistant',
    content: typeof payload.content === 'string' ? payload.content : '',
    timestamp: payload.timestamp ? new Date(payload.timestamp as string) : new Date(),
    type: messageType,
    metadata
  }
}

export function useUnifiedChat(options: UnifiedChatOptions = {}): UnifiedChatReturn {
  const [messages, setMessages] = useState<UnifiedMessage[]>(options.initialMessages ?? [])
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [chatContextState, setChatContextState] = useState<UnifiedContext>(options.context ?? {})

  const abortControllerRef = useRef<AbortController | null>(null)
  const messagesRef = useRef<UnifiedMessage[]>(options.initialMessages ?? [])
  const chatContextRef = useRef<UnifiedContext>(options.context ?? {})

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    chatContextRef.current = chatContextState
  }, [chatContextState])

  const commitMessages = useCallback((
    next: UnifiedMessage[] | ((prev: UnifiedMessage[]) => UnifiedMessage[])
  ) => {
    setMessages(prev => {
      const computed = typeof next === 'function' ? next(prev) : next
      messagesRef.current = computed
      return computed
    })
  }, [])

  const addMessage = useCallback((message: Omit<UnifiedMessage, 'id'> & { id?: string }): UnifiedMessage => {
    const { id, ...rest } = message
    const normalised: UnifiedMessage = {
      ...rest,
      id: id && id.length > 0 ? id : crypto.randomUUID(),
      timestamp: rest.timestamp ?? new Date(),
      type: rest.type ?? 'text',
      metadata: rest.metadata ?? {}
    }

    commitMessages(prev => [...prev, normalised])
    return normalised
  }, [commitMessages])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const replaceMessages = useCallback((nextMessages: UnifiedMessage[]) => {
    commitMessages(nextMessages)
  }, [commitMessages])

  const stop = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    setIsStreaming(false)
    setIsLoading(false)
  }, [])

  const runStream = useCallback(async (
    requestMessages: UnifiedMessage[],
    { assistantId, requestId }: StreamRunOptions = {}
  ) => {
    const reqId = requestId || crypto.randomUUID()

    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      const controller = new AbortController()
      abortControllerRef.current = controller

      setIsLoading(true)
      setIsStreaming(false)
      setError(null)

      const request: UnifiedChatRequest = {
        messages: requestMessages,
        context: chatContextRef.current,
        mode: options.mode ?? 'standard',
        stream: true
      }

      const response = await fetch('/api/chat/unified', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': reqId,
          'x-session-id': options.sessionId || 'anonymous'
        },
        body: JSON.stringify(request),
        signal: controller.signal
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      setIsLoading(false)
      setIsStreaming(true)

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let buffer = ''
      let activeAssistantId = assistantId ?? null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        let boundary = buffer.indexOf('\n\n')
        while (boundary !== -1) {
          const rawEvent = buffer.slice(0, boundary)
          buffer = buffer.slice(boundary + 2)

          const dataLine = rawEvent.split('\n').find(line => line.startsWith('data:'))
          if (dataLine) {
            const payloadText = dataLine.replace(/^data:\s*/, '')
            if (payloadText && payloadText !== '[DONE]') {
              try {
                const parsed = JSON.parse(payloadText)
                const normalised = normaliseStreamMessage(parsed, activeAssistantId)
                if (normalised) {
                  activeAssistantId = normalised.id

                  commitMessages(prev => {
                    const index = prev.findIndex(message => message.id === normalised.id)
                    if (index === -1) {
                      return [...prev, normalised]
                    }

                    const next = [...prev]
                    const existing = next[index]
                    if (!existing) {
                      return next
                    }

                    next[index] = {
                      ...existing,
                      content: normalised.content,
                      metadata: { ...existing.metadata, ...normalised.metadata },
                      timestamp: normalised.timestamp ?? existing.timestamp
                    }
                    return next
                  })

                  options.onMessage?.(normalised)

                  if (normalised.metadata?.isComplete) {
                    setIsStreaming(false)
                    options.onComplete?.()
                  }
                }
              } catch (streamError) {
                console.warn('[UNIFIED_CHAT] Failed to parse stream chunk', streamError)
              }
            }
          }

          boundary = buffer.indexOf('\n\n')
        }
      }

      setIsStreaming(false)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }

      const normalisedError = err instanceof Error ? err : new Error(String(err))
      setIsLoading(false)
      setIsStreaming(false)
      setError(normalisedError)
      options.onError?.(normalisedError)

      commitMessages(prev => ([
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I apologize, but I encountered an error: ${normalisedError.message}. Please try again.`,
          timestamp: new Date(),
          type: 'text',
          metadata: { error: true }
        }
      ]))
    } finally {
      abortControllerRef.current = null
    }
  }, [options, commitMessages])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading || isStreaming) return

    const trimmed = content.trim()
    const userMessage: UnifiedMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
      type: 'text',
      metadata: {}
    }

    const nextMessages = [...messagesRef.current, userMessage]
    messagesRef.current = nextMessages
    commitMessages(nextMessages)
    await runStream(nextMessages, { requestId: crypto.randomUUID() })
  }, [commitMessages, runStream, isLoading, isStreaming])

  const clearMessages = useCallback(() => {
    commitMessages([])
    setError(null)
  }, [commitMessages])

  const updateContext = useCallback((context: Partial<UnifiedContext>) => {
    setChatContextState(prev => ({ ...prev, ...context }))
  }, [])

  const regenerate = useCallback(async () => {
    const current = messagesRef.current
    const lastUserIndex = [...current].map(message => message.role).lastIndexOf('user')
    if (lastUserIndex === -1) return

    const truncated = current.slice(0, lastUserIndex + 1)
    commitMessages(truncated)

    await runStream(truncated)
  }, [commitMessages, runStream])

  const resumeStream = useCallback(async () => {
    const current = messagesRef.current
    const lastAssistantIndex = [...current].map(message => message.role).lastIndexOf('assistant')
    if (lastAssistantIndex === -1) {
      await regenerate()
      return
    }

    const lastAssistant = current[lastAssistantIndex]
    if (!lastAssistant) {
      await regenerate()
      return
    }

    if (lastAssistant.metadata?.isComplete) {
      return
    }

    const truncated = current.slice(0, lastAssistantIndex)
    commitMessages(truncated)

    await runStream(truncated)
  }, [commitMessages, regenerate, runStream])

  const addToolResult = useCallback(async (
    toolCallId: string,
    result: unknown,
    metadata: Record<string, unknown> = {}
  ) => {
    commitMessages(prev => prev.map(message => {
      if (message.role !== 'assistant') return message

      const existingInvocations = Array.isArray(message.metadata?.toolInvocations)
        ? [...(message.metadata!.toolInvocations as unknown[])]
        : []

      const index = existingInvocations.findIndex((invocation: any) => invocation?.toolCallId === toolCallId)
      const payload = {
        toolCallId,
        result,
        state: 'output-available',
        ...metadata
      }

      if (index === -1) {
        existingInvocations.push(payload)
      } else {
        const existing = existingInvocations[index]
        existingInvocations[index] = existing && typeof existing === 'object' 
          ? { ...existing, ...payload }
          : payload
      }

      return {
        ...message,
        metadata: {
          ...message.metadata,
          toolInvocations: existingInvocations
        }
      }
    }))
  }, [commitMessages])

  const chatStatus = useMemo(() => {
    if (error) return 'error' as const
    if (isStreaming) return 'streaming' as const
    if (isLoading) return 'submitted' as const
    return 'ready' as const
  }, [error, isStreaming, isLoading])

  useEffect(() => {
    if (options.context) {
      setChatContextState(prev => ({ ...prev, ...options.context! }))
    }
  }, [options.context])

  // Separate state and actions for stable syncing
  const stateSyncData = useMemo(() => ({
    id: options.sessionId || 'unified-session',
    messages,
    error: error ?? null,
    status: chatStatus,
    context: chatContextState,
  }), [
    options.sessionId,
    messages,
    error,
    chatStatus,
    chatContextState
  ])

  const actionsRef = useRef({
    sendMessage,
    regenerate,
    stop,
    resumeStream,
    addToolResult,
    setMessages: replaceMessages,
    clearError
  })

  // Update actions ref when they change (stable via useCallback)
  useEffect(() => {
    actionsRef.current = {
      sendMessage,
      regenerate,
      stop,
      resumeStream,
      addToolResult,
      setMessages: replaceMessages,
      clearError
    }
  }, [sendMessage, regenerate, stop, resumeStream, addToolResult, replaceMessages, clearError])

  // Sync state with stable dependencies to prevent infinite re-render loops
  useEffect(() => {
    syncUnifiedChatStoreState(stateSyncData, UNIFIED_CHAT_STORE_ID)
  }, [options.sessionId, messages.length, error?.message, chatStatus, JSON.stringify(chatContextState)])

  // Sync actions once on mount or when needed (avoid in loop)
  useEffect(() => {
    syncUnifiedChatStoreState({
      sendMessage: actionsRef.current.sendMessage,
      regenerate: actionsRef.current.regenerate,
      stop: actionsRef.current.stop,
      resumeStream: actionsRef.current.resumeStream,
      addToolResult: actionsRef.current.addToolResult,
      setMessages: actionsRef.current.setMessages,
      clearError: actionsRef.current.clearError
    }, UNIFIED_CHAT_STORE_ID)
  }, []) // Run once on mount; actions are stable

  useEffect(() => () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    resetUnifiedChatStore(UNIFIED_CHAT_STORE_ID)
  }, [])

  return {
    messages,
    isLoading,
    isStreaming,
    error,
    context: chatContextState,
    sendMessage,
    addMessage,
    clearMessages,
    updateContext,
    stop,
    regenerate,
    resumeStream,
    addToolResult,
    setMessages: replaceMessages,
    clearError
  }
}
