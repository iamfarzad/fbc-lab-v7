'use client'

import { cn } from '@/lib/utils'

interface AdminVoiceTranscriptProps {
  userTranscript: string
  userPartialTranscript: string
  aiTranscript: string
  aiPartialTranscript: string
  isUserSpeaking: boolean
  isAiSpeaking: boolean
}

export function AdminVoiceTranscript({
  userTranscript,
  userPartialTranscript,
  aiTranscript,
  aiPartialTranscript,
  isUserSpeaking,
  isAiSpeaking,
}: AdminVoiceTranscriptProps) {
  // Combine final and partial transcripts
  const displayUserText = userTranscript || userPartialTranscript
  const displayAiText = aiTranscript || aiPartialTranscript
  
  // Determine if text is partial (has partial but no final)
  const isUserPartial = !userTranscript && !!userPartialTranscript
  const isAiPartial = !aiTranscript && !!aiPartialTranscript

  return (
    <div className="rounded-lg border border-border bg-card p-3 max-h-32 overflow-y-auto w-full min-w-0">
      <div className="space-y-2 text-sm">
        {/* User transcript */}
        {(displayUserText || isUserSpeaking) && (
          <div className={cn('flex items-start gap-2', isUserSpeaking && 'animate-in fade-in duration-300')}>
            <div className="size-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
            <div className="flex-1 min-w-0">
              {displayUserText ? (
                <span className={cn('text-primary', isUserPartial && 'italic opacity-70', !isUserPartial && 'font-medium')}>
                  {displayUserText}
                </span>
              ) : (
                <span className="text-muted-foreground italic opacity-70">Listening...</span>
              )}
            </div>
          </div>
        )}

        {/* AI transcript */}
        {(displayAiText || isAiSpeaking) && (
          <div className={cn('flex items-start gap-2', isAiSpeaking && 'animate-in fade-in duration-300')}>
            <div className="size-1.5 rounded-full bg-accent shrink-0 mt-1.5" />
            <div className="flex-1 min-w-0">
              {displayAiText ? (
                <span className={cn('text-accent', isAiPartial && 'italic opacity-70', !isAiPartial && 'font-medium')}>
                  {displayAiText}
                </span>
              ) : (
                <span className="text-muted-foreground italic opacity-70">Processing...</span>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!displayUserText && !displayAiText && !isUserSpeaking && !isAiSpeaking && (
          <div className="text-center text-muted-foreground text-xs py-2">
            Voice transcripts will appear here
          </div>
        )}
      </div>
    </div>
  )
}

