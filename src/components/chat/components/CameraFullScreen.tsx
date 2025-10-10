import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X, RotateCcw, Camera, CameraOff } from "lucide-react";
import { getGradientForTheme, getMonochromeClass, getThemeAwareBackdrop } from "@/lib/theme-utils";
import { DESIGN_TOKENS } from "../tokens/design-tokens";

interface CameraFullScreenProps {
  isOpen: boolean;
  onClose: () => void;
  isActive: boolean;
  stream?: MediaStream | null;
  error?: string;
  onToggle: () => void;
  onSwitchCamera?: () => void;
  availableDevices?: number;
  onCapture?: (blob: Blob) => void;
}

export function CameraFullScreen({
  isOpen,
  onClose,
  isActive,
  stream,
  error,
  onToggle,
  onSwitchCamera,
  availableDevices = 1,
  onCapture
}: CameraFullScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFacingUser, setIsFacingUser] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Set up video stream
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Prevent body scroll when camera mode is open
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

  // Track viewport to enable swipe-down close on mobile
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    const video = videoRef.current;
    if (!video) return;
    // Use video dimensions; fallback if not ready
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror for front camera so the saved photo matches preview
    if (isFacingUser) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      if (onCapture) {
        onCapture(blob);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        a.href = url;
        a.download = `camera-capture-${ts}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    }, 'image/png', 0.92);
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
        // Swipe-down to close on mobile
        drag={isMobile ? 'y' : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        dragSnapToOrigin
        onDragEnd={(_, info) => {
          if (info.offset.y > 80 || info.velocity.y > 500) {
            onClose();
          }
        }}
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
              <span className={cn(DESIGN_TOKENS.typography.body, "text-foreground font-medium")}>Camera</span>
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
            aria-label="Close camera"
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
        </div>

        {/* Bottom Controls */}
        <div className={cn(
          "p-6",
          DESIGN_TOKENS.safeArea.bottom,
          getThemeAwareBackdrop(),
          "bg-muted/50"
        )}>
          <div className="flex items-center justify-center gap-8">
            {/* Toggle Camera Button */}
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

            {/* Capture Button */}
            {isActive && (
              <Button
                size="lg"
                onClick={handleCapture}
                className={cn(
                  "h-20 w-20 bg-primary hover:bg-primary/90 text-primary-foreground border-4 border-border/20",
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
