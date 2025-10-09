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
      setChatState(prev => ({ ...prev, screenShareError: message, isScreenShareInitializing: false }));
      toast.error(message);
      throw new Error(message);
    }

    try {
      // Set initializing state before showing screen picker
      setChatState(prev => ({ ...prev, isScreenShareInitializing: true, screenShareError: null }));
      
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
      setChatState(prev => ({ ...prev, cameraError: message, isCameraInitializing: false }));
      toast.error(message);
      throw new Error(message);
    }

    try {
      // Set initializing state before requesting permission
      setChatState(prev => ({ ...prev, isCameraInitializing: true, cameraError: null }));
      
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });

      // Count available cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setAvailableCameras(videoDevices.length);

      stream.getVideoTracks().forEach(track => {
        track.addEventListener("ended", () => {
          setChatState(prev => ({ ...prev, isCameraActive: false, cameraStream: null }));
        });
      });

      setChatState(prev => ({
        ...prev,
        isCameraActive: true,
        isCameraInitializing: false,
        cameraStream: stream,
        cameraError: null,
      }));
      return stream;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to access the camera.";
      setChatState(prev => ({ 
        ...prev, 
        cameraError: message, 
        isCameraActive: false, 
        cameraStream: null,
        isCameraInitializing: false 
      }));
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
    setChatState(prev => {
      if (prev.isListening === listening) {
        return prev;
      }
      return { ...prev, isListening: listening };
    });
  }, []);

  const switchCamera = useCallback(async () => {
    if (!chatState.isCameraActive) return;

    try {
      // Get list of available video devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length <= 1) {
        toast.info('Only one camera available');
        return;
      }

      // Get current device ID
      const currentStream = chatState.cameraStream;
      const currentTrack = currentStream?.getVideoTracks()[0];
      const currentDeviceId = currentTrack?.getSettings().deviceId;

      // Find next device
      const currentIndex = videoDevices.findIndex(d => d.deviceId === currentDeviceId);
      const nextIndex = (currentIndex + 1) % videoDevices.length;
      const nextDevice = videoDevices[nextIndex];

      // Stop current stream
      currentStream?.getTracks().forEach(track => track.stop());

      // Start new stream with next device
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: nextDevice.deviceId } },
        audio: false
      });

      newStream.getVideoTracks().forEach(track => {
        track.addEventListener("ended", () => {
          setChatState(prev => ({ ...prev, isCameraActive: false, cameraStream: null }));
        });
      });

      setChatState(prev => ({
        ...prev,
        cameraStream: newStream,
        cameraError: null,
      }));

      toast.success(`Switched to ${nextDevice.label || 'camera ' + (nextIndex + 1)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to switch camera";
      setChatState(prev => ({ ...prev, cameraError: message }));
      toast.error(message);
    }
  }, [chatState.isCameraActive, chatState.cameraStream]);

  return {
    chatState,
    availableCameras,
    toggleChat,
    toggleMinimize,
    toggleExpand,
    toggleScreenShare,
    toggleSettings,
    setCameraActive,
    toggleCamera,
    switchCamera,
    setListening,
    startScreenShare,
    stopScreenShare,
    startCamera,
    stopCamera,
  };
}

