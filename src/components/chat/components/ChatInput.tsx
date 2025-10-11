import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  PromptInputButton,
  PromptInputSubmit,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionMenuItem,
  PromptInputActionAddAttachments,
  PromptInputAttachment,
  PromptInputAttachments,
  type PromptInputFile
} from "@/components/ai-elements/interactive/prompt-input";
import { toast } from "sonner";
import { CHAT_CONSTANTS } from "../constants/chatConstants";
import { CHAT_DESIGN, VISUAL, chatStyles } from "../design-tokens";
import {
  Plus,
  Mic,
  MicOff,
  Send,
  Wrench,
  Camera,
  CameraOff,
  Monitor,
  MonitorOff,
  Settings,
  FileText,
  Calendar,
  Download,
} from "lucide-react";
import { VoiceButton, type VoiceButtonState } from "@/components/ui/voice-button";
import { ToolsMenu } from "./ToolsMenu";
import { ActionsMenu } from "./ActionsMenu";
import { VoiceLiveMode } from "./VoiceLiveMode";
import { CameraFullScreen } from "./CameraFullScreen";
import { ScreenShareFullScreen } from "./ScreenShareFullScreen";
import { PermissionExplanationDialog } from "./PermissionExplanationDialog";
import { useMediaController } from "../hooks/useMediaController";
import type { MediaType } from "../hooks/useMediaController";

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

export function ChatInput({
  inputValue,
  isLoading,
  isListening,
  voiceTranscript,
  voicePartialTranscript,
  voiceError,
  isVoiceActive,
  isVoiceProcessing,
  isVoiceSupported,
  isVoiceInitializing = false,
  cameraState,
  isCameraInitializing = false,
  isScreenSharing,
  isScreenShareInitializing = false,
  cameraStream,
  screenShareStream,
  cameraError,
  screenShareError,
  availableCameras = 1,
  onInputChange,
  onSendMessage,
  onToggleVoice,
  onToggleCamera,
  onToggleScreenShare,
  onSwitchCamera,
  onToggleSettings,
  isExpanded = false,
  isMinimized = false,
  onOpenMeeting,
  onExportSummary,
  sessionIdForExport,
  autoOpenPopover = null,
  onAutoOpenPopoverHandled,
}: ChatInputProps) {
  const [hasAttachments, setHasAttachments] = useState(false);
  // Bottom sheet state
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

  // Unified media controller (full-screen overlays on all viewports)
  const media = useMediaController({
    voice: {
      isActive: isVoiceActive,
      isProcessing: isVoiceProcessing,
      isSupported: isVoiceSupported,
      isInitializing: isVoiceInitializing,
      transcript: voiceTranscript,
      partialTranscript: voicePartialTranscript,
      error: voiceError,
      onToggle: onToggleVoice,
    },
    camera: {
      isActive: cameraState,
      isInitializing: isCameraInitializing,
      stream: cameraStream ?? undefined,
      error: cameraError,
      availableDevices: availableCameras,
      onToggle: onToggleCamera,
      onSwitchCamera,
    },
    screen: {
      isActive: isScreenSharing,
      isInitializing: isScreenShareInitializing,
      stream: screenShareStream ?? undefined,
      error: screenShareError,
      onToggle: onToggleScreenShare,
    },
  })

  useEffect(() => {
    if (!autoOpenPopover) return;
    // Show permission explainer for targeted media; controller will handle start after accept
    media.setPendingPermission(autoOpenPopover as MediaType);
    onAutoOpenPopoverHandled?.();
  }, [autoOpenPopover, media, onAutoOpenPopoverHandled]);

  const handleVoiceButtonClick = async () => {
    await media.handleVoicePress();
  };

  const handleCameraButtonClick = async () => {
    await media.handleCameraPress();
  };

  const handleScreenButtonClick = async () => {
    await media.handleScreenPress();
  };

  // Permission dialog handlers (delegated to controller)
  const handlePermissionAccept = media.acceptPermissionExplainer;
  const handlePermissionDecline = media.declinePermissionExplainer;

  // Keyboard shortcuts for media controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + M = Toggle microphone/voice
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        void media.handleVoicePress();
      }
      // Ctrl/Cmd + Shift + C = Toggle camera
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'c') {
        e.preventDefault();
        void media.handleCameraPress();
      }
      // Ctrl/Cmd + Shift + S = Toggle screen share
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 's') {
        e.preventDefault();
        void media.handleScreenPress();
      }
      // ESC handled by overlays and dialogs
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [media]);

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
        <PromptInput
          className={cn(
            "flex flex-col gap-2 border border-border/30 bg-card/95 px-4 sm:px-6 pb-3 pt-3 shadow-[0_20px_60px_-40px_rgba(12,18,26,0.45)]",
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
          <PromptInputBody className="flex flex-col gap-2">
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

          {isListening && (voicePartialTranscript || voiceTranscript) && (
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
                          {/* Actions Menu Button (+ button) - Everything goes here now */}
                          <PromptInputButton
                            variant="ghost"
                            className={cn(
                              "flex items-center justify-center border border-border/40 bg-muted transition-all duration-150 hover:scale-105 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]/40",
                              VISUAL.CORNER_RADIUS,
                              "[.monochrome_&]:rounded-none [.monochrome_&]:font-mono",
                              "h-8 w-8 min-h-[32px] min-w-[32px] shadow-sm"
                            )}
                            onClick={() => setIsActionsMenuOpen(true)}
                            aria-label="All actions menu"
                            title="Actions, Tools & Media"
                          >
                            <Plus className="h-4 w-4 text-foreground/70" aria-hidden="true" />
                          </PromptInputButton>
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
                                "h-8 w-8 min-h-[32px] min-w-[32px]",
                                isVoiceActive ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]" : "bg-muted"
                              )}
                            />
                          </div>

                          {/* Send Button */}
                          <PromptInputSubmit
                            className={cn(
                              "h-8 w-8 min-h-[32px] min-w-[32px] bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] shadow-[0_24px_60px_-30px_rgba(255,107,53,0.35)] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[hsl(var(--accent))]/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[hsl(var(--accent))]/40 focus-visible:ring-offset-2",
                              VISUAL.CORNER_RADIUS,
                              "[.monochrome_&]:rounded-none [.monochrome_&]:font-mono"
                            )}
                            variant="ghost"
                            status={isLoading ? 'submitted' : undefined}
                            disabled={isLoading || (!getInputDisplayValue().trim() && !hasAttachments)}
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
        </PromptInput>
      </div>

      {/* Full-screen overlays for all media (desktop + mobile) */}
      <VoiceLiveMode
        isOpen={media.isVoiceOverlayOpen}
        onClose={() => media.closeOverlay('voice')}
        isActive={isVoiceActive}
        isProcessing={isVoiceProcessing}
        transcript={voiceTranscript}
        partialTranscript={voicePartialTranscript}
        error={voiceError}
        onToggle={handleVoiceButtonClick}
        onToggleCamera={handleCameraButtonClick}
        onToggleScreenShare={handleScreenButtonClick}
        isCameraActive={cameraState}
        isScreenSharing={isScreenSharing}
      />

      <CameraFullScreen
        isOpen={media.isCameraOverlayOpen}
        onClose={() => media.closeOverlay('camera')}
        isActive={cameraState}
        stream={cameraStream}
        error={cameraError}
        onToggle={handleCameraButtonClick}
        onSwitchCamera={onSwitchCamera}
        availableDevices={availableCameras}
      />

      <ScreenShareFullScreen
        isOpen={media.isScreenOverlayOpen}
        onClose={() => media.closeOverlay('screen')}
        isActive={isScreenSharing}
        stream={screenShareStream}
        error={screenShareError || undefined}
        onToggle={handleScreenButtonClick}
        isVoiceActive={isVoiceActive}
        isWebcamActive={cameraState}
        onToggleVoice={handleVoiceButtonClick}
        onToggleWebcam={handleCameraButtonClick}
        isProcessing={isVoiceProcessing}
        transcript={voiceTranscript}
        partialTranscript={voicePartialTranscript}
      />

      {/* Permission Explanation Dialog */}
      <PermissionExplanationDialog
        type={media.pendingPermission}
        isOpen={media.pendingPermission !== null}
        onAccept={handlePermissionAccept}
        onDecline={handlePermissionDecline}
      />

      {/* Unified Actions Menu - Everything in one place */}
      <ActionsMenu
        isOpen={isActionsMenuOpen}
        onClose={() => setIsActionsMenuOpen(false)}
        onScheduleCall={onOpenMeeting || (() => {})}
        onExportSummary={onExportSummary || (() => {})}
        onUploadFiles={() => {
          // Trigger file upload - this would integrate with the existing file upload system
          toast.info('File upload functionality');
        }}
        onUploadImages={() => {
          // Trigger image upload
          toast.info('Image upload functionality');
        }}
        canExportSummary={!!sessionIdForExport}
        // Add all media controls to this menu
        isVoiceActive={isVoiceActive}
        onToggleVoice={handleVoiceButtonClick}
        isCameraActive={cameraState}
        onToggleCamera={handleCameraButtonClick}
        isScreenSharing={isScreenSharing}
        onToggleScreenShare={handleScreenButtonClick}
        onToggleSettings={onToggleSettings}
        onOpenVoiceFullScreen={() => media.openOverlay('voice')}
        onOpenCameraFullScreen={() => media.openOverlay('camera')}
        currentTheme="default" // TODO: Get from context
        onToggleTheme={() => {}} // TODO: Implement theme toggle
      />
    </div>
  );
}
