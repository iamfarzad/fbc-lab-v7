import React from "react";
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
} from "@/components/ai-elements/prompt-input";
import { toast } from "sonner";
import { CHAT_CONSTANTS } from "../constants/chatConstants";
import {
  Plus,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Monitor,
  MonitorOff,
  Settings,
  FileText,
} from "lucide-react";

interface ChatInputProps {
  inputValue: string;
  isLoading: boolean;
  isListening: boolean;
  voiceTranscript: string;
  voicePartialTranscript: string;
  voiceError: string | null;
  cameraState: boolean;
  isScreenSharing: boolean;
  onInputChange: (value: string) => void;
  onSendMessage: (message: string) => void;
  onToggleVoice: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleSettings: () => void;
}

export function ChatInput({
  inputValue,
  isLoading,
  isListening,
  voiceTranscript,
  voicePartialTranscript,
  voiceError,
  cameraState,
  isScreenSharing,
  onInputChange,
  onSendMessage,
  onToggleVoice,
  onToggleCamera,
  onToggleScreenShare,
  onToggleSettings,
}: ChatInputProps) {
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
    <div className={`border-t border-border ${CHAT_CONSTANTS.STYLING.CARD} safe-area-inset-bottom`}>
      <div className="flex items-center gap-2 p-4">
        <PromptInput
          className={`mx-2 sm:mx-4 my-2 sm:my-4 flex flex-col gap-2 rounded-3xl border border-border/60 ${CHAT_CONSTANTS.STYLING.GLASS} px-3 pb-2 pt-3 shadow-lg`}
          accept="image/*,.pdf"
          onSubmit={async (message, event) => {
            event.preventDefault();

            if (message.files && message.files.length > 0) {
              toast.info('File analysis is coming soon. The attachment was noted but not yet processed.');
            }

            if (message.text) {
              onSendMessage(message.text);
            }
          }}
        >
          <PromptInputBody className="flex flex-col gap-2">
            <PromptInputTextarea
              className={`rounded-2xl bg-transparent px-2 sm:px-4 text-base sm:text-base leading-relaxed placeholder:text-muted-foreground/70 ${CHAT_CONSTANTS.STYLING.FONT_SANS}`}
              value={getInputDisplayValue()}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder={getPlaceholder()}
              disabled={isLoading || isListening}
            />

            {(isListening) && (voicePartialTranscript || voiceTranscript) && (
              <div className="px-2 text-xs text-muted-foreground/80">
                <span className="font-medium text-muted-foreground">Voice preview:</span>{' '}
                {voicePartialTranscript || voiceTranscript?.split('\n').slice(-1)[0]}
              </div>
            )}

            {voiceError && (
              <div className="px-2 text-xs text-destructive/80">
                {voiceError}
              </div>
            )}

            <PromptInputToolbar className="items-center px-2 pb-1 pt-0">
              <PromptInputTools className="gap-0.5 sm:gap-1.5">
                {/* Upload/Attachment button */}
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger
                    className={`h-8 sm:h-9 rounded-full px-2 sm:px-3 text-xs sm:text-sm transition-colors ${CHAT_CONSTANTS.STYLING.HOVER_SCALE} ${CHAT_CONSTANTS.STYLING.FOCUS_RING} ${CHAT_CONSTANTS.STYLING.INTERACTIVE} border border-border/60 bg-background`}
                    aria-label="Upload files"
                  >
                    <Plus className={CHAT_CONSTANTS.ICONS.SMALL} aria-hidden="true" />
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

                {/* Voice button */}
                <PromptInputButton
                  variant={isListening ? 'default' : 'ghost'}
                  className={`h-8 sm:h-9 rounded-full px-2 sm:px-3 text-xs sm:text-sm transition-colors ${CHAT_CONSTANTS.STYLING.HOVER_SCALE} ${CHAT_CONSTANTS.STYLING.FOCUS_RING} ${CHAT_CONSTANTS.STYLING.INTERACTIVE}`}
                  onClick={onToggleVoice}
                  aria-label={isListening ? 'Stop voice conversation' : 'Start voice conversation'}
                  title={isListening ? 'Stop voice conversation' : 'Start voice conversation'}
                >
                  {isListening ? (
                    <Mic className={CHAT_CONSTANTS.ICONS.SMALL} aria-hidden="true" />
                  ) : (
                    <MicOff className={CHAT_CONSTANTS.ICONS.SMALL} aria-hidden="true" />
                  )}
                </PromptInputButton>

                {/* Camera button */}
                <PromptInputButton
                  variant={cameraState ? 'default' : 'ghost'}
                  className={`h-8 sm:h-9 rounded-full px-2 sm:px-3 text-xs sm:text-sm transition-colors ${CHAT_CONSTANTS.STYLING.HOVER_SCALE} ${CHAT_CONSTANTS.STYLING.FOCUS_RING} ${CHAT_CONSTANTS.STYLING.INTERACTIVE}`}
                  onClick={onToggleCamera}
                  aria-label={`${cameraState ? 'Disable' : 'Enable'} camera`}
                  title={`${cameraState ? 'Disable' : 'Enable'} camera`}
                >
                  {cameraState ? (
                    <Camera className={CHAT_CONSTANTS.ICONS.SMALL} aria-hidden="true" />
                  ) : (
                    <CameraOff className={CHAT_CONSTANTS.ICONS.SMALL} aria-hidden="true" />
                  )}
                </PromptInputButton>

                {/* Screen share button */}
                <PromptInputButton
                  variant={isScreenSharing ? 'default' : 'ghost'}
                  className={`h-8 sm:h-9 rounded-full px-2 sm:px-3 text-xs sm:text-sm transition-colors ${CHAT_CONSTANTS.STYLING.HOVER_SCALE} ${CHAT_CONSTANTS.STYLING.FOCUS_RING} ${CHAT_CONSTANTS.STYLING.INTERACTIVE}`}
                  onClick={onToggleScreenShare}
                  aria-label="Toggle screen share"
                  title="Toggle screen share"
                >
                  {isScreenSharing ? (
                    <Monitor className={CHAT_CONSTANTS.ICONS.SMALL} aria-hidden="true" />
                  ) : (
                    <MonitorOff className={CHAT_CONSTANTS.ICONS.SMALL} aria-hidden="true" />
                  )}
                </PromptInputButton>

                {/* Settings button */}
                <PromptInputButton
                  variant="ghost"
                  className={`h-8 sm:h-9 rounded-full px-2 sm:px-3 text-xs sm:text-sm transition-colors ${CHAT_CONSTANTS.STYLING.HOVER_SCALE} ${CHAT_CONSTANTS.STYLING.FOCUS_RING} ${CHAT_CONSTANTS.STYLING.INTERACTIVE}`}
                  onClick={onToggleSettings}
                  aria-label="Chat settings"
                  title="Chat settings"
                >
                  <Settings className={CHAT_CONSTANTS.ICONS.SMALL} aria-hidden="true" />
                </PromptInputButton>
              </PromptInputTools>

              <PromptInputSubmit
                className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors ${CHAT_CONSTANTS.STYLING.HOVER_SCALE} ${CHAT_CONSTANTS.STYLING.FOCUS_RING} ${CHAT_CONSTANTS.STYLING.INTERACTIVE}`}
                variant="ghost"
                status={isLoading ? 'submitted' : undefined}
                disabled={isLoading || !getInputDisplayValue().trim()}
                aria-label={isLoading ? 'Sending message...' : 'Send message'}
              />
            </PromptInputToolbar>
          </PromptInputBody>
        </PromptInput>
      </div>
    </div>
  );
}
