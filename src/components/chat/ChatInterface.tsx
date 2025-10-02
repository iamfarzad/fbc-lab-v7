"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, Monitor, X, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Core chat components - clean imports
import { ChatContainer } from "./components/ChatContainer";
import { ChatHeader } from "./components/ChatHeader";
import { ChatMessages } from "./components/ChatMessages";
import { ChatInput } from "./components/ChatInput";

// Hooks - extracted logic
import { useChatState } from "./hooks/useChatState";
import { useChatMessages } from "./hooks/useChatMessages";
import { useChatAudio } from "./hooks/useChatAudio";
import { useChatIntelligence } from "./hooks/useChatIntelligence";

// Constants - centralized configuration
import { CHAT_CONSTANTS } from "./constants/chatConstants";

// Utils
import { useAIElements } from "@/hooks/useAIElements";
import { MeetingOverlay } from "@/components/meeting/MeetingOverlay";
import { AIDevtools } from "@ai-sdk-tools/devtools";
import { useArtifacts } from "@ai-sdk-tools/artifacts/client";
import { toast } from "sonner";

type StreamedArtifact = {
  id: string;
  type: string;
  status?: string;
  payload?: Record<string, any> | null;
  createdAt?: number;
  updatedAt?: number;
  version?: number;
  progress?: number;
  error?: string;
};

// Main chat interface - clean and structured
export function ChatInterface({ id }: { id?: string | null }) {
  // Extract state management to hooks
  const chatStateHook = useChatState();
  const messagesHook = useChatMessages();
  const audioHook = useChatAudio();
  // const intelligenceHook = useChatIntelligence(id); // Bypassed due to missing file
  const mockIntelligenceHook = {
    sessionId: 'mock-session',
    name: 'Test User',
    email: 'test@example.com',
    agreed: true,
    hasAcceptedTerms: true,
    contextReady: true,
    currentContext: { company: { name: 'FBC' }, person: { fullName: 'Test User' } },
    setName: () => {},
    setEmail: () => {},
    setAgreed: () => {},
    handleTermsAcceptance: () => {},
  };
  const intelligenceHook = mockIntelligenceHook;
  const artifactsState = useArtifacts();

  // Enhanced AI elements for advanced features
  const aiElements = useAIElements({
    showReasoning: true,
    showSources: true,
    showActions: true,
    showCodeBlocks: true,
    showArtifacts: true,
    enableReactions: true,
    enableReadReceipts: true,
    enableTypingIndicators: true
  });

  // Meeting overlay state
  const [isMeetingOpen, setIsMeetingOpen] = useState(false);

  // Handle opening meeting booking
  const openMeeting = useCallback(() => {
    setIsMeetingOpen(true);
  }, []);

  const { chatState } = chatStateHook;
  const isExpanded = chatState.isExpanded;
  const isMinimized = chatState.isMinimized;

  const streamedArtifacts = artifactsState.artifacts as StreamedArtifact[] | undefined;

  const derivedResearchArtifacts = useMemo<StreamedArtifact[]>(() =>
    messagesHook.researchSummaries.map((summary) => ({
      id: `research-${summary.messageId}`,
      type: "research-summary",
      status: "complete",
      payload: {
        ...summary,
        urlsUsed: summary.urlsUsed,
      },
      createdAt: summary.timestamp.getTime(),
      updatedAt: summary.timestamp.getTime(),
      version: 1,
    })),
    [messagesHook.researchSummaries]
  );

  const artifactCards = useMemo<StreamedArtifact[]>(() => (
    streamedArtifacts && streamedArtifacts.length > 0
      ? streamedArtifacts
      : derivedResearchArtifacts
  ), [streamedArtifacts, derivedResearchArtifacts]);

  const exportArtifacts = artifactCards;

  const sessionIdForExport = messagesHook.sessionId || intelligenceHook.sessionId;

  const handleExportSummary = () => {
    if (!sessionIdForExport) {
      toast.error('No active session to export.');
      return;
    }

    messagesHook.handleExportSummary({
      sessionId: sessionIdForExport,
      artifacts: exportArtifacts,
      research: messagesHook.researchSummaries,
    });
  };

  const renderActiveStreamBanner = () => {
    if (!isExpanded) return null;

    if (!(chatState.isCameraActive || chatState.isScreenSharing)) {
      return null;
    }

    return (
      <div className="mx-auto w-full max-w-4xl px-6 sm:px-10 pb-6">
        <div className="relative overflow-hidden rounded-[28px] border border-border/40 bg-card/70 py-12 text-center shadow-[0_40px_120px_-80px_rgba(12,18,26,0.45)]">
          <div className="space-y-3">
            {chatState.isCameraActive ? (
              <Camera className="mx-auto h-10 w-10 text-muted-foreground/70" />
            ) : (
              <Monitor className="mx-auto h-10 w-10 text-muted-foreground/70" />
            )}
            <p className="text-xs uppercase tracking-[0.45em] text-muted-foreground/70">
              {chatState.isCameraActive ? "Camera Active" : "Screen Share Active"}
            </p>
            <p className="text-sm text-muted-foreground">
              Participants can now see your {chatState.isCameraActive ? 'video feed' : 'shared screen'}.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderResearchStatus = () => {
    if (!intelligenceHook.sessionId) return null;

    return (
      <div className="mx-auto w-full max-w-3xl px-6 sm:px-10 pb-6">
        <div className="flex items-center gap-3 rounded-full border border-border/40 bg-card/80 px-5 py-3 text-xs text-muted-foreground shadow-[0_24px_60px_-50px_rgba(12,18,26,0.45)]">
          <div className="h-2 w-2 animate-pulse rounded-full bg-[hsl(var(--accent))]" />
          <span className="tracking-[0.35em] uppercase">Enhanced Research Active</span>
          <Badge variant="secondary" className="ml-auto text-[10px] tracking-[0.3em] uppercase">
            Auto-grounding
          </Badge>
        </div>
      </div>
    );
  };

  const renderVoiceProcessingBanner = () => {
    if (!isExpanded) return null;
    if (!chatState.isListening) return null;

    return (
      <div className="mx-auto w-full max-w-3xl px-6 sm:px-10 pb-6">
        <div className="flex items-center gap-3 rounded-full border border-border/40 bg-card/80 px-5 py-3 text-xs text-muted-foreground shadow-[0_24px_60px_-50px_rgba(12,18,26,0.45)]">
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5">
              <div className="h-1 w-0.5 bg-[hsl(var(--accent))] voice-wavebar"></div>
              <div className="h-1.5 w-0.5 bg-[hsl(var(--accent))] voice-wavebar"></div>
              <div className="h-1 w-0.5 bg-[hsl(var(--accent))] voice-wavebar"></div>
              <div className="h-1.5 w-0.5 bg-[hsl(var(--accent))] voice-wavebar"></div>
              <div className="h-1 w-0.5 bg-[hsl(var(--accent))] voice-wavebar"></div>
            </div>
          </div>
          <span className="tracking-[0.35em] uppercase">Voice Active</span>
          <Badge variant="secondary" className="ml-auto text-[10px] tracking-[0.3em] uppercase">
            Listening
          </Badge>
        </div>
      </div>
    );
  };


  // Main render - clean and organized
  return (
    <ErrorBoundary>
      {/* Chat Toggle Button */}
      <motion.div
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          onClick={chatStateHook.toggleChat}
          data-chat-trigger
          aria-label={chatStateHook.chatState.isOpen ? "Close chat" : "Open chat"}
          aria-expanded={chatStateHook.chatState.isOpen}
          className="h-12 w-12 sm:h-14 sm:w-14 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90 shadow-lg relative"
        >
          {chatStateHook.chatState.isOpen ? (
            <X className={CHAT_CONSTANTS.ICONS.MEDIUM} aria-hidden="true" />
          ) : (
            <>
              <MessageCircle className={CHAT_CONSTANTS.ICONS.MEDIUM} />
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-[hsl(var(--accent))]"></div>
              <span className="sr-only">Unread messages</span>
            </>
          )}
        </Button>
      </motion.div>

      {/* Main Chat Interface */}
      <ChatContainer chatState={chatState}>
        {isMinimized ? (
          /* Minimized State */
          <motion.div
            className="h-full flex items-center justify-between px-4 cursor-pointer"
            onClick={chatStateHook.toggleMinimize}
          >
            <div className="flex items-center gap-2">
              {/* Voice indicator with wavebar animation */}
              {chatState.isListening ? (
                <div className="flex items-center gap-1" title="Voice active">
                  <div className="flex items-center gap-0.5">
                    <div className="h-1 w-0.5 bg-[hsl(var(--accent))] voice-wavebar"></div>
                    <div className="h-1.5 w-0.5 bg-[hsl(var(--accent))] voice-wavebar"></div>
                    <div className="h-1 w-0.5 bg-[hsl(var(--accent))] voice-wavebar"></div>
                    <div className="h-1.5 w-0.5 bg-[hsl(var(--accent))] voice-wavebar"></div>
                    <div className="h-1 w-0.5 bg-[hsl(var(--accent))] voice-wavebar"></div>
                  </div>
                </div>
              ) : (
                <div className="h-2 w-2 animate-pulse rounded-full bg-primary"></div>
              )}
              
              <span className="text-sm truncate font-mono">
                F.B/c AI
              </span>
              
              {/* Status indicators */}
              <div className="flex items-center gap-1">
                {chatState.isCameraActive && (
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" title="Camera active"></div>
                )}
                {chatState.isScreenSharing && (
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" title="Screen sharing active"></div>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                chatStateHook.toggleChat();
              }}
              className="h-6 w-6 p-0 transition-colors"
            >
              <X className="h-3 w-3" />
            </Button>
          </motion.div>
        ) : (
          <div className={cn("flex h-full w-full flex-col", isExpanded ? "" : "overflow-hidden")}>
            <ChatHeader
              chatState={chatState}
              onToggleMinimize={chatStateHook.toggleMinimize}
              onToggleExpand={chatStateHook.toggleExpand}
              onToggleChat={chatStateHook.toggleChat}
            />

            {isExpanded && renderActiveStreamBanner()}
            {isExpanded && renderResearchStatus()}
            {isExpanded && renderVoiceProcessingBanner()}

            <div className={cn("flex-1 overflow-hidden", isExpanded ? "px-0" : "px-5 sm:px-6")}
            >
              <div className="flex h-full w-full flex-col">
                <div className="flex-1 overflow-hidden">
                  <ChatMessages
                    messages={messagesHook.messages}
                    enhancedMessages={messagesHook.enhancedMessages}
                    researchSummaries={messagesHook.researchSummaries}
                    isLoading={messagesHook.isLoading}
                    contextReady={intelligenceHook.contextReady}
                    currentContext={intelligenceHook.currentContext}
                    hasAcceptedTerms={intelligenceHook.hasAcceptedTerms}
                    onSendMessage={messagesHook.handleSendMessage}
                    aiElements={aiElements}
                    isExpanded={isExpanded}
                    artifacts={artifactCards}
                    name={intelligenceHook.name}
                    email={intelligenceHook.email}
                    agreed={intelligenceHook.agreed}
                    onNameChange={intelligenceHook.setName}
                    onEmailChange={intelligenceHook.setEmail}
                    onAgreedChange={intelligenceHook.setAgreed}
                    onAcceptTerms={intelligenceHook.handleTermsAcceptance}
                  />
                </div>
              </div>
            </div>

            <div className={cn("pb-4", isExpanded ? "px-8 sm:px-12 pb-10" : "px-5 sm:px-6 pb-6")}
            >
              <ChatInput
                inputValue={messagesHook.inputValue}
                isLoading={messagesHook.isLoading}
                isListening={chatState.isListening}
                voiceTranscript={audioHook.voiceTranscript}
                voicePartialTranscript={audioHook.voicePartialTranscript}
                isMinimized={chatState.isMinimized}
                voiceError={audioHook.voiceError}
                cameraState={chatState.isCameraActive}
                isScreenSharing={chatState.isScreenSharing}
                onInputChange={messagesHook.setInputValue}
                onSendMessage={messagesHook.handleSendMessage}
                onToggleVoice={audioHook.toggleVoice}
                onToggleCamera={chatStateHook.toggleCamera}
                onToggleScreenShare={chatStateHook.toggleScreenShare}
                onToggleSettings={chatStateHook.toggleSettings}
                isExpanded={isExpanded}
                onOpenMeeting={openMeeting}
                onExportSummary={handleExportSummary}
                sessionIdForExport={sessionIdForExport}
              />
            </div>
          </div>
        )}
      </ChatContainer>

      {/* Meeting Overlay */}
      <MeetingOverlay
        open={isMeetingOpen}
        onClose={() => setIsMeetingOpen(false)}
      />

      {/* AI SDK Devtools - Development Only */}
      {process.env.NODE_ENV === 'development' && (
        <AIDevtools
          config={{
            streamCapture: {
              enabled: true,
              endpoint: '/api/chat/unified',
              autoConnect: true
            }
          }}
        />
      )}
    </ErrorBoundary>
  );
}
