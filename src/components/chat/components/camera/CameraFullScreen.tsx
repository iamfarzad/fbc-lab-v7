import { Camera, CameraOff, SwitchCamera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CameraDisplay } from './CameraDisplay'
import { FullScreenModal } from '@/components/ui/full-screen-modal'

interface CameraFullScreenProps {
  isOpen: boolean
  onClose: () => void
  isActive: boolean
  stream: MediaStream | null
  error?: string
  onToggle: () => void
  onSwitchCamera?: () => void
  hasMultipleCameras?: boolean
}

export function CameraFullScreen({
  isOpen,
  onClose,
  isActive,
  stream,
  error,
  onToggle,
  onSwitchCamera,
  hasMultipleCameras
}: CameraFullScreenProps) {
  return (
    <FullScreenModal
      isOpen={isOpen}
      onClose={onClose}
      title="Camera"
      contentClassName="flex flex-col p-4"
    >
      <div className="mb-4 flex-1">
        <CameraDisplay stream={stream} error={error} />
      </div>

      <div className="space-y-2">
        {isActive && hasMultipleCameras && onSwitchCamera && (
          <Button
            onClick={onSwitchCamera}
            variant="outline"
            className="w-full"
          >
            <SwitchCamera className="mr-2 h-4 w-4" />
            Switch Camera
          </Button>
        )}
        <Button
          onClick={onToggle}
          size="lg"
          variant={isActive ? 'destructive' : 'default'}
          className="w-full"
        >
          {isActive ? (
            <>
              <CameraOff className="mr-2 h-5 w-5" />
              Stop Camera
            </>
          ) : (
            <>
              <Camera className="mr-2 h-5 w-5" />
              Start Camera
            </>
          )}
        </Button>
      </div>
    </FullScreenModal>
  )
}

