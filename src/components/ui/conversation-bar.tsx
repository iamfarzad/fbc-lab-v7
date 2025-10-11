import React from 'react'
import { cn } from '@/lib/utils'
import { MinimizedChatBar } from '@/components/chat/components/MinimizedChatBar'

export interface ConversationBarProps {
  className?: string
  // Connection/voice
  isConnected?: boolean
  isVoiceActive: boolean
  isVoiceProcessing?: boolean
  voiceTranscript?: string
  voicePartialTranscript?: string
  // Media states
  isCameraActive: boolean
  isScreenSharing: boolean
  // Actions
  onExpand: () => void
  onToggleVoice: () => void | Promise<void>
  onToggleCamera: () => void | Promise<void>
  onToggleScreenShare: () => void | Promise<void>
}

export function ConversationBar({
  className,
  isConnected = false,
  isVoiceActive,
  isVoiceProcessing = false,
  voiceTranscript,
  voicePartialTranscript,
  isCameraActive,
  isScreenSharing,
  onExpand,
  onToggleVoice,
  onToggleCamera,
  onToggleScreenShare,
}: ConversationBarProps) {
  return (
    <div className={cn(className)}>
      <MinimizedChatBar
        isVoiceActive={isVoiceActive}
        isWebcamActive={isCameraActive}
        isScreenSharing={isScreenSharing}
        onExpand={onExpand}
        onToggleVoice={onToggleVoice}
        onToggleWebcam={onToggleCamera}
        onToggleScreenShare={onToggleScreenShare}
        isConnected={isConnected}
        isProcessing={isVoiceProcessing}
        transcript={voiceTranscript}
        partialTranscript={voicePartialTranscript}
      />
    </div>
  )
}
