import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X, Monitor, MonitorOff, Mic, Camera } from "lucide-react";
import { getGradientForTheme, getMonochromeClass, getThemeAwareBackdrop } from "@/lib/theme-utils";
import { DESIGN_TOKENS } from "../tokens/design-tokens";
import { VoiceWaveform } from "./VoiceWaveform";

interface ScreenShareFullScreenProps {
  isOpen: boolean;
  onClose: () => void;
  isActive: boolean;
  stream?: MediaStream | null;
  error?: string;
  onToggle: () => void;
  // Additional media states
  isVoiceActive?: boolean;
  isWebcamActive?: boolean;
  onToggleVoice?: () => void;
  onToggleWebcam?: () => void;
  // Voice-related props
  isProcessing?: boolean;
  transcript?: string;
  partialTranscript?: string;
}

export function ScreenShareFullScreen({
  isOpen,
  onClose,
  isActive,
  stream,
  error,
  onToggle,
  isVoiceActive = false,
  isWebcamActive = false,
  onToggleVoice,
  onToggleWebcam,
  isProcessing = false,
  transcript,
  partialTranscript
}: ScreenShareFullScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Set up video stream
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Prevent body scroll when screen share mode is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          getGradientForTheme().camera,
          getMonochromeClass(),
          "fixed inset-0 z-[300] flex flex-col"
        )}
      >
        {/* Top Bar */}
        <div className={cn(
          "flex items-center justify-between p-4",
          DESIGN_TOKENS.safeArea.top,
          getThemeAwareBackdrop(),
          "bg-muted/50"
        )}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                "h-2 w-2",
                DESIGN_TOKENS.corners.full,
                DESIGN_TOKENS.animations.pulse,
                isActive ? "bg-green-500" : "bg-muted-foreground",
                getMonochromeClass()
              )} />
              <span className={cn(DESIGN_TOKENS.typography.body, "text-foreground font-medium")}>Screen Share</span>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className={cn(
              "h-10 w-10 p-0 text-foreground hover:bg-foreground/10",
              getMonochromeClass()
            )}
            aria-label="Close screen share"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Screen Preview */}
        <div className="flex-1 relative bg-background">
          {stream && isActive ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <MonitorOff className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">
                  {error || "Screen share not available"}
                </p>
              </div>
            </div>
          )}

          {/* Voice Waveform Overlay */}
          {isVoiceActive && (
            <div className="absolute top-4 left-4">
              <div className={cn(
                "flex items-center gap-2 bg-primary/90 text-primary-foreground px-3 py-2 rounded-lg",
                "backdrop-blur-sm border border-primary-foreground/20",
                DESIGN_TOKENS.corners.default,
                getMonochromeClass()
              )}>
                <VoiceWaveform isActive={isProcessing} />
                <span className={cn(DESIGN_TOKENS.typography.disclaimer, "font-medium")}>
                  {isProcessing ? "Processing..." : "Voice Active"}
                </span>
              </div>
            </div>
          )}

          {/* Webcam Preview Overlay */}
          {isWebcamActive && (
            <div className="absolute top-4 right-4">
              <div className={cn(
                "w-32 h-24 rounded-lg overflow-hidden border-2 border-primary shadow-lg",
                DESIGN_TOKENS.corners.default,
                getMonochromeClass()
              )}>
                <div className="w-full h-full bg-muted/50 flex items-center justify-center">
                  <Camera className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="absolute bottom-1 left-1">
                  <span className={cn(
                    "text-xs px-2 py-1 bg-primary text-primary-foreground rounded",
                    DESIGN_TOKENS.corners.sm
                  )}>
                    Webcam
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Transcript Display */}
          {(transcript || partialTranscript) && isVoiceActive && (
            <div className="absolute bottom-20 left-4 right-4">
              <div className={cn(
                getThemeAwareBackdrop(),
                "bg-muted/30 rounded-2xl p-4",
                DESIGN_TOKENS.borders.default,
                DESIGN_TOKENS.corners.lg,
                getMonochromeClass()
              )}>
                <p className="text-foreground/90 text-sm leading-relaxed">
                  {partialTranscript || transcript}
                </p>
                {partialTranscript && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 bg-muted-foreground/60",
                      DESIGN_TOKENS.corners.full,
                      DESIGN_TOKENS.animations.pulse,
                      getMonochromeClass()
                    )} />
                    <span className={cn(DESIGN_TOKENS.typography.disclaimer, "text-muted-foreground/60")}>Listening...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Annotation Tools (Future Enhancement) */}
          <div className="absolute bottom-4 left-4">
            <div className={cn(
              "flex items-center gap-2 bg-muted/80 text-foreground px-3 py-2 rounded-lg",
              "backdrop-blur-sm border border-border/30",
              DESIGN_TOKENS.corners.default,
              getMonochromeClass()
            )}>
              <span className={cn(DESIGN_TOKENS.typography.disclaimer, "text-muted-foreground")}>
                Annotation tools coming soon
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className={cn(
          "p-6",
          DESIGN_TOKENS.safeArea.bottom,
          getThemeAwareBackdrop(),
          "bg-muted/50"
        )}>
          <div className="flex items-center justify-center gap-6">
            {/* Voice Toggle */}
            {onToggleVoice && (
              <Button
                variant="ghost"
                size="lg"
                onClick={onToggleVoice}
                className={cn(
                  "h-16 w-16 transition-all duration-200",
                  DESIGN_TOKENS.corners.full,
                  isVoiceActive 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                    : "bg-muted/30 text-foreground hover:bg-muted/50",
                  getMonochromeClass()
                )}
                aria-label={`${isVoiceActive ? 'Stop' : 'Start'} voice`}
              >
                <Mic className="h-6 w-6" />
              </Button>
            )}

            {/* Main Screen Share Toggle */}
            <Button
              size="lg"
              onClick={onToggle}
              className={cn(
                "h-16 w-16 transition-all duration-200",
                DESIGN_TOKENS.corners.full,
                isActive
                  ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground",
                getMonochromeClass()
              )}
              aria-label={isActive ? 'Stop screen share' : 'Start screen share'}
            >
              {isActive ? (
                <MonitorOff className="h-6 w-6" />
              ) : (
                <Monitor className="h-6 w-6" />
              )}
            </Button>

            {/* Webcam Toggle */}
            {onToggleWebcam && (
              <Button
                variant="ghost"
                size="lg"
                onClick={onToggleWebcam}
                className={cn(
                  "h-16 w-16 transition-all duration-200",
                  DESIGN_TOKENS.corners.full,
                  isWebcamActive 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                    : "bg-muted/30 text-foreground hover:bg-muted/50",
                  getMonochromeClass()
                )}
                aria-label={`${isWebcamActive ? 'Stop' : 'Start'} webcam`}
              >
                <Camera className="h-6 w-6" />
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
