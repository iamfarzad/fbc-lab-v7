import { Monitor, MonitorOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScreenDisplay } from './ScreenDisplay'
import { FullScreenModal } from '@/components/ui/full-screen-modal'

interface ScreenFullScreenProps {
  isOpen: boolean
  onClose: () => void
  isActive: boolean
  stream: MediaStream | null
  thumbnail?: string | null
  error?: string
  onToggle: () => void
}

export function ScreenFullScreen({
  isOpen,
  onClose,
  isActive,
  stream,
  thumbnail,
  error,
  onToggle
}: ScreenFullScreenProps) {
  return (
    <FullScreenModal
      isOpen={isOpen}
      onClose={onClose}
      title="Screen Share"
      contentClassName="flex flex-col p-4"
    >
      <div className="mb-4 flex-1">
        <ScreenDisplay
          stream={stream}
          thumbnail={thumbnail}
          error={error}
        />
      </div>

      <Button
        onClick={onToggle}
        size="lg"
        variant={isActive ? 'destructive' : 'default'}
        className="w-full"
      >
        {isActive ? (
          <>
            <MonitorOff className="mr-2 h-5 w-5" />
            Stop Screen Share
          </>
        ) : (
          <>
            <Monitor className="mr-2 h-5 w-5" />
            Start Screen Share
          </>
        )}
      </Button>
    </FullScreenModal>
  )
}

