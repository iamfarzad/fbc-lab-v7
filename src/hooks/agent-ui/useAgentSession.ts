import { useAgentAdapter } from './useAgentAdapter'

// Session context hook matching LiveKit's useSession pattern
export function useAgentSession() {
  const adapter = useAgentAdapter()
  
  return {
    state: adapter.state,
    connect: adapter.connect,
    disconnect: adapter.disconnect,
    participants: adapter.participants,
    localParticipant: adapter.localParticipant,
    error: adapter.error,
  }
}
