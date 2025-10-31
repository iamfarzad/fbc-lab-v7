'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { useCamera } from '@/hooks/useCamera'
import { Badge } from '@/components/ui/badge'
import { Camera, Activity } from 'lucide-react'

interface AdminWebcamPreviewProps {
  camera: ReturnType<typeof useCamera>
  isActive: boolean
  className?: string
}

export function AdminWebcamPreview({
  camera,
  isActive,
  className,
}: AdminWebcamPreviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (videoRef.current && camera.stream) {
      try {
        videoRef.current.srcObject = camera.stream
      } catch (error) {
        console.warn('[AdminWebcamPreview] Failed to bind camera stream', error)
      }
    }
  }, [camera.stream])

  if (!isActive || !camera.stream) {
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
            <Camera className="size-3 mr-1" />
            <span className="text-xs">Webcam Active</span>
          </Badge>
          {camera.isInitializing && (
            <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
              <Activity className="size-3 mr-1 animate-pulse" />
              <span className="text-xs">Initializing...</span>
            </Badge>
          )}
        </div>

        {/* Error Display */}
        {camera.error && (
          <div className="absolute bottom-2 left-2 right-2">
            <Badge variant="destructive" className="w-full justify-center">
              {camera.error}
            </Badge>
          </div>
        )}
      </div>

      {/* Analytics Info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>Stream: {camera.stream.getVideoTracks()[0]?.label || 'Unknown'}</span>
        {camera.currentDeviceId && (
          <span className="text-[10px]">Device ID: {camera.currentDeviceId.slice(0, 8)}...</span>
        )}
      </div>
    </div>
  )
}
