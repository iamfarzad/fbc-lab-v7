import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Mic, MicOff } from 'lucide-react';
import { VISUAL, SPACING } from '../design-tokens';

interface VoicePopoverSectionProps {
  isActive: boolean;
  isProcessing: boolean;
  isSupported: boolean;
  isInitializing?: boolean;
  transcript?: string;
  partialTranscript?: string;
  error?: string | null;
  onToggle: () => void;
}

export function VoicePopoverSection({
  isActive,
  isProcessing,
  isSupported,
  isInitializing = false,
  transcript,
  partialTranscript,
  error,
  onToggle
}: VoicePopoverSectionProps) {
  const displayText = partialTranscript || transcript || '';
  
  if (!isSupported) {
    return (
      <div className={cn("space-y-3", SPACING.PADDING_CONTAINER)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MicOff className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Voice</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            Not Supported
          </Badge>
        </div>
        <div className={cn(
          "text-xs text-muted-foreground bg-muted/50 p-3",
          VISUAL.CORNER_RADIUS
        )}>
          Voice recording is not supported in this browser.
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", SPACING.PADDING_CONTAINER)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              (isActive || isProcessing) ? "bg-accent animate-pulse" : "bg-muted-foreground/30"
            )}
          />
          <span className="text-sm font-medium">Voice</span>
          {isInitializing && (
            <Badge variant="secondary" className="text-xs">
              Connecting
            </Badge>
          )}
          {(isActive || isProcessing) && !isInitializing && (
            <Badge variant="secondary" className="text-xs">
              {isProcessing ? "Processing" : "Recording"}
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          onClick={onToggle}
          variant={(isActive || isProcessing) ? "destructive" : "default"}
          className="min-h-[32px]"
          disabled={isInitializing}
        >
          {(isActive || isProcessing) ? 'Stop' : 'Start'}
        </Button>
      </div>

      {/* Loading State */}
      {isInitializing && !isActive && (
        <div className={cn(
          "flex items-center justify-center gap-3 bg-muted/50 p-4",
          VISUAL.CORNER_RADIUS
        )}>
          <div className="h-4 w-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">
            Requesting microphone access...
          </span>
        </div>
      )}

      {/* Error */}
      {error && !isInitializing && (
        <div className={cn(
          "border bg-destructive/10 border-destructive/20 p-2 text-destructive text-sm",
          VISUAL.CORNER_RADIUS
        )}>
          {error}
        </div>
      )}

      {/* Transcript */}
      {(isActive || isProcessing) && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground font-medium">
            Live Transcript
          </div>
          <div className={cn(
            "bg-muted/50 p-3 text-sm min-h-[60px] max-h-[100px] overflow-y-auto",
            VISUAL.CORNER_RADIUS
          )}>
            {displayText ? (
              <span className="text-foreground">
                {displayText}
                {isActive && !isProcessing && (
                  <span className="animate-pulse ml-0.5">█</span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground italic">
                {isProcessing ? "Processing..." : "Listening..."}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Info */}
      {(isActive || isProcessing) && !error && (
        <div className={cn(
          "text-xs text-muted-foreground bg-muted/30 p-2",
          VISUAL.CORNER_RADIUS
        )}>
          <div className="flex items-center gap-2">
            <Mic className="h-3 w-3" />
            <span>{isProcessing ? 'Processing response...' : 'Streaming voice input'}</span>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!isActive && !isProcessing && !error && (
        <div className={cn(
          "text-xs text-muted-foreground bg-muted/30 p-3",
          VISUAL.CORNER_RADIUS
        )}>
          <div className="flex items-center gap-2 mb-2">
            <Mic className="h-4 w-4" />
            <span className="font-medium">Ready to Record</span>
          </div>
          <p>
            Click "Start" to begin voice recording. Your transcript will appear in real-time.
          </p>
        </div>
      )}
    </div>
  );
}
