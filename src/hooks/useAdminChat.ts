import { useState, useCallback, useEffect } from 'react'
import type { Message } from '@/types/core'
import { adminChatService } from '@/core/admin/admin-chat-service'
import { ADMIN_CONFIG } from '@/config/constants'

interface UseAdminChatOptions {
  sessionId?: string
}

interface UseAdminChatReturn {
  messages: Message[]
  isLoading: boolean
  isStreaming: boolean
  error: Error | null
  sendMessage: (content: string) => Promise<void>
  clearMessages: () => void
  isLoadingHistory?: boolean
}

export function useAdminChat({ sessionId }: UseAdminChatOptions = {}): UseAdminChatReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)

  // Initialize with admin session ID
  const resolvedSessionId = sessionId || `admin-${crypto.randomUUID()}`

  // Load history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        setIsLoadingHistory(true)
        // Ensure session exists
        await adminChatService.getOrCreateSession(resolvedSessionId, ADMIN_CONFIG.ADMIN_ID)
        
        // Load conversation history
        const context = await adminChatService.getConversationContext(resolvedSessionId, '', 100)
        
        // Map AdminMessage to Message
        const mapped: Message[] = context.messages.map(msg => ({
          id: msg.id || crypto.randomUUID(),
          role: msg.type as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(),
          metadata: msg.metadata
        }))
        
        setMessages(mapped)
      } catch (err) {
        console.error('Failed to load admin chat history:', err)
      } finally {
        setIsLoadingHistory(false)
      }
    }
    
    void loadHistory()
  }, [resolvedSessionId])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    
    // Persist user message to admin schema
    try {
      await adminChatService.saveMessage({
        sessionId: resolvedSessionId,
        type: 'user',
        content: userMessage.content,
        adminId: ADMIN_CONFIG.ADMIN_ID,
        id: userMessage.id
      })
    } catch (err) {
      console.error('Failed to persist user message:', err)
    }
    
    setIsLoading(true)
    setIsStreaming(true)
    setError(null)

    try {
      const response = await fetch('/api/chat/unified', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-query': 'true',
          'x-session-id': resolvedSessionId
        },
        credentials: 'include',
        body: JSON.stringify({
          messages: [...messages, userMessage],
          context: {
            sessionId: resolvedSessionId
          },
          stream: true
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`)
      }

      // Parse SSE stream
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulatedContent = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataText = line.slice(6).trim()
              if (dataText && dataText !== '[DONE]') {
                try {
                  const parsed = JSON.parse(dataText)
                  // Skip meta events
                  if (parsed.type === 'meta' || parsed.type === 'flow_update') {
                    continue
                  }
                  // Accumulate content
                  if (parsed.content && typeof parsed.content === 'string') {
                    accumulatedContent = parsed.content
                    
                    // Update streaming message
                    setMessages(prev => {
                      const updated = [...prev]
                      const lastMsg = updated[updated.length - 1]
                      if (lastMsg?.role === 'assistant') {
                        updated[updated.length - 1] = {
                          ...lastMsg,
                          content: accumulatedContent
                        }
                      } else {
                        updated.push({
                          id: crypto.randomUUID(),
                          role: 'assistant',
                          content: accumulatedContent,
                          timestamp: new Date()
                        })
                      }
                      return updated
                    })
                  }
                } catch {
                  // Ignore parse errors
                }
              }
            }
          }
        }
      }

      // Persist assistant message after streaming completes
      if (accumulatedContent) {
        try {
          await adminChatService.saveMessage({
            sessionId: resolvedSessionId,
            type: 'assistant',
            content: accumulatedContent,
            adminId: ADMIN_CONFIG.ADMIN_ID
          })
        } catch (err) {
          console.error('Failed to persist assistant message:', err)
        }
      }

      setIsStreaming(false)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to send message')
      setError(error)
      console.error('Admin chat error:', error)
      
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: new Date()
      }])
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
    }
  }, [messages, resolvedSessionId])

  const clearMessages = useCallback(() => {
    // Note: We don't delete from DB here, just clear UI
    // Use AdminChatHistory component to delete sessions
    setMessages([])
  }, [])

  return {
    messages,
    isLoading: isLoading || isLoadingHistory,
    isStreaming,
    error,
    sendMessage,
    clearMessages,
    isLoadingHistory
  }
}

