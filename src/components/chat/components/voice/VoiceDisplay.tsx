import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { VISUAL, ANIMATION } from '@/components/chat/design-tokens'

interface VoiceDisplayProps {
  transcript: string
  partialTranscript: string
  isProcessing: boolean
  error: string | null
}

export function VoiceDisplay({
  transcript,
  partialTranscript,
  isProcessing,
  error
}: VoiceDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcript, partialTranscript])

  if (error) {
    return (
      <div 
        className={cn(
          "p-3 border",
          VISUAL.CORNER_RADIUS,
          "[.monochrome_&]:rounded-none", // Monochrome: sharp corners
          ANIMATION.FADE,
          "bg-destructive/10 border-destructive/20"
        )}
        role="alert"
      >
        <p className="text-sm text-destructive font-medium">{error}</p>
      </div>
    )
  }

  const hasContent = transcript || partialTranscript || (isProcessing && !partialTranscript)

  if (!hasContent) {
    return (
      <div 
        className={cn(
          "p-3 border",
          VISUAL.CORNER_RADIUS,
          "[.monochrome_&]:rounded-none",
          ANIMATION.FADE,
          "bg-muted/30 border-border/40"
        )}
      >
        <p className="text-sm text-muted-foreground text-center">
          Start speaking to see your transcript...
        </p>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className={cn(
        "overflow-y-auto p-3 space-y-2 border",
        VISUAL.CORNER_RADIUS,
        "[.monochrome_&]:rounded-none",
        ANIMATION.FADE,
        "bg-muted/30 border-border/40",
        "max-h-32 sm:max-h-40", // Responsive max height
        "scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent"
      )}
      role="log"
      aria-live="polite"
      aria-atomic="false"
    >
      {transcript && (
        <div className="text-sm text-foreground leading-relaxed">
          {transcript}
        </div>
      )}
      {partialTranscript && (
        <div className="text-sm text-muted-foreground italic leading-relaxed">
          {partialTranscript}
        </div>
      )}
      {isProcessing && !partialTranscript && !transcript && (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <span className={cn("inline-block w-1.5 h-1.5 rounded-full bg-current", ANIMATION.PULSE)} />
          Listening...
        </div>
      )}
    </div>
  )
}

