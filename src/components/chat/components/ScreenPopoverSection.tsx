import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Monitor, MonitorOff, Video, VideoOff, X } from 'lucide-react';
import { VISUAL } from '../design-tokens';

interface ScreenPopoverSectionProps {
  isActive: boolean;
  stream?: MediaStream | null;
  error?: string | null;
  onToggle: () => void;
}

export function ScreenPopoverSection({
  isActive,
  stream,
  error,
  onToggle
}: ScreenPopoverSectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Set up video stream when active
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    video.play().catch(err => {
      console.error('Error playing screen share:', err);
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
            isActive ? "bg-blue-500 animate-pulse" : "bg-gray-400"
          )} />
          <span className="text-sm font-medium">🖥️ Screen Share</span>
          {isActive && (
            <Badge variant="secondary" className="text-xs">
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse mr-1" />
              Sharing
            </Badge>
          )}
        </div>
        <Button 
          size="sm" 
          onClick={onToggle}
          variant={isActive ? "destructive" : "default"}
          className="h-7 px-3"
        >
          {isActive ? 'Stop' : 'Share'}
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-2 text-red-600 text-sm">
          <div className="font-medium mb-1">Screen Share Error</div>
          {error}
          <Button size="sm" variant="outline" onClick={onToggle} className="mt-2 h-6 px-2">
            Retry
          </Button>
        </div>
      )}

      {/* Screen Preview */}
      {isActive && !error && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground font-medium">
            Screen Preview
          </div>
          <div className={cn(
            "relative bg-black overflow-hidden aspect-video rounded-lg",
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
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <VideoOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <div className="text-xs">Screen share initializing...</div>
                </div>
              </div>
            )}
            
            {/* Overlay indicator */}
            <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              REC
            </div>
          </div>
        </div>
      )}

      {/* Screen Share Info */}
      {isActive && !error && (
        <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2">
          <div className="flex items-center gap-2">
            <Monitor className="h-3 w-3" />
            <span>Your screen is being shared</span>
          </div>
          <p className="mt-1 text-xs">
            Other users can see your screen. Stop sharing when you're done.
          </p>
        </div>
      )}

      {/* Instructions when inactive */}
      {!isActive && !error && (
        <div className="text-xs text-muted-foreground bg-muted/30 rounded p-3">
          <div className="flex items-center gap-2 mb-2">
            <Monitor className="h-4 w-4" />
            <span className="font-medium">Ready to Share</span>
          </div>
          <p className="mb-2">
            Click "Share" to start sharing your screen. You can choose to share your entire screen, a specific window, or a browser tab.
          </p>
          <div className="space-y-1 text-xs">
            <p>💡 <strong>Privacy Tip:</strong> Make sure to close any sensitive windows before sharing.</p>
            <p>💡 You can stop sharing at any time by clicking "Stop".</p>
          </div>
        </div>
      )}

      {/* Quick Actions when active */}
      {isActive && !error && (
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onToggle}
            className="flex items-center gap-1 h-7 px-2"
          >
            <X className="h-3 w-3" />
            Stop Sharing
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="flex items-center gap-1 h-7 px-2"
            disabled
          >
            <Monitor className="h-3 w-3" />
            Pause
          </Button>
        </div>
      )}

      {/* Screen Share Options (placeholder) */}
      {!isActive && !error && (
        <div className="text-xs text-muted-foreground">
          <div className="font-medium mb-1">What you can share:</div>
          <ul className="space-y-1 ml-2">
            <li>• Entire desktop screen</li>
            <li>• Specific application window</li>
            <li>• Browser tab</li>
          </ul>
        </div>
      )}
    </div>
  );
}
