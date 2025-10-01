import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"

type WebcamState = 
  | 'idle' 
  | 'initializing' 
  | 'active' 
  | 'captured' 
  | 'error' 
  | 'permission-denied'
  | 'stopped'

interface UseWebcamProps {
  /**
   * Callback when a photo is captured
   */
  onCapture?: (imageData: string) => void
  
  /**
   * Callback when AI analysis is complete
   */
  onAIAnalysis?: (analysis: string) => void
  
  /**
   * Whether to start the camera automatically
   * @default false
   */
  autoStart?: boolean
  
  /**
   * Preferred facing mode ('user' or 'environment')
   * @default 'user'
   */
  facingMode?: 'user' | 'environment' | 'left' | 'right'
}

export function useWebcam({ 
  onCapture, 
  onAIAnalysis, 
  autoStart = false,
  facingMode = 'user'
}: UseWebcamProps = {}) {
  void onAIAnalysis
  const [state, setState] = useState<WebcamState>('idle')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Get available camera devices
  const getAvailableDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      setAvailableDevices(videoDevices)
      
      if (videoDevices.length > 0) {
        // Try to find the front camera by default
        const frontCamera = videoDevices.find(device => 
          device.label.toLowerCase().includes('front')
        )
        setSelectedDeviceId(frontCamera?.deviceId || videoDevices[0]?.deviceId || '')
        return videoDevices
      }
      
      return []
    } catch (err) {
      console.error('Error getting devices:', err)
      setError('Failed to access camera devices')
      setState('error')
      return []
    }
  }, [])

  // Start the webcam
  const startWebcam = useCallback(async (deviceId?: string) => {
    try {
      setState('initializing')
      setError(null)
      
      // Stop any existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
      
      const video: MediaTrackConstraints = {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        ...(facingMode ? { facingMode } : {})
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia({ video });

      setStream(mediaStream)
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play().catch(err => {
          console.error('Error playing video:', err)
          setError('Failed to start camera preview')
          setState('error')
        })
      }
      
      // Update available devices
      await getAvailableDevices()
      
      setState('active')
      return mediaStream
    } catch (err: any) {
      console.error('Webcam error:', err)
      
      const errorState = err.name === 'NotAllowedError' ? 'permission-denied' : 'error'
      const errorMessage = errorState === 'permission-denied'
        ? 'Camera access was denied. Please allow camera access to use this feature.'
        : 'Failed to access camera. Please check your camera connection.'
      
      setError(errorMessage)
      setState(errorState)
      
      toast.error(errorMessage)
      
      return null
    }
  }, [facingMode, getAvailableDevices, stream])

  // Stop the webcam
  const stopWebcam = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    setState('stopped')
  }, [stream])

  // Toggle webcam on/off
  const toggleWebcam = useCallback(() => {
    if (state === 'active' || state === 'initializing') {
      stopWebcam()
    } else {
      startWebcam()
    }
  }, [startWebcam, state, stopWebcam])

  // Switch camera
  const switchCamera = useCallback(() => {
    if (availableDevices.length < 2) return
    
    const currentIndex = availableDevices.findIndex(
      device => device.deviceId === selectedDeviceId
    )
    
    const nextIndex = (currentIndex + 1) % availableDevices.length
    const nextDeviceId = availableDevices[nextIndex]?.deviceId
    
    if (nextDeviceId) {
      setSelectedDeviceId(nextDeviceId)
      startWebcam(nextDeviceId)
    }
  }, [availableDevices, selectedDeviceId, startWebcam])

  // Capture photo
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null
    
    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    
    if (!context) return null
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    // Get image data URL
    const imageUrl = canvas.toDataURL('image/png')
    setCapturedImage(imageUrl)
    setState('captured')
    onCapture?.(imageUrl)
    
    return imageUrl
  }, [onCapture])

  // Retry initialization
  const retry = useCallback(() => {
    setError(null)
    startWebcam()
  }, [startWebcam])

  // Initialize on mount if autoStart is true
  useEffect(() => {
    if (autoStart) {
      startWebcam()
    }
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [autoStart, startWebcam, stream])

  return {
    // State
    state,
    stream,
    capturedImage,
    availableDevices,
    selectedDeviceId,
    error,
    
    // Refs
    videoRef,
    canvasRef,
    
    // Actions
    startWebcam,
    stopWebcam,
    toggleWebcam,
    switchCamera,
    capturePhoto,
    retry,
    
    // State helpers
    isActive: state === 'active',
    isInitializing: state === 'initializing',
    hasError: state === 'error' || state === 'permission-denied',
    hasCaptured: state === 'captured',
    isStopped: state === 'stopped',
  }
}
