"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LiveWaveform } from "./live-waveform";
import { cn } from "@/lib/utils";
import { Mic, Check, X, Loader2 } from "lucide-react";

export type VoiceButtonState = "idle" | "recording" | "processing" | "success" | "error";

export interface VoiceButtonProps {
  label?: string;
  trailing?: string;
  state?: VoiceButtonState;
  onPress?: () => void;
  feedbackDuration?: number;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "ghost";
  className?: string;
  // Mode-based sizing
  isExpanded?: boolean;
  isMinimized?: boolean;
}

export function VoiceButton({
  label,
  trailing,
  state = "idle",
  onPress,
  feedbackDuration = 1500,
  size = "default",
  variant = "default",
  className,
  isExpanded = false,
  isMinimized = false,
}: VoiceButtonProps) {
  // Hooks must be called before any conditional returns
  const [internalState, setInternalState] = useState<VoiceButtonState>(state);

  // Sync with external state
  useEffect(() => {
    setInternalState(state);
  }, [state]);

  // Auto-transition from success/error back to idle
  useEffect(() => {
    if (internalState === "success" || internalState === "error") {
      const timer = setTimeout(() => {
        setInternalState("idle");
      }, feedbackDuration);
      return () => clearTimeout(timer);
    }
    return undefined
  }, [internalState, feedbackDuration]);

  // Don't render in minimized mode (conditional return after hooks)
  if (isMinimized) return null;

  const getIcon = () => {
    switch (internalState) {
      case "recording":
        return null; // Waveform will show
      case "processing":
        return <Loader2 className="size-4 animate-spin" />;
      case "success":
        return <Check className="size-4" />;
      case "error":
        return <X className="size-4" />;
      default:
        return <Mic className="size-4" />;
    }
  };

  const isIconOnly = !label && !trailing;
  
  // Dynamic sizing based on mode
  const buttonSize = isExpanded ? "h-10 w-10 min-h-[44px] min-w-[44px]" : "h-9 w-9 min-h-[44px] min-w-[44px]";
  const waveformHeight = isExpanded ? 16 : 14;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={onPress}
      className={cn(
        "relative transition-all duration-200",
        internalState === "recording" && "bg-primary/10",
        internalState === "processing" && "opacity-80",
        isIconOnly ? buttonSize : "px-4 gap-2",
        "[.monochrome_&]:rounded-none [.monochrome_&]:font-mono",
        className
      )}
      disabled={internalState === "processing"}
    >
      {internalState === "recording" ? (
        isIconOnly ? (
          <LiveWaveform
            active={true}
            height={waveformHeight}
            barWidth={2}
            barGap={1}
            mode="static"
            className="absolute inset-0"
          />
        ) : (
          <div className="flex items-center gap-2 min-w-[120px]">
            <LiveWaveform
              active={true}
              height={20}
              barWidth={2}
              barGap={1}
              mode="static"
              className="flex-1"
            />
          </div>
        )
      ) : (
        <>
          {getIcon()}
          {label && <span className="font-medium">{label}</span>}
          {trailing && (
            <span className="ml-auto text-xs text-muted-foreground opacity-60">
              {trailing}
            </span>
          )}
        </>
      )}
    </Button>
  );
}

