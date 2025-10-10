"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Core chat components - clean imports
import { ChatContainer } from "./components/ChatContainer";
import { ChatHeader } from "./components/ChatHeader";
import { ChatMessages } from "./components/ChatMessages";
import { ChatInput } from "./components/ChatInput";
import { SessionLimitWarning } from "./SessionLimitWarning";
import { LiveTranscriptPanel } from "./components/LiveTranscriptPanel";

// Hooks - extracted logic
import { useChatState } from "./hooks/useChatState";
import { useChatMessages } from "./hooks/useChatMessages";
import { useRealtimeVoice } from "@/hooks/useRealtimeVoice";
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
  const { setListening } = chatStateHook;

  const [sessionId] = useState(() => id ?? crypto.randomUUID());
  const [usage, setUsage] = useState<any>(null);
  const [showTranscript, setShowTranscript] = useState(false);

  // Keep only the existing chatStateHook - no conflicting state

  const messagesHook = useChatMessages(sessionId);
  const [lastScreenSnapshot, setLastScreenSnapshot] = useState<{ analysis: string; imageData?: string; capturedAt: number } | null>(null);
  const [lastWebcamSnapshot, setLastWebcamSnapshot] = useState<{ analysis: string; capturedAt: number } | null>(null);

  // Use existing chatStateHook handlers directly

  // Poll usage every 10 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/usage/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          setUsage(data);
        }
      } catch (error) {
        // Silently fail - usage tracking is not critical
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [sessionId]);
  const audioHookRef = useRef<ReturnType<typeof useRealtimeVoice> | null>(null);
  const {
    appendVoiceUserMessage,
    appendVoiceAssistantChunk,
    finalizeVoiceAssistantMessage,
    updateChatContext,
  } = messagesHook;

  const handleVoiceSessionState = useCallback((state: { active: boolean; isProcessing: boolean }) => {
    setListening(state.active || state.isProcessing);
    if (!state.active && !state.isProcessing) {
      finalizeVoiceAssistantMessage();
    }
  }, [finalizeVoiceAssistantMessage, setListening]);

  const handleVoicePartialTranscript = useCallback((text: string) => {
    // Show partial transcript in UI (live transcription)
    // This is handled by useRealtimeVoice state, just log for now
    console.log('🎤 Partial transcript:', text)
  }, []);

  const handleVoiceFinalTranscript = useCallback((text: string) => {
    console.log('🎤 [ChatInterface] Final transcript received:', text);
    appendVoiceUserMessage(text);
    
    // Store in multimodal context (non-blocking)
    import('@/core/context/multimodal-context').then(({ multimodalContextManager }) => {
      multimodalContextManager.addVoiceTranscript(sessionId, text, 'user', true)
        .then(() => console.log('✅ Voice transcript stored in context'))
        .catch(err => console.error('❌ Failed to store voice context:', err))
    })
  }, [appendVoiceUserMessage, sessionId]);

  const handleVoiceAssistantText = useCallback((text: string) => {
    console.log('🤖 [ChatInterface] Assistant text chunk:', text);
    appendVoiceAssistantChunk(text);
    
    // Store assistant voice output (non-blocking)
    import('@/core/context/multimodal-context').then(({ multimodalContextManager }) => {
      multimodalContextManager.addVoiceTranscript(sessionId, text, 'assistant', true)
        .then(() => console.log('✅ Assistant voice stored in context'))
        .catch(err => console.error('❌ Failed to store assistant voice:', err))
    })
  }, [appendVoiceAssistantChunk, sessionId]);

  const handleVoiceOutputTranscript = useCallback((text: string, isFinal: boolean) => {
    // Closed captions for AI speech
    if (isFinal) {
      console.log('🔊 AI said (transcript):', text)
      // Could display as closed captions in UI
    }
  }, []);

  const handleVoiceTurnComplete = useCallback(() => {
    finalizeVoiceAssistantMessage();
  }, [finalizeVoiceAssistantMessage]);

  const handleVoiceInterrupted = useCallback(() => {
    // User interrupted AI - stop current assistant message
    console.log('🔇 Voice interrupted')
    finalizeVoiceAssistantMessage();
  }, [finalizeVoiceAssistantMessage]);

  const handleVoiceSetupComplete = useCallback(() => {
    console.log('✅ Voice session setup complete')
  }, []);

  const handleVoiceToolCall = useCallback(async (toolCall: any) => {
    if (toolCall?.handledByServer || toolCall?.handledBy === 'server') {
      console.info('🛠️ Voice tool call handled server-side; skipping client execution.');
      return;
    }
    const functionCalls: any[] = Array.isArray(toolCall?.functionCalls) ? toolCall.functionCalls : [];
    if (functionCalls.length === 0) return;

    const names = functionCalls.map((fc) => fc?.name ?? 'tool').join(', ');
    toast.info(`Running ${names}…`, { id: 'voice-tool-call' });

    const parseArgs = (raw: unknown): Record<string, unknown> => {
      if (!raw) return {};
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw) as Record<string, unknown>;
        } catch {
          return {};
        }
      }
      if (typeof raw === 'object') return raw as Record<string, unknown>;
      return {};
    };

    const responses: Array<{ id: string; name: string; response: { json: any } }> = [];

    for (const call of functionCalls) {
      const name: string = typeof call?.name === 'string' ? call.name : 'unknown_tool';
      const id: string = typeof call?.id === 'string' ? call.id : crypto.randomUUID();
      const args = parseArgs(call?.args);

      try {
        let resultPayload: Record<string, unknown> = {};

        if (name === 'search_web') {
          const query = typeof args?.query === 'string' ? args.query.trim() : '';
          const urls = Array.isArray(args?.urls) ? args.urls.filter((u): u is string => typeof u === 'string') : undefined;
          if (!query) {
            throw new Error('Missing query for web search.');
          }

          const response = await fetch('/api/tools/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, urls }),
          });

          if (!response.ok) {
            const text = await response.text().catch(() => 'Web search failed.');
            throw new Error(text || `Web search failed with status ${response.status}`);
          }

          const data = await response.json();
          resultPayload = {
            summary: data?.result?.summary ?? data?.result?.text ?? '',
            citations: data?.result?.citations ?? [],
            urlsUsed: data?.result?.urlsUsed ?? [],
          };
        } else if (name === 'capture_screen_snapshot') {
          if (!lastScreenSnapshot) {
            throw new Error('No recent screen share captured yet.');
          }
          const summaryOnly = Boolean(args?.summaryOnly);
          resultPayload = {
            analysis: lastScreenSnapshot.analysis,
            capturedAt: lastScreenSnapshot.capturedAt,
            imageAvailable: Boolean(!summaryOnly && lastScreenSnapshot.imageData),
            imageData: summaryOnly ? undefined : lastScreenSnapshot.imageData,
          };
        } else if (name === 'capture_webcam_snapshot') {
          if (!lastWebcamSnapshot) {
            throw new Error('No recent webcam capture available yet.');
          }
          const summaryOnly = Boolean(args?.summaryOnly);
          resultPayload = {
            analysis: lastWebcamSnapshot.analysis,
            capturedAt: lastWebcamSnapshot.capturedAt,
            imageAvailable: false,
            imageData: summaryOnly ? undefined : undefined,
          };
        } else {
          throw new Error(`Unsupported tool: ${name}`);
        }

        responses.push({
          id,
          name,
          response: { json: { success: true, result: resultPayload } },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Tool execution failed.';
        responses.push({
          id,
          name,
          response: { json: { success: false, error: message } },
        });
      }
    }

    const hook = audioHookRef.current;
    if (!hook) return;
    hook.sendToolResult(responses);
  }, [lastScreenSnapshot, lastWebcamSnapshot]);

  const handleVoiceToolResult = useCallback((result: any) => {
    console.log('🛠️ Voice tool result:', result);
    const payload = result?.payload ?? result;
    const errorMessage: string | undefined =
      typeof payload?.error === 'string' ? payload.error : undefined;

    if (errorMessage) {
      toast.error(errorMessage, { id: 'voice-tool-call' });
      return;
    }

    const responses = Array.isArray(payload?.responses) ? payload.responses : [];
    const failedResponse = responses.find((item: any) => item?.response?.json?.success === false);
    if (failedResponse) {
      const failureMessage =
        typeof failedResponse.response?.json?.error === 'string'
          ? failedResponse.response.json.error
          : 'Tool execution failed.';
      toast.error(failureMessage, { id: 'voice-tool-call' });
      return;
    }

    toast.success('Tool result ready.', { id: 'voice-tool-call' });
  }, []);

  const handleVoiceError = useCallback((message: string) => {
    finalizeVoiceAssistantMessage({ error: message });
  }, [finalizeVoiceAssistantMessage]);

  const audioHook = useRealtimeVoice({
    onSessionStateChange: handleVoiceSessionState,
    onPartialTranscript: handleVoicePartialTranscript,
    onFinalTranscript: handleVoiceFinalTranscript,
    onAssistantText: handleVoiceAssistantText,
    onOutputTranscript: handleVoiceOutputTranscript,
    onTurnComplete: handleVoiceTurnComplete,
    onInterrupted: handleVoiceInterrupted,
    onSetupComplete: handleVoiceSetupComplete,
    onToolCall: handleVoiceToolCall,
    onToolResult: handleVoiceToolResult,
    onError: handleVoiceError,
  });
  audioHookRef.current = audioHook;
  const voiceConnectionId = audioHook.session?.connectionId ?? null;

  // Toggle voice session (start/stop, not just mute)
  const toggleVoiceSession = useCallback(async () => {
    const hook = audioHookRef.current;
    if (!hook) {
      console.error('🎤 [ChatInterface] Audio hook ref not available');
      return;
    }
    
    console.log('🎤 [ChatInterface] toggleVoiceSession called', {
      isSessionActive: hook.isSessionActive,
      isRecording: hook.isRecording
    });
    
    if (hook.isSessionActive) {
      console.log('🎤 [ChatInterface] Stopping session...');
      await hook.stopSession();
      // Hide transcript when voice session ends
      setShowTranscript(false);
    } else {
      console.log('🎤 [ChatInterface] Starting session...');
      await hook.startSession({ sessionId });
    }
  }, [sessionId]);

  const toggleTranscript = useCallback(() => {
    setShowTranscript(prev => !prev);
  }, []);

  // Transform voice data into transcript entries
  const transcriptEntries = useMemo(() => {
    const entries: Array<{
      id: string;
      text: string;
      type: 'user' | 'assistant';
      isPartial?: boolean;
      timestamp: number;
    }> = [];

    // Add partial transcript if available (user speaking)
    if (audioHook.partialTranscript) {
      entries.push({
        id: `partial-${Date.now()}`,
        text: audioHook.partialTranscript,
        type: 'user',
        isPartial: true,
        timestamp: Date.now()
      });
    }

    // Add final transcript if available
    if (audioHook.transcript) {
      entries.push({
        id: `final-${Date.now()}`,
        text: audioHook.transcript,
        type: 'user',
        isPartial: false,
        timestamp: Date.now()
      });
    }

    // Add assistant output transcript if available
    if (audioHook.assistantText) {
      entries.push({
        id: `assistant-${Date.now()}`,
        text: audioHook.assistantText,
        type: 'assistant',
        isPartial: false,
        timestamp: Date.now()
      });
    }

    return entries;
  }, [audioHook.partialTranscript, audioHook.transcript, audioHook.assistantText]);
  
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
    showReasoning: true,
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
  const aiElements = useAIElements(aiConfig);

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
  const isMinimized = chatState.isMinimized;

  const streamedArtifacts = artifactsState.artifacts as StreamedArtifact[] | undefined;

  const artifactCards = useMemo<StreamedArtifact[]>(() => (
    streamedArtifacts ?? []
  ), [streamedArtifacts]);

  const exportArtifacts = artifactCards;

  const sessionIdForExport = messagesHook.sessionId || intelligenceHook.sessionId;

  // Capture screen share frames during voice sessions so Gemini can use them via tool calls
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stream = chatState.screenShareStream;
    if (!chatState.isScreenSharing || !stream || !audioHook.isSessionActive || !sessionId) {
      return;
    }

    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    let ready = false;
    let cancelled = false;
    let isUploading = false;

    const configureCanvas = () => {
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      const maxWidth = 1280;
      const scale = width > maxWidth ? maxWidth / width : 1;
      canvas.width = Math.floor(width * scale) || 1280;
      canvas.height = Math.floor(height * scale) || 720;
      ready = true;
      video.play().catch(() => undefined);
    };

    const handleLoadedMetadata = () => {
      configureCanvas();
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    if (video.readyState >= 1) {
      configureCanvas();
    }

    const CAPTURE_INTERVAL_MS = 8000;
    let intervalId: number | null = null;

    const captureFrame = async () => {
      if (cancelled || !ready || isUploading || !audioHook.isSessionActive) {
        return;
      }
      isUploading = true;
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        const response = await fetch('/api/tools/screen', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-intelligence-session-id': sessionId,
            ...(voiceConnectionId ? { 'x-voice-connection-id': voiceConnectionId } : {}),
          },
          body: JSON.stringify({
            image: dataUrl,
            type: 'screen',
            context: {
              trigger: 'voice',
              prompt: 'Provide a concise summary aligned with the current voice conversation.',
            },
          }),
        });
        if (response.ok) {
          const data = await response.json().catch(() => null);
          const analysis = data?.output?.analysis || data?.analysis;
          if (analysis) {
            const capturedAt = Date.now();
            setLastScreenSnapshot({ analysis, imageData: dataUrl, capturedAt });
            audioHook.sendContextUpdate({
              sessionId,
              modality: 'screen',
              analysis,
              imageData: dataUrl,
              capturedAt,
              metadata: { source: 'screen_capture', connectionId: voiceConnectionId },
            });
          }
        }
      } catch (err) {
        console.error('Screen share capture failed:', err);
      } finally {
        isUploading = false;
      }
    };

    intervalId = window.setInterval(captureFrame, CAPTURE_INTERVAL_MS);
    captureFrame();

    return () => {
      cancelled = true;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
      video.pause();
      video.srcObject = null;
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [chatState.isScreenSharing, chatState.screenShareStream, audioHook.isSessionActive, audioHook.sendContextUpdate, voiceConnectionId, sessionId]);

  // Capture webcam frames while voice is active to maintain up-to-date visual context
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stream = chatState.cameraStream;
    if (!chatState.isCameraActive || !stream || !audioHook.isSessionActive || !sessionId) {
      return;
    }

    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    let ready = false;
    let cancelled = false;
    let isUploading = false;

    const configureCanvas = () => {
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      const maxWidth = 640;
      const scale = width > maxWidth ? maxWidth / width : 1;
      canvas.width = Math.floor(width * scale) || 640;
      canvas.height = Math.floor(height * scale) || 480;
      ready = true;
      video.play().catch(() => undefined);
    };

    const handleLoadedMetadata = () => {
      configureCanvas();
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    if (video.readyState >= 1) {
      configureCanvas();
    }

    const CAPTURE_INTERVAL_MS = 12000;
    let intervalId: number | null = null;

    const captureFrame = async () => {
      if (cancelled || !ready || isUploading || !audioHook.isSessionActive) {
        return;
      }
      isUploading = true;
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/jpeg', 0.85)
        );
        if (!blob) return;

        const formData = new FormData();
        formData.append('webcamCapture', blob, `webcam-${Date.now()}.jpg`);

        const response = await fetch('/api/tools/webcam', {
          method: 'POST',
          headers: {
            'x-intelligence-session-id': sessionId,
            ...(voiceConnectionId ? { 'x-voice-connection-id': voiceConnectionId } : {}),
          },
          body: formData,
        });
        if (response.ok) {
          const data = await response.json().catch(() => null);
          const analysis = data?.analysis || data?.output?.analysis;
          if (analysis) {
            const capturedAt = Date.now();
            // Convert canvas to data URL for image data
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            setLastWebcamSnapshot({ analysis, capturedAt });
            audioHook.sendContextUpdate({
              sessionId,
              modality: 'webcam',
              analysis,
              imageData: dataUrl, // Add image data
              capturedAt,
              metadata: { source: 'webcam_capture', connectionId: voiceConnectionId },
            });
          }
        }
      } catch (err) {
        console.error('Webcam capture failed:', err);
      } finally {
        isUploading = false;
      }
    };

    intervalId = window.setInterval(captureFrame, CAPTURE_INTERVAL_MS);
    captureFrame();

    return () => {
      cancelled = true;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
      video.pause();
      video.srcObject = null;
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [chatState.isCameraActive, chatState.cameraStream, audioHook.isSessionActive, audioHook.sendContextUpdate, voiceConnectionId, sessionId]);

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

  // Camera and screen share now live entirely in their popovers
  // No background banners needed
  const renderActiveStreamBanner = () => {
    return null;
  };

  const renderResearchStatus = () => {
    if (!intelligenceHook.sessionId) return null;

    return (
      <div className="mx-auto w-full max-w-3xl px-6 sm:px-10 pb-6">
        <div className="flex items-center gap-3 rounded-full border border-border/40 bg-card/80 px-5 py-3 text-xs text-muted-foreground shadow-chat">
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
        <div className="flex items-center gap-3 rounded-full border border-border/40 bg-card/80 px-5 py-3 text-xs text-muted-foreground shadow-chat">
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
            {audioHook.isProcessing ? 'Processing' : audioHook.isRecording ? 'Recording' : 'Listening'}
          </Badge>
        </div>
      </div>
    );
  };

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
      <ChatContainer chatState={chatStateHook.chatState}>
        {chatStateHook.chatState.isMinimized ? (
          /* Minimized State */
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
        ) : (
          <div key="chat-expanded" className={cn("flex h-full w-full flex-col", isExpanded ? "" : "overflow-hidden")}>
            <ChatHeader
              chatState={chatState}
              onToggleMinimize={chatStateHook.toggleMinimize}
              onToggleExpand={chatStateHook.toggleExpand}
              onToggleChat={chatStateHook.toggleChat}
              sessionId={sessionId}
              showNextSteps={intelligenceHook.hasAcceptedTerms && usage && (usage.messages_sent >= 5 || (Date.now() - (usage.started_at || 0)) / 60000 >= 5)}
              isVoiceActive={audioHook.isSessionActive}
              showTranscript={showTranscript}
              onToggleTranscript={toggleTranscript}
            />

            {isExpanded && renderActiveStreamBanner()}
            {isExpanded && renderResearchStatus()}
            {isExpanded && renderVoiceProcessingBanner()}

            <div className={cn("flex-1 overflow-hidden", isExpanded ? "px-0" : "px-5 sm:px-6")}>
              {intelligenceHook.hasAcceptedTerms && usage && (
                <div className={cn(isExpanded ? "mx-auto w-full max-w-3xl px-4 sm:px-6" : "px-0")}>
                  <SessionLimitWarning sessionId={sessionId} usage={usage} />
                </div>
              )}
              <ChatMessages
                messages={messagesHook.messages}
                enhancedMessages={messagesHook.enhancedMessages}
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
              />
            </div>

            <div className={cn(
              "flex-shrink-0 border-t border-border/20 safe-area-inset-bottom",
              isExpanded ? "px-4 sm:px-8 py-4 pb-6" : "px-4 py-4 pb-5"
            )}>
              <ChatInput
                inputValue={messagesHook.inputValue}
                isLoading={messagesHook.isLoading}
                isListening={chatState.isListening}
                voiceTranscript={audioHook.transcript}
                voicePartialTranscript={audioHook.partialTranscript}
                isMinimized={chatState.isMinimized}
                voiceError={audioHook.error}
                isVoiceActive={audioHook.isRecording}
                isVoiceProcessing={audioHook.isProcessing}
                isVoiceSupported={audioHook.isVoiceSupported}
                isVoiceInitializing={!audioHook.isSocketReady && !audioHook.isRecording}
                  cameraState={chatState.isCameraActive}
                  isCameraInitializing={chatState.isCameraInitializing}
                  cameraStream={chatState.cameraStream}
                  cameraError={chatState.cameraError}
                  availableCameras={chatStateHook.availableCameras}
                  isScreenSharing={chatState.isScreenSharing}
                  isScreenShareInitializing={chatState.isScreenShareInitializing}
                  screenShareStream={chatState.screenShareStream}
                  screenShareError={chatState.screenShareError}
                  onInputChange={messagesHook.setInputValue}
                  onSendMessage={messagesHook.handleSendMessage}
                  onToggleVoice={toggleVoiceSession}
                onToggleCamera={chatStateHook.toggleCamera}
                onSwitchCamera={chatStateHook.switchCamera}
                onToggleScreenShare={chatStateHook.toggleScreenShare}
                onToggleSettings={chatStateHook.toggleSettings}
                isExpanded={isExpanded}
                onOpenMeeting={openMeeting}
                onExportSummary={handleExportSummary}
                sessionIdForExport={sessionIdForExport}
                autoOpenPopover={requestedPopover}
                onAutoOpenPopoverHandled={() => setRequestedPopover(null)}
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

      {/* Live Transcript Panel */}
      <LiveTranscriptPanel
        isVisible={showTranscript && audioHook.isSessionActive}
        transcripts={transcriptEntries}
      />
    </ErrorBoundary>
  );
}
