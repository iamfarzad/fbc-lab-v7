/**
 * Unified Chat Types - AI SDK Compatible
 * Maintains compatibility while using AI SDK backend
 */

export interface UnifiedMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  type?: 'text' | 'tool' | 'multimodal' | 'meta'
  metadata?: {
    mode?: string
    isStreaming?: boolean
    isComplete?: boolean
    finalChunk?: boolean
    error?: boolean
    errorCode?: string
    errorMessage?: string
    toolCalls?: number
    usage?: any
    [key: string]: any
  }
}

export interface UnifiedContext {
  sessionId?: string
  leadContext?: {
    name?: string
    email?: string
    company?: string
    role?: string
    industry?: string
  }
  intelligenceContext?: any
  conversationIds?: string[]
  adminId?: string
  multimodalData?: {
    audioData?: string | Uint8Array
    imageData?: string | Uint8Array
    videoData?: string | Uint8Array
  }
  [key: string]: any
}

export interface UnifiedChatOptions {
  sessionId?: string
  mode?: ChatMode
  context?: UnifiedContext
  initialMessages?: UnifiedMessage[]
  onMessage?: (message: UnifiedMessage) => void
  onComplete?: () => void
  onError?: (error: Error) => void
}

export interface UnifiedChatReturn {
  messages: UnifiedMessage[]
  isLoading: boolean
  isStreaming: boolean
  error: Error | null
  sendMessage: (content: string) => Promise<void>
  addMessage: (message: Omit<UnifiedMessage, 'id'>) => UnifiedMessage
  clearMessages: () => void
  updateContext: (context: Partial<UnifiedContext>) => void
}

export interface UnifiedChatRequest {
  messages: UnifiedMessage[]
  context?: UnifiedContext
  mode?: ChatMode
  stream?: boolean
}

export type ChatMode = 'standard' | 'realtime' | 'admin' | 'multimodal' | 'automation'

export interface ChatCapabilities {
  supportsStreaming: boolean
  supportsMultimodal: boolean
  supportsRealtime: boolean
  maxTokens: number
  supportedModes: ChatMode[]
}

export interface UnifiedChatProvider {
  generate(input: {
    messages: UnifiedMessage[]
    context?: UnifiedContext
    mode?: ChatMode
  }): AsyncIterable<UnifiedMessage>
  
  supportsMode(mode: ChatMode): boolean
  getCapabilities(): ChatCapabilities
}