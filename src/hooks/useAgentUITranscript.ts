import { useMemo } from 'react'
import type { UseAgentUITranscriptReturn, AgentUITranscript } from '@/types/agent-ui'
import { useLiveApi } from './useLiveApi'

export function useAgentUITranscript(): UseAgentUITranscriptReturn {
  const liveApi = useLiveApi()

  const transcripts = useMemo<AgentUITranscript[]>(() => {
    const items: AgentUITranscript[] = []

    // Latest partial user transcript (if any)
    if (liveApi.partialTranscript) {
      items.push({
        id: `partial-${Math.random().toString(36).slice(2)}`,
        text: liveApi.partialTranscript,
        timestamp: Date.now(),
        participant: 'user',
        isFinal: false,
      })
    }

    // Latest final user transcript (if any)
    if (liveApi.transcript) {
      items.push({
        id: `user-${Math.random().toString(36).slice(2)}`,
        text: liveApi.transcript,
        timestamp: Date.now(),
        participant: 'user',
        isFinal: true,
      })
    }

    // All AI replies known to the session
    if (Array.isArray(liveApi.modelReplies)) {
      for (const t of liveApi.modelReplies) {
        items.push({
          id: `ai-${Math.random().toString(36).slice(2)}`,
          text: t,
          timestamp: Date.now(),
          participant: 'assistant',
          isFinal: true,
        })
      }
    }

    return items
  }, [liveApi.partialTranscript, liveApi.transcript, liveApi.modelReplies])

  return {
    transcripts,
    addTranscript: () => {},
    clearTranscripts: () => {},
  }
}
