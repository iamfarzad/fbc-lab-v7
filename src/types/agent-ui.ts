export interface AgentParticipant {
  identity: string
  name: string
  isAgent: boolean
  isSpeaking: boolean
}

export interface LocalParticipant {
  identity: string
  name: string
  isMicrophoneEnabled: boolean
  isCameraEnabled: boolean
}

export type AgentSessionState = 'disconnected' | 'connecting' | 'connected' | 'error'
