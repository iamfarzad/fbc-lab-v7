"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MicOff, Mic } from "lucide-react";
import { useMemo } from "react";

// Custom Voice Icon with smooth animation
const VoiceIcon = ({
  size = 16,
  isActive = false,
  isProcessing = false,
}: { size?: number; isActive?: boolean; isProcessing?: boolean }) => {
  const animate = isActive || isProcessing;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Animated voice waveform icon */}
      {/* Bar 1 (leftmost, shortest) */}
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

      {/* Bar 2 (second from left) */}
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

      {/* Bar 3 (center, tallest) */}
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

      {/* Bar 4 (second from right) */}
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

      {/* Bar 5 (rightmost) */}
      <rect x="19" y="10" width="2" height="4" fill="currentColor">
        {animate && (
          <>
            <animate
              attributeName="height"
              values="4;6;2;7;3;8;1;5;3;4"
              dur="3.0s"
              repeatCount="indefinite"
              begin="1.8s"
            />
            <animate
              attributeName="y"
              values="10;7;11;6.5;10.5;6;11.5;8.5;10.5;10"
              dur="3.0s"
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
  disabled?: boolean;
  className?: string;
  size?: number;
  isActive?: boolean;
  isProcessing?: boolean;
  isMuted?: boolean;
  error?: string | null;
  onToggle?: () => void | Promise<void>;
}

export function VoiceButton({
  disabled = false,
  className,
  size = 16,
  isActive = false,
  isProcessing = false,
  isMuted = false,
  error,
  onToggle,
}: VoiceButtonProps) {
  const hasError = Boolean(error);

  const title = useMemo(() => {
    if (hasError) return `Voice error: ${error}`;
    if (disabled) return 'Voice capture is not supported in this browser yet.';
    if (!isActive) return 'Start voice session';
    return isMuted ? 'Unmute microphone' : 'Mute microphone';
  }, [disabled, error, hasError, isActive, isMuted]);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => { if (!disabled && !hasError) { void onToggle?.(); } }}
      disabled={disabled || hasError}
      className={cn(
        "size-6 mr-2 transition-all duration-300 hover:bg-transparent text-muted-foreground",
        isActive && !isMuted && "text-[hsl(var(--foreground))] bg-[hsl(var(--background))]",
        isActive && isMuted && "text-[hsl(var(--foreground))]/70 bg-[hsl(var(--background))]/30",
        disabled && "opacity-50",
        hasError && "text-red-500",
        className,
      )}
      title={title}
    >
      {disabled ? (
        <MicOff className="h-3 w-3" aria-hidden="true" />
      ) : !isActive ? (
        <Mic className="h-3 w-3" aria-hidden="true" />
      ) : isMuted ? (
        <MicOff className="h-3 w-3" aria-hidden="true" />
      ) : (
        <VoiceIcon size={size} isActive={true} isProcessing={isProcessing} />
      )}
    </Button>
  );
}
