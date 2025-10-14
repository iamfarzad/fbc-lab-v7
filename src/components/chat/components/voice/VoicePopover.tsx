import { Mic, MicOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VoiceDisplay } from './VoiceDisplay'
import { VoiceWaveform } from '../VoiceWaveform'
import { cn } from '@/lib/utils'
import { VISUAL, ANIMATION, SPACING } from '@/components/chat/design-tokens'

interface VoicePopoverProps {
  isActive: boolean
  isProcessing: boolean
  transcript: string
  partialTranscript: string
  error: string | null
  onToggle: () => void
}

export function VoicePopover({
  isActive,
  isProcessing,
  transcript,
  partialTranscript,
  error,
  onToggle
}: VoicePopoverProps) {
  return (
    <div className={cn("w-full", SPACING.MINIMAL)}>
      {/* Waveform Section - responsive height */}
      <div 
        className={cn(
          "relative overflow-hidden",
          VISUAL.CORNER_RADIUS,
          "[.monochrome_&]:rounded-none", // Monochrome: sharp corners
          ANIMATION.FADE,
          "bg-gradient-to-b from-muted/30 to-muted/10",
          isActive && "from-primary/5 to-primary/10",
          error && "from-destructive/5 to-destructive/10"
        )}
      >
        <VoiceWaveform
          isActive={isActive}
          isProcessing={isProcessing}
          height={60}
          barWidth={3}
          barGap={2}
          barCount={32}
          className="sm:hidden" // Mobile: 60px, 32 bars
        />
        <VoiceWaveform
          isActive={isActive}
          isProcessing={isProcessing}
          height={80}
          barWidth={3}
          barGap={2}
          barCount={50}
          className="hidden sm:block" // Desktop: 80px, 50 bars
        />
        
        {/* Status indicator */}
        <div className="absolute top-2 right-2">
          <div 
            className={cn(
              "w-2 h-2 rounded-full",
              ANIMATION.FADE,
              isActive && cn("bg-primary", ANIMATION.PULSE),
              isProcessing && !isActive && cn("bg-muted-foreground", ANIMATION.PULSE),
              !isActive && !isProcessing && "bg-muted-foreground/30"
            )}
            aria-label={isActive ? "Recording" : isProcessing ? "Processing" : "Inactive"}
          />
        </div>
      </div>

      {/* Transcript Section */}
      <VoiceDisplay
        transcript={transcript}
        partialTranscript={partialTranscript}
        isProcessing={isProcessing}
        error={error}
      />

      {/* Control Button */}
      <Button
        onClick={onToggle}
        variant={isActive ? 'destructive' : 'default'}
        className={cn(
          "w-full",
          ANIMATION.FADE,
          "focus-visible:ring-2 focus-visible:ring-offset-2"
        )}
        aria-label={isActive ? "Stop voice recording" : "Start voice recording"}
      >
        {isActive ? (
          <>
            <MicOff className="mr-2 h-4 w-4" aria-hidden="true" />
            Stop Voice
          </>
        ) : (
          <>
            <Mic className="mr-2 h-4 w-4" aria-hidden="true" />
            Start Voice
          </>
        )}
      </Button>
    </div>
  )
}

