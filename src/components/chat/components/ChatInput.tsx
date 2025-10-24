import { useState, useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  PromptInputSubmit,
  PromptInputAttachment,
  PromptInputAttachments,
  type PromptInputFile
} from "@/components/ai-elements/interactive/prompt-input";
import { toast } from "sonner";
import { VISUAL } from "../design-tokens";
import { Download } from "lucide-react";
import { VoiceButton } from "@/components/ui/voice-button";
import { Button } from "@/components/ui/button";
import { VoiceFullScreen } from "./voice/VoiceFullScreen";
import { CameraFullScreen } from "./camera/CameraFullScreen";
import { ScreenFullScreen } from "./screen/ScreenFullScreen";
import { PermissionExplanationDialog } from "./PermissionExplanationDialog";
import { usePromptInputAttachments } from "@/components/ai-elements/interactive/prompt-input";
import { useMediaToggle } from "@/hooks/useMediaToggle";
import { useMediaKeyboardShortcuts } from "@/hooks/useMediaKeyboardShortcuts";
// MediaDrawer and MediaPanel removed
import { ChatActions } from "./ChatActions";

export type SendMessageInput = string | {
  text?: string;
  attachments?: PromptInputFile[];
};

interface ChatInputProps {
  inputValue: string;
  isLoading: boolean;
  isListening: boolean;
  voiceTranscript: string;
  voicePartialTranscript: string;
  voiceError: string | null;
  isVoiceActive: boolean;
  isVoiceProcessing: boolean;
  isVoiceSupported: boolean;
  isVoiceInitializing?: boolean;
  cameraState: boolean;
  isCameraInitializing?: boolean;
  isScreenSharing: boolean;
  isScreenShareInitializing?: boolean;
  cameraStream?: MediaStream | null;
  screenShareStream?: MediaStream | null;
  screenThumbnail?: string | null;
  cameraError?: string;
  screenShareError?: string;
  availableCameras?: number;
  onInputChange: (value: string) => void;
  onSendMessage: (message: SendMessageInput) => Promise<void> | void;
  onToggleVoice: () => void | Promise<void>;
  onToggleCamera: () => void | Promise<void>;
  onToggleScreenShare: () => void | Promise<void>;
  onSwitchCamera?: () => void | Promise<void>;
  onToggleSettings: () => void | Promise<void>;
  isExpanded?: boolean;
  isMinimized?: boolean;
  // New props for action buttons
  onOpenMeeting?: () => void;
  onExportSummary?: () => void;
  sessionIdForExport?: string | null;
  autoOpenPopover?: 'voice' | 'camera' | 'screen' | null;
  onAutoOpenPopoverHandled?: () => void;
  termsAccepted?: boolean;
  onRequireTerms?: () => void;
}

export type ChatInputHandle = {
  openMedia: (tab?: 'voice' | 'camera' | 'screen') => void;
}

// Small bridge to lift attachments.add API from PromptInput's context
function AttachmentsBridge({ onReady }: { onReady: (addFn: (files: File[] | FileList) => void) => void }) {
  const ctx = usePromptInputAttachments();
  useEffect(() => {
    onReady(ctx.add);
  }, [ctx.add, onReady]);
  return null;
}

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps & { showStatusLine?: boolean; showVoicePreview?: boolean; disableExpandedControls?: boolean }>(function ChatInput({
  inputValue,
  isLoading,
  isListening,
  voiceTranscript,
  voicePartialTranscript,
  voiceError,
  isVoiceActive,
  isVoiceProcessing,
  isVoiceInitializing = false,
  cameraState,
  isCameraInitializing = false,
  isScreenSharing,
  isScreenShareInitializing = false,
  cameraStream,
  screenShareStream,
  screenThumbnail,
  cameraError,
  screenShareError,
  availableCameras = 1,
  onInputChange,
  onSendMessage,
  onToggleVoice,
  onToggleCamera,
  onToggleScreenShare,
  onSwitchCamera,
  isExpanded = false,
  isMinimized = false,
  onOpenMeeting,
  onExportSummary,
  sessionIdForExport,
  autoOpenPopover = null,
  onAutoOpenPopoverHandled,
  showStatusLine = true,
  showVoicePreview = false,
  disableExpandedControls = false,
  termsAccepted = true,
  onRequireTerms,
}, ref) {
  const [isFocused, setIsFocused] = useState(false);
  const [manualInputOverride, setManualInputOverride] = useState(false);
  const [activePopover, setActivePopover] = useState<'voice' | 'camera' | 'screen' | null>(null);
  const [pendingPermission, setPendingPermission] = useState<'voice' | 'camera' | 'screen' | null>(null);
  const [isDownloadingSession, setIsDownloadingSession] = useState(false);
  const [voicePermissionGranted, setVoicePermissionGranted] = useState(false);

  useEffect(() => {
    if (voicePermissionGranted) return;
    if (isVoiceActive) {
      setVoicePermissionGranted(true);
    }
  }, [voicePermissionGranted, isVoiceActive]);

  // Reset manual override when voice fully stops
  useEffect(() => {
    if (!isVoiceActive && !isVoiceProcessing) {
      setManualInputOverride(false);
    }
  }, [isVoiceActive, isVoiceProcessing]);

  useEffect(() => {
    if (!voiceError) return;
    if (/denied|permission/i.test(voiceError)) {
      setVoicePermissionGranted(false);
    }
  }, [voiceError]);

  useEffect(() => {
    if (pendingPermission === 'voice' && voicePermissionGranted) {
      setPendingPermission(null);
    }
  }, [pendingPermission, voicePermissionGranted]);

  // Expose imperative method to open media from header
  useImperativeHandle(ref, () => ({
    openMedia: () => { /* drawers removed: no-op */ }
  }), []);
  // Auto-show feature disabled by consolidation
  
  // Refs for popover positioning
  const voiceButtonRef = useRef<HTMLDivElement>(null);
  const cameraButtonRef = useRef<HTMLDivElement>(null);
  const screenButtonRef = useRef<HTMLDivElement>(null);
  const attachmentsBridgeRef = useRef<{ add: (files: File[] | FileList) => void } | null>(null);
  const hiddenFilesInputRef = useRef<HTMLInputElement>(null);
  const hiddenImagesInputRef = useRef<HTMLInputElement>(null);

  // Unified media toggle hooks
  const voiceToggle = useMediaToggle({
    isActive: isVoiceActive,
    hasPermission: voicePermissionGranted,
    onToggle: onToggleVoice,
    type: 'voice',
    onPermissionNeeded: setPendingPermission
  });

  const cameraToggle = useMediaToggle({
    isActive: cameraState,
    onToggle: onToggleCamera,
    type: 'camera',
    onPermissionNeeded: setPendingPermission
  });

  const screenToggle = useMediaToggle({
    isActive: isScreenSharing,
    onToggle: onToggleScreenShare,
    type: 'screen',
    onPermissionNeeded: setPendingPermission
  });

  const ensureTerms = useCallback(() => {
    if (termsAccepted) return true;
    onRequireTerms?.();
    return false;
  }, [termsAccepted, onRequireTerms]);

  // Unified keyboard shortcuts
  useMediaKeyboardShortcuts({
    onVoiceToggle: () => {
      if (!ensureTerms()) return;
      voiceToggle.handleButtonClick();
    },
    onCameraToggle: () => {
      if (!ensureTerms()) return;
      cameraToggle.handleButtonClick();
    },
    onScreenToggle: () => {
      if (!ensureTerms()) return;
      screenToggle.handleButtonClick();
    },
    onClosePopover: () => setActivePopover(null)
  });

  // Auto-open popover when media becomes active
  // Auto-open drawers removed

  // Close popover when media stops
  useEffect(() => {
    if (activePopover === 'voice' && !isVoiceActive && !isVoiceProcessing) {
      setActivePopover(null);
    } else if (activePopover === 'camera' && !cameraState) {
      setActivePopover(null);
    } else if (activePopover === 'screen' && !isScreenSharing) {
      setActivePopover(null);
    }
  }, [activePopover, isVoiceActive, isVoiceProcessing, cameraState, isScreenSharing]);

  // closePopover removed - popovers replaced by MediaPanel/MediaDrawer

  useEffect(() => {
    if (!autoOpenPopover || disableExpandedControls) return;
    onAutoOpenPopoverHandled?.();
  }, [autoOpenPopover, onAutoOpenPopoverHandled, disableExpandedControls]);

  // Simplified handlers that close actions menu and delegate to hooks
  const handleVoiceButtonClick = () => {
    if (!ensureTerms()) return;
    voiceToggle.handleButtonClick();
  };

  const handleCameraButtonClick = () => {
    if (!ensureTerms()) return;
    cameraToggle.handleButtonClick();
  };

  const handleScreenButtonClick = () => {
    if (!ensureTerms()) return;
    screenToggle.handleButtonClick();
  };

  const handleDownloadSession = async () => {
    if (!ensureTerms()) return;
    if (!sessionIdForExport) {
      toast.error('Conversation not ready for download yet.');
      return;
    }
    if (isDownloadingSession) return;
    setIsDownloadingSession(true);
    try {
      const response = await fetch('/api/session/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionIdForExport }),
      });

      if (!response.ok) {
        throw new Error(`Export failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const fileSuffix = sessionIdForExport.slice(0, 8);
      link.href = url;
      link.download = `fbc-session-${fileSuffix}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Session JSON downloaded');
    } catch (err) {
      console.error('Failed to export session', err);
      toast.error('Failed to download session. Please try again.');
    } finally {
      setIsDownloadingSession(false);
    }
  };

  // Handle permission dialog acceptance
  const handlePermissionAccept = async () => {
    const permissionType = pendingPermission;
    setPendingPermission(null);
    
    if (!permissionType) return;
    
    setActivePopover(permissionType);
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    try {
      if (permissionType === 'voice') await onToggleVoice();
      else if (permissionType === 'camera') await onToggleCamera();
      else if (permissionType === 'screen') await onToggleScreenShare();
    } catch (error) {
      console.error('Permission request failed:', error);
      setActivePopover(null);
    }
  };

  const handlePermissionDecline = () => {
    setPendingPermission(null);
  };


  // Don't render input in minimized state
  if (isMinimized) {
    return null;
  }

  // Get current input display value
  const getInputDisplayValue = () => {
    if (isListening && !manualInputOverride && !isFocused) {
      if (voicePartialTranscript) return voicePartialTranscript;
      if (voiceTranscript) return voiceTranscript.split('\n').slice(-1)[0] || '';
      return '';
    }
    return inputValue;
  };

  // Get appropriate placeholder text
  const getPlaceholder = () => {
    if (isListening) {
      return "Listening... speak now";
    }
    return "Ask about AI consulting...";
  };

  return (
    <div className="w-full pb-safe-area-inset-bottom">
      <div className={cn(
        "mx-auto w-full",
        isExpanded ? "max-w-3xl px-4" : "px-4"
      )}>
        {showStatusLine && (isLoading || isVoiceProcessing || isVoiceActive) && (
          <output className="mb-1 text-[11px] text-muted-foreground flex items-center gap-2" aria-live="polite" aria-atomic="true">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))] animate-pulse" />
            <span>
              {isVoiceProcessing ? 'Processing voice…' : isVoiceActive ? 'Recording…' : 'AI is responding…'}
            </span>
          </output>
        )}
        <PromptInput
          className={cn(
            "flex flex-col gap-2 border border-border/20 bg-card/90 px-3 sm:px-6 pb-3 pt-3 shadow-sm",
            VISUAL.CORNER_RADIUS,
            "[.monochrome_&]:rounded-none [.monochrome_&]:shadow-none [.monochrome_&]:border-2"
          )}
          accept="image/*,.pdf"
          onSubmit={async (message) => {
            if (!ensureTerms()) {
              return;
            }
            const text = message.text?.trim() ?? '';

            if (!text && (!message.files || message.files.length === 0)) {
              toast.error('Please add a message or at least one attachment.');
              return;
            }

            try {
              await onSendMessage({
                text,
                attachments: message.files,
              });

              if (message.files && message.files.length > 0) {
                toast.success('Attachments uploaded for analysis.');
              }
            } catch (error) {
              console.error('Failed to send message:', error);
              toast.error('Failed to send message. Please try again.');
              throw error;
            }
          }}
        >
          <PromptInputBody className="flex flex-col gap-2" data-ui-rev="2025-10-10-polish2">
            <PromptInputTextarea
              className="rounded-xl bg-transparent px-2 sm:px-3 py-1.5 text-sm leading-relaxed text-foreground/90 placeholder:text-muted-foreground/70 min-h-[36px] max-h-[120px] resize-none"
            value={getInputDisplayValue()}
            onFocus={() => {
              if (!ensureTerms()) {
                (document.activeElement as HTMLElement | null)?.blur?.();
                return;
              }
              setIsFocused(true);
            }}
            onBlur={() => setIsFocused(false)}
            onChange={(e) => {
              if (isListening && !manualInputOverride) setManualInputOverride(true);
              onInputChange(e.target.value);
            }}
            placeholder={termsAccepted ? getPlaceholder() : 'Share your name and email above to begin.'}
            disabled={isLoading || !termsAccepted}
          />

          <PromptInputAttachments className="pt-1">
            {(attachment) => (
              <PromptInputAttachment key={attachment.id} data={attachment} />
            )}
          </PromptInputAttachments>

          {showVoicePreview && isListening && (voicePartialTranscript || voiceTranscript) && (
            <div className="px-1 sm:px-2 text-xs text-muted-foreground/75">
              <span className="font-medium text-muted-foreground/90">Voice preview:</span>{' '}
              {voicePartialTranscript || voiceTranscript?.split('\n').slice(-1)[0]}
            </div>
          )}

          {voiceError && (
            <div className="px-1 sm:px-2 text-xs text-destructive/80">
              {voiceError}
            </div>
          )}

          <PromptInputToolbar className="items-center px-1 sm:px-0 pb-0 pt-1 overflow-visible">
            <PromptInputTools className="gap-2">
              <ChatActions
                className={VISUAL.CORNER_RADIUS}
                analyticsId="chat-actions-trigger"
                onScheduleCall={onOpenMeeting}
                onExportSummary={onExportSummary}
                canExportSummary={Boolean(sessionIdForExport)}
                onUploadFiles={() => {
                  if (!ensureTerms()) return;
                  hiddenFilesInputRef.current?.click();
                }}
                onUploadImages={() => {
                  if (!ensureTerms()) return;
                  hiddenImagesInputRef.current?.click();
                }}
                onRequestUnlock={() => {
                  if (!termsAccepted) ensureTerms();
                }}
                voice={{
                  isActive: isVoiceActive,
                  isProcessing: isVoiceProcessing,
                  onToggle: handleVoiceButtonClick,
                  disabled: isVoiceInitializing,
                }}
                camera={{
                  isActive: cameraState,
                  isProcessing: Boolean(isCameraInitializing),
                  onToggle: handleCameraButtonClick,
                  disabled: Boolean(isCameraInitializing),
                }}
                screen={{
                  isActive: isScreenSharing,
                  isProcessing: Boolean(isScreenShareInitializing),
                  onToggle: handleScreenButtonClick,
                  disabled: Boolean(isScreenShareInitializing),
                }}
              />
            </PromptInputTools>

            {!termsAccepted && (
              <p className="px-1 sm:px-0 text-[11px] text-muted-foreground">
                Introduce yourself above and accept the terms to unlock chat, voice, and media tools.
              </p>
            )}

                        {/* Right side: Voice + Send */}
                        <div className="flex items-center gap-2">
                          {/* Voice Button - Moved next to send */}
                          <div ref={voiceButtonRef} className="flex items-center">
                            <VoiceButton
                              state={
                                voiceError ? "error" :
                                isVoiceProcessing ? "processing" :
                                isVoiceActive ? "recording" :
                                "idle"
                              }
                              onPress={handleVoiceButtonClick}
                              isExpanded={isExpanded}
                              isMinimized={isMinimized}
                              variant="ghost"
                              animationStyle="svg"
                              className={cn(
                                "border border-border/30 transition-all duration-300 ease-out",
                                "hover:scale-[1.02] hover:border-border/50 hover:shadow-md active:scale-[0.98]",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
                                VISUAL.CORNER_RADIUS,
                                "h-10 w-10 min-h-[40px] min-w-[40px] sm:h-11 sm:w-11 sm:min-h-[44px] sm:min-w-[44px]",
                                isVoiceActive 
                                  ? "bg-accent/10 border-accent/30 text-accent ring-2 ring-accent/20" 
                                  : "bg-muted/50 text-muted-foreground"
                              )}
                            />
                          </div>
                          {/* Anchor placeholders for camera/screen popovers on desktop */}
                          <div ref={cameraButtonRef} className="hidden sm:block w-[1px] h-[1px]" />
                          <div ref={screenButtonRef} className="hidden sm:block w-[1px] h-[1px]" />

                          {/* Send Button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={handleDownloadSession}
                            disabled={isDownloadingSession || !sessionIdForExport}
                            className={cn(
                              "h-10 w-10 min-h-[40px] min-w-[40px] sm:h-11 sm:w-11 sm:min-h-[44px] sm:min-w-[44px]",
                              "border border-border/30 bg-muted/50 text-muted-foreground",
                              "transition-all duration-300 ease-out",
                              "hover:scale-[1.02] hover:border-border/50 hover:bg-muted/70 hover:shadow-md",
                              "active:scale-[0.98]",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
                              VISUAL.CORNER_RADIUS,
                              "[.monochrome_&]:rounded-none"
                            )}
                            aria-label="Download session JSON"
                            title="Download session JSON"
                          >
                            <Download className={cn("h-4 w-4", isDownloadingSession && "animate-pulse")} />
                          </Button>
                          <PromptInputSubmit
                            className={cn(
                              "h-10 w-10 min-h-[40px] min-w-[40px] sm:h-11 sm:w-11 sm:min-h-[44px] sm:min-w-[44px]",
                              "bg-accent text-accent-foreground",
                              "shadow-[0_20px_50px_-30px_rgba(255,107,53,0.4)]",
                              "transition-all duration-300 ease-out",
                              "hover:scale-[1.02] hover:shadow-[0_25px_60px_-30px_rgba(255,107,53,0.5)]",
                              "active:scale-[0.98]",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                              VISUAL.CORNER_RADIUS,
                              "[.monochrome_&]:rounded-none [.monochrome_&]:font-mono"
                            )}
                            variant="ghost"
                            status={isLoading ? 'submitted' : undefined}
                            disabled={isLoading || !getInputDisplayValue().trim()}
                            aria-label={isLoading ? 'Sending message...' : 'Send message'}
                          />
                        </div>
                      </PromptInputToolbar>

                      <div className="px-1 sm:px-2 text-[10px] text-muted-foreground/50 text-right">
                        <span className="font-medium">Shift + Enter</span> for newline
                      </div>
                      <div className="px-1 sm:px-2 text-[10px] text-muted-foreground/50 text-center">
                        Strategic guidance only - not legal, medical, or financial advice.
                      </div>
        </PromptInputBody>
        {/* Bridge lives inside PromptInput to gain access to attachments context */}
        <AttachmentsBridge onReady={(add) => { attachmentsBridgeRef.current = { add }; }} />
        </PromptInput>
      </div>

      {/* Hidden inputs for upload actions */}
      <input
        type="file"
        ref={hiddenFilesInputRef}
        className="hidden"
        multiple
        onChange={(e) => {
          const files = e.target.files;
          if (files?.length) {
            attachmentsBridgeRef.current?.add(files);
          }
          e.currentTarget.value = '';
        }}
      />
      <input
        type="file"
        ref={hiddenImagesInputRef}
        className="hidden"
        accept="image/*"
        multiple
        onChange={(e) => {
          const files = e.target.files;
          if (files?.length) {
            attachmentsBridgeRef.current?.add(files);
          }
          e.currentTarget.value = '';
        }}
      />

      {/* Legacy media drawers/panels removed: Conversation Bar owns media */}

      {/* Permission Explanation Dialog */}
      <PermissionExplanationDialog
        type={pendingPermission}
        isOpen={pendingPermission !== null}
        onAccept={handlePermissionAccept}
        onDecline={handlePermissionDecline}
      />

      {/* Legacy ActionsMenu removed; Actions now provided via inline Popover in toolbar */}

      {/* Full-Screen Media Components */}
      <VoiceFullScreen
        isOpen={voiceToggle.isFullScreenOpen}
        onClose={voiceToggle.closeFullScreen}
        isActive={isVoiceActive}
        isProcessing={isVoiceProcessing}
        transcript={voiceTranscript}
        partialTranscript={voicePartialTranscript}
        error={voiceError}
        onToggle={onToggleVoice}
        onOpenCamera={onToggleCamera}
        onOpenScreen={onToggleScreenShare}
      />

      <CameraFullScreen
        isOpen={cameraToggle.isFullScreenOpen}
        onClose={cameraToggle.closeFullScreen}
        isActive={cameraState}
        stream={cameraStream ?? null}
        error={cameraError}
        onToggle={onToggleCamera}
        onSwitchCamera={onSwitchCamera}
        hasMultipleCameras={availableCameras > 1}
        onOpenVoice={onToggleVoice}
        onOpenScreen={onToggleScreenShare}
        transcript={voiceTranscript}
        partialTranscript={voicePartialTranscript}
      />

      <ScreenFullScreen
        isOpen={screenToggle.isFullScreenOpen}
        onClose={screenToggle.closeFullScreen}
        isActive={isScreenSharing}
        stream={screenShareStream ?? null}
        thumbnail={screenThumbnail}
        error={screenShareError}
        onToggle={onToggleScreenShare}
        onOpenCamera={onToggleCamera}
        onOpenVoice={onToggleVoice}
        transcript={voiceTranscript}
        partialTranscript={voicePartialTranscript}
      />
    </div>
  );
});
