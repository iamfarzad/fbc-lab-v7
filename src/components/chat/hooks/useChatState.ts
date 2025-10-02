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
    screenShareStream: null,
    cameraStream: null,
    screenShareError: null,
    cameraError: null,
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

  const stopScreenShare = useCallback(() => {
    setChatState(prev => {
      prev.screenShareStream?.getTracks().forEach(track => track.stop());
      return {
        ...prev,
        isScreenSharing: false,
        screenShareStream: null,
        screenShareError: null,
      };
    });
  }, []);

  const startScreenShare = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
      const message = "Screen sharing is not supported in this browser.";
      setChatState(prev => ({ ...prev, screenShareError: message }));
      toast.error(message);
      throw new Error(message);
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      stream.getVideoTracks().forEach(track => {
        track.addEventListener("ended", () => {
          setChatState(prev => {
            prev.screenShareStream?.getTracks().forEach(innerTrack => innerTrack.stop());
            return {
              ...prev,
              isScreenSharing: false,
              screenShareStream: null,
            };
          });
        });
      });

      setChatState(prev => ({
        ...prev,
        isScreenSharing: true,
        screenShareStream: stream,
        screenShareError: null,
      }));
      return stream;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start screen sharing.";
      setChatState(prev => ({ ...prev, screenShareError: message, isScreenSharing: false, screenShareStream: null }));
      toast.error(message);
      throw error;
    }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (chatState.isScreenSharing) {
      stopScreenShare();
      return;
    }

    try {
      await startScreenShare();
    } catch (error) {
      console.error("Failed to start screen sharing", error);
    }
  }, [chatState.isScreenSharing, startScreenShare, stopScreenShare]);

  const toggleSettings = useCallback(() => {
    setChatState(prev => ({ ...prev, showSettings: !prev.showSettings }));
  }, []);

  const stopCamera = useCallback(() => {
    setChatState(prev => {
      prev.cameraStream?.getTracks().forEach(track => track.stop());
      return {
        ...prev,
        isCameraActive: false,
        cameraStream: null,
      };
    });
  }, []);

  const startCamera = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      const message = "Camera access is not supported in this browser.";
      setChatState(prev => ({ ...prev, cameraError: message }));
      toast.error(message);
      throw new Error(message);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });

      stream.getVideoTracks().forEach(track => {
        track.addEventListener("ended", () => {
          setChatState(prev => ({ ...prev, isCameraActive: false, cameraStream: null }));
        });
      });

      setChatState(prev => ({
        ...prev,
        isCameraActive: true,
        cameraStream: stream,
        cameraError: null,
      }));
      return stream;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to access the camera.";
      setChatState(prev => ({ ...prev, cameraError: message, isCameraActive: false, cameraStream: null }));
      toast.error(message);
      throw error;
    }
  }, []);

  const setCameraActive = useCallback(async (active: boolean) => {
    if (active) {
      await startCamera();
    } else {
      stopCamera();
    }
  }, [startCamera, stopCamera]);

  const toggleCamera = useCallback(async () => {
    try {
      await setCameraActive(!chatState.isCameraActive);
    } catch (error) {
      console.error("Failed to toggle camera", error);
    }
  }, [chatState.isCameraActive, setCameraActive]);

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
    toggleCamera,
    setListening,
    startScreenShare,
    stopScreenShare,
    startCamera,
    stopCamera,
  };
}


