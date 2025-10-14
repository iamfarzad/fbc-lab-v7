import { Monitor, MonitorOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScreenDisplay } from './ScreenDisplay'

interface ScreenPopoverProps {
  isActive: boolean
  stream: MediaStream | null
  thumbnail?: string | null
  error?: string
  onToggle: () => void
}

export function ScreenPopover({
  isActive,
  stream,
  thumbnail,
  error,
  onToggle
}: ScreenPopoverProps) {
  return (
    <div className="w-full max-w-md space-y-4">
      {/* Screen View */}
      <div className="aspect-video">
        <ScreenDisplay stream={stream} thumbnail={thumbnail} error={error} />
      </div>

      {/* Toggle Button */}
      <Button
        onClick={onToggle}
        variant={isActive ? 'destructive' : 'default'}
        className="w-full"
      >
        {isActive ? (
          <>
            <MonitorOff className="mr-2 h-4 w-4" />
            Stop Screen Share
          </>
        ) : (
          <>
            <Monitor className="mr-2 h-4 w-4" />
            Start Screen Share
          </>
        )}
      </Button>
    </div>
  )
}


