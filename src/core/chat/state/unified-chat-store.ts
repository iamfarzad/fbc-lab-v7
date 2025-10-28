import { createStore, type StoreApi } from 'zustand/vanilla'
import { useStore } from 'zustand'
import { useMemo } from 'react'

import type { UnifiedMessage, UnifiedContext } from '@/core/chat/unified-types'

export const UNIFIED_CHAT_STORE_ID = 'unified-ai-sdk'

export type ChatStatus = 'ready' | 'submitted' | 'streaming' | 'error'

export interface UnifiedChatStoreState {
  id?: string
  messages: UnifiedMessage[]
  status: ChatStatus
  error?: Error | null
  context?: UnifiedContext | null
  sendMessage?: (content: string) => Promise<void>
  regenerate?: () => Promise<void>
  stop?: () => Promise<void>
  resumeStream?: () => Promise<void>
  addToolResult?: (...args: any[]) => Promise<void>
  setMessages?: (messages: UnifiedMessage[]) => void
  clearError?: () => void
}

const DEFAULT_STATE: UnifiedChatStoreState = {
  id: '',
  messages: [],
  status: 'ready',
  error: null,
  context: null
}

const stores = new Map<string, StoreApi<UnifiedChatStoreState>>()

function getOrCreateStore(storeId: string): StoreApi<UnifiedChatStoreState> {
  const existing = stores.get(storeId)
  if (existing) return existing

  const store = createStore<UnifiedChatStoreState>(() => DEFAULT_STATE)
  stores.set(storeId, store)
  return store
}

export function resetUnifiedChatStore(storeId: string = UNIFIED_CHAT_STORE_ID): void {
  const store = getOrCreateStore(storeId)
  store.setState(DEFAULT_STATE, true)
}

export function syncUnifiedChatStoreState(
  partial: Partial<UnifiedChatStoreState>,
  storeId: string = UNIFIED_CHAT_STORE_ID
): void {
  const store = getOrCreateStore(storeId)
  store.setState(prev => ({ ...prev, ...partial }), true)
}

export function useUnifiedChatMessages(storeId: string = UNIFIED_CHAT_STORE_ID) {
  const store = getOrCreateStore(storeId)
  return useStore(store, state => state.messages)
}

export function useUnifiedChatStatus(storeId: string = UNIFIED_CHAT_STORE_ID) {
  const store = getOrCreateStore(storeId)
  return useStore(store, state => state.status)
}

export function useUnifiedChatError(storeId: string = UNIFIED_CHAT_STORE_ID) {
  const store = getOrCreateStore(storeId)
  return useStore(store, state => state.error)
}

export function useUnifiedChatSendMessage(storeId: string = UNIFIED_CHAT_STORE_ID) {
  const store = getOrCreateStore(storeId)
  return useStore(store, state => state.sendMessage)
}

export function useUnifiedChatMessageCount(storeId: string = UNIFIED_CHAT_STORE_ID) {
  const store = getOrCreateStore(storeId)
  return useStore(store, state => state.messages.length)
}

export function useUnifiedChatActions(storeId: string = UNIFIED_CHAT_STORE_ID) {
  const store = getOrCreateStore(storeId)
  // Select each action independently to avoid unstable selector objects
  const sendMessage = useStore(store, s => s.sendMessage)
  const regenerate = useStore(store, s => s.regenerate)
  const stop = useStore(store, s => s.stop)
  const resumeStream = useStore(store, s => s.resumeStream)
  const addToolResult = useStore(store, s => s.addToolResult)
  const setMessages = useStore(store, s => s.setMessages)
  const clearError = useStore(store, s => s.clearError)

  // Memoize the combined object so identity is stable across renders
  return useMemo(() => ({
    sendMessage,
    regenerate,
    stop,
    resumeStream,
    addToolResult,
    setMessages,
    clearError
  }), [sendMessage, regenerate, stop, resumeStream, addToolResult, setMessages, clearError])
}

export function useUnifiedChatSelector<T>(
  selector: (state: UnifiedChatStoreState) => T,
  storeId: string = UNIFIED_CHAT_STORE_ID
): T {
  const store = getOrCreateStore(storeId)
  return useStore(store, selector)
}
