import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X, RotateCcw, Camera, CameraOff, Mic, Monitor } from "lucide-react";
import { getGradientForTheme, getMonochromeClass, getThemeAwareBackdrop } from "@/lib/theme-utils";
import { DESIGN_TOKENS } from "../tokens/design-tokens";
import { VoiceWaveform } from "./VoiceWaveform";

interface WebcamFullScreenProps {
  isOpen: boolean;
  onClose: () => void;
  isActive: boolean;
  stream?: MediaStream | null;
  error?: string;
  onToggle: () => void;
  onSwitchCamera?: () => void;
  availableDevices?: number;
  // Additional media states
  isVoiceActive?: boolean;
  isScreenSharing?: boolean;
  onToggleVoice?: () => void;
  onToggleScreenShare?: () => void;
  // Voice-related props
  isProcessing?: boolean;
  transcript?: string;
  partialTranscript?: string;
}

export function WebcamFullScreen({
  isOpen,
  onClose,
  isActive,
  stream,
  error,
  onToggle,
  onSwitchCamera,
  availableDevices = 1,
  isVoiceActive = false,
  isScreenSharing = false,
  onToggleVoice,
  onToggleScreenShare,
  isProcessing = false,
  transcript,
  partialTranscript
}: WebcamFullScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFacingUser, setIsFacingUser] = useState(true);

  // Set up video stream
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Prevent body scroll when webcam mode is open
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

  const handleSwitchCamera = () => {
    setIsFacingUser(!isFacingUser);
    onSwitchCamera?.();
  };

  const handleCapture = () => {
    // Capture functionality would go here
    console.log('Capturing photo...');
  };

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
              <span className={cn(DESIGN_TOKENS.typography.body, "text-foreground font-medium")}>Webcam</span>
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
            aria-label="Close webcam"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Camera Preview */}
        <div className="flex-1 relative bg-background">
          {stream && isActive ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{
                transform: isFacingUser ? 'scaleX(-1)' : 'scaleX(1)'
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <CameraOff className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">
                  {error || "Camera not available"}
                </p>
              </div>
            </div>
          )}

          {/* Camera Switch Button */}
          {availableDevices > 1 && isActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSwitchCamera}
              className={cn(
                "absolute top-4 right-4 h-12 w-12 p-0 text-foreground hover:bg-foreground/10",
                DESIGN_TOKENS.corners.full,
                getMonochromeClass()
              )}
              aria-label="Switch camera"
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
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

          {/* Screen Share Indicator */}
          {isScreenSharing && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
              <div className={cn(
                "flex items-center gap-2 bg-accent/90 text-accent-foreground px-3 py-2 rounded-lg",
                "backdrop-blur-sm border border-accent-foreground/20",
                DESIGN_TOKENS.corners.default,
                getMonochromeClass()
              )}>
                <Monitor className="h-4 w-4" />
                <span className={cn(DESIGN_TOKENS.typography.disclaimer, "font-medium")}>Screen Sharing</span>
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

            {/* Main Camera Toggle */}
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
              aria-label={isActive ? 'Stop camera' : 'Start camera'}
            >
              {isActive ? (
                <CameraOff className="h-6 w-6" />
              ) : (
                <Camera className="h-6 w-6" />
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

            {/* Capture Button */}
            {isActive && (
              <Button
                size="lg"
                onClick={handleCapture}
                className={cn(
                  "h-20 w-20 bg-accent hover:bg-accent/90 text-accent-foreground border-4 border-border/20",
                  DESIGN_TOKENS.corners.full,
                  getMonochromeClass()
                )}
                aria-label="Capture photo"
              >
                <Camera className="h-8 w-8" />
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
