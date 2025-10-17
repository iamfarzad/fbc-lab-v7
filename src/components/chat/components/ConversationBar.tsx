"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { MediaToggle } from '@/components/ui/media-toggle';
import { BarVisualizer, type AgentState } from "@/components/ui/bar-visualizer";
import { ChatInput, type ChatInputHandle } from "./ChatInput";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ConversationBarProps = React.ComponentProps<typeof ChatInput> & {
  className?: string;
  visualizerState?: AgentState;
  micStream?: MediaStream | null;
  aiSpeechTranscript?: string;
  onAnalyzeScreen?: (prompt: string) => void | Promise<void>;
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
      onAnalyzeScreen,
      availableCameras,
      ...rest
    } = props as ConversationBarProps & { onToggleCamera: () => void | Promise<void>; onToggleScreenShare: () => void | Promise<void> };

    // Hooks must be called before any early returns (Rules of Hooks)
    const showVoiceBar = Boolean(isVoiceActive || isVoiceProcessing);
    const [showInlineTranscript, setShowInlineTranscript] = React.useState(false);
    const [cameraPopoverOpen, setCameraPopoverOpen] = React.useState(false);
    const [screenPopoverOpen, setScreenPopoverOpen] = React.useState(false);
    const camVideoRef = React.useRef<HTMLVideoElement | null>(null);
    const screenVideoRef = React.useRef<HTMLVideoElement | null>(null);
    const [analyzeOpen, setAnalyzeOpen] = React.useState(false);
    const [analyzePrompt, setAnalyzePrompt] = React.useState("");
    const [analyzing, setAnalyzing] = React.useState(false);
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
                <div
                  className="mt-1 max-h-24 overflow-y-auto rounded-md border border-border/40 bg-muted/30 p-2 text-[12px]"
                  role="log" aria-live="polite" aria-atomic={false}
                >
                  {voicePartialTranscript && (
                    <div className="italic text-muted-foreground">{voicePartialTranscript}</div>
                  )}
                  {voiceTranscript && (
                    <div className="text-foreground whitespace-pre-line">{voiceTranscript}</div>
                  )}
                  {aiSpeechTranscript && (
                    <div className="text-blue-600 font-medium whitespace-pre-line">🤖 AI: {aiSpeechTranscript}</div>
                  )}
                  {!voiceTranscript && !voicePartialTranscript && !aiSpeechTranscript && (
                    <div className="text-muted-foreground">Start speaking to see your transcript…</div>
                  )}
                </div>
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

          {/* Media chips */}
          <div className="flex items-center gap-2 mb-2">
            {/* Camera chip */}
            {cameraState && (
              <Popover open={cameraPopoverOpen} onOpenChange={setCameraPopoverOpen}>
                <MediaToggle
                  type="camera"
                  variant="chip"
                  isActive={cameraState}
                  aria-label="Camera active. Click to preview or double-click to toggle"
                  onClick={() => setCameraPopoverOpen(!cameraPopoverOpen)}
                  onDoubleClick={() => onToggleCamera?.()}
                />
                <PopoverContent className="w-[200px] p-2 space-y-2">
                  <video ref={camVideoRef} muted playsInline className="w-full h-auto rounded-sm" />
                  {Boolean(availableCameras && availableCameras > 1) && (
                    <Button size="sm" variant="outline" onClick={() => { void onSwitchCamera?.(); }} className="w-full">
                      Switch Camera
                    </Button>
                  )}
                </PopoverContent>
              </Popover>
            )}

            {/* Screen share chip */}
            {isScreenSharing && (
              <Popover open={screenPopoverOpen} onOpenChange={setScreenPopoverOpen}>
                <MediaToggle
                  type="screen"
                  variant="chip"
                  isActive={isScreenSharing}
                  labelOverride="Sharing"
                  aria-label="Screen sharing active. Click to preview or double-click to toggle"
                  onClick={() => setScreenPopoverOpen(!screenPopoverOpen)}
                  onDoubleClick={() => onToggleScreenShare?.()}
                />
                <PopoverContent className="w-[200px] p-1">
                  <video ref={screenVideoRef} muted playsInline className="w-full h-auto rounded-sm" />
                </PopoverContent>
              </Popover>
            )}

            {/* Explicit screen analysis trigger */}
            {isScreenSharing && (
              <Popover open={analyzeOpen} onOpenChange={setAnalyzeOpen}>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/40 px-3 py-2.5 text-[11px] min-h-[44px]"
                  onClick={() => setAnalyzeOpen(v => !v)}
                  aria-label="Analyze current screen frame"
                >
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-500" />
                  <span>Analyze Screen</span>
                </button>
                <PopoverContent className="w-[300px] p-2 space-y-2">
                  <label htmlFor="analyze-prompt" className="text-[11px] text-muted-foreground">Prompt (optional)</label>
                  <Input
                    id="analyze-prompt"
                    value={analyzePrompt}
                    placeholder="e.g., What’s the main error?"
                    onChange={(e) => setAnalyzePrompt(e.target.value)}
                    disabled={analyzing}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (typeof onAnalyzeScreen === 'function') {
                          try {
                            setAnalyzing(true);
                            const maybe = onAnalyzeScreen(analyzePrompt.trim());
                            if (maybe && typeof maybe === 'object' && 'then' in maybe) {
                              maybe
                                .catch(() => undefined)
                                .finally(() => {
                                  setAnalyzing(false);
                                  setAnalyzeOpen(false);
                                  setAnalyzePrompt('');
                                });
                            } else {
                              setAnalyzing(false);
                              setAnalyzeOpen(false);
                              setAnalyzePrompt('');
                            }
                          } catch {
                            setAnalyzing(false);
                          }
                        }
                      }
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    {['Summarize this screen', 'What is the main error?', 'List key actions'].map((label) => (
                      <Button
                        key={label}
                        size="sm"
                        variant="outline"
                        disabled={analyzing}
                        onClick={() => {
                          setAnalyzePrompt(label);
                          if (typeof onAnalyzeScreen === 'function') {
                            try {
                              setAnalyzing(true);
                              const maybe = onAnalyzeScreen(label);
                              if (maybe && typeof (maybe as any).then === 'function') {
                                (maybe as Promise<void>)
                                  .catch(() => undefined)
                                  .finally(() => {
                                    setAnalyzing(false);
                                    setAnalyzeOpen(false);
                                    setAnalyzePrompt('');
                                  });
                              } else {
                                setAnalyzing(false);
                                setAnalyzeOpen(false);
                                setAnalyzePrompt('');
                              }
                            } catch {
                              setAnalyzing(false);
                            }
                          }
                        }}
                        className="text-[11px]"
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { if (!analyzing) setAnalyzeOpen(false); }} disabled={analyzing}>Cancel</Button>
                    <Button size="sm" onClick={() => {
                      if (typeof onAnalyzeScreen === 'function') {
                        try {
                          setAnalyzing(true);
                          const maybe = onAnalyzeScreen(analyzePrompt.trim());
                          if (maybe && typeof maybe === 'object' && 'then' in maybe) {
                            maybe
                              .catch(() => undefined)
                              .finally(() => {
                                setAnalyzing(false);
                                setAnalyzeOpen(false);
                                setAnalyzePrompt('');
                              });
                          } else {
                            setAnalyzing(false);
                            setAnalyzeOpen(false);
                            setAnalyzePrompt('');
                          }
                        } catch {
                          setAnalyzing(false);
                        }
                      }
                    }} disabled={analyzing}>{analyzing ? 'Analyzing…' : 'Analyze'}</Button>
                  </div>
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
