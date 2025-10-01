import { useState, useCallback } from "react";
import { ChatState } from "../types/chatTypes";

export function useChatState() {
  const [chatState, setChatState] = useState<ChatState>({
    isOpen: false,
    isMinimized: false,
    isExpanded: false,
    isScreenSharing: false,
    isCameraActive: false,
    isListening: false,
    showSettings: false,
  });

  // Toggle functions - clean and simple
  const toggleChat = useCallback(() => {
    setChatState(prev => ({ ...prev, isOpen: !prev.isOpen }));
  }, []);

  const toggleMinimize = useCallback(() => {
    setChatState(prev => ({
      ...prev,
      isMinimized: !prev.isMinimized,
      isExpanded: false
    }));
  }, []);

  const toggleExpand = useCallback(() => {
    setChatState(prev => ({
      ...prev,
      isExpanded: !prev.isExpanded,
      isMinimized: false
    }));
  }, []);

  const toggleScreenShare = useCallback(() => {
    setChatState(prev => ({ ...prev, isScreenSharing: !prev.isScreenSharing }));
  }, []);

  const toggleSettings = useCallback(() => {
    setChatState(prev => ({ ...prev, showSettings: !prev.showSettings }));
  }, []);

  const setCameraActive = useCallback((active: boolean) => {
    setChatState(prev => ({ ...prev, isCameraActive: active }));
  }, []);

  const setListening = useCallback((listening: boolean) => {
    setChatState(prev => ({ ...prev, isListening: listening }));
  }, []);

  return {
    chatState,
    toggleChat,
    toggleMinimize,
    toggleExpand,
    toggleScreenShare,
    toggleSettings,
    setCameraActive,
    setListening,
  };
}

