import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
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
} from "@/components/ai-elements/prompt-input";
import { toast } from "sonner";
import { CHAT_CONSTANTS } from "../constants/chatConstants";
import { CHAT_DESIGN, VISUAL, chatStyles } from "../design-tokens";
import {
  Plus,
  Camera,
  CameraOff,
  Monitor,
  MonitorOff,
  Settings,
  FileText,
  Calendar,
  Download,
} from "lucide-react";
import { VoiceButton } from "./VoiceButton";
import { MediaPopover } from "./MediaPopover";
import { VoicePopoverSection } from "./VoicePopoverSection";
import { CameraPopoverSection } from "./CameraPopoverSection";
import { ScreenPopoverSection } from "./ScreenPopoverSection";

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
  isMuted?: boolean;
  cameraState: boolean;
  isScreenSharing: boolean;
  cameraStream?: MediaStream | null;
  screenShareStream?: MediaStream | null;
  cameraError?: string;
  screenShareError?: string;
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
  isMuted = false,
  cameraState,
  isScreenSharing,
  cameraStream,
  screenShareStream,
  cameraError,
  screenShareError,
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
}: ChatInputProps) {
  const [hasAttachments, setHasAttachments] = useState(false);
  const [activePopover, setActivePopover] = useState<'voice' | 'camera' | 'screen' | null>(null);
  
  // Refs for popover positioning
  const voiceButtonRef = useRef<HTMLDivElement>(null);
  const cameraButtonRef = useRef<HTMLDivElement>(null);
  const screenButtonRef = useRef<HTMLDivElement>(null);

  // Auto-open popover when media becomes active
  useEffect(() => {
    if (isVoiceActive && !activePopover) {
      setActivePopover('voice');
    } else if (cameraState && !activePopover) {
      setActivePopover('camera');
    } else if (isScreenSharing && !activePopover) {
      setActivePopover('screen');
    }
  }, [isVoiceActive, cameraState, isScreenSharing, activePopover]);

  // Close popover when media stops
  useEffect(() => {
    if (activePopover === 'voice' && !isVoiceActive) {
      setActivePopover(null);
    } else if (activePopover === 'camera' && !cameraState) {
      setActivePopover(null);
    } else if (activePopover === 'screen' && !isScreenSharing) {
      setActivePopover(null);
    }
  }, [activePopover, isVoiceActive, cameraState, isScreenSharing]);

  const closePopover = () => setActivePopover(null);

  const handleVoiceButtonClick = () => {
    setActivePopover(activePopover === 'voice' ? null : 'voice');
    onToggleVoice();
  };

  const handleCameraButtonClick = () => {
    setActivePopover(activePopover === 'camera' ? null : 'camera');
    onToggleCamera();
  };

  const handleScreenButtonClick = () => {
    setActivePopover(activePopover === 'screen' ? null : 'screen');
    onToggleScreenShare();
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
    <div
      className={cn(
        "px-4 sm:px-6 pb-4 pt-2 safe-area-inset-bottom",
        isExpanded ? "w-full bg-transparent pb-6 pt-4" : ""
      )}
    >
      <div className="mx-auto w-full max-w-3xl">
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
          {/* Primary actions */}
          {onOpenMeeting && onExportSummary && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button
                onClick={onOpenMeeting}
                className={cn(
                  "flex items-center gap-2 border border-border/40 bg-card px-4 py-2 text-[11px] font-semibold tracking-[0.2em] text-foreground transition-colors duration-150 hover:bg-card/80",
                  VISUAL.CORNER_RADIUS,
                  "[.monochrome_&]:rounded-none [.monochrome_&]:font-mono"
                )}
              >
                <Calendar className={CHAT_DESIGN.SIZES.ICON_MEDIUM} />
                Schedule a call
              </button>
              <button
                onClick={onExportSummary}
                disabled={!sessionIdForExport}
                className={cn(
                  "flex items-center gap-2 border border-border/40 bg-card px-4 py-2 text-[11px] font-semibold tracking-[0.2em] text-foreground transition-colors duration-150 hover:bg-card/80 disabled:cursor-not-allowed disabled:opacity-50",
                  VISUAL.CORNER_RADIUS,
                  "[.monochrome_&]:rounded-none [.monochrome_&]:font-mono"
                )}
              >
                <Download className={CHAT_DESIGN.SIZES.ICON_MEDIUM} />
                Export summary
              </button>
            </div>
          )}
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
            <PromptInputTools className="gap-1.5">
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger
                  className={cn(
                    "flex items-center justify-center border border-border/40 bg-muted transition-all duration-150 hover:scale-105 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]/40",
                    VISUAL.CORNER_RADIUS,
                    "[.monochrome_&]:rounded-none [.monochrome_&]:font-mono",
                    isExpanded ? "h-8 w-8 shadow-md" : "h-6 w-6 shadow-sm"
                  )}
                  aria-label="Upload files"
                  title="Upload files"
                >
                  <Plus className={cn("text-foreground/70", isExpanded ? "h-4 w-4" : "h-3 w-3")} aria-hidden="true" />
                </PromptInputActionMenuTrigger>
                <PromptInputActionMenuContent align="start" className="rounded-2xl border border-border/40 bg-background/95 shadow-lg">
                  <PromptInputActionAddAttachments label="Upload photos & files" />
                  <PromptInputActionMenuItem
                    onClick={() => toast.info('PDF summaries are on the roadmap. Stay tuned!')}
                  >
                    <FileText className={`mr-2 ${CHAT_CONSTANTS.ICONS.SMALL}`} />
                    Generate summary (soon)
                  </PromptInputActionMenuItem>
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>

              <div ref={voiceButtonRef}>
                <VoiceButton
                  className={cn(
                    "border border-border/40 transition-all duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]/40",
                    VISUAL.CORNER_RADIUS,
                    "[.monochrome_&]:rounded-none [.monochrome_&]:font-mono",
                    isExpanded ? "h-8 w-8 shadow-md" : "h-6 w-6 shadow-sm",
                    isVoiceActive ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]" : ""
                  )}
                  size={isExpanded ? 16 : 12}
                  disabled={!isVoiceSupported}
                  isActive={isVoiceActive}
                  isProcessing={isVoiceProcessing}
                  isMuted={isMuted}
                  error={voiceError}
                  onToggle={handleVoiceButtonClick}
                />
              </div>

              <div ref={cameraButtonRef}>
                <PromptInputButton
                  variant="ghost"
                  className={cn(
                    "flex items-center justify-center border border-border/40 transition-all duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]/40",
                    VISUAL.CORNER_RADIUS,
                    "[.monochrome_&]:rounded-none [.monochrome_&]:font-mono",
                    isExpanded ? "h-8 w-8 shadow-md" : "h-6 w-6 shadow-sm",
                    cameraState 
                      ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))] shadow-[0_18px_40px_-28px_rgba(12,18,26,0.65)]" 
                      : "bg-muted text-foreground/70 hover:bg-card hover:text-foreground"
                  )}
                  onClick={handleCameraButtonClick}
                  aria-label={`${cameraState ? 'Disable' : 'Enable'} camera`}
                  title={`${cameraState ? 'Disable' : 'Enable'} camera`}
                >
                  {cameraState ? (
                    <Camera className={cn("", isExpanded ? "h-4 w-4" : "h-3 w-3")} aria-hidden="true" />
                  ) : (
                    <CameraOff className={cn("", isExpanded ? "h-4 w-4" : "h-3 w-3")} aria-hidden="true" />
                  )}
                </PromptInputButton>
              </div>

              <div ref={screenButtonRef}>
                <PromptInputButton
                  variant="ghost"
                  className={cn(
                    "flex items-center justify-center border border-border/40 transition-all duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]/40",
                    VISUAL.CORNER_RADIUS,
                    "[.monochrome_&]:rounded-none [.monochrome_&]:font-mono",
                    isExpanded ? "h-8 w-8 shadow-md" : "h-6 w-6 shadow-sm",
                    isScreenSharing
                      ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))] shadow-[0_18px_40px_-28px_rgba(12,18,26,0.65)]"
                      : "bg-muted text-foreground/70 hover:bg-card hover:text-foreground"
                  )}
                  onClick={handleScreenButtonClick}
                  aria-label="Toggle screen share"
                  title="Toggle screen share"
                >
                  {isScreenSharing ? (
                    <Monitor className={cn("", isExpanded ? "h-4 w-4" : "h-3 w-3")} aria-hidden="true" />
                  ) : (
                    <MonitorOff className={cn("", isExpanded ? "h-4 w-4" : "h-3 w-3")} aria-hidden="true" />
                  )}
                </PromptInputButton>
              </div>

              <PromptInputButton
                variant="ghost"
                className={cn(
                  "flex items-center justify-center border border-border/40 bg-muted text-foreground/70 transition-all duration-150 hover:scale-105 hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]/40",
                  VISUAL.CORNER_RADIUS,
                  "[.monochrome_&]:rounded-none [.monochrome_&]:font-mono",
                  isExpanded ? "h-8 w-8 shadow-md" : "h-6 w-6 shadow-sm"
                )}
                onClick={onToggleSettings}
                aria-label="Chat settings"
                title="Chat settings"
              >
                <Settings className={cn("text-foreground/70", isExpanded ? "h-4 w-4" : "h-3 w-3")} aria-hidden="true" />
              </PromptInputButton>
            </PromptInputTools>

            <PromptInputSubmit
              className={cn(
                `${CHAT_DESIGN.SIZES.INPUT_HEIGHT} ${CHAT_DESIGN.SIZES.INPUT_HEIGHT} bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] shadow-[0_24px_60px_-30px_rgba(255,107,53,0.35)] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[hsl(var(--accent))]/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[hsl(var(--accent))]/40 focus-visible:ring-offset-2`,
                VISUAL.CORNER_RADIUS,
                "[.monochrome_&]:rounded-none [.monochrome_&]:font-mono"
              )}
              variant="ghost"
              status={isLoading ? 'submitted' : undefined}
              disabled={isLoading || (!getInputDisplayValue().trim() && !hasAttachments)}
              aria-label={isLoading ? 'Sending message...' : 'Send message'}
            />
          </PromptInputToolbar>

          <div className="px-1 sm:px-2 text-[10px] text-muted-foreground/65 text-right">
            <span className="font-semibold tracking-[0.3em] uppercase">Shift + Enter</span> for newline
          </div>
        </PromptInputBody>
        </PromptInput>
      </div>

      {/* Popovers for media controls */}
      <MediaPopover
        type="voice"
        isOpen={activePopover === 'voice'}
        onClose={closePopover}
        triggerRef={voiceButtonRef}
      >
        <VoicePopoverSection
          isActive={isVoiceActive}
          isProcessing={isVoiceProcessing}
          isSupported={isVoiceSupported}
          isMuted={isMuted}
          transcript={voiceTranscript}
          partialTranscript={voicePartialTranscript}
          error={voiceError}
          onToggle={handleVoiceButtonClick}
        />
      </MediaPopover>

      <MediaPopover
        type="camera"
        isOpen={activePopover === 'camera'}
        onClose={closePopover}
        triggerRef={cameraButtonRef}
      >
        <CameraPopoverSection
          isActive={cameraState}
          stream={cameraStream}
          error={cameraError}
          onToggle={handleCameraButtonClick}
          onSwitchCamera={onSwitchCamera}
          availableDevices={2} // TODO: Get actual device count
        />
      </MediaPopover>

      <MediaPopover
        type="screen"
        isOpen={activePopover === 'screen'}
        onClose={closePopover}
        triggerRef={screenButtonRef}
      >
        <ScreenPopoverSection
          isActive={isScreenSharing}
          stream={screenShareStream}
          error={screenShareError}
          onToggle={handleScreenButtonClick}
        />
      </MediaPopover>
    </div>
  );
}
