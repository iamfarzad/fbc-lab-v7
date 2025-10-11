import { useCallback, useMemo, useRef, useState } from 'react'

export type MediaType = 'voice' | 'camera' | 'screen'

interface VoiceDeps {
  isActive: boolean
  isProcessing: boolean
  isSupported: boolean
  isInitializing?: boolean
  transcript: string
  partialTranscript: string
  error: string | null
  onToggle: () => void | Promise<void>
}

interface CameraDeps {
  isActive: boolean
  isInitializing?: boolean
  stream?: MediaStream | null
  error?: string | null
  availableDevices?: number
  onToggle: () => void | Promise<void>
  onSwitchCamera?: () => void | Promise<void>
}

interface ScreenDeps {
  isActive: boolean
  isInitializing?: boolean
  stream?: MediaStream | null
  error?: string | null
  onToggle: () => void | Promise<void>
}

export interface UseMediaControllerArgs {
  voice: VoiceDeps
  camera: CameraDeps
  screen: ScreenDeps
  /** Minimum ms window to suppress re-showing permission explainer */
  reExplainMs?: number
}

export function useMediaController({ voice, camera, screen, reExplainMs = 5 * 60 * 1000 }: UseMediaControllerArgs) {
  const [overlayOpen, setOverlayOpen] = useState<{ voice: boolean; camera: boolean; screen: boolean }>({
    voice: false,
    camera: false,
    screen: false,
  })
  const [pendingPermission, setPendingPermission] = useState<MediaType | null>(null)
  const lastExplainedAtRef = useRef<Record<MediaType, number>>({ voice: 0, camera: 0, screen: 0 })

  const openOverlay = useCallback((type: MediaType) => {
    setOverlayOpen(prev => ({ ...prev, [type]: true }))
  }, [])

  const closeOverlay = useCallback((type: MediaType) => {
    setOverlayOpen(prev => ({ ...prev, [type]: false }))
  }, [])

  const shouldExplain = useCallback((type: MediaType) => {
    const now = Date.now()
    const last = lastExplainedAtRef.current[type] || 0
    return now - last > reExplainMs
  }, [reExplainMs])

  const requestStart = useCallback(async (type: MediaType) => {
    if (type === 'voice') {
      if (!voice.isActive && !voice.isProcessing) {
        await voice.onToggle()
      }
      openOverlay('voice')
      return
    }

    if (type === 'camera') {
      if (!camera.isActive) {
        await camera.onToggle()
      }
      openOverlay('camera')
      return
    }

    if (type === 'screen') {
      if (!screen.isActive) {
        await screen.onToggle()
      }
      openOverlay('screen')
    }
  }, [camera.isActive, camera.onToggle, openOverlay, screen.isActive, screen.onToggle, voice.isActive, voice.isProcessing, voice.onToggle])

  const requestStop = useCallback(async (type: MediaType) => {
    // Close overlay first to avoid UI race with system prompts
    closeOverlay(type)
    if (type === 'voice') {
      if (voice.isActive || voice.isProcessing) {
        await voice.onToggle()
      }
      return
    }
    if (type === 'camera') {
      if (camera.isActive) {
        await camera.onToggle()
      }
      return
    }
    if (type === 'screen') {
      if (screen.isActive) {
        await screen.onToggle()
      }
    }
  }, [camera.isActive, camera.onToggle, closeOverlay, screen.isActive, screen.onToggle, voice.isActive, voice.isProcessing, voice.onToggle])

  const handlePress = useCallback(async (type: MediaType) => {
    // Always use full-screen overlays on all viewports
    const active = type === 'voice' ? (voice.isActive || voice.isProcessing) : type === 'camera' ? camera.isActive : screen.isActive

    if (active) {
      await requestStop(type)
      return
    }

    // Not active → potentially show explainer first
    if (shouldExplain(type)) {
      setPendingPermission(type)
      return
    }

    await requestStart(type)
  }, [camera.isActive, requestStart, requestStop, screen.isActive, shouldExplain, voice.isActive, voice.isProcessing])

  const acceptPermissionExplainer = useCallback(async () => {
    const type = pendingPermission
    setPendingPermission(null)
    if (!type) return
    lastExplainedAtRef.current[type] = Date.now()
    await requestStart(type)
  }, [pendingPermission, requestStart])

  const declinePermissionExplainer = useCallback(() => {
    setPendingPermission(null)
  }, [])

  const api = useMemo(() => ({
    // Overlay state
    isVoiceOverlayOpen: overlayOpen.voice,
    isCameraOverlayOpen: overlayOpen.camera,
    isScreenOverlayOpen: overlayOpen.screen,
    openOverlay,
    closeOverlay,

    // Permission explainer
    pendingPermission,
    setPendingPermission,
    acceptPermissionExplainer,
    declinePermissionExplainer,

    // Unified actions
    handleVoicePress: () => handlePress('voice'),
    handleCameraPress: () => handlePress('camera'),
    handleScreenPress: () => handlePress('screen'),
    stopVoice: () => requestStop('voice'),
    stopCamera: () => requestStop('camera'),
    stopScreen: () => requestStop('screen'),
  }), [
    overlayOpen.voice,
    overlayOpen.camera,
    overlayOpen.screen,
    openOverlay,
    closeOverlay,
    pendingPermission,
    acceptPermissionExplainer,
    declinePermissionExplainer,
    handlePress,
    requestStop,
  ])

  return api
}
