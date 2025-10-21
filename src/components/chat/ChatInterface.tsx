"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Button } from "@/components/ui/button";
import { X, MessageCircle } from "lucide-react";
import { cn, blobToBase64 } from "@/lib/utils";

// Core chat components - clean imports
import { ChatShell } from "./ChatShell";
import { ChatHeader } from "./components/ChatHeader";
import { ChatMessages } from "./components/ChatMessages";
import { type ChatInputHandle } from "./components/ChatInput";
import { ConversationBar } from "./components/ConversationBar";
import { SessionLimitWarning } from "./SessionLimitWarning";

// Hooks - extracted logic
import { useChatState } from "./hooks/useChatState";
import { useChatMessages } from "./hooks/useChatMessages";
import { useChatIntelligence } from "./hooks/useChatIntelligence";
import { useCamera } from "@/hooks/useCamera";
import { useChatUsagePolling } from "./hooks/useChatUsagePolling";
import { useVoicePipeline } from "./hooks/useVoicePipeline";
import { useScreenShareSnapshots } from "./hooks/useScreenShareSnapshots";

// Media display components

// Constants - centralized configuration
import { CHAT_CONSTANTS } from "./constants/chatConstants";

// Utils
import { MeetingOverlay } from "@/components/meeting/MeetingOverlay";
import { SettingsDialog } from "./components/SettingsDialog";
import { AIDevtools } from "@ai-sdk-tools/devtools";
import { FEATURE_FLAGS } from "@/config/constants";
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
  const { setListening } = chatStateHook;

  const [sessionId] = useState(() => id ?? crypto.randomUUID());
  const usage = useChatUsagePolling(sessionId);
  const [screenThumbnail, setScreenThumbnail] = useState<string | null>(null);
  const [hasNotifiedCapture, setHasNotifiedCapture] = useState(false);

  // Keep only the existing chatStateHook - no conflicting state

  const messagesHook = useChatMessages(sessionId);
  const [lastScreenSnapshot, setLastScreenSnapshot] = useState<{ analysis: string; imageData?: string; capturedAt: number } | null>(null);
  const [lastWebcamSnapshot, setLastWebcamSnapshot] = useState<{ analysis: string; capturedAt: number } | null>(null);

  // Use existing chatStateHook handlers directly

  const chatInputRef = useRef<ChatInputHandle | null>(null);
  const {
    appendVoiceUserMessage,
    updatePartialUserTranscript,
    appendVoiceAssistantChunk,
    finalizeVoiceAssistantMessage,
    updateChatContext,
  } = messagesHook;

  const {
    audio: audioHook,
    toggleVoiceSession,
    aiSpeechTranscript,
    voiceConnectionId,
    visualizerState,
    registerScreenAnalyzer,
  } = useVoicePipeline({
    sessionId,
    setListening,
    appendVoiceUserMessage,
    updatePartialUserTranscript,
    appendVoiceAssistantChunk,
    finalizeVoiceAssistantMessage,
    lastScreenSnapshot,
    lastWebcamSnapshot,
  });

  // Camera integration with continuous frame streaming (prototype pattern)
  const camera = useCamera({
    sessionId,
    voiceConnectionId,
    requireVoiceSession: false, // ✅ Allow camera to work without voice session
    enableAutoCapture: true,
    captureInterval: 500, // 2 FPS for continuous streaming
    maxDimension: 640,
    quality: 0.85,
    sendRealtimeInput: audioHook.sendRealtimeInput,
    sendContextUpdate: audioHook.sendContextUpdate,
    onAnalysis: useCallback((analysis: string, _imageData: string, capturedAt: number) => {
      // Keep for legacy compatibility but not used in prototype pattern
      setLastWebcamSnapshot({ analysis, capturedAt });
    }, []),
  });

  // Sync camera state (only update when values actually change)
  useEffect(() => {
    chatStateHook.setChatState(prev => {
      if (camera.isActive && camera.stream) {
        const next = {
          ...prev,
          isCameraActive: true,
          cameraStream: camera.stream,
          cameraError: null as string | null,
          isCameraInitializing: false,
        }
        if (
          prev.isCameraActive !== next.isCameraActive ||
          prev.cameraStream !== next.cameraStream ||
          prev.cameraError !== next.cameraError ||
          prev.isCameraInitializing !== next.isCameraInitializing
        ) {
          return next
        }
        return prev
      } else if (camera.isActive === false) {
        const next = {
          ...prev,
          isCameraActive: false,
          cameraStream: null as MediaStream | null,
          cameraError: camera.error || null,
          isCameraInitializing: camera.isInitializing,
        }
        if (
          prev.isCameraActive !== next.isCameraActive ||
          prev.cameraStream !== next.cameraStream ||
          prev.cameraError !== next.cameraError ||
          prev.isCameraInitializing !== next.isCameraInitializing
        ) {
          return next
        }
        return prev
      }
      return prev
    })

    if (
      camera.availableCameraCount !== undefined &&
      camera.availableCameraCount !== chatStateHook.availableCameras
    ) {
      chatStateHook.setAvailableCameras(camera.availableCameraCount)
    }
  }, [
    camera.isActive,
    camera.stream,
    camera.error,
    camera.isInitializing,
    camera.availableCameraCount,
    chatStateHook.availableCameras,
  ]);

  // Camera control handlers
  const handleToggleCamera = useCallback(async () => {
    await camera.toggleCamera();
  }, [camera]);

  const handleSwitchCamera = useCallback(async () => {
    await camera.switchCamera();
  }, [camera]);

  

  
  const intelligenceHook = useChatIntelligence(sessionId);
  const artifactsState = useArtifacts();

  useEffect(() => {
    if (!intelligenceHook.hasAcceptedTerms) return;

    const leadName = intelligenceHook.name?.trim() || undefined;
    const leadEmail = intelligenceHook.email?.trim() || undefined;
    const companyContext = intelligenceHook.currentContext?.company;
    const personContext = intelligenceHook.currentContext?.person;

    const leadContext = {
      name: leadName,
      email: leadEmail,
      company: companyContext?.name,
      industry: companyContext?.industry,
      role: personContext?.role,
    };

    updateChatContext({
      leadContext,
      intelligenceContext: {
        lead: { name: leadName, email: leadEmail },
        company: companyContext,
        person: personContext,
      },
    });
  }, [
    intelligenceHook.hasAcceptedTerms,
    intelligenceHook.name,
    intelligenceHook.email,
    intelligenceHook.currentContext,
    updateChatContext,
  ]);

  // Enhanced AI elements for advanced features
  const aiConfig = {
    showReasoning: FEATURE_FLAGS.REASONING_STREAMING,
    showSources: true,
    showActions: true,
    showCodeBlocks: true,
    showArtifacts: true,
    showImages: true,
    showInlineCitations: true,
    showSuggestions: true,
    showTasks: true,
    showWebPreview: true,
    enableReactions: true,
    enableReadReceipts: true,
    enableTypingIndicators: true
  };
  // AI Elements hook - keeping for future use
  // const aiElements = useAIElements(aiConfig);

  // Meeting overlay state
  const [isMeetingOpen, setIsMeetingOpen] = useState(false);
  const [requestedPopover, setRequestedPopover] = useState<'voice' | 'camera' | 'screen' | null>(null);
  const lastProcessedMessageRef = useRef<string | null>(null);

  // Handle opening meeting booking
  const openMeeting = useCallback(() => {
    setIsMeetingOpen(true);
  }, []);

  const { chatState } = chatStateHook;
  const isExpanded = chatState.isExpanded;

  const streamedArtifacts = artifactsState.artifacts as StreamedArtifact[] | undefined;

  const artifactCards = useMemo<StreamedArtifact[]>(() => (
    streamedArtifacts ?? []
  ), [streamedArtifacts]);

  const exportArtifacts = artifactCards;

  const sessionIdForExport = messagesHook.sessionId || intelligenceHook.sessionId;

  // Booking CTA (outer-layer): detect latest assistant message with triggerBooking
  const bookingTrigger = useMemo(() => {
    for (let i = messagesHook.messages.length - 1; i >= 0; i--) {
      const m = messagesHook.messages[i]
      if (m.role === 'assistant' && (m.metadata as any)?.triggerBooking) {
        return { id: m.id }
      }
    }
    return null
  }, [messagesHook.messages])

  const [dismissedBookingId, setDismissedBookingId] = useState<string | null>(null)
  useEffect(() => {
    // Reset dismissal when a new booking-triggering message arrives
    if (bookingTrigger && dismissedBookingId && bookingTrigger.id !== dismissedBookingId) {
      setDismissedBookingId(null)
    }
  }, [bookingTrigger, dismissedBookingId])

  const showBookingCta = Boolean(bookingTrigger && bookingTrigger.id !== dismissedBookingId)

  // Map HTTP chat tool approvals to actual UI toggles
  const handleApproveTool = useCallback(async (tool: string, args?: Record<string, any>) => {
    const t = String(tool || '').trim();
    try {
      if (t === 'enable_voice') {
        setRequestedPopover('voice');
        await toggleVoiceSession();
      } else if (t === 'enable_screen_share') {
        setRequestedPopover('screen');
        await chatStateHook.toggleScreenShare();
      } else if (t === 'enable_webcam') {
        setRequestedPopover('camera');
        await handleToggleCamera();
      } else {
        console.info('Unhandled tool approval:', t, args);
      }
    } catch (e) {
      console.error('Failed to approve tool:', t, e);
    }
  }, [chatStateHook, handleToggleCamera, toggleVoiceSession]);

  const handleDeclineTool = useCallback((tool: string) => {
    console.info('Tool declined:', tool);
  }, []);

  // Explicit screen analysis handler (HTTP one-shot)
  const handleAnalyzeScreen = useCallback(async (prompt: string) => {
    if (!chatState.isScreenSharing || !chatState.screenShareStream) {
      toast.error('No screen share active');
      return;
    }
    try {
      // Capture current frame into canvas
      const stream = chatState.screenShareStream as MediaStream;
      const video = document.createElement('video');
      video.srcObject = stream as any;
      await video.play();
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get 2D context');
      ctx.drawImage(video, 0, 0, width, height);
      const blob: Blob = await new Promise((resolve) => canvas.toBlob(b => resolve(b as Blob), 'image/jpeg', 0.85));
      const base64 = await blobToBase64(blob);

      const { ok, analysis } = await audioHook.sendScreenShareMessage(base64, prompt || 'Analyze current screen', {
        sessionId,
        voiceConnectionId,
        type: 'screen',
      });

      if (!ok) {
        toast.error('Screen analysis failed');
        return;
      }
      if (analysis && analysis.trim().length > 0) {
        messagesHook.appendAssistantMessage(analysis, { source: 'screen', modality: 'image', tool: 'screen_analyze' });
        setLastScreenSnapshot({ analysis, imageData: canvas.toDataURL('image/jpeg', 0.7), capturedAt: Date.now() });
        toast.success('Screen analyzed');
      } else {
        toast.info('No analysis returned');
      }
    } catch (err) {
      console.error('Analyze screen error:', err);
      toast.error('Analyze screen error');
    }
  }, [audioHook, chatState.isScreenSharing, chatState.screenShareStream, messagesHook, sessionId, voiceConnectionId]);

  useEffect(() => {
    registerScreenAnalyzer(handleAnalyzeScreen);
    return () => registerScreenAnalyzer(null);
  }, [handleAnalyzeScreen, registerScreenAnalyzer]);

  useScreenShareSnapshots({
    isScreenSharing: chatState.isScreenSharing,
    stream: chatState.screenShareStream ?? null,
    sessionId,
    isVoiceSessionActive: audioHook.isSessionActive,
    sendRealtimeInput: audioHook.sendRealtimeInput,
    sendContextUpdate: audioHook.sendContextUpdate,
    voiceConnectionId,
    setLastScreenSnapshot,
    setScreenThumbnail,
    hasNotifiedCapture,
    setHasNotifiedCapture,
  });

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

  // Camera, screen, and voice banners removed - now handled by ConversationBar

  useEffect(() => {
    const lastUserMessage = [...messagesHook.messages].reverse().find((message) => message.role === 'user');
    if (!lastUserMessage) return;
    if (lastProcessedMessageRef.current === lastUserMessage.id) return;
    lastProcessedMessageRef.current = lastUserMessage.id;

    const text = lastUserMessage.content.toLowerCase();
    let trigger: 'voice' | 'camera' | 'screen' | null = null;

    if (/(let'?s talk|can we talk|call you|speak to you|jump on a call|voice chat|talk to you)/i.test(text)) {
      trigger = 'voice';
    } else if (/(share (my|the) screen|show you (my|the) screen|screen share|look at my screen)/i.test(text)) {
      trigger = 'screen';
    } else if (/(turn on (my )?camera|show you (my )?face|video on|use the camera)/i.test(text)) {
      trigger = 'camera';
    }

    if (trigger) {
      setRequestedPopover(trigger);
    }
  }, [messagesHook.messages]);

  // Main render - clean and organized
  const minimizedContent = (
    <motion.div
      key="chat-minimized"
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
  );

  const sessionWarningNode = intelligenceHook.hasAcceptedTerms && usage ? (
    <div className={cn(isExpanded ? "mx-auto w-full max-w-3xl px-4 sm:px-6" : "px-0")}>
      <SessionLimitWarning sessionId={sessionId} usage={usage} />
    </div>
  ) : null;

  const expandedContent = (
    <div key="chat-expanded" className={cn("flex h-full w-full flex-col", isExpanded ? "" : "overflow-hidden")}>
      <ChatHeader
        chatState={chatState}
        onToggleMinimize={chatStateHook.toggleMinimize}
        onToggleExpand={chatStateHook.toggleExpand}
        onToggleChat={chatStateHook.toggleChat}
        sessionId={sessionId}
        showNextSteps={intelligenceHook.hasAcceptedTerms && usage && (usage.messages_sent >= 5 || (Date.now() - (usage.started_at || 0)) / 60000 >= 5)}
        isVoiceActive={audioHook.isSessionActive}
        onOpenMedia={undefined}
        backend={{
          voiceConnected: Boolean(audioHook.isSocketReady),
          voiceActive: Boolean(audioHook.isRecording || audioHook.isSessionActive),
          voiceError: audioHook.error || null,
          sseReady: !messagesHook.sseError,
          sseStreaming: Boolean(messagesHook.isLoading),
          sseError: messagesHook.sseError?.message || null,
        }}
      />

      <div className={cn("flex-1 overflow-hidden", isExpanded ? "px-0" : "px-5 sm:px-6")}>
        {sessionWarningNode}

            <ChatMessages
              messages={messagesHook.messages}
              researchSummaries={messagesHook.researchSummaries}
              isLoading={messagesHook.isLoading}
              contextReady={intelligenceHook.contextReady}
              currentContext={intelligenceHook.currentContext}
              hasAcceptedTerms={intelligenceHook.hasAcceptedTerms}
              onSendMessage={messagesHook.handleSendMessage}
              aiElements={aiConfig}
              isExpanded={isExpanded}
              artifacts={artifactCards}
              name={intelligenceHook.name}
              email={intelligenceHook.email}
              agreed={intelligenceHook.agreed}
              onNameChange={intelligenceHook.setName}
              onEmailChange={intelligenceHook.setEmail}
              onAgreedChange={intelligenceHook.setAgreed}
              onAcceptTerms={intelligenceHook.handleTermsAcceptance}
              onApproveTool={handleApproveTool}
              onDeclineTool={handleDeclineTool}
            />

            {/* Inline booking CTA bar */}
            {showBookingCta && (
              <div className={cn(
                "mt-3 mb-2 px-3 py-2 border border-border/30 rounded-md bg-card/80 flex items-center justify-between gap-2",
                isExpanded ? "mx-auto w-full max-w-3xl" : "mx-4"
              )}>
                <div className="text-xs text-muted-foreground">
                  Ready to book? Open the calendar to pick a time.
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="h-7 px-3 text-xs bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] hover:bg-[hsl(var(--accent))]/90"
                    onClick={() => {
                      openMeeting();
                      setDismissedBookingId(bookingTrigger!.id)
                    }}
                  >
                    Open Calendar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-3 text-xs"
                    onClick={() => setDismissedBookingId(bookingTrigger!.id)}
                  >
                    Not now
                  </Button>
                </div>
              </div>
            )}
      </div>

      <div className={cn("flex-shrink-0 border-t border-border/20 safe-area-inset-bottom", isExpanded ? "px-0 sm:px-0 py-0 pb-0" : "px-0 py-0 pb-0")}>
        <ConversationBar
          ref={chatInputRef}
          inputValue={messagesHook.inputValue}
          isLoading={messagesHook.isLoading}
          isListening={chatState.isListening}
          voiceTranscript={audioHook.transcript}
          voicePartialTranscript={audioHook.partialTranscript}
          aiSpeechTranscript={aiSpeechTranscript}
          isMinimized={chatState.isMinimized}
          voiceError={audioHook.error}
          isVoiceActive={audioHook.isRecording}
          isVoiceProcessing={audioHook.isProcessing}
          isVoiceSupported={audioHook.isVoiceSupported}
          isVoiceInitializing={!audioHook.isSocketReady && !audioHook.isRecording}
          micStream={audioHook.micStream}
          cameraState={chatState.isCameraActive}
          isCameraInitializing={chatState.isCameraInitializing}
          cameraStream={chatState.cameraStream}
          cameraError={chatState.cameraError ?? undefined}
          availableCameras={chatStateHook.availableCameras}
          isScreenSharing={chatState.isScreenSharing}
          isScreenShareInitializing={chatState.isScreenShareInitializing}
          screenShareStream={chatState.screenShareStream}
          screenThumbnail={screenThumbnail}
          screenShareError={chatState.screenShareError ?? undefined}
          onInputChange={messagesHook.setInputValue}
          onSendMessage={messagesHook.handleSendMessage}
          onToggleVoice={toggleVoiceSession}
          onToggleCamera={handleToggleCamera}
          onSwitchCamera={handleSwitchCamera}
          onToggleScreenShare={chatStateHook.toggleScreenShare}
          onToggleSettings={chatStateHook.toggleSettings}
          onAnalyzeScreen={handleAnalyzeScreen}
          isExpanded={isExpanded}
          onOpenMeeting={openMeeting}
          onExportSummary={handleExportSummary}
          sessionIdForExport={sessionIdForExport}
          autoOpenPopover={requestedPopover}
          onAutoOpenPopoverHandled={() => setRequestedPopover(null)}
          visualizerState={visualizerState}
        />
      </div>
    </div>
  );

  const overlays = (
    <>
      <MeetingOverlay
        open={isMeetingOpen}
        onClose={() => setIsMeetingOpen(false)}
      />
      <SettingsDialog
        isOpen={chatState.showSettings}
        onClose={chatStateHook.toggleSettings}
        isMonochrome={chatState.theme === 'mono'}
        onMonochromeChange={(mono) => chatStateHook.setTheme(mono ? 'mono' : 'default')}
      />
    </>
  );

  return (
    <ErrorBoundary>
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

      <ChatShell
        chatState={chatStateHook.chatState}
        minimized={minimizedContent}
        expanded={expandedContent}
        overlays={overlays}
      />

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
