/**
 * Unified Camera Hook
 * Consolidates camera capture logic for both mobile and desktop
 * Fixes black frame issue with proper readyState checking
 * Implements resource management and memory optimization
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { blobToBase64 } from '@/lib/utils';
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
  sendContextUpdate?: (update: {
    sessionId?: string | null;
    modality: 'screen' | 'webcam';
    analysis: string;
    imageData?: string;
    capturedAt?: number;
    metadata?: Record<string, unknown>;
  }) => void;
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
    sendContextUpdate,
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
  const facingModeRef = useRef<'user' | 'environment'>('user');

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
  const lastAnalysisAtRef = useRef(0);
  const ANALYSIS_INTERVAL_MS = 4000;

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
      try {
        videoRef.current.pause?.();
      } catch (pauseError) {
        console.debug('📷 [useCamera] Unable to pause preview element', pauseError);
      }
      videoRef.current.srcObject = null;
    }
    videoRef.current = null;

    setStream(null);
    setIsActive(false);
    setError(null);
    setCurrentDeviceId(undefined);
  }, []);

  // Start camera with specific device or default
  const startCamera = useCallback(async (deviceId?: string, facingOverride?: 'user' | 'environment') => {
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

      const desiredFacing = facingOverride || facingModeRef.current || 'user'
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : {
              facingMode: desiredFacing,
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
        audio: false,
      };

      console.log('📷 [useCamera] Requesting getUserMedia with constraints:', constraints);
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('📷 [useCamera] getUserMedia success, stream tracks:', mediaStream.getTracks().length);
      
      // Track device ID
      const videoTrack = mediaStream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      setCurrentDeviceId(settings.deviceId);
      // Attempt to infer facing mode from label if available
      try {
        const label = (videoTrack.getSettings() as any)?.label || (videoTrack as any).label || ''
        if (/back|rear|environment/i.test(label)) facingModeRef.current = 'environment'
        else if (/front|user|face/i.test(label)) facingModeRef.current = 'user'
      } catch (labelError) {
        console.debug('📷 [useCamera] Unable to infer facing mode from label', labelError);
      }

      // Set up track ended listener
      videoTrack.addEventListener('ended', () => {
        console.log('Camera track ended');
        stopCamera();
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsActive(true);
      setIsInitializing(false);
      console.log('📷 [useCamera] Camera started successfully');

      // Create internal preview element for frame capture if consumer does not attach one
      if (!videoRef.current) {
        try {
          const internalVideo = document.createElement('video');
          internalVideo.srcObject = mediaStream;
          internalVideo.muted = true;
          internalVideo.playsInline = true;
          await internalVideo.play().catch(() => undefined);
          videoRef.current = internalVideo;
        } catch (internalErr) {
          console.debug('📷 [useCamera] Unable to prime internal video element', internalErr);
        }
      }

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
  }, [enumerateDevices, isInitializing, stopCamera]);

  // Toggle camera on/off
  const toggleCamera = useCallback(async () => {
    console.log('📷 [useCamera] toggleCamera called', { isActive, currentDeviceId, isInitializing });
    if (isInitializing) {
      console.log('📷 [useCamera] Initialization in progress, ignoring toggle request.');
      return;
    }
    if (isActive) {
      console.log('📷 [useCamera] Camera is active, stopping...');
      stopCamera();
    } else {
      console.log('📷 [useCamera] Camera is inactive, starting...');
      await startCamera(currentDeviceId);
    }
  }, [isActive, currentDeviceId, isInitializing, startCamera, stopCamera]);

  // Switch to next available camera
  const switchCamera = useCallback(async () => {
    if (!isActive) return;
    if (availableDevices.length > 1) {
      const currentIndex = availableDevices.findIndex(
        device => device.deviceId === currentDeviceId
      );
      const nextIndex = (currentIndex + 1) % availableDevices.length;
      const nextDevice = availableDevices[nextIndex];
      await startCamera(nextDevice.deviceId);
      return;
    }
    // Fallback for mobile where only one deviceId is exposed: flip facingMode
    const nextFacing: 'user' | 'environment' = facingModeRef.current === 'user' ? 'environment' : 'user'
    facingModeRef.current = nextFacing
    await startCamera(undefined, nextFacing)
  }, [isActive, availableDevices, currentDeviceId, startCamera]);

  const flipFacingMode = useCallback(async () => {
    if (!isActive) return;
    const nextFacing: 'user' | 'environment' = facingModeRef.current === 'user' ? 'environment' : 'user'
    facingModeRef.current = nextFacing
    await startCamera(undefined, nextFacing)
  }, [isActive, startCamera])

  // Upload frame to backend for analysis
  const uploadToBackend = useCallback(async (
    blob: Blob,
    _imageData: string,
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

      let analysisText: string | null = null;
      const now = Date.now();
      const shouldAnalyze = Boolean(sessionId) && (now - lastAnalysisAtRef.current >= ANALYSIS_INTERVAL_MS);

      // Send frame via sendRealtimeInput for continuous streaming (prototype pattern)
      if (sendRealtimeInput) {
        try {
          // Strip data URL prefix for Gemini Live API compatibility
          const base64Data = await blobToBase64(blob);
          sendRealtimeInput([{
            mimeType: 'image/jpeg',
            data: base64Data,
          }]);
          console.log('📹 Webcam frame streamed to Live API');
        } catch (err) {
          console.error('❌ Failed to stream webcam frame:', err);
        }
      }

      if (sessionId && shouldAnalyze) {
        const result = await uploadToBackend(blob, imageData, sessionId, voiceConnectionId);
        if (result?.analysis) {
          lastAnalysisAtRef.current = now;
          analysisText = result.analysis;
          onAnalysis?.(result.analysis, imageData, capture.timestamp);
        }
      }

      if (analysisText && typeof sendContextUpdate === 'function') {
        try {
          sendContextUpdate({
            sessionId,
            modality: 'webcam',
            analysis: analysisText,
            imageData,
            capturedAt: capture.timestamp,
            metadata: {
              source: sendRealtimeInput ? 'webcam_stream' : 'webcam_capture',
              connectionId: voiceConnectionId,
            },
          });
        } catch (contextErr) {
          console.warn('⚠️ Failed to push webcam context update:', contextErr);
        }
      }

      // Debug logging
      console.log('📷 Camera capture:', {
        dimensions: `${capture.metadata?.width ?? 0}x${capture.metadata?.height ?? 0}`,
        blobSize: `${Math.round(capture.blob.size / 1024)}KB`,
        deviceId: capture.metadata?.deviceId ?? 'unknown',
        timestamp: capture.timestamp,
      });

      return capture;
    } catch (err) {
      console.error('Frame capture failed:', err);
      metricsRef.current.failedCaptures++;
      return null;
    }
  }, [
    currentDeviceId,
    maxDimension,
    quality,
    onCapture,
    sessionId,
    voiceConnectionId,
    onAnalysis,
    uploadToBackend,
    sendContextUpdate,
    sendRealtimeInput,
  ]);

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
    return undefined
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
    flipFacingMode,
    captureFrame,
    attachVideoElement,
    uploadToBackend,
    getMetrics,
  };
}
