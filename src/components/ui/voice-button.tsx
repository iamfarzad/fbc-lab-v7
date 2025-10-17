"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { LiveWaveform } from "./live-waveform";
import { cn } from "@/lib/utils";
import { Mic, Check, X, Loader2, MicOff } from "lucide-react";

export type VoiceButtonState =
  | "idle"
  | "recording"
  | "processing"
  | "success"
  | "error";

const VoiceIcon = ({
  size = 16,
  isActive = false,
  isProcessing = false,
}: {
  size?: number;
  isActive?: boolean;
  isProcessing?: boolean;
}) => {
  const animate = isActive || isProcessing;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="3" y="10" width="2" height="4" fill="currentColor">
        {animate && (
          <>
            <animate
              attributeName="height"
              values="4;2;6;3;8;1;5;2;7;4"
              dur="2.4s"
              repeatCount="indefinite"
              begin="0s"
            />
            <animate
              attributeName="y"
              values="10;11;7;10.5;6;11.5;8.5;11;6.5;10"
              dur="2.4s"
              repeatCount="indefinite"
              begin="0s"
            />
          </>
        )}
      </rect>
      <rect x="7" y="6" width="2" height="12" fill="currentColor">
        {animate && (
          <>
            <animate
              attributeName="height"
              values="12;8;16;10;18;6;14;9;15;12"
              dur="2.7s"
              repeatCount="indefinite"
              begin="0.45s"
            />
            <animate
              attributeName="y"
              values="6;8;2;7;1;9;5;7.5;4.5;6"
              dur="2.7s"
              repeatCount="indefinite"
              begin="0.45s"
            />
          </>
        )}
      </rect>
      <rect x="11" y="2" width="2" height="20" fill="currentColor">
        {animate && (
          <>
            <animate
              attributeName="height"
              values="20;14;22;16;24;12;18;15;21;20"
              dur="2.1s"
              repeatCount="indefinite"
              begin="0.9s"
            />
            <animate
              attributeName="y"
              values="2;5;1;4;0;6;3;4.5;1.5;2"
              dur="2.1s"
              repeatCount="indefinite"
              begin="0.9s"
            />
          </>
        )}
      </rect>
      <rect x="15" y="6" width="2" height="12" fill="currentColor">
        {animate && (
          <>
            <animate
              attributeName="height"
              values="12;16;8;14;10;18;6;13;9;12"
              dur="3.3s"
              repeatCount="indefinite"
              begin="1.35s"
            />
            <animate
              attributeName="y"
              values="6;2;8;5;7;1;9;5.5;7.5;6"
              dur="3.3s"
              repeatCount="indefinite"
              begin="1.35s"
            />
          </>
        )}
      </rect>
      <rect x="19" y="10" width="2" height="4" fill="currentColor">
        {animate && (
          <>
            <animate
              attributeName="height"
              values="4;6;2;7;3;8;1;5;3;4"
              dur="3s"
              repeatCount="indefinite"
              begin="1.8s"
            />
            <animate
              attributeName="y"
              values="10;7;11;6.5;10.5;6;11.5;8.5;10.5;10"
              dur="3s"
              repeatCount="indefinite"
              begin="1.8s"
            />
          </>
        )}
      </rect>
    </svg>
  );
};

export interface VoiceButtonProps {
  label?: string;
  trailing?: string;
  state?: VoiceButtonState;
  onPress?: () => void;
  onToggle?: () => void;
  feedbackDuration?: number;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "ghost";
  className?: string;
  // Mode-based sizing
  isExpanded?: boolean;
  isMinimized?: boolean;
  disabled?: boolean;
  error?: string | null;
  animationStyle?: "waveform" | "svg";
  svgIconSize?: number;
  title?: string;
}

export function VoiceButton({
  label,
  trailing,
  state = "idle",
  onPress,
  onToggle,
  feedbackDuration = 1500,
  size = "default",
  variant = "default",
  className,
  isExpanded = false,
  isMinimized = false,
  disabled = false,
  error = null,
  animationStyle = "waveform",
  svgIconSize = 16,
  title,
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

  // Compute derived state (must be before conditional return)
  const hasError = internalState === "error" || Boolean(error);
  const isProcessingState = internalState === "processing";
  const isDisabled = disabled || hasError || isProcessingState;

  const computedTitle = useMemo(() => {
    if (title) return title;
    if (hasError && error) return `Voice error: ${error}`;
    if (hasError) return "Voice error";
    if (disabled) {
      return "Voice capture is not supported in this browser yet.";
    }
    if (isProcessingState) return "Processing voice input";
    return internalState === "recording"
      ? "Stop voice session"
      : "Start voice session";
  }, [title, hasError, error, disabled, isProcessingState, internalState]);

  // Don't render in minimized mode (conditional return after hooks)
  if (isMinimized) return null;

  const isIconOnly = !label && !trailing;
  const shouldShowWaveform =
    animationStyle === "waveform" && internalState === "recording";
  const waveformHeight = isExpanded ? 16 : 14;
  const buttonSize = isExpanded
    ? "h-10 w-10 min-h-[44px] min-w-[44px]"
    : "h-9 w-9 min-h-[44px] min-w-[44px]";

  const handleClick = () => {
    if (isDisabled) return;
    onPress?.();
    onToggle?.();
  };

  const getIcon = () => {
    if (animationStyle === "svg") {
      if (hasError) return <X className="size-4" />;
      if (disabled) return <MicOff className="size-4" />;
      if (internalState === "success") return <Check className="size-4" />;
      if (internalState === "recording" || isProcessingState) {
        return (
          <VoiceIcon
            size={svgIconSize}
            isActive={internalState === "recording"}
            isProcessing={isProcessingState}
          />
        );
      }
      return <Mic className="size-4" />;
    }

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
        if (disabled) return <MicOff className="size-4" />;
        return <Mic className="size-4" />;
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={cn(
        "relative transition-all duration-200",
        internalState === "recording" && "bg-primary/10",
        internalState === "processing" && "opacity-80",
        hasError && "border border-destructive/40 text-destructive",
        isIconOnly ? buttonSize : "px-4 gap-2",
        "[.monochrome_&]:rounded-none [.monochrome_&]:font-mono",
        isDisabled && "cursor-not-allowed opacity-70",
        className
      )}
      disabled={isDisabled}
      title={computedTitle}
    >
      {shouldShowWaveform ? (
        isIconOnly ? (
          <LiveWaveform
            active
            height={waveformHeight}
            barWidth={2}
            barGap={1}
            mode="static"
            className="absolute inset-0"
          />
        ) : (
          <div className="flex items-center gap-2 min-w-[120px]">
            <LiveWaveform
              active
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
