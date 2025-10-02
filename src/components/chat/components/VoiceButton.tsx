"use client";

import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
// import { Spinner } from "@/components/ui/spinner";
import { useCallback } from "react";

// Custom Voice Icon with smooth animation
const VoiceIcon = ({
  size = 16,
  isRecording = false,
}: { size?: number; isRecording?: boolean }) => {
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
        {isRecording && (
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
        {isRecording && (
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
        {isRecording && (
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
        {isRecording && (
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
        {isRecording && (
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
  onTranscriptUpdate?: (transcript: string) => void;
}

export function VoiceButton({
  disabled = false,
  className,
  size = 16,
  onTranscriptUpdate,
}: VoiceButtonProps) {
  const {
    isRecording,
    isProcessing,
    transcript,
    partialTranscript,
    error: voiceError,
    startRecording,
    stopRecording,
  } = useVoiceRecording();

  const handleVoiceClick = useCallback(async () => {
    if (isRecording) {
      // Stop recording and get transcript
      try {
        const finalTranscript = await stopRecording();
        if (finalTranscript && onTranscriptUpdate) {
          onTranscriptUpdate(finalTranscript);
        }
      } catch (error) {
        console.error("Failed to stop recording:", error);
      }
    } else {
      // Start recording
      try {
        await startRecording();
      } catch (error) {
        console.error("Failed to start recording:", error);
      }
    }
  }, [
    isRecording,
    stopRecording,
    startRecording,
    onTranscriptUpdate,
  ]);

  // Show error state
  if (voiceError) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled
        className={cn("size-6 mr-2 opacity-50", className)}
        title={`Voice error: ${voiceError}`}
      >
        <div className="flex items-center justify-center">
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-red-500"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        </div>
      </Button>
    );
  }

  // Show processing state
  if (isProcessing) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled
        className={cn("size-6 mr-2 opacity-50", className)}
      >
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
        </div>
      </Button>
    );
  }


  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleVoiceClick}
      disabled={disabled}
      className={cn(
        "size-6 mr-2 transition-all duration-300 hover:bg-transparent text-muted-foreground",
        isRecording &&
          "text-red-500 hover:text-red-500 [&_svg]:text-red-500 [&_svg]:hover:text-red-500",
        disabled && "opacity-50",
        className,
      )}
      title={isRecording ? "Stop voice recording" : "Start voice recording"}
    >
      <VoiceIcon size={size} isRecording={isRecording} />
    </Button>
  );
}
