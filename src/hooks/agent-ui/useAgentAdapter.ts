import { useLiveApi } from '@/hooks/useLiveApi'

// Adapter: Makes useLiveApi look like LiveKit's useRoom
export function useAgentAdapter() {
  const liveApi = useLiveApi()
  
  // Map FBC state to LiveKit-style state
  return {
    // Connection state
    state: liveApi.isSessionActive ? 'connected' : 'disconnected',
    connectionState: liveApi.isSessionActive ? 'connected' : 'disconnected',
    
    // Session control
    connect: liveApi.startSession,
    disconnect: liveApi.stopSession,
    
    // Audio state
    isRecording: liveApi.isRecording,
    isSpeaking: liveApi.isProcessing,
    
    // Participants (simulate single AI participant)
    participants: liveApi.isSessionActive ? [{
      identity: 'fbc-ai-agent',
      name: 'F.B/c AI',
      isAgent: true,
      isSpeaking: liveApi.isProcessing,
    }] : [],
    
    // Local participant (user)
    localParticipant: {
      identity: 'user',
      name: 'You',
      isMicrophoneEnabled: liveApi.isRecording,
      isCameraEnabled: false, // FBC handles camera separately
    },
    
    // Error state
    error: liveApi.error,
  }
}
