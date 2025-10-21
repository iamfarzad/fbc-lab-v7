import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, SwitchCamera, Mic, Monitor, MessageSquare } from 'lucide-react'
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
  onOpenVoice?: () => void
  onOpenScreen?: () => void
  transcript?: string
  partialTranscript?: string
}

export function CameraFullScreen({
  isOpen,
  onClose,
  isActive,
  stream,
  error,
  onToggle,
  onSwitchCamera,
  hasMultipleCameras,
  onOpenVoice,
  onOpenScreen,
  transcript,
  partialTranscript
}: CameraFullScreenProps) {
  const [showTranscript, setShowTranscript] = useState(false)
  const didAutoStartRef = useRef(false)

  // One-tap flow: when modal opens and camera isn't active, request immediately
  useEffect(() => {
    if (!isOpen) {
      didAutoStartRef.current = false
      return
    }
    if (!isActive && !stream && !didAutoStartRef.current) {
      didAutoStartRef.current = true
      try { void onToggle() } catch {}
    }
  }, [isOpen, isActive, stream, onToggle])

  return (
    <FullScreenModal
      isOpen={isOpen}
      onClose={onClose}
      title="Camera"
      contentClassName="bg-matrix-soft flex flex-col p-4"
    >
      <div className="relative mb-4 flex-1">
        <CameraDisplay stream={stream} error={error} />
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

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          {onOpenVoice && (
            <Button variant="outline" className="flex-1" onClick={onOpenVoice}>
              <Mic className="mr-2 h-4 w-4" /> Voice
            </Button>
          )}
          {onOpenScreen && (
            <Button variant="outline" className="flex-1" onClick={onOpenScreen}>
              <Monitor className="mr-2 h-4 w-4" /> Screen
            </Button>
          )}
          <Button variant="outline" className="flex-1" onClick={() => setShowTranscript(v => !v)} aria-pressed={showTranscript}>
            <MessageSquare className="mr-2 h-4 w-4" /> Transcript
          </Button>
        </div>

        {(onSwitchCamera && (hasMultipleCameras || isActive)) && (
          <Button
            onClick={onSwitchCamera}
            variant="outline"
            className="w-full"
          >
            <SwitchCamera className="mr-2 h-4 w-4" />
            Flip Camera
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
