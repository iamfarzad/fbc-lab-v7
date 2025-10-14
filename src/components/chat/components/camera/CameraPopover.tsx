import { Camera, CameraOff, SwitchCamera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CameraDisplay } from './CameraDisplay'

interface CameraPopoverProps {
  isActive: boolean
  stream: MediaStream | null
  error?: string
  onToggle: () => void
  onSwitchCamera?: () => void
  hasMultipleCameras?: boolean
}

export function CameraPopover({
  isActive,
  stream,
  error,
  onToggle,
  onSwitchCamera,
  hasMultipleCameras
}: CameraPopoverProps) {
  return (
    <div className="w-full max-w-md space-y-4">
      {/* Camera View */}
      <div className="aspect-video">
        <CameraDisplay stream={stream} error={error} />
      </div>

      {/* Controls */}
      <div className="space-y-2">
        {isActive && hasMultipleCameras && onSwitchCamera && (
          <Button
            onClick={onSwitchCamera}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <SwitchCamera className="mr-2 h-4 w-4" />
            Switch Camera
          </Button>
        )}
        <Button
          onClick={onToggle}
          variant={isActive ? 'destructive' : 'default'}
          className="w-full"
        >
          {isActive ? (
            <>
              <CameraOff className="mr-2 h-4 w-4" />
              Stop Camera
            </>
          ) : (
            <>
              <Camera className="mr-2 h-4 w-4" />
              Start Camera
            </>
          )}
        </Button>
      </div>
    </div>
  )
}


