import { useState, useCallback } from "react";
import { toast } from "sonner";
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
    theme: 'default',
    screenShareStream: null,
    cameraStream: null,
    screenShareError: null,
    cameraError: null,
    isCameraInitializing: false,
    isScreenShareInitializing: false,
  });
  const [availableCameras, setAvailableCameras] = useState<number>(0);

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

  const stopScreenShare = useCallback(() => {
    setChatState(prev => {
      const stream = prev.screenShareStream;
      stream?.getTracks().forEach(track => track.stop());
      return {
        ...prev,
        isScreenSharing: false,
        screenShareStream: null,
        screenShareError: null,
      };
    });
  }, []);

  const startScreenShare = useCallback(async () => {
    console.log('🖥️ [useChatState] startScreenShare called');
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
      const message = "Screen sharing is not supported in this browser.";
      console.error('🖥️ [useChatState] Screen sharing not supported');
      setChatState(prev => ({ ...prev, screenShareError: message, isScreenShareInitializing: false }));
      toast.error(message);
      throw new Error(message);
    }

    try {
      // Set initializing state before showing screen picker
      setChatState(prev => ({ ...prev, isScreenShareInitializing: true, screenShareError: null }));
      
      console.log('🖥️ [useChatState] Requesting getDisplayMedia...');
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      console.log('🖥️ [useChatState] getDisplayMedia success, stream tracks:', stream.getTracks().length);

      stream.getVideoTracks().forEach(track => {
        track.addEventListener("ended", () => {
          setChatState(prev => {
            const stream = prev.screenShareStream;
            stream?.getTracks().forEach(track => track.stop());
            return {
              ...prev,
              isScreenSharing: false,
              screenShareStream: null,
            };
          });
        });
      });

      console.log('🖥️ [useChatState] Screen share started successfully');
      setChatState(prev => ({
        ...prev,
        isScreenSharing: true,
        isScreenShareInitializing: false,
        screenShareStream: stream,
        screenShareError: null,
      }));
      return stream;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start screen sharing.";
      setChatState(prev => ({ 
        ...prev, 
        screenShareError: message, 
        isScreenSharing: false, 
        screenShareStream: null,
        isScreenShareInitializing: false 
      }));
      toast.error(message);
      throw error;
    }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    console.log('🖥️ [useChatState] toggleScreenShare called', { isScreenSharing: chatState.isScreenSharing });
    if (chatState.isScreenSharing) {
      console.log('🖥️ [useChatState] Screen share is active, stopping...');
      stopScreenShare();
      return;
    }

    console.log('🖥️ [useChatState] Screen share is inactive, starting...');
    try {
      await startScreenShare();
    } catch (error) {
      console.error("🖥️ [useChatState] Failed to start screen sharing", error);
    }
  }, [chatState.isScreenSharing, startScreenShare, stopScreenShare]);

  const toggleSettings = useCallback(() => {
    setChatState(prev => ({ ...prev, showSettings: !prev.showSettings }));
  }, []);

  const setTheme = useCallback((theme: 'default' | 'mono') => {
    setChatState(prev => ({ ...prev, theme }));
  }, []);

  const setListening = useCallback((listening: boolean) => {
    setChatState(prev => {
      if (prev.isListening === listening) {
        return prev;
      }
      return { ...prev, isListening: listening };
    });
  }, []);

  return {
    chatState,
    availableCameras,
    setChatState,
    setAvailableCameras,
    toggleChat,
    toggleMinimize,
    toggleExpand,
    toggleScreenShare,
    toggleSettings,
    setTheme,
    setListening,
    startScreenShare,
    stopScreenShare,
  };
}
