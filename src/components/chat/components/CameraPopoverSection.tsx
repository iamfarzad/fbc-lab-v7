import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Camera, RotateCcw, VideoOff } from 'lucide-react';
import { VISUAL, SPACING } from '../design-tokens';

interface CameraPopoverSectionProps {
  isActive: boolean;
  isInitializing?: boolean;
  stream?: MediaStream | null;
  error?: string | null;
  onToggle: () => void;
  onSwitchCamera?: () => void;
  availableDevices?: number;
}

export function CameraPopoverSection({
  isActive,
  isInitializing = false,
  stream,
  error,
  onToggle,
  onSwitchCamera,
  availableDevices = 1
}: CameraPopoverSectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    video.play().catch(err => {
      console.error('Error playing video:', err);
    });

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
          <span className="text-sm font-medium">Camera</span>
          {isInitializing && (
            <Badge variant="secondary" className="text-xs">
              Requesting
            </Badge>
          )}
          {isActive && !isInitializing && (
            <Badge variant="secondary" className="text-xs">
              Live
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
          {isActive ? 'Stop' : 'Start'}
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
            <div className="font-medium mb-1">Requesting Camera Access</div>
            <p className="text-xs">Please allow camera permissions in your browser</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !isInitializing && (
        <div className={cn(
          "border bg-destructive/10 border-destructive/20 p-3 text-destructive text-sm",
          VISUAL.CORNER_RADIUS
        )}>
          <div className="font-medium mb-1">Camera Error</div>
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
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
                aria-label="Camera preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-muted-foreground">
                  <VideoOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <div className="text-xs">Initializing...</div>
                </div>
              </div>
            )}
            
            {/* Controls */}
            {onSwitchCamera && availableDevices > 1 && stream && (
              <div className="absolute bottom-2 right-2">
                <Button 
                  size="icon"
                  variant="secondary" 
                  onClick={onSwitchCamera}
                  className="h-9 w-9 bg-background/80 hover:bg-background/90 backdrop-blur-sm"
                  aria-label="Switch camera"
                  title="Switch camera"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info */}
      {isActive && !error && (
        <div className={cn(
          "text-xs text-muted-foreground bg-muted/30 p-2",
          VISUAL.CORNER_RADIUS
        )}>
          <div className="flex items-center justify-between">
            <span>Camera active</span>
            {availableDevices > 1 && (
              <span>{availableDevices} available</span>
            )}
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
            <Camera className="h-4 w-4" />
            <span className="font-medium">Camera Ready</span>
          </div>
          <p className="mb-2">
            Click "Start" to enable your camera. Preview will appear here.
          </p>
          {availableDevices > 1 && (
            <p>
              {availableDevices} cameras detected - you can switch between them.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
