import { useAgentUIAdapter } from '@/hooks/useAgentUIAdapter'

// Session context hook matching LiveKit's useSession pattern
// Migrated from useAgentAdapter to useAgentUIAdapter for full feature support
export function useAgentSession() {
  const adapter = useAgentUIAdapter()
  
  return {
    state: adapter.isConnected ? 'connected' : 'disconnected',
    connect: adapter.connect,
    disconnect: adapter.disconnect,
    participants: adapter.participants,
    localParticipant: adapter.participants.find(p => p.identity === 'user') || {
      identity: 'user',
      name: 'You',
      isSpeaking: false,
      isMuted: true,
      isCameraEnabled: false,
      isMicrophoneEnabled: false,
    },
    error: adapter.error,
  }
}
