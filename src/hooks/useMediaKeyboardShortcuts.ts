import { useEffect } from 'react'

interface MediaKeyboardShortcutsHandlers {
  onVoiceToggle: () => void
  onCameraToggle: () => void
  onScreenToggle: () => void
  onClosePopover?: () => void
  onTextareaToggle?: () => void
}

export function useMediaKeyboardShortcuts({
  onVoiceToggle,
  onCameraToggle,
  onScreenToggle,
  onClosePopover,
  onTextareaToggle,
}: MediaKeyboardShortcutsHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + M = Toggle microphone/voice
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault()
        onVoiceToggle()
      }
      // Ctrl/Cmd + Shift + C = Toggle camera
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'c') {
        e.preventDefault()
        onCameraToggle()
      }
      // Ctrl/Cmd + Shift + S = Toggle screen share
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 's') {
        e.preventDefault()
        onScreenToggle()
      }
      // ESC = Close active popover
      else if (e.key === 'Escape' && onClosePopover) {
        e.preventDefault()
        onClosePopover()
      }
      // Ctrl/Cmd + K = Toggle textarea
      else if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        onTextareaToggle?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onVoiceToggle, onCameraToggle, onScreenToggle, onClosePopover, onTextareaToggle])
}


