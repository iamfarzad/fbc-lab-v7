import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatState, MediaState } from "../constants/chatConstants";
import { CHAT_CONSTANTS } from "../constants/chatConstants";
import { cn } from "@/lib/utils";
import { chatAnimations } from "@/lib/theme-utils";
import { MinimizedChatBar } from "./MinimizedChatBar";
import { MediaControlsOverlay } from "./MediaControlsOverlay";

interface ChatContainerProps {
  chatState: ChatState;
  mediaState: MediaState;
  children: React.ReactNode;
  // Media control handlers
  onToggleVoice: () => void;
  onToggleWebcam: () => void;
  onToggleScreenShare: () => void;
  onToggleTranscript: () => void;
  // Media streams
  webcamStream?: MediaStream | null;
  screenStream?: MediaStream | null;
  // Voice state
  isProcessing?: boolean;
  transcript?: string;
  partialTranscript?: string;
  // Chat state handlers
  onExpand: () => void;
  onMinimize: () => void;
}

export function ChatContainer({ 
  chatState, 
  mediaState,
  children,
  onToggleVoice,
  onToggleWebcam,
  onToggleScreenShare,
  onToggleTranscript,
  webcamStream,
  screenStream,
  isProcessing = false,
  transcript,
  partialTranscript,
  onExpand,
  onMinimize
}: ChatContainerProps) {
  // Don't render if chat is closed
  if (chatState === 'minimized' && !mediaState.voice && !mediaState.webcam && !mediaState.screenShare) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      {chatState === 'minimized' ? (
        <motion.div
          key="minimized"
          initial={chatAnimations.minimizeToBar.initial}
          animate={chatAnimations.minimizeToBar.animate}
          exit={chatAnimations.minimizeToBar.exit}
          transition={chatAnimations.minimizeToBar.transition}
          className="fixed z-[100]"
        >
          <MinimizedChatBar
            isVoiceActive={mediaState.voice}
            isWebcamActive={mediaState.webcam}
            isScreenSharing={mediaState.screenShare}
            onExpand={onExpand}
            onToggleVoice={onToggleVoice}
            onToggleWebcam={onToggleWebcam}
            onToggleScreenShare={onToggleScreenShare}
            isConnected={true}
            isProcessing={isProcessing}
            transcript={transcript}
            partialTranscript={partialTranscript}
          />
        </motion.div>
      ) : (
        <motion.div
          key="expanded"
          initial={chatAnimations.expandFromButton.initial}
          animate={chatAnimations.expandFromButton.animate}
          transition={chatAnimations.expandFromButton.transition}
          className={cn(
            "fixed inset-0 z-[100] flex flex-col",
            "bg-background text-foreground overflow-hidden",
            "safe-area-inset-top safe-area-inset-bottom"
          )}
        >
          {children}
          
          {/* Media Controls Overlay */}
          <MediaControlsOverlay
            chatState={chatState}
            mediaState={mediaState}
            onToggleVoice={onToggleVoice}
            onToggleWebcam={onToggleWebcam}
            onToggleScreenShare={onToggleScreenShare}
            onToggleTranscript={onToggleTranscript}
            webcamStream={webcamStream}
            screenStream={screenStream}
            isProcessing={isProcessing}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
