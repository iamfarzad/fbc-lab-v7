import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Monitor, VideoOff } from 'lucide-react';
import { VISUAL, SPACING } from '../design-tokens';

interface ScreenPopoverSectionProps {
  isActive: boolean;
  isInitializing?: boolean;
  stream?: MediaStream | null;
  error?: string | null;
  onToggle: () => void;
}

export function ScreenPopoverSection({
  isActive,
  isInitializing = false,
  stream,
  error,
  onToggle
}: ScreenPopoverSectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    // Only update if stream changed (prevents video reload loops)
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    video.play().catch(err => {
      const name = (err as any)?.name || 'Error';
      const message = (err as any)?.message || String(err);
      if (name === 'AbortError' || message.includes('interrupted by a new load request')) {
        console.debug('Screen share preview play() interrupted — benign:', message);
      } else {
        console.warn('Screen share preview play() warning:', message);
      }
    });
    }

    return () => {
      if (video.srcObject) {
        const tracks = (video.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
      }
    };
  }, [stream]);

  return (
    <div className={cn("space-y-3", SPACING.PADDING_CONTAINER)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "h-2 w-2 rounded-full",
            isActive ? "bg-accent animate-pulse" : "bg-muted-foreground/30"
          )} />
          <span className="text-sm font-medium">Screen Share</span>
          {isInitializing && (
            <Badge variant="secondary" className="text-xs">
              Selecting
            </Badge>
          )}
          {isActive && !isInitializing && (
            <Badge variant="secondary" className="text-xs">
              Sharing
            </Badge>
          )}
        </div>
        <Button 
          size="sm" 
          onClick={onToggle}
          variant={isActive ? "destructive" : "default"}
          className="min-h-[32px]"
          disabled={isInitializing}
        >
          {isActive ? 'Stop' : 'Share'}
        </Button>
      </div>

      {/* Loading State */}
      {isInitializing && !isActive && (
        <div className={cn(
          "flex flex-col items-center justify-center gap-3 bg-muted/50 p-6",
          VISUAL.CORNER_RADIUS
        )}>
          <div className="h-8 w-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
          <div className="text-center text-sm text-muted-foreground">
            <div className="font-medium mb-1">Select Screen to Share</div>
            <p className="text-xs">Choose from the dialog that appeared</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !isInitializing && (
        <div className={cn(
          "border bg-destructive/10 border-destructive/20 p-3 text-destructive text-sm",
          VISUAL.CORNER_RADIUS
        )}>
          <div className="font-medium mb-1">Screen Share Error</div>
          <p>{error}</p>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onToggle} 
            className="mt-2 min-h-[28px]"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Preview */}
      {isActive && !error && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground font-medium">Preview</div>
          <div className={cn(
            "relative bg-muted overflow-hidden aspect-video touch-none",
            VISUAL.CORNER_RADIUS,
            "[.monochrome_&]:rounded-none"
          )}>
            {stream ? (
              <video
                ref={videoRef}
                className="w-full h-full object-contain"
                autoPlay
                muted
                playsInline
                aria-label="Screen share preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-muted-foreground">
                  <VideoOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <div className="text-xs">Initializing...</div>
                </div>
              </div>
            )}
            
            {/* Recording indicator */}
            <div className={cn(
              "absolute top-2 left-2 bg-destructive/90 text-destructive-foreground px-2 py-1 text-xs flex items-center gap-1",
              VISUAL.CORNER_RADIUS
            )}>
              <div className="h-2 w-2 rounded-full bg-current animate-pulse" />
              REC
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      {isActive && !error && (
        <div className={cn(
          "text-xs text-muted-foreground bg-muted/30 p-2",
          VISUAL.CORNER_RADIUS
        )}>
          <div className="flex items-center gap-2">
            <Monitor className="h-3 w-3" />
            <span>Screen sharing active</span>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!isActive && !error && (
        <div className={cn(
          "text-xs text-muted-foreground bg-muted/30 p-3",
          VISUAL.CORNER_RADIUS
        )}>
          <div className="flex items-center gap-2 mb-2">
            <Monitor className="h-4 w-4" />
            <span className="font-medium">Ready to Share</span>
          </div>
          <p>
            Click "Share" to start sharing your screen. Choose to share your entire screen, a window, or a browser tab.
          </p>
        </div>
      )}
    </div>
  );
}
