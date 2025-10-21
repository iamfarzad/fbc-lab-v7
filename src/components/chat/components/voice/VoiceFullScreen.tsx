import React from 'react'
import { Mic, MicOff, Monitor, Camera, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VoiceDisplay } from './VoiceDisplay'
import { LiveWaveform } from '@/components/ui/live-waveform'
import { FullScreenModal } from '@/components/ui/full-screen-modal'

interface VoiceFullScreenProps {
  isOpen: boolean
  onClose: () => void
  isActive: boolean
  isProcessing: boolean
  transcript: string
  partialTranscript: string
  error: string | null
  onToggle: () => void
  onOpenCamera?: () => void
  onOpenScreen?: () => void
}

export function VoiceFullScreen({
  isOpen,
  onClose,
  isActive,
  isProcessing,
  transcript,
  partialTranscript,
  error,
  onToggle,
  onOpenCamera,
  onOpenScreen
}: VoiceFullScreenProps) {
  const [showTranscript, setShowTranscript] = React.useState(true)
  return (
    <FullScreenModal
      isOpen={isOpen}
      onClose={onClose}
      title="Voice Mode"
      contentClassName="bg-matrix-soft flex flex-col"
    >
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <LiveWaveform
            active={isActive}
            processing={isProcessing}
            height={120}
            barWidth={4}
            barGap={3}
            mode="static"
          />
        </div>
      </div>

      {showTranscript && (
        <div className="flex-1 px-4">
          <VoiceDisplay
            transcript={transcript}
            partialTranscript={partialTranscript}
            isProcessing={isProcessing}
            error={error}
          />
        </div>
      )}

      <div className="border-t p-4">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3">
          {onOpenCamera && (
            <Button variant="outline" className="flex-1" onClick={onOpenCamera}>
              <Camera className="mr-2 h-5 w-5" />
              Camera
            </Button>
          )}
          {onOpenScreen && (
            <Button variant="outline" className="flex-1" onClick={onOpenScreen}>
              <Monitor className="mr-2 h-5 w-5" />
              Screen
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
                <MicOff className="mr-2 h-5 w-5" />
                Stop
              </>
            ) : (
              <>
                <Mic className="mr-2 h-5 w-5" />
                Start
              </>
            )}
          </Button>
        </div>
      </div>
    </FullScreenModal>
  )
}
