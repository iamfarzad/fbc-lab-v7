import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { VISUAL, ANIMATION } from '@/components/chat/design-tokens'

interface TranscriptDisplayProps {
  // Core data
  transcript?: string
  partialTranscript?: string
  aiTranscript?: string
  
  // Display variants
  variant?: 'inline' | 'overlay' | 'conversation'
  
  // UI options
  showLabel?: boolean
  emptyMessage?: string
  
  // Styling
  className?: string
}

export function TranscriptDisplay({
  transcript,
  partialTranscript,
  aiTranscript,
  variant = 'inline',
  showLabel = false,
  emptyMessage = 'Start speaking to see your transcript…',
  className
}: TranscriptDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  
  // Auto-scroll to bottom on updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcript, partialTranscript, aiTranscript])
  
  const hasContent = transcript || partialTranscript || aiTranscript
  
  // Base container classes based on variant
  const getContainerClasses = () => {
    const baseClasses = "overflow-y-auto border"
    
    switch (variant) {
      case 'conversation':
        return cn(
          baseClasses,
          "max-h-28 rounded-md border-border/40 bg-muted/30 p-2 text-[12px]",
          "scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent"
        )
      case 'overlay':
        return cn(
          baseClasses,
          "rounded-md border-border/40 bg-background/85 p-3 text-foreground shadow-lg"
        )
      case 'inline':
      default:
        return cn(
          baseClasses,
          VISUAL.CORNER_RADIUS,
          "[.monochrome_&]:rounded-none",
          ANIMATION.FADE,
          "bg-muted/30 border-border/40 p-3",
          "max-h-32 sm:max-h-40",
          "scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent"
        )
    }
  }
  
  // Render content based on variant
  const renderContent = () => {
    if (!hasContent) {
      return (
        <div className="text-muted-foreground text-center text-sm">
          {emptyMessage}
        </div>
      )
    }
    
    if (variant === 'conversation') {
      return (
        <>
          {(partialTranscript || transcript) && (
            <div className="mb-1">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">You</div>
              <div className={cn(
                "whitespace-pre-line",
                partialTranscript ? "text-muted-foreground italic" : "text-foreground"
              )}>
                {partialTranscript || transcript}
              </div>
            </div>
          )}
          {aiTranscript && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">AI</div>
              <div className="text-foreground whitespace-pre-line">{aiTranscript}</div>
            </div>
          )}
        </>
      )
    }
    
    // For overlay and inline variants
    return (
      <>
        {showLabel && (
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Transcript</div>
        )}
        {partialTranscript ? (
          <div className="italic text-muted-foreground whitespace-pre-line">{partialTranscript}</div>
        ) : (
          <div className="whitespace-pre-line">{transcript || 'No transcript yet.'}</div>
        )}
      </>
    )
  }
  
  return (
    <div
      ref={scrollRef}
      className={cn(
        getContainerClasses(),
        className
      )}
      role="log"
      aria-live="polite"
      aria-atomic="false"
    >
      {renderContent()}
    </div>
  )
}
