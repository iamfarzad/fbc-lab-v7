import { useState, useCallback, useRef } from 'react'
import { useIsMobile } from './useIsMobile'

export interface MediaToggleOptions {
  isActive: boolean
  hasPermission?: boolean
  onToggle: () => void | Promise<void>
  type: 'voice' | 'camera' | 'screen'
  onPermissionNeeded?: (type: 'voice' | 'camera' | 'screen') => void
}

export function useMediaToggle({
  isActive,
  hasPermission = false,
  onToggle,
  type,
  onPermissionNeeded
}: MediaToggleOptions) {
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false)
  const isTogglingRef = useRef(false)
  const isMobile = useIsMobile(768)

  const handleButtonClick = useCallback(async () => {
    if (isTogglingRef.current) return
    
    isTogglingRef.current = true
    
    try {
      const needsPermission = !isActive && !hasPermission

      if (isMobile) {
        setIsFullScreenOpen(!isFullScreenOpen)
        if (needsPermission && onPermissionNeeded) {
          onPermissionNeeded(type)
          return
        }
      } else {
        if (needsPermission && onPermissionNeeded) {
          onPermissionNeeded(type)
          return
        }
      }

      await onToggle()
    } catch (error) {
      console.error(`[${type}] Toggle error:`, error)
      if (isMobile) {
        setIsFullScreenOpen(false)
      }
    } finally {
      setTimeout(() => {
        isTogglingRef.current = false
      }, 500)
    }
  }, [hasPermission, isActive, isFullScreenOpen, onToggle, type, onPermissionNeeded, isMobile])

  const closeFullScreen = useCallback(() => {
    setIsFullScreenOpen(false)
  }, [])

  const openFullScreen = useCallback(() => {
    setIsFullScreenOpen(true)
  }, [])

  return {
    isMobile,
    isFullScreenOpen,
    handleButtonClick,
    closeFullScreen,
    openFullScreen,
    setIsFullScreenOpen
  }
}
