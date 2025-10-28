import { useUnifiedChatMessages, UNIFIED_CHAT_STORE_ID } from '@/core/chat/state/unified-chat-store'
import type { Message } from '@/types/core'

export function useLiveChatAPI(sessionId: string): Message[] {
  if (!sessionId) {
    throw new Error('useLiveChatAPI requires a valid sessionId')
  }

  // Ensure at least one instance is mounted in the tree (AgentControlBar does this)
  // Read from the shared store so multiple components stay in sync.
  const messages = useUnifiedChatMessages(UNIFIED_CHAT_STORE_ID)

  return messages as Message[]
}
