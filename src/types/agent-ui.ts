import type { Message } from './core'

// LiveKit-compatible interfaces for Agent UI components
export interface AgentUIRoom {
  name: string
  participants: AgentUIParticipant[]
  isConnected: boolean
  isConnecting: boolean
  isDisconnected: boolean
}

export interface AgentUIParticipant {
  identity: string
  name: string
  isSpeaking: boolean
  isMuted: boolean
  isCameraEnabled: boolean
  isMicrophoneEnabled: boolean
}

export interface AgentUISession {
  isConnected: boolean
  isConnecting: boolean
  isDisconnected: boolean
  error?: string
}

export interface AgentUITranscript {
  id: string
  text: string
  timestamp: number
  participant: string
  isFinal: boolean
}

// Adapter hook interfaces
export interface UseAgentUIAdapterReturn {
  room: AgentUIRoom
  participants: AgentUIParticipant[]
  isConnected: boolean
  isConnecting: boolean
  isDisconnected: boolean
  error?: string
  connect: () => void
  disconnect: () => void
  toggleMicrophone: () => void
  toggleCamera: () => void
  toggleScreenShare: () => void
  sendMessage: (text: string) => void
}

export interface UseAgentUISessionReturn {
  session: AgentUISession
  connect: () => void
  disconnect: () => void
  reconnect: () => void
}

export interface UseAgentUITranscriptReturn {
  transcripts: AgentUITranscript[]
  addTranscript: (transcript: AgentUITranscript) => void
  clearTranscripts: () => void
}

// Map FBC Message to AgentUI transcript format
export const mapMessageToTranscript = (message: Message): AgentUITranscript => ({
  id: message.id,
  text: message.content,
  timestamp: new Date(message.timestamp).getTime(),
  participant: message.role === 'user' ? 'user' : 'assistant',
  isFinal: true,
})