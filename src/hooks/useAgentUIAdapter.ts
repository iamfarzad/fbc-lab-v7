import { useCallback, useMemo } from 'react'
import { useLiveApi } from './useLiveApi'
import { useCamera } from './useCamera'
import { useScreenShare } from './useScreenShare'
import type { UseAgentUIAdapterReturn, AgentUIRoom, AgentUIParticipant } from '@/types/agent-ui'

export function useAgentUIAdapter(): UseAgentUIAdapterReturn {
  const liveApi = useLiveApi()
  const {
    startSession,
    stopSession,
    pauseMicrophone,
    resumeMicrophone,
    sendRealtimeInput,
    isRecording,
    isProcessing,
    isSessionActive,
    error,
  } = liveApi
  
  // Create mock room state based on FBC session
  const room = useMemo((): AgentUIRoom => ({
    name: 'fbc-agent-room',
    participants: [],
    isConnected: isSessionActive,
    isConnecting: false, // FBC doesn't have isConnecting, use false
    isDisconnected: !isSessionActive,
  }), [isSessionActive])

  // Create mock participants (user and assistant)
  const participants = useMemo((): AgentUIParticipant[] => {
    const userParticipant: AgentUIParticipant = {
      identity: 'user',
      name: 'You',
      isSpeaking: isRecording,
      isMuted: !isRecording,
      isCameraEnabled: false, // Will be handled by camera hooks
      isMicrophoneEnabled: !isRecording,
    }

    const assistantParticipant: AgentUIParticipant = {
      identity: 'assistant',
      name: 'F.B/c AI',
      isSpeaking: isProcessing,
      isMuted: false,
      isCameraEnabled: false,
      isMicrophoneEnabled: false,
    }

    return [userParticipant, assistantParticipant]
  }, [isRecording, isProcessing])

  const connect = useCallback(() => {
    void startSession()
  }, [startSession])

  const disconnect = useCallback(() => {
    void stopSession()
  }, [stopSession])

  // Camera and screen share controls via FBC hooks
  const camera = useCamera()
  const screenShare = useScreenShare()

  const toggleMicrophone = useCallback(() => {
    if (isRecording) {
      void pauseMicrophone?.()
    } else {
      void resumeMicrophone?.()
    }
  }, [isRecording, pauseMicrophone, resumeMicrophone])

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
    await sendRealtimeInput([
      {
        mimeType: 'text/plain',
        data: text,
      },
    ])
  }, [sendRealtimeInput])

  return {
    room,
    participants,
    isConnected: isSessionActive,
    isConnecting: false, // FBC doesn't have isConnecting
    isDisconnected: !isSessionActive,
    error: error || undefined,
    connect,
    disconnect,
    toggleMicrophone,
    toggleCamera,
    toggleScreenShare,
    sendMessage,
  }
}
