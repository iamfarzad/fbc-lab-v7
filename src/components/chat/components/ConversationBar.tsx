"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { BarVisualizer, type AgentState } from "@/components/ui/bar-visualizer";
import { ChatInput, type ChatInputHandle } from "./ChatInput";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TranscriptDisplay } from "./TranscriptDisplay";

type ConversationBarProps = React.ComponentProps<typeof ChatInput> & {
  className?: string;
  visualizerState?: AgentState;
  micStream?: MediaStream | null;
  aiSpeechTranscript?: string;
  onSwitchCamera?: () => void | Promise<void>;
  availableCameras?: number;
};

export const ConversationBar = forwardRef<ChatInputHandle, ConversationBarProps>(
  function ConversationBar(props, ref) {
    const {
      isMinimized,
      isVoiceActive,
      isVoiceProcessing,
      voiceError,
      voicePartialTranscript,
      voiceTranscript,
      aiSpeechTranscript,
      cameraState,
      isScreenSharing,
      onToggleCamera,
      onSwitchCamera,
      onToggleScreenShare,
      className,
      availableCameras,
      termsAccepted = true,
      onRequireTerms,
      ...rest
    } = props as ConversationBarProps & { onToggleCamera: () => void | Promise<void>; onToggleScreenShare: () => void | Promise<void> };

    // Hooks must be called before any early returns (Rules of Hooks)
    const showVoiceBar = Boolean(isVoiceActive || isVoiceProcessing);
    const [showInlineTranscript, setShowInlineTranscript] = React.useState(false);
    const [cameraPopoverOpen, setCameraPopoverOpen] = React.useState(false);
    const [screenPopoverOpen, setScreenPopoverOpen] = React.useState(false);
    const camVideoRef = React.useRef<HTMLVideoElement | null>(null);
    const screenVideoRef = React.useRef<HTMLVideoElement | null>(null);
    // Manual analyze disabled: auto-analysis is handled by useScreenShareSnapshots
    // Keep lightweight local state minimal for best performance
    const [previewOpen, setPreviewOpen] = React.useState(false);
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

    // Early return after all hooks
    if (isMinimized) return null;

    return (
      <div className={cn("w-full", className)}>
        {/* Unified status + waveform + media chips */}
        <div className="mx-auto w-full max-w-3xl px-4">
          {/* Enhanced status line with waveform */}
          {(isVoiceProcessing || isVoiceActive) && (
            <div className="mb-1 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-sm shadow-sm border-accent/30 bg-accent/10 text-accent transition-all duration-300 ease-out" role="status" aria-live="polite" aria-atomic="true">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              {showVoiceBar && (
                <div className="h-3 w-8">
                  <BarVisualizer
                    state={props.visualizerState}
                    barCount={8}
                    mediaStream={props.micStream}
                    minHeight={20}
                    maxHeight={100}
                    centerAlign={false}
                    className="h-full w-full"
                  />
                </div>
              )}
              <span className="text-[10px] font-medium">
                {isVoiceProcessing ? 'AI is thinking...' : 'Recording your voice'}
              </span>
            </div>
          )}

          {/* AI Speech Transcript Display */}
          {aiSpeechTranscript && (
            <div className="mb-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-sm shadow-sm border-primary/30 bg-primary/10 text-primary transition-all duration-300 ease-out" role="status" aria-live="polite" aria-atomic="true">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-medium">AI is speaking:</span>
              <span className="text-[10px] text-primary-foreground/80 max-w-xs truncate">
                {aiSpeechTranscript}
              </span>
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
              {/* Inline transcript toggle */}
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 hover:text-foreground"
                  onClick={() => setShowInlineTranscript(v => !v)}
                >
                  {showInlineTranscript ? (<ChevronUp className="h-3 w-3" />) : (<ChevronDown className="h-3 w-3" />)}
                  <span>Transcript</span>
                </button>
                {(isVoiceProcessing || isVoiceActive) && (
                  <span>{isVoiceProcessing ? 'Processing…' : 'Listening…'}</span>
                )}
              </div>

              {showInlineTranscript && (
                <TranscriptDisplay
                  transcript={voiceTranscript}
                  partialTranscript={voicePartialTranscript}
                  aiTranscript={aiSpeechTranscript}
                  variant="conversation"
                  className="mt-1"
                />
              )}
            </div>
          )}

          {/* Mini preview for screen share */}
          {isScreenSharing && props.screenThumbnail && (
            <div className="mb-2">
              <button type="button" onClick={() => setPreviewOpen(true)} aria-label="Open screen preview">
                <img
                  src={props.screenThumbnail}
                  alt="Screen preview"
                  className="w-32 h-20 object-cover rounded-md border border-border/40 shadow-sm hover:opacity-90"
                />
              </button>
              <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-[90vw] p-2">
                  <DialogHeader>
                    <DialogTitle>Screen Preview</DialogTitle>
                  </DialogHeader>
                  <img src={props.screenThumbnail} alt="Screen full preview" className="w-full h-auto rounded-md" />
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Media status chips */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {/* Camera chip */}
            {cameraState && (
              <Popover open={cameraPopoverOpen} onOpenChange={setCameraPopoverOpen}>
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border border-border/40 bg-muted/40 px-2.5 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-[11px] font-medium text-muted-foreground transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[hsl(var(--accent))]/40"
                  )}
                  aria-expanded={cameraPopoverOpen}
                  aria-controls="camera-preview-popover"
                  onClick={() => setCameraPopoverOpen((open) => !open)}
                >
                  <span className="inline-flex h-1.5 w-1.5 items-center justify-center rounded-full bg-emerald-500" />
                  <span>Camera on</span>
                </button>
                <PopoverContent
                  id="camera-preview-popover"
                  className="w-[200px] sm:w-[220px] p-2 space-y-2"
                >
                  <video
                    ref={camVideoRef}
                    muted
                    playsInline
                    className="w-full h-auto rounded-sm border border-border/30"
                  />
                  {Boolean(availableCameras && availableCameras >= 1) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void onSwitchCamera?.();
                      }}
                      className="w-full"
                    >
                      Flip camera
                    </Button>
                  )}
                </PopoverContent>
              </Popover>
            )}

            {/* Screen share chip */}
            {isScreenSharing && (
              <Popover open={screenPopoverOpen} onOpenChange={setScreenPopoverOpen}>
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border border-border/40 bg-muted/40 px-2.5 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-[11px] font-medium text-muted-foreground transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[hsl(var(--accent))]/40"
                  )}
                  aria-expanded={screenPopoverOpen}
                  aria-controls="screen-preview-popover"
                  onClick={() => setScreenPopoverOpen((open) => !open)}
                >
                  <span className="inline-flex h-1.5 w-1.5 items-center justify-center rounded-full bg-blue-500" />
                  <span>Sharing screen</span>
                </button>
                <PopoverContent
                  id="screen-preview-popover"
                  className="w-[200px] sm:w-[220px] p-1 space-y-2"
                >
                  <video
                    ref={screenVideoRef}
                    muted
                    playsInline
                    className="w-full h-auto rounded-sm border border-border/30"
                  />
                </PopoverContent>
              </Popover>
            )}

            {/* Manual screen analysis removed — analysis runs automatically while sharing */}

            {/* Voice error */}
            {voiceError && (
              <span className="text-[11px] text-destructive/80" role="alert">{voiceError}</span>
            )}
          </div>
        </div>

        {/* Existing input, with status line suppressed (Conversation Bar owns it) */}
        <ChatInput
          ref={ref}
          {...(rest as any)}
          termsAccepted={termsAccepted}
          onRequireTerms={onRequireTerms}
          isMinimized={isMinimized}
          isVoiceActive={isVoiceActive!}
          isVoiceProcessing={isVoiceProcessing!}
          showStatusLine={false}
          cameraState={cameraState!}
          isScreenSharing={isScreenSharing!}
          onToggleCamera={onToggleCamera}
          onToggleScreenShare={onToggleScreenShare}
          voicePartialTranscript={voicePartialTranscript!}
          disableExpandedControls={true}
        />
      </div>
    );
  }
);
