import { useCallback, useMemo } from 'react'
import { useLiveApi } from './useLiveApi'
import { useCamera } from './useCamera'
import { useScreenShare } from './useScreenShare'
import type { UseAgentUIAdapterReturn, AgentUIRoom, AgentUIParticipant } from '@/types/agent-ui'

export function useAgentUIAdapter(): UseAgentUIAdapterReturn {
  const liveApi = useLiveApi()
  
  // Create mock room state based on FBC session
  const room = useMemo((): AgentUIRoom => ({
    name: 'fbc-agent-room',
    participants: [],
    isConnected: liveApi.isSessionActive,
    isConnecting: false, // FBC doesn't have isConnecting, use false
    isDisconnected: !liveApi.isSessionActive,
  }), [liveApi.isSessionActive])

  // Create mock participants (user and assistant)
  const participants = useMemo((): AgentUIParticipant[] => {
    const userParticipant: AgentUIParticipant = {
      identity: 'user',
      name: 'You',
      isSpeaking: liveApi.isRecording,
      isMuted: !liveApi.isRecording,
      isCameraEnabled: false, // Will be handled by camera hooks
      isMicrophoneEnabled: !liveApi.isRecording,
    }

    const assistantParticipant: AgentUIParticipant = {
      identity: 'assistant',
      name: 'F.B/c AI',
      isSpeaking: liveApi.isProcessing,
      isMuted: false,
      isCameraEnabled: false,
      isMicrophoneEnabled: false,
    }

    return [userParticipant, assistantParticipant]
  }, [liveApi.isRecording, liveApi.isProcessing])

  const connect = useCallback(() => {
    liveApi.startSession()
  }, [liveApi])

  const disconnect = useCallback(() => {
    liveApi.stopSession()
  }, [liveApi])

  // Camera and screen share controls via FBC hooks
  const camera = useCamera()
  const screenShare = useScreenShare()

  const toggleMicrophone = useCallback(() => {
    if (liveApi.isRecording) {
      void liveApi.pauseMicrophone?.()
    } else {
      void liveApi.resumeMicrophone?.()
    }
  }, [liveApi.isRecording, liveApi.pauseMicrophone, liveApi.resumeMicrophone])

  const toggleCamera = useCallback(() => {
    if (camera.isActive) {
      camera.stopCamera()
    } else {
      void camera.startCamera()
    }
  }, [camera])

  const toggleScreenShare = useCallback(() => {
    if (screenShare.isActive) {
      screenShare.stopScreenShare()
    } else {
      void screenShare.startScreenShare()
    }
  }, [screenShare])

  const sendMessage = useCallback(async (text: string) => {
    await liveApi.sendRealtimeInput([
      {
        mimeType: 'text/plain',
        data: text,
      },
    ])
  }, [liveApi])

  return {
    room,
    participants,
    isConnected: liveApi.isSessionActive,
    isConnecting: false, // FBC doesn't have isConnecting
    isDisconnected: !liveApi.isSessionActive,
    error: liveApi.error || undefined,
    connect,
    disconnect,
    toggleMicrophone,
    toggleCamera,
    toggleScreenShare,
    sendMessage,
  }
}
