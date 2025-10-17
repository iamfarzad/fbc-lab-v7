import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MediaStatusBadge } from '@/components/ui/media-status-badge';
import { Mic, X } from 'lucide-react';
import { DESIGN_TOKENS } from '../design-tokens';
import { getMonochromeClass } from '@/lib/theme-utils';
import { ChatState, MediaState } from '../constants/chatConstants';
import { MEDIA_MOTION_VARIANTS } from '@/lib/animations';

interface MediaControlsOverlayProps {
  chatState: ChatState;
  mediaState: MediaState;
  onToggleVoice: () => void;
  onToggleWebcam: () => void;
  onToggleScreenShare: () => void;
  onToggleTranscript: () => void;
  webcamStream?: MediaStream | null;
  isProcessing?: boolean;
  screenThumbnail?: string | null;
}

export function MediaControlsOverlay({
  chatState,
  mediaState,
  onToggleVoice,
  onToggleWebcam,
  onToggleScreenShare,
  webcamStream,
  isProcessing = false,
  screenThumbnail
}: MediaControlsOverlayProps) {
  const webcamVideoRef = useRef<HTMLVideoElement>(null);

  // Set up webcam video stream
  useEffect(() => {
    if (webcamVideoRef.current && webcamStream) {
      webcamVideoRef.current.srcObject = webcamStream;
    }
  }, [webcamStream]);

  // Minimized state: return null (handled by MinimizedChatBar)
  if (chatState === 'minimized') return null;

  return (
    <div className="fixed top-20 right-4 z-[110] flex flex-col gap-3">
      <AnimatePresence>
        {/* Webcam preview */}
        {mediaState.webcam && webcamStream && (
          <motion.div
            {...MEDIA_MOTION_VARIANTS.slideInRight}
            className={cn(
              "relative w-48 h-36 rounded-lg overflow-hidden border-2 border-primary shadow-lg",
              DESIGN_TOKENS.corners.default,
              getMonochromeClass()
            )}
          >
            <video
              ref={webcamVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }} // Mirror for user-facing camera
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleWebcam}
              className={cn(
                "absolute top-2 right-2 h-6 w-6 p-0 rounded-full",
                "bg-destructive/90 text-destructive-foreground hover:bg-destructive",
                "border border-destructive-foreground/20",
                DESIGN_TOKENS.corners.full,
                getMonochromeClass()
              )}
              aria-label="Stop webcam"
            >
              <X className="h-3 w-3" />
            </Button>
            <div className="absolute bottom-2 left-2">
              <MediaStatusBadge
                type="camera"
                variant="secondary"
                className="px-2 py-1"
              />
            </div>
          </motion.div>
        )}

        {/* Screen share preview */}
        {mediaState.screenShare && screenThumbnail && (
          <motion.div
            {...MEDIA_MOTION_VARIANTS.slideInRight}
            className={cn(
              "relative w-48 h-36 rounded-lg overflow-hidden border-2 border-accent shadow-lg",
              DESIGN_TOKENS.corners.default,
              getMonochromeClass()
            )}
          >
            <img
              src={screenThumbnail}
              alt="Screen share preview"
              className="w-full h-full object-cover"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleScreenShare}
              className={cn(
                "absolute top-2 right-2 h-6 w-6 p-0 rounded-full",
                "bg-destructive/90 text-destructive-foreground hover:bg-destructive",
                "border border-destructive-foreground/20",
                DESIGN_TOKENS.corners.full,
                getMonochromeClass()
              )}
              aria-label="Stop screen share"
            >
              <X className="h-3 w-3" />
            </Button>
            <div className="absolute bottom-2 left-2">
              <MediaStatusBadge
                type="screen"
                variant="secondary"
                className="px-2 py-1"
              />
            </div>
          </motion.div>
        )}

        {/* Voice indicator */}
        {mediaState.voice && (
          <motion.div
            {...MEDIA_MOTION_VARIANTS.slideInRight}
            className={cn(
              "flex items-center gap-3 bg-primary/90 text-primary-foreground px-4 py-3 rounded-lg shadow-lg",
              "backdrop-blur-sm border border-primary-foreground/20",
              DESIGN_TOKENS.corners.default,
              getMonochromeClass()
            )}
          >
            <div className="flex items-center gap-2">
              <Mic className={cn(
                "h-4 w-4",
                isProcessing ? "animate-pulse" : ""
              )} />
              <span className={cn(DESIGN_TOKENS.typography.body, "font-medium")}>
                {isProcessing ? "Processing..." : "Voice Active"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleVoice}
              className={cn(
                "h-6 w-6 p-0 rounded-full",
                "hover:bg-primary-foreground/20",
                DESIGN_TOKENS.corners.full,
                getMonochromeClass()
              )}
              aria-label="Stop voice"
            >
              <X className="h-3 w-3" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
