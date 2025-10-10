import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X, Mic, MicOff, Camera, Monitor, Eye, EyeOff } from "lucide-react";
import { getGradientForTheme, getMonochromeClass, getThemeAwareBackdrop } from "@/lib/theme-utils";
import { DESIGN_TOKENS } from "../tokens/design-tokens";
import { VoiceWaveform } from "./VoiceWaveform";

interface VoiceLiveModeProps {
  isOpen: boolean;
  onClose: () => void;
  isActive: boolean;
  isProcessing: boolean;
  transcript: string;
  partialTranscript: string;
  error: string | null;
  onToggle: () => void;
  onToggleCamera?: () => void;
  onToggleScreenShare?: () => void;
  isCameraActive?: boolean;
  isScreenSharing?: boolean;
}

export function VoiceLiveMode({
  isOpen,
  onClose,
  isActive,
  isProcessing,
  transcript,
  partialTranscript,
  error,
  onToggle,
  onToggleCamera,
  onToggleScreenShare,
  isCameraActive = false,
  isScreenSharing = false
}: VoiceLiveModeProps) {
  const [waveformBars] = useState([1, 2, 3, 4, 5]);
  
  // Transcript toggle with responsive behavior
  const [showTranscript, setShowTranscript] = useState(() => {
    // Auto-show on desktop (>=768px), auto-hide on mobile
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });

  // Listen for resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && !showTranscript) {
        setShowTranscript(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showTranscript]);

  // Prevent body scroll when voice mode is open
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
          getGradientForTheme().voice,
          getMonochromeClass(),
          "fixed inset-0 z-[300] flex flex-col"
        )}
      >
        {/* Top Bar */}
        <div className={cn("flex items-center justify-between p-4", DESIGN_TOKENS.safeArea.top)}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-foreground text-sm font-medium">Live</span>
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
            aria-label="Close voice mode"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          {/* Voice Visualizer */}
          <div className="mb-8 flex items-center justify-center gap-2">
            <VoiceWaveform isActive={isActive} />
          </div>

          {/* Status Text */}
          <div className="text-center mb-8">
            <h2 className={cn(DESIGN_TOKENS.typography.display, "text-foreground mb-2")}>
              {isActive ? "Listening..." : isProcessing ? "Processing..." : "Voice Mode"}
            </h2>
            <p className={cn(DESIGN_TOKENS.typography.body, "text-muted-foreground")}>
              {isActive ? "Speak now" : isProcessing ? "Converting your speech..." : "Tap to start"}
            </p>
          </div>

          {/* Toggle button */}
          {(transcript || partialTranscript) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTranscript(!showTranscript)}
              className={cn(
                "mb-4 px-4 py-2 rounded-full",
                "bg-muted/20 text-foreground hover:bg-muted/30",
                "border border-border/30",
                DESIGN_TOKENS.corners.full,
                getMonochromeClass()
              )}
            >
              {showTranscript ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              <span className={cn(DESIGN_TOKENS.typography.body)}>
                {showTranscript ? 'Hide' : 'Show'} Transcript
              </span>
            </Button>
          )}

          {/* Transcript - collapsible */}
          {showTranscript && (transcript || partialTranscript) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-2xl mb-8"
            >
              <div className={cn(
                getThemeAwareBackdrop(),
                "bg-muted/30 rounded-2xl p-6",
                DESIGN_TOKENS.borders.default,
                DESIGN_TOKENS.corners.lg,
                getMonochromeClass()
              )}>
                <p className="text-foreground/90 text-lg leading-relaxed">
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
            </motion.div>
          )}

          {/* Error Display */}
          {error && (
            <div className="w-full max-w-2xl mb-8">
              <div className={cn(
                "bg-destructive/20 backdrop-blur-sm p-6",
                DESIGN_TOKENS.corners.lg,
                DESIGN_TOKENS.borders.default,
                "border-destructive/30",
                getMonochromeClass()
              )}>
                <p className={cn(DESIGN_TOKENS.typography.body, "text-destructive-foreground")}>{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Controls */}
        <div className={cn("p-6", DESIGN_TOKENS.safeArea.bottom)}>
          <div className="flex items-center justify-center gap-6">
            {/* Camera Toggle */}
            {onToggleCamera && (
              <Button
                variant="ghost"
                size="lg"
                onClick={onToggleCamera}
                className={cn(
                  "h-16 w-16 transition-all duration-200",
                  DESIGN_TOKENS.corners.full,
                  isCameraActive 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                    : "bg-muted/30 text-foreground hover:bg-muted/50",
                  getMonochromeClass()
                )}
                aria-label={`${isCameraActive ? 'Stop' : 'Start'} camera`}
              >
                <Camera className="h-6 w-6" />
              </Button>
            )}

            {/* Main Voice Toggle */}
            <Button
              size="lg"
              onClick={onToggle}
              className={cn(
                "h-20 w-20 transition-all duration-200",
                DESIGN_TOKENS.corners.full,
                isActive || isProcessing
                  ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground",
                getMonochromeClass()
              )}
              aria-label={isActive ? 'Stop recording' : 'Start recording'}
            >
              {isActive || isProcessing ? (
                <MicOff className="h-8 w-8" />
              ) : (
                <Mic className="h-8 w-8" />
              )}
            </Button>

            {/* Screen Share Toggle */}
            {onToggleScreenShare && (
              <Button
                variant="ghost"
                size="lg"
                onClick={onToggleScreenShare}
                className={cn(
                  "h-16 w-16 transition-all duration-200",
                  DESIGN_TOKENS.corners.full,
                  isScreenSharing 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                    : "bg-muted/30 text-foreground hover:bg-muted/50",
                  getMonochromeClass()
                )}
                aria-label={`${isScreenSharing ? 'Stop' : 'Start'} screen sharing`}
              >
                <Monitor className="h-6 w-6" />
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
