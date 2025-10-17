import { Mic, MicOff } from 'lucide-react'
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
}

export function VoiceFullScreen({
  isOpen,
  onClose,
  isActive,
  isProcessing,
  transcript,
  partialTranscript,
  error,
  onToggle
}: VoiceFullScreenProps) {
  return (
    <FullScreenModal
      isOpen={isOpen}
      onClose={onClose}
      title="Voice Mode"
      contentClassName="flex flex-col"
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

      <div className="flex-1 px-4">
        <VoiceDisplay
          transcript={transcript}
          partialTranscript={partialTranscript}
          isProcessing={isProcessing}
          error={error}
        />
      </div>

      <div className="border-t p-6">
        <Button
          onClick={onToggle}
          size="lg"
          variant={isActive ? 'destructive' : 'default'}
          className="w-full"
        >
          {isActive ? (
            <>
              <MicOff className="mr-2 h-5 w-5" />
              Stop Voice
            </>
          ) : (
            <>
              <Mic className="mr-2 h-5 w-5" />
              Start Voice
            </>
          )}
        </Button>
      </div>
    </FullScreenModal>
  )
}
