/**
 * Unified Chat Types - AI SDK Compatible
 * Maintains compatibility while using AI SDK backend
 * 
 * NOTE: Core types now live in @/types/core.ts
 * This file re-exports them for backward compatibility
 */

// Re-export canonical types from core
export type { 
  Message, 
  UnifiedMessage, 
  MessageMetadata,
  Attachment,
  TokenUsage,
  ChatContext,
  LeadContext,
  MultimodalData,
  ChatCapabilities
} from '@/types/core'

// Keep only unified-chat-specific types here
export type UnifiedContext = import('@/types/core').ChatContext

import type { Message, ChatContext, ChatCapabilities } from '@/types/core'

// Use canonical types for all interfaces
export interface UnifiedChatOptions {
  sessionId?: string
  context?: ChatContext
  initialMessages?: Message[]
  onMessage?: (message: Message) => void
  onComplete?: () => void
  onError?: (error: Error) => void
}

export interface UnifiedChatReturn {
  messages: Message[]
  isLoading: boolean
  isStreaming: boolean
  error: Error | null
  context: ChatContext
  sendMessage: (content: string) => Promise<void>
  addMessage: (message: Omit<Message, 'id'>) => Message
  clearMessages: () => void
  updateContext: (context: Partial<ChatContext>) => void
  stop: () => Promise<void>
  regenerate: () => Promise<void>
  resumeStream: () => Promise<void>
  addToolResult: (
    toolCallId: string,
    result: unknown,
    metadata?: Record<string, unknown>
  ) => Promise<void>
  setMessages: (messages: Message[]) => void
  clearError: () => void
}

export interface UnifiedChatRequest {
  messages: Message[]
  context?: ChatContext
  stream?: boolean
}

export interface UnifiedChatProvider {
  generate(input: {
    messages: Message[]
    context?: ChatContext
  }): AsyncIterable<Message>
  
  getCapabilities(): ChatCapabilities
}
