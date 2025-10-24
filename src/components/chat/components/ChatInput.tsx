import { useState, useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  type PromptInputFile
} from "@/components/ai-elements/interactive/prompt-input";
import { toast } from "sonner";
import { Download, Keyboard, Mic, MicOff, Video, VideoOff, Monitor, MonitorOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { VoiceFullScreen } from "./voice/VoiceFullScreen";
import { CameraFullScreen } from "./camera/CameraFullScreen";
import { ScreenFullScreen } from "./screen/ScreenFullScreen";
import { PermissionExplanationDialog } from "./PermissionExplanationDialog";
import { useMediaToggle } from "@/hooks/useMediaToggle";
import { useMediaKeyboardShortcuts } from "@/hooks/useMediaKeyboardShortcuts";
import { LiveWaveformMatrix } from "@/components/ui/live-waveform-matrix";

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
  isMinimized = false,
  sessionIdForExport,
  autoOpenPopover = null,
  onAutoOpenPopoverHandled,
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
  const [isTextareaExpanded, setIsTextareaExpanded] = useState(false);

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
  
  // Refs for file uploads
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
    onClosePopover: () => setActivePopover(null),
    onTextareaToggle: () => setIsTextareaExpanded(v => !v)
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

  // Unified status determination
  const getStatusInfo = () => {
    if (isVoiceActive) {
      return { type: "recording", label: "Recording your voice", color: "bg-blue-500" }
    }
    if (isVoiceProcessing) {
      return { type: "processing", label: "AI is speaking", color: "bg-orange-500" }
    }
    if (isListening) {
      return { type: "listening", label: "Listening...", color: "bg-green-500" }
    }
    return { type: "idle", label: "Ready to chat", color: "bg-gray-500" }
  }

  const statusInfo = getStatusInfo()

  return (
    <div className="flex flex-col gap-4">
      {/* Status Indicators */}
      <div className="flex items-center justify-center gap-4">
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
          "bg-background/80 backdrop-blur-sm border border-border/20",
          statusInfo.color === "bg-blue-500" && "bg-blue-500/10 border-blue-500/30 text-blue-700",
          statusInfo.color === "bg-orange-500" && "bg-orange-500/10 border-orange-500/30 text-orange-700",
          statusInfo.color === "bg-green-500" && "bg-green-500/10 border-green-500/30 text-green-700",
          statusInfo.color === "bg-gray-500" && "bg-gray-500/10 border-gray-500/30 text-gray-700"
        )}>
          <div className={cn(
            "w-2 h-2 rounded-full",
            statusInfo.color === "bg-blue-500" && "bg-blue-500",
            statusInfo.color === "bg-orange-500" && "bg-orange-500",
            statusInfo.color === "bg-green-500" && "bg-green-500",
            statusInfo.color === "bg-gray-500" && "bg-gray-500"
          )} />
          {statusInfo.label}
        </div>
      </div>

      {/* Matrix Waveform Center */}
      <div className="flex justify-center">
        <div className="w-32 h-16 flex items-center justify-center">
          <LiveWaveformMatrix
            mode={isVoiceActive ? "user" : isVoiceProcessing ? "ai" : "idle"}
            active={isVoiceActive || isVoiceProcessing}
            size={3}
            gap={1}
          />
        </div>
      </div>

      {/* Collapsible Transcript */}
      <div className="flex justify-center">
        <div className="w-full max-w-md">
          <div
            className={cn(
              "overflow-hidden transition-all duration-300 ease-out",
              isTextareaExpanded ? "max-h-[200px]" : "max-h-0"
            )}
          >
            <div className="bg-background/80 backdrop-blur-sm border border-border/20 rounded-lg p-3">
              <textarea
                className="w-full bg-transparent border-none outline-none resize-none text-sm leading-relaxed"
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
            </div>
          </div>
        </div>
      </div>

      {/* Unified Control Bar */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm border border-border/20 rounded-full px-4 py-2">
          {/* Customer Support Button */}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            Customer Support
          </Button>

          {/* Separator */}
          <Separator orientation="vertical" className="mx-2" />

          {/* Media Controls */}
          <div className="flex items-center gap-1">
            {/* Voice Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleVoiceButtonClick}
              className={cn(
                "h-8 w-8",
                isVoiceActive && "bg-accent/10 text-accent"
              )}
            >
              {isVoiceActive ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>

            {/* Camera Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCameraButtonClick}
              className={cn(
                "h-8 w-8",
                cameraState && "bg-accent/10 text-accent"
              )}
            >
              {cameraState ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
            </Button>

            {/* Screen Share Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleScreenButtonClick}
              className={cn(
                "h-8 w-8",
                isScreenSharing && "bg-accent/10 text-accent"
              )}
            >
              {isScreenSharing ? <MonitorOff className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
            </Button>
          </div>

          {/* Separator */}
          <Separator orientation="vertical" className="mx-2" />

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            {/* Download Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownloadSession}
              disabled={isDownloadingSession || !sessionIdForExport}
              className="h-8 w-8"
            >
              <Download className="h-4 w-4" />
            </Button>

            {/* Send Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                if (!ensureTerms()) return;
                const text = getInputDisplayValue().trim();
                if (!text) return;
                try {
                  await onSendMessage(text);
                } catch (error) {
                  console.error('Failed to send message:', error);
                  toast.error('Failed to send message. Please try again.');
                }
              }}
              disabled={isLoading || !getInputDisplayValue().trim()}
              className="h-8 w-8 bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </Button>

            {/* Keyboard Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsTextareaExpanded(v => !v)}
              className="h-8 w-8"
            >
              <Keyboard className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Footer Text */}
      {!isTextareaExpanded && (
        <div className="text-center text-xs text-muted-foreground/50 space-y-1">
          <div>Shift + Enter for newline</div>
          <div>Strategic guidance only - not legal, medical, or financial advice.</div>
        </div>
      )}

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
