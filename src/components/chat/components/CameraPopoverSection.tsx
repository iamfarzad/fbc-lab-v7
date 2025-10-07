import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Camera, CameraOff, RotateCcw, Video, VideoOff } from 'lucide-react';
import { VISUAL } from '../design-tokens';

interface CameraPopoverSectionProps {
  isActive: boolean;
  stream?: MediaStream | null;
  error?: string | null;
  onToggle: () => void;
  onSwitchCamera?: () => void;
  availableDevices?: number;
}

export function CameraPopoverSection({
  isActive,
  stream,
  error,
  onToggle,
  onSwitchCamera,
  availableDevices = 1
}: CameraPopoverSectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Set up video stream when active
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
    <div className="space-y-3 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "h-2 w-2 rounded-full",
            isActive ? "bg-green-500 animate-pulse" : "bg-gray-400"
          )} />
          <span className="text-sm font-medium">📷 Camera</span>
          {isActive && (
            <Badge variant="secondary" className="text-xs">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse mr-1" />
              Live
            </Badge>
          )}
        </div>
        <Button 
          size="sm" 
          onClick={onToggle}
          variant={isActive ? "destructive" : "default"}
          className="h-7 px-3"
        >
          {isActive ? 'Stop' : 'Start'}
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-2 text-red-600 text-sm">
          <div className="font-medium mb-1">Camera Error</div>
          {error}
          <Button size="sm" variant="outline" onClick={onToggle} className="mt-2 h-6 px-2">
            Retry
          </Button>
        </div>
      )}

      {/* Video Preview */}
      {isActive && !error && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground font-medium">
            Camera Preview
          </div>
          <div className={cn(
            "relative bg-black overflow-hidden aspect-video rounded-lg",
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
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <VideoOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <div className="text-xs">Camera initializing...</div>
                </div>
              </div>
            )}
            
            {/* Overlay controls */}
            <div className="absolute bottom-2 right-2 flex gap-1">
              {onSwitchCamera && availableDevices > 1 && (
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={onSwitchCamera}
                  className="h-6 w-6 p-0 bg-black/50 hover:bg-black/70"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Camera Info */}
      {isActive && !error && (
        <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2">
          <div className="flex items-center justify-between">
            <span>Camera is active and sharing</span>
            {availableDevices > 1 && (
              <span className="text-xs">{availableDevices} cameras available</span>
            )}
          </div>
        </div>
      )}

      {/* Instructions when inactive */}
      {!isActive && !error && (
        <div className="text-xs text-muted-foreground bg-muted/30 rounded p-3">
          <div className="flex items-center gap-2 mb-2">
            <Camera className="h-4 w-4" />
            <span className="font-medium">Camera Ready</span>
          </div>
          <p className="mb-2">
            Click "Start" to enable your camera. The preview will appear here and you can switch between cameras if multiple are available.
          </p>
          {availableDevices > 1 && (
            <p className="text-xs">
              💡 {availableDevices} cameras detected - you can switch between them.
            </p>
          )}
        </div>
      )}

      {/* Camera Settings (placeholder) */}
      {isActive && !error && (
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="flex items-center gap-1 h-7 px-2"
            disabled
          >
            <Camera className="h-3 w-3" />
            Settings
          </Button>
        </div>
      )}
    </div>
  );
}
