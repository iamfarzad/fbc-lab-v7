import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, Monitor, Mic, X } from 'lucide-react';
import { DESIGN_TOKENS } from '../tokens/design-tokens';
import { getMonochromeClass } from '@/lib/theme-utils';
import { ChatState, MediaState } from '../constants/chatConstants';

interface MediaControlsOverlayProps {
  chatState: ChatState;
  mediaState: MediaState;
  onToggleVoice: () => void;
  onToggleWebcam: () => void;
  onToggleScreenShare: () => void;
  onToggleTranscript: () => void;
  webcamStream?: MediaStream | null;
  screenStream?: MediaStream | null;
  isProcessing?: boolean;
}

export function MediaControlsOverlay({
  chatState,
  mediaState,
  onToggleVoice,
  onToggleWebcam,
  onToggleScreenShare,
  onToggleTranscript,
  webcamStream,
  screenStream,
  isProcessing = false
}: MediaControlsOverlayProps) {
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  // Set up video streams
  useEffect(() => {
    if (webcamVideoRef.current && webcamStream) {
      webcamVideoRef.current.srcObject = webcamStream;
    }
  }, [webcamStream]);

  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  // Minimized state: return null (handled by MinimizedChatBar)
  if (chatState === 'minimized') return null;

  return (
    <div className="fixed top-20 right-4 z-[110] flex flex-col gap-3">
      <AnimatePresence>
        {/* Webcam preview */}
        {mediaState.webcam && webcamStream && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
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
              <Badge variant="secondary" className="text-xs px-2 py-1">
                <Camera className="h-3 w-3 mr-1" />
                Webcam
              </Badge>
            </div>
          </motion.div>
        )}

        {/* Screen share preview */}
        {mediaState.screenShare && screenStream && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "relative w-48 h-36 rounded-lg overflow-hidden border-2 border-accent shadow-lg",
              DESIGN_TOKENS.corners.default,
              getMonochromeClass()
            )}
          >
            <video
              ref={screenVideoRef}
              autoPlay
              playsInline
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
              <Badge variant="secondary" className="text-xs px-2 py-1">
                <Monitor className="h-3 w-3 mr-1" />
                Screen
              </Badge>
            </div>
          </motion.div>
        )}

        {/* Voice indicator */}
        {mediaState.voice && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
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
