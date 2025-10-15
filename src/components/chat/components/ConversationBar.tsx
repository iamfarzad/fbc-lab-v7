"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { MonitorUp, Camera } from "lucide-react";
import { BarVisualizer, type AgentState } from "@/components/ui/bar-visualizer";
import { ChatInput, type ChatInputHandle } from "./ChatInput";
import { Popover, PopoverContent } from "@/components/ui/popover";

type ConversationBarProps = React.ComponentProps<typeof ChatInput> & {
  className?: string;
  visualizerState?: AgentState;
  micStream?: MediaStream | null;
};

export const ConversationBar = forwardRef<ChatInputHandle, ConversationBarProps>(
  function ConversationBar(props, ref) {
    const {
      isMinimized,
      isVoiceActive,
      isVoiceProcessing,
      voiceError,
      voicePartialTranscript,
      cameraState,
      isScreenSharing,
      onToggleCamera,
      onToggleScreenShare,
      className,
      ...rest
    } = props as ConversationBarProps & { onToggleCamera: () => void | Promise<void>; onToggleScreenShare: () => void | Promise<void> };

    if (isMinimized) return null;

    const showVoiceBar = Boolean(isVoiceActive || isVoiceProcessing);
    const [cameraPopoverOpen, setCameraPopoverOpen] = React.useState(false);
    const [screenPopoverOpen, setScreenPopoverOpen] = React.useState(false);
    const camVideoRef = React.useRef<HTMLVideoElement | null>(null);
    const screenVideoRef = React.useRef<HTMLVideoElement | null>(null);
    React.useEffect(() => {
      const el = camVideoRef.current;
      if (!el) return;
      if (props.cameraStream && cameraState) {
        el.srcObject = props.cameraStream as any;
        el.play().catch(() => undefined);
      } else {
        el.srcObject = null;
      }
    }, [props.cameraStream, cameraState]);
    React.useEffect(() => {
      const el = screenVideoRef.current;
      if (!el) return;
      if (props.screenShareStream && isScreenSharing) {
        el.srcObject = props.screenShareStream as any;
        el.play().catch(() => undefined);
      } else {
        el.srcObject = null;
      }
    }, [props.screenShareStream, isScreenSharing]);

    return (
      <div className={cn("w-full", className)}>
        {/* Unified status + waveform + media chips */}
        <div className="mx-auto w-full max-w-3xl px-4">
          {/* Status line */}
          {(isVoiceProcessing || isVoiceActive) && (
            <div className="mb-1 text-[11px] text-muted-foreground flex items-center gap-2" role="status" aria-live="polite" aria-atomic="true">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))] animate-pulse" />
              <span>{isVoiceProcessing ? 'Processing voice…' : 'Recording…'}</span>
            </div>
          )}

          {/* Voice waveform */}
          {showVoiceBar && (
            <div className="mb-2">
              <BarVisualizer
                state={props.visualizerState}
                mediaStream={props.micStream ?? undefined}
                demo={!props.micStream}
                barCount={24}
                minHeight={10}
                maxHeight={95}
                className="h-24 sm:h-28 md:h-32 w-full rounded-md border border-border/40 bg-muted/20"
              />
            </div>
          )}

          {/* Media chips */}
          <div className="flex items-center gap-2 mb-2">
            {/* Camera chip */}
            {cameraState && (
              <Popover open={cameraPopoverOpen} onOpenChange={setCameraPopoverOpen}>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/40 px-3 py-2.5 text-[11px] min-h-[44px]"
                  aria-pressed={true}
                  aria-label="Camera active. Click to preview or double-click to toggle"
                  onClick={() => setCameraPopoverOpen(!cameraPopoverOpen)}
                  onDoubleClick={() => onToggleCamera?.()}
                >
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <Camera className="h-3 w-3" />
                  <span>Camera</span>
                </button>
                <PopoverContent className="w-[180px] p-1">
                  <video ref={camVideoRef} muted playsInline className="w-full h-auto rounded-sm" />
                </PopoverContent>
              </Popover>
            )}

            {/* Screen share chip */}
            {isScreenSharing && (
              <Popover open={screenPopoverOpen} onOpenChange={setScreenPopoverOpen}>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/40 px-3 py-2.5 text-[11px] min-h-[44px]"
                  aria-pressed={true}
                  aria-label="Screen sharing active. Click to preview or double-click to toggle"
                  onClick={() => setScreenPopoverOpen(!screenPopoverOpen)}
                  onDoubleClick={() => onToggleScreenShare?.()}
                >
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <MonitorUp className="h-3 w-3" />
                  <span>Sharing</span>
                </button>
                <PopoverContent className="w-[200px] p-1">
                  <video ref={screenVideoRef} muted playsInline className="w-full h-auto rounded-sm" />
                </PopoverContent>
              </Popover>
            )}

            {/* Voice error */}
            {voiceError && (
              <span className="text-[11px] text-destructive/80" role="alert">{voiceError}</span>
            )}
          </div>
        </div>

        {/* Existing input, with status line suppressed (Conversation Bar owns it) */}
        <ChatInput ref={ref} {...(rest as any)} isMinimized={isMinimized} isVoiceActive={isVoiceActive!} isVoiceProcessing={isVoiceProcessing!} showStatusLine={false} cameraState={cameraState!} isScreenSharing={isScreenSharing!} onToggleCamera={onToggleCamera} onToggleScreenShare={onToggleScreenShare} voicePartialTranscript={voicePartialTranscript!} disableExpandedControls={true} />
      </div>
    );
  }
);
