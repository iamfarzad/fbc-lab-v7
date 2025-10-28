import { useCallback, useMemo } from 'react'
import { useRealtimeVoice } from './useRealtimeVoice'
import type { UseAgentUISessionReturn, AgentUISession } from '@/types/agent-ui'

export function useAgentUISession(): UseAgentUISessionReturn {
  const realtimeVoice = useRealtimeVoice()

  const session = useMemo((): AgentUISession => ({
    isConnected: realtimeVoice.isSessionActive,
    isConnecting: false, // FBC doesn't have isConnecting
    isDisconnected: !realtimeVoice.isSessionActive,
    error: realtimeVoice.error || undefined,
  }), [realtimeVoice.isSessionActive, realtimeVoice.error])

  const connect = useCallback(() => {
    realtimeVoice.startSession()
  }, [realtimeVoice])

  const disconnect = useCallback(() => {
    realtimeVoice.stopSession()
  }, [realtimeVoice])

  const reconnect = useCallback(() => {
    realtimeVoice.stopSession()
    // Small delay before reconnecting
    setTimeout(() => {
      realtimeVoice.startSession()
    }, 1000)
  }, [realtimeVoice])

  return {
    session,
    connect,
    disconnect,
    reconnect,
  }
}
