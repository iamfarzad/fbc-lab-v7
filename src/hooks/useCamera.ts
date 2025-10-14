/**
 * Unified Camera Hook
 * Consolidates camera capture logic for both mobile and desktop
 * Fixes black frame issue with proper readyState checking
 * Implements resource management and memory optimization
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
// import { useSessionStore } from '@/stores/sessionStore'; // TODO: Re-enable when store is created

export interface UseCameraOptions {
  onCapture?: (blob: Blob, imageData?: string) => void;
  onAnalysis?: (analysis: string, imageData: string, capturedAt: number) => void; // NEW
  captureInterval?: number; // Auto-capture interval in ms
  enableAutoCapture?: boolean;
  maxDimension?: number; // Max width/height for compression
  quality?: number; // JPEG quality 0-1
  sessionId?: string; // NEW
  voiceConnectionId?: string; // NEW
  requireVoiceSession?: boolean; // NEW - only capture when voice active
  sendRealtimeInput?: (chunks: Array<{ mimeType: string; data: string }>) => void; // NEW - for prototype pattern
}

export interface CameraCapture {
  blob: Blob;
  imageData?: string;
  timestamp: number;
  metadata?: {
    width: number;
    height: number;
    deviceId?: string;
  };
}

interface CameraMetrics {
  captureCount: number;
  failedCaptures: number;
  avgCaptureTime: number;
}

export function useCamera(options: UseCameraOptions = {}) {
  const {
    onCapture,
    onAnalysis,
    captureInterval = 12000,
    enableAutoCapture = false,
    maxDimension = 1280,
    quality = 0.7,
    sessionId,
    voiceConnectionId,
    requireVoiceSession = false,
    sendRealtimeInput,
  } = options;

  // Session store integration
  // const {
  //   sessionId: storeSessionId,
  //   setCameraActive,
  //   setCameraInitializing,
  //   setCameraDeviceId,
  //   setCameraError,
  //   updateActivity,
  //   updateMetrics,
  // } = useSessionStore(); // TODO: Re-enable when store is created

  const [isActive, setIsActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | undefined>();

  // Refs for resource management
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const autoCaptureTimerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const metricsRef = useRef<CameraMetrics>({
    captureCount: 0,
    failedCaptures: 0,
    avgCaptureTime: 0,
  });

  // Initialize canvas (reused across captures to prevent memory leaks)
  useEffect(() => {
    if (typeof document !== 'undefined' && !canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    return () => {
      canvasRef.current = null;
    };
  }, []);

  // Sync camera state to session store
  // TODO: Re-enable when store is created
  // useEffect(() => {
  //   setCameraActive(isActive);
  // }, [isActive, setCameraActive]);

  // useEffect(() => {
  //   setCameraInitializing(isInitializing);
  // }, [isInitializing, setCameraInitializing]);

  // useEffect(() => {
  //   setCameraError(error);
  // }, [error, setCameraError]);

  // useEffect(() => {
  //   setCameraDeviceId(currentDeviceId || null);
  // }, [currentDeviceId, setCameraDeviceId]);

  // Enumerate available cameras
  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setAvailableDevices(videoDevices);
      return videoDevices;
    } catch (err) {
      console.error('Failed to enumerate devices:', err);
      return [];
    }
  }, []);

  // Start camera with specific device or default
  const startCamera = useCallback(async (deviceId?: string) => {
    if (isInitializing) {
      console.log('Camera initialization already in progress');
      return;
    }

    setIsInitializing(true);
    setError(null);

    try {
      // Stop existing stream if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : {
              facingMode: 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Track device ID
      const videoTrack = mediaStream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      setCurrentDeviceId(settings.deviceId);

      // Set up track ended listener
      videoTrack.addEventListener('ended', () => {
        console.log('Camera track ended');
        stopCamera();
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsActive(true);
      setIsInitializing(false);

      // Enumerate devices after getting permission
      await enumerateDevices();

      return mediaStream;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to access camera';
      
      setError(message);
      setIsActive(false);
      setIsInitializing(false);
      toast.error(message);
      throw err;
    }
  }, [isInitializing, enumerateDevices]);

  // Stop camera and cleanup resources
  const stopCamera = useCallback(() => {
    // Stop auto-capture if running
    if (autoCaptureTimerRef.current) {
      clearInterval(autoCaptureTimerRef.current);
      autoCaptureTimerRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setStream(null);
    setIsActive(false);
    setError(null);
    setCurrentDeviceId(undefined);
  }, []);

  // Toggle camera on/off
  const toggleCamera = useCallback(async () => {
    if (isActive) {
      stopCamera();
    } else {
      await startCamera(currentDeviceId);
    }
  }, [isActive, currentDeviceId, startCamera, stopCamera]);

  // Switch to next available camera
  const switchCamera = useCallback(async () => {
    if (!isActive || availableDevices.length <= 1) {
      return;
    }

    const currentIndex = availableDevices.findIndex(
      device => device.deviceId === currentDeviceId
    );
    const nextIndex = (currentIndex + 1) % availableDevices.length;
    const nextDevice = availableDevices[nextIndex];

    await startCamera(nextDevice.deviceId);
  }, [isActive, availableDevices, currentDeviceId, startCamera]);

  // Upload frame to backend for analysis
  const uploadToBackend = useCallback(async (
    blob: Blob,
    imageData: string,
    sessionId: string,
    voiceConnectionId?: string
  ): Promise<{ analysis?: string } | null> => {
    try {
      const formData = new FormData();
      formData.append('webcamCapture', blob, `webcam-${Date.now()}.jpg`);

      const response = await fetch('/api/tools/webcam', {
        method: 'POST',
        headers: {
          'x-intelligence-session-id': sessionId,
          ...(voiceConnectionId ? { 'x-voice-connection-id': voiceConnectionId } : {}),
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json().catch(() => null);
        return data;
      }
      return null;
    } catch (err) {
      console.error('Webcam upload failed:', err);
      return null;
    }
  }, []);

  // Capture frame from video element
  const captureFrame = useCallback(async (
    videoElement?: HTMLVideoElement
  ): Promise<CameraCapture | null> => {
    const video = videoElement || videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      metricsRef.current.failedCaptures++;
      return null; // Silent - normal during init
    }

    // ✅ CRITICAL FIX: Check video readyState before drawing
    if (video.readyState < 2) { // HAVE_CURRENT_DATA or better
      console.debug('Video not ready for capture (readyState:', video.readyState, ')');
      metricsRef.current.failedCaptures++;
      return null;
    }

    const startTime = performance.now();

    try {
      // Get video dimensions
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      if (videoWidth === 0 || videoHeight === 0) {
        console.warn('Video dimensions are zero');
        metricsRef.current.failedCaptures++;
        return null;
      }

      // Calculate scaled dimensions (max dimension limit)
      let width = videoWidth;
      let height = videoHeight;
      
      if (maxDimension && (width > maxDimension || height > maxDimension)) {
        const scale = maxDimension / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      // Set canvas size (reusing existing canvas)
      canvas.width = width;
      canvas.height = height;

      // Draw video frame to canvas
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      ctx.drawImage(video, 0, 0, width, height);

      // Convert to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', quality);
      });

      if (!blob) {
        throw new Error('Failed to create blob from canvas');
      }

      // Optionally create data URL for transmission
      const imageData = canvas.toDataURL('image/jpeg', quality);

      // Update metrics
      const captureTime = performance.now() - startTime;
      const metrics = metricsRef.current;
      metrics.captureCount++;
      metrics.avgCaptureTime = 
        (metrics.avgCaptureTime * (metrics.captureCount - 1) + captureTime) / 
        metrics.captureCount;

      // Update activity and metrics in session store
      // TODO: Re-enable when store is created
      // updateActivity();
      // updateMetrics({ framesCaptured: metrics.captureCount });

      const capture: CameraCapture = {
        blob,
        imageData,
        timestamp: Date.now(),
        metadata: {
          width,
          height,
          deviceId: currentDeviceId,
        },
      };

      // Call capture callback if provided
      onCapture?.(blob, imageData);

      // Send frame via sendRealtimeInput for continuous streaming (prototype pattern)
      if (sendRealtimeInput) {
        try {
          sendRealtimeInput([{
            mimeType: 'image/jpeg',
            data: imageData,
          }]);
          console.log('📹 Webcam frame streamed to Live API');
        } catch (err) {
          console.error('❌ Failed to stream webcam frame:', err);
        }
      } else if (sessionId) {
        // Fallback: Upload to backend for analysis (legacy mode)
        const result = await uploadToBackend(blob, imageData, sessionId, voiceConnectionId);
        if (result?.analysis) {
          onAnalysis?.(result.analysis, imageData, capture.timestamp);
        }
      }

      // Debug logging
      console.log('📷 Camera capture:', {
        dimensions: `${capture.metadata.width}x${capture.metadata.height}`,
        blobSize: `${Math.round(capture.blob.size / 1024)}KB`,
        deviceId: capture.metadata.deviceId,
        timestamp: capture.timestamp,
      });

      return capture;
    } catch (err) {
      console.error('Frame capture failed:', err);
      metricsRef.current.failedCaptures++;
      return null;
    }
  }, [currentDeviceId, maxDimension, quality, onCapture, sessionId, voiceConnectionId, onAnalysis, uploadToBackend]);

  // Attach video element for capture
  const attachVideoElement = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
    
    // Set stream if video element is provided and we have a stream
    if (element && streamRef.current) {
      element.srcObject = streamRef.current;
    }
  }, []);

  // Auto-capture setup - use continuous streaming for prototype pattern
  useEffect(() => {
    const shouldCapture = enableAutoCapture && isActive && 
      (!requireVoiceSession || (sessionId && voiceConnectionId));
    
    if (shouldCapture && sendRealtimeInput) {
      // Prototype pattern: Continuous frame streaming at 2 FPS
      console.log('Starting continuous webcam streaming at 2 FPS');

      // ✅ Delay 1 second for video element to be ready (prototype pattern)
      const startDelay = setTimeout(() => {
        autoCaptureTimerRef.current = window.setInterval(() => {
          void captureFrame();
        }, 500); // 2 FPS (500ms intervals)
      }, 1000);
      
      return () => {
        clearTimeout(startDelay);
        if (autoCaptureTimerRef.current) {
          clearInterval(autoCaptureTimerRef.current);
          autoCaptureTimerRef.current = null;
        }
      };
    } else if (shouldCapture && !autoCaptureTimerRef.current) {
      // Legacy mode: Periodic capture for analysis
      console.log(`Starting auto-capture every ${captureInterval}ms`);
      
      const startDelay = setTimeout(() => {
        autoCaptureTimerRef.current = window.setInterval(() => {
          void captureFrame();
        }, captureInterval);
      }, 1000);
      
      return () => {
        clearTimeout(startDelay);
        if (autoCaptureTimerRef.current) {
          clearInterval(autoCaptureTimerRef.current);
          autoCaptureTimerRef.current = null;
        }
      };
    }

    if (!shouldCapture) {
      if (autoCaptureTimerRef.current) {
        clearInterval(autoCaptureTimerRef.current);
        autoCaptureTimerRef.current = null;
      }
    }
  }, [enableAutoCapture, isActive, captureInterval, captureFrame, requireVoiceSession, sessionId, voiceConnectionId, sendRealtimeInput]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Get camera metrics
  const getMetrics = useCallback(() => {
    return {
      ...metricsRef.current,
      avgCaptureTime: Math.round(metricsRef.current.avgCaptureTime * 10) / 10,
    };
  }, []);

  return {
    isActive,
    isInitializing,
    stream,
    error,
    availableDevices,
    currentDeviceId,
    availableCameraCount: availableDevices.length,
    startCamera,
    stopCamera,
    toggleCamera,
    switchCamera,
    captureFrame,
    attachVideoElement,
    uploadToBackend,
    getMetrics,
  };
}
