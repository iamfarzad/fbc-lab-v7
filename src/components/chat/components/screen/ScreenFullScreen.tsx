import React from 'react'
import { Monitor, MonitorOff, Camera, Mic, MessageSquare } from 'lucide-react'
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
  onOpenCamera?: () => void
  onOpenVoice?: () => void
  transcript?: string
  partialTranscript?: string
}

export function ScreenFullScreen({
  isOpen,
  onClose,
  isActive,
  stream,
  thumbnail,
  error,
  onToggle,
  onOpenCamera,
  onOpenVoice,
  transcript,
  partialTranscript
}: ScreenFullScreenProps) {
  const [showTranscript, setShowTranscript] = React.useState(false)
  return (
    <FullScreenModal
      isOpen={isOpen}
      onClose={onClose}
      title="Screen Share"
      contentClassName="bg-matrix-soft flex flex-col p-4"
    >
      <div className="relative mb-4 flex-1">
        <ScreenDisplay
          stream={stream}
          thumbnail={thumbnail}
          error={error}
        />
        {showTranscript && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 mx-4 rounded-md border border-border/40 bg-background/85 p-3 text-foreground shadow-lg">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Transcript</div>
            {partialTranscript ? (
              <div className="italic text-muted-foreground whitespace-pre-line">{partialTranscript}</div>
            ) : (
              <div className="whitespace-pre-line">{transcript || 'No transcript yet.'}</div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {onOpenCamera && (
          <Button variant="outline" className="flex-1" onClick={onOpenCamera}>
            <Camera className="mr-2 h-5 w-5" />
            Camera
          </Button>
        )}
        {onOpenVoice && (
          <Button variant="outline" className="flex-1" onClick={onOpenVoice}>
            <Mic className="mr-2 h-5 w-5" />
            Voice
          </Button>
        )}
        <Button variant="outline" className="flex-1" onClick={() => setShowTranscript(v => !v)} aria-pressed={showTranscript}>
          <MessageSquare className="mr-2 h-5 w-5" /> Transcript
        </Button>
        <Button
          onClick={onToggle}
          size="lg"
          variant={isActive ? 'destructive' : 'default'}
          className="flex-1"
        >
          {isActive ? (
            <>
              <MonitorOff className="mr-2 h-5 w-5" />
              Stop
            </>
          ) : (
            <>
              <Monitor className="mr-2 h-5 w-5" />
              Start
            </>
          )}
        </Button>
      </div>
    </FullScreenModal>
  )
}
