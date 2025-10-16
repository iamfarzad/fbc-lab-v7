import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, Monitor, Mic, Expand, MessageCircle } from 'lucide-react';
import { DESIGN_TOKENS } from '../design-tokens';
import { getMonochromeClass } from '@/lib/theme-utils';

interface MinimizedChatBarProps {
  isVoiceActive: boolean;
  isWebcamActive: boolean;
  isScreenSharing: boolean;
  onExpand: () => void;
  onToggleVoice: () => void;
  onToggleWebcam: () => void;
  onToggleScreenShare: () => void;
  isConnected?: boolean;
  isProcessing?: boolean;
  transcript?: string;
  partialTranscript?: string;
}

export function MinimizedChatBar({
  isVoiceActive,
  isWebcamActive,
  isScreenSharing,
  onExpand,
  onToggleVoice,
  onToggleWebcam,
  onToggleScreenShare,
  isConnected = false,
  isProcessing = false,
  transcript,
  partialTranscript
}: MinimizedChatBarProps) {
  const currentTranscript = partialTranscript || transcript;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        "relative w-[400px] h-[160px] rounded-2xl border border-border/40 shadow-2xl overflow-hidden",
        "bg-card/95 backdrop-blur-sm",
        DESIGN_TOKENS.corners.lg,
        getMonochromeClass()
      )}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-background" />
      
      {/* Media indicators overlay */}
      <div className="absolute top-3 right-3 flex gap-1.5 z-10">
        {isVoiceActive && (
          <Badge 
            variant="default" 
            className={cn(
              "h-6 px-2 text-xs font-medium",
              isProcessing ? "animate-pulse" : "",
              getMonochromeClass()
            )}
          >
            <Mic className="h-3 w-3 mr-1" />
            Voice
          </Badge>
        )}
        {isWebcamActive && (
          <Badge 
            variant="default" 
            className={cn("h-6 px-2 text-xs font-medium", getMonochromeClass())}
          >
            <Camera className="h-3 w-3 mr-1" />
            Cam
          </Badge>
        )}
        {isScreenSharing && (
          <Badge 
            variant="default" 
            className={cn("h-6 px-2 text-xs font-medium", getMonochromeClass())}
          >
            <Monitor className="h-3 w-3 mr-1" />
            Screen
          </Badge>
        )}
      </div>

      {/* Expand button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onExpand}
        className={cn(
          "absolute left-3 top-3 h-8 w-8 p-0 rounded-full",
          "bg-accent/20 text-accent-foreground hover:bg-accent/30",
          "border border-accent/30",
          DESIGN_TOKENS.corners.full,
          getMonochromeClass()
        )}
        aria-label="Expand chat"
      >
        <Expand className="h-4 w-4" />
      </Button>

      {/* Main content area */}
      <div className="flex flex-col h-full pt-12 pb-4 px-4">
        {/* Status and transcript */}
        <div className="flex-1 flex flex-col justify-center">
          {currentTranscript ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <span className={cn(DESIGN_TOKENS.typography.disclaimer, "text-muted-foreground")}>
                  {isProcessing ? "Processing..." : "Listening..."}
                </span>
              </div>
              <p className={cn(
                DESIGN_TOKENS.typography.body,
                "text-foreground/90 leading-relaxed line-clamp-2"
              )}>
                {currentTranscript}
              </p>
            </div>
          ) : (
            <div className="text-center">
              <MessageCircle className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className={cn(DESIGN_TOKENS.typography.disclaimer, "text-muted-foreground")}>
                {isConnected ? "Chat minimized" : "Click to expand"}
              </p>
            </div>
          )}
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleVoice}
            className={cn(
              "h-8 px-3 rounded-full",
              isVoiceActive 
                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                : "bg-muted/50 text-muted-foreground hover:bg-muted/70",
              DESIGN_TOKENS.corners.full,
              getMonochromeClass()
            )}
          >
            <Mic className="h-3 w-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleWebcam}
            className={cn(
              "h-8 px-3 rounded-full",
              isWebcamActive 
                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                : "bg-muted/50 text-muted-foreground hover:bg-muted/70",
              DESIGN_TOKENS.corners.full,
              getMonochromeClass()
            )}
          >
            <Camera className="h-3 w-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleScreenShare}
            className={cn(
              "h-8 px-3 rounded-full",
              isScreenSharing 
                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                : "bg-muted/50 text-muted-foreground hover:bg-muted/70",
              DESIGN_TOKENS.corners.full,
              getMonochromeClass()
            )}
          >
            <Monitor className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Connection indicator */}
      <div className="absolute bottom-2 right-2">
        <div className={cn(
          "w-2 h-2 rounded-full",
          isConnected ? "bg-green-500" : "bg-muted-foreground/50",
          DESIGN_TOKENS.corners.full
        )} />
      </div>
    </motion.div>
  );
}
