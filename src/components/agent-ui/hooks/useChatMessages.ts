import type { Message } from '@/types/core'
import { useLiveChatAPI } from '@/components/agent-ui/hooks/useLiveChatAPI'

export function useChatMessages(sessionId?: string): Message[] {
  if (!sessionId) {
    throw new Error('useChatMessages requires a valid sessionId')
  }
  return useLiveChatAPI(sessionId)
}
