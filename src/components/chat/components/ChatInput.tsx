import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { cn } from "@/lib/utils";
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  PromptInputButton,
  PromptInputSubmit,
  PromptInputAttachment,
  PromptInputAttachments,
  type PromptInputFile
} from "@/components/ai-elements/interactive/prompt-input";
import { toast } from "sonner";
import { VISUAL } from "../design-tokens";
import {
  Plus,
  Calendar,
  Download,
  Paperclip,
  Image as ImageIcon,
  Mic,
  MicOff,
  Camera as CameraIcon,
  CameraOff,
  MonitorUp,
  MonitorOff,
} from "lucide-react";
import { VoiceButton } from "@/components/ui/voice-button";
import { VoiceFullScreen } from "./voice/VoiceFullScreen";
import { CameraFullScreen } from "./camera/CameraFullScreen";
import { ScreenFullScreen } from "./screen/ScreenFullScreen";
import { PermissionExplanationDialog } from "./PermissionExplanationDialog";
import { usePromptInputAttachments } from "@/components/ai-elements/interactive/prompt-input";
import { useMediaToggle } from "@/hooks/useMediaToggle";
import { useMediaKeyboardShortcuts } from "@/hooks/useMediaKeyboardShortcuts";
// MediaDrawer and MediaPanel removed
import { Popover, PopoverContent } from "@/components/ui/popover";

type SendMessageInput = string | {
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
}

export type ChatInputHandle = {
  openMedia: (tab?: 'voice' | 'camera' | 'screen') => void;
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
  cameraState,
  isScreenSharing,
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
}, ref) {
  const [activePopover, setActivePopover] = useState<'voice' | 'camera' | 'screen' | null>(null);
  const [pendingPermission, setPendingPermission] = useState<'voice' | 'camera' | 'screen' | null>(null);
  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);

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

  // Unified keyboard shortcuts
  useMediaKeyboardShortcuts({
    onVoiceToggle: voiceToggle.handleButtonClick,
    onCameraToggle: cameraToggle.handleButtonClick,
    onScreenToggle: screenToggle.handleButtonClick,
    onClosePopover: () => setActivePopover(null)
  });

  // Small bridge to lift attachments.add API from PromptInput's context
  function AttachmentsBridge({ onReady }: { onReady: (addFn: (files: File[] | FileList) => void) => void }) {
    const ctx = usePromptInputAttachments();
    useEffect(() => {
      onReady(ctx.add);
    }, [ctx.add, onReady]);
    return null;
  }

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
    voiceToggle.handleButtonClick();
  };

  const handleCameraButtonClick = () => {
    cameraToggle.handleButtonClick();
  };

  const handleScreenButtonClick = () => {
    screenToggle.handleButtonClick();
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
    if (isListening) {
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
          <div className="mb-1 text-[11px] text-muted-foreground flex items-center gap-2" role="status" aria-live="polite" aria-atomic="true">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))] animate-pulse" />
            <span>
              {isVoiceProcessing ? 'Processing voice…' : isVoiceActive ? 'Recording…' : 'AI is responding…'}
            </span>
          </div>
        )}
        <PromptInput
          className={cn(
            "flex flex-col gap-2 border border-border/20 bg-card/90 px-4 sm:px-6 pb-3 pt-3 shadow-sm",
            VISUAL.CORNER_RADIUS,
            "[.monochrome_&]:rounded-none [.monochrome_&]:shadow-none [.monochrome_&]:border-2"
          )}
          accept="image/*,.pdf"
          onSubmit={async (message) => {
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
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={getPlaceholder()}
            disabled={isLoading || isListening}
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

                      <PromptInputToolbar className="items-center px-1 sm:px-0 pb-0 pt-1">
                        <PromptInputTools className="gap-2">
                          {/* Inline Actions Popover (replaces drawer) */}
                          <Popover open={isActionsPopoverOpen} onOpenChange={setIsActionsPopoverOpen}>
                          <PromptInputButton
                            variant="ghost"
                            className={cn(
                              "flex items-center justify-center border border-border/40 bg-muted transition-all duration-150 hover:scale-105 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]/40",
                              VISUAL.CORNER_RADIUS,
                              "[.monochrome_&]:rounded-none [.monochrome_&]:font-mono",
                              "h-11 w-11 min-h-[44px] min-w-[44px] shadow-sm"
                            )}
                            aria-label="Actions"
                            title="Actions, Tools & Media"
                            onClick={() => setIsActionsPopoverOpen(!isActionsPopoverOpen)}
                          >
                            <Plus className="h-4 w-4 text-foreground/70" aria-hidden="true" />
                          </PromptInputButton>
                            <PopoverContent className="w-72 p-1">
                              <div className="flex flex-col">
                                {/* Utilities (top) */}
                                <button className="flex items-start gap-3 min-h-[44px] rounded px-2 py-2 hover:bg-muted text-left" onClick={() => { setIsActionsPopoverOpen(false); onOpenMeeting?.(); }}>
                                  <Calendar className="h-5 w-5 text-[hsl(var(--accent))]" />
                                  <span>
                                    <div className="text-sm font-medium">Schedule a call</div>
                                    <div className="text-xs text-muted-foreground">Book a consultation session</div>
                                  </span>
                                </button>
                                <button className="flex items-start gap-3 min-h-[44px] rounded px-2 py-2 hover:bg-muted text-left disabled:opacity-50" disabled={!sessionIdForExport} onClick={() => { setIsActionsPopoverOpen(false); onExportSummary?.(); }}>
                                  <Download className="h-5 w-5 text-[hsl(var(--accent))]" />
                                  <span>
                                    <div className="text-sm font-medium">Export summary</div>
                                    <div className="text-xs text-muted-foreground">Download conversation summary</div>
                                  </span>
                                </button>

                                <div className="my-1 h-px bg-border/30" />

                                <button className="flex items-start gap-3 min-h-[44px] rounded px-2 py-2 hover:bg-muted text-left" onClick={() => { setIsActionsPopoverOpen(false); hiddenFilesInputRef.current?.click(); }}>
                                  <Paperclip className="h-5 w-5 text-muted-foreground" />
                                  <span>
                                    <div className="text-sm font-medium">Upload files</div>
                                    <div className="text-xs text-muted-foreground">Attach documents or PDFs</div>
                                  </span>
                                </button>
                                <button className="flex items-start gap-3 min-h-[44px] rounded px-2 py-2 hover:bg-muted text-left" onClick={() => { setIsActionsPopoverOpen(false); hiddenImagesInputRef.current?.click(); }}>
                                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                  <span>
                                    <div className="text-sm font-medium">Upload images</div>
                                    <div className="text-xs text-muted-foreground">Share photos or screenshots</div>
                                  </span>
                                </button>

                                <div className="my-1 h-px bg-border/30" />

                                {/* Core media toggles */}
                                <button className="flex items-start gap-3 min-h-[44px] rounded px-2 py-2 hover:bg-muted text-left" onClick={() => { setIsActionsPopoverOpen(false); handleVoiceButtonClick(); }}>
                                  {(isVoiceActive || isVoiceProcessing) ? (
                                    <Mic className="h-5 w-5 text-[hsl(var(--accent))]" />
                                  ) : (
                                    <MicOff className="h-5 w-5 text-muted-foreground" />
                                  )}
                                  <span>
                                    <div className="text-sm font-medium">{isVoiceActive || isVoiceProcessing ? 'Stop Voice' : 'Start Voice'}</div>
                                    <div className="text-xs text-muted-foreground">{isVoiceActive || isVoiceProcessing ? 'Currently recording' : 'Use voice input'}</div>
                                  </span>
                                </button>
                                <button className="flex items-start gap-3 min-h-[44px] rounded px-2 py-2 hover:bg-muted text-left" onClick={() => { setIsActionsPopoverOpen(false); handleCameraButtonClick(); }}>
                                  {cameraState ? (
                                    <CameraIcon className="h-5 w-5 text-[hsl(var(--accent))]" />
                                  ) : (
                                    <CameraOff className="h-5 w-5 text-muted-foreground" />
                                  )}
                                  <span>
                                    <div className="text-sm font-medium">{cameraState ? 'Stop Camera' : 'Start Camera'}</div>
                                    <div className="text-xs text-muted-foreground">{cameraState ? 'Camera is active' : 'Use camera input'}</div>
                                  </span>
                                </button>
                                <button className="flex items-start gap-3 min-h-[44px] rounded px-2 py-2 hover:bg-muted text-left" onClick={() => { setIsActionsPopoverOpen(false); handleScreenButtonClick(); }}>
                                  {isScreenSharing ? (
                                    <MonitorUp className="h-5 w-5 text-[hsl(var(--accent))]" />
                                  ) : (
                                    <MonitorOff className="h-5 w-5 text-muted-foreground" />
                                  )}
                                  <span>
                                    <div className="text-sm font-medium">{isScreenSharing ? 'Stop Screen Share' : 'Start Screen Share'}</div>
                                    <div className="text-xs text-muted-foreground">{isScreenSharing ? 'Sharing screen' : 'Share your screen'}</div>
                                  </span>
                                </button>

                                {/* Advanced panels & Settings removed per consolidation */}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </PromptInputTools>

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
                              className={cn(
                                "border border-border/40 transition-all duration-150 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]/40 shadow-sm",
                                VISUAL.CORNER_RADIUS,
                                "h-11 w-11 min-h-[44px] min-w-[44px]",
                                isVoiceActive ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]" : "bg-muted"
                              )}
                            />
                          </div>
                          {/* Inline voice status chip */}
                          {(isVoiceProcessing || isVoiceActive) && (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-md border",
                                isVoiceProcessing
                                  ? "border-amber-500/30 bg-amber-500/10 text-amber-600"
                                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                              )}
                              aria-live="polite"
                            >
                              <span className={cn("inline-block h-1.5 w-1.5 rounded-full", isVoiceProcessing ? "bg-amber-500" : "bg-emerald-500")} />
                              {isVoiceProcessing ? 'Processing' : 'Recording'}
                            </span>
                          )}
                          {/* Anchor placeholders for camera/screen popovers on desktop */}
                          <div ref={cameraButtonRef} className="hidden sm:block w-[1px] h-[1px]" />
                          <div ref={screenButtonRef} className="hidden sm:block w-[1px] h-[1px]" />

                          {/* Send Button */}
                          <PromptInputSubmit
                            className={cn(
                              "h-11 w-11 min-h-[44px] min-w-[44px] bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] shadow-[0_24px_60px_-30px_rgba(255,107,53,0.35)] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[hsl(var(--accent))]/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[hsl(var(--accent))]/40 focus-visible:ring-offset-2",
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
          if (files && files.length) {
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
          if (files && files.length) {
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
      />

      <ScreenFullScreen
        isOpen={screenToggle.isFullScreenOpen}
        onClose={screenToggle.closeFullScreen}
        isActive={isScreenSharing}
        stream={screenShareStream ?? null}
        thumbnail={screenThumbnail}
        error={screenShareError}
        onToggle={onToggleScreenShare}
      />
    </div>
  );
});
