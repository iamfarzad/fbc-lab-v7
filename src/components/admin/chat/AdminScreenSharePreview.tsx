'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { useScreenShare } from '@/hooks/useScreenShare'
import { Badge } from '@/components/ui/badge'
import { Monitor, Activity } from 'lucide-react'

interface AdminScreenSharePreviewProps {
  screenShare: ReturnType<typeof useScreenShare>
  isActive: boolean
  className?: string
}

export function AdminScreenSharePreview({
  screenShare,
  isActive,
  className,
}: AdminScreenSharePreviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (videoRef.current && screenShare.stream) {
      try {
        videoRef.current.srcObject = screenShare.stream
      } catch (error) {
        console.warn('[AdminScreenSharePreview] Failed to bind screen stream', error)
      }
    }
  }, [screenShare.stream])

  if (!isActive || !screenShare.stream) {
    return null
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative rounded-lg border border-border bg-card overflow-hidden">
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          className="w-full h-48 object-cover bg-muted"
        />
        
        {/* Analytics Overlay */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
            <Monitor className="size-3 mr-1" />
            <span className="text-xs">Screen Share Active</span>
          </Badge>
          {screenShare.isInitializing && (
            <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
              <Activity className="size-3 mr-1 animate-pulse" />
              <span className="text-xs">Initializing...</span>
            </Badge>
          )}
        </div>

        {/* Error Display */}
        {screenShare.error && (
          <div className="absolute bottom-2 left-2 right-2">
            <Badge variant="destructive" className="w-full justify-center">
              {screenShare.error}
            </Badge>
          </div>
        )}
      </div>

      {/* Analytics Info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>Screen sharing active</span>
        {screenShare.stream.getVideoTracks()[0]?.getSettings().displaySurface && (
          <span className="text-[10px]">
            {screenShare.stream.getVideoTracks()[0]?.getSettings().displaySurface}
          </span>
        )}
      </div>
    </div>
  )
}
