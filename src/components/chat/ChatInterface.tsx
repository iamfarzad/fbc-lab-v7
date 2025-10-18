"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Button } from "@/components/ui/button";
import { X, MessageCircle, Calendar, SkipForward, RotateCcw } from "lucide-react";
import { cn, blobToBase64 } from "@/lib/utils";

// Core chat components - clean imports
import { ChatContainer } from "./components/ChatContainer";
import { ChatHeader } from "./components/ChatHeader";
import { ChatMessages } from "./components/ChatMessages";
import { type ChatInputHandle } from "./components/ChatInput";
import { ConversationBar } from "./components/ConversationBar";
import { SessionLimitWarning } from "./SessionLimitWarning";

// Hooks - extracted logic
import { useChatState } from "./hooks/useChatState";
import { useChatMessages } from "./hooks/useChatMessages";
import { useLiveApi } from "@/hooks/useLiveApi";
import { useChatIntelligence } from "./hooks/useChatIntelligence";
import { useCamera } from "@/hooks/useCamera";

// Media display components

// Constants - centralized configuration
import { CHAT_CONSTANTS } from "./constants/chatConstants";

// Utils
import { MeetingOverlay } from "@/components/meeting/MeetingOverlay";
import { SettingsDialog } from "./components/SettingsDialog";
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
  const [screenThumbnail, setScreenThumbnail] = useState<string | null>(null);
  const [hasNotifiedCapture, setHasNotifiedCapture] = useState(false);
  const [detectedExitIntent, setDetectedExitIntent] = useState(false);
  const [bookingWidgetShown, setBookingWidgetShown] = useState(false);

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

  const audioHookRef = useRef<ReturnType<typeof useLiveApi> | null>(null);
  const chatInputRef = useRef<ChatInputHandle | null>(null);
  const [aiSpeechTranscript, setAiSpeechTranscript] = useState('');
  const analyzeScreenRef = useRef<((prompt: string) => void | Promise<void>) | null>(null);
  const {
    appendVoiceUserMessage,
    updatePartialUserTranscript,
    appendVoiceAssistantChunk,
    finalizeVoiceAssistantMessage,
    updateChatContext,
  } = messagesHook;

  const handleVoiceSessionState = useCallback((state: { active: boolean; isProcessing?: boolean; connectionId?: string | null; mock?: boolean }) => {
    setListening(state.active || Boolean(state.isProcessing));
    if (!state.active && !state.isProcessing) {
      finalizeVoiceAssistantMessage();
    }
  }, [finalizeVoiceAssistantMessage, setListening]);

  const handleVoicePartialTranscript = useCallback((text: string) => {
    // Update partial message in chat directly
    updatePartialUserTranscript(text);
    console.log('🎤 Partial transcript:', text);
  }, [updatePartialUserTranscript]);

  const handleVoiceFinalTranscript = useCallback((text: string) => {
    console.log('🎤 [ChatInterface] Final transcript received:', text);
    appendVoiceUserMessage(text);
    
    // Store in multimodal context (non-blocking)
    import('@/core/context/multimodal-context').then(({ multimodalContextManager }) => {
      multimodalContextManager.addVoiceTranscript(sessionId, text, 'user', true)
        .then(() => console.log('✅ Voice transcript stored in context'))
        .catch(err => console.error('❌ Failed to store voice context:', err))
    })

    // Lightweight voice trigger for explicit screen analysis
    try {
      const lower = text.toLowerCase();
      const wantsScreenAnalyze = /(analy[sz]e|look|describe|what\s*(?:'s| is)\s*on).*\b(screen|this|it)\b/.test(lower);
      if (wantsScreenAnalyze && analyzeScreenRef.current) {
        analyzeScreenRef.current(text);
      }
    } catch {}
  }, [appendVoiceUserMessage, sessionId]);

  const handleVoiceAssistantText = useCallback((text: string) => {
    console.log('🤖 [ChatInterface] Assistant text chunk:', text);
    appendVoiceAssistantChunk(text);
    
    // Store assistant voice output (non-blocking)
    import('@/core/context/multimodal-context').then(({ multimodalContextManager }) => {
      multimodalContextManager.addVoiceTranscript(sessionId, text, 'assistant', true)
        .then(() => console.log('✅ Assistant voice stored in context'))
        .catch((err: unknown) => console.error('❌ Failed to store assistant voice:', err));
    }).catch((err) => {
      console.warn('⚠️ Multimodal context not available:', err);
    });
  }, [appendVoiceAssistantChunk, sessionId]);

  const handleVoiceOutputTranscript = useCallback((text: string, isFinal: boolean) => {
    // Closed captions for AI speech
    if (isFinal) {
      console.log('🔊 AI said (transcript):', text);
      setAiSpeechTranscript(text);
      // Clear after 3 seconds
      setTimeout(() => setAiSpeechTranscript(''), 3000);
    } else {
      setAiSpeechTranscript(text); // Show partial
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
    // Silent - tracked via state
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

  const audioHook = useLiveApi({
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
  const voiceConnectionId = audioHook.session?.connectionId ?? undefined;
  // Map voice hook state to visualizer state
  const visualizerState = useMemo(() => {
    if (!audioHook.isSocketReady) return 'connecting' as const;
    if (audioHook.isProcessing && !audioHook.isRecording) return 'initializing' as const;
    if (audioHook.isRecording) return 'listening' as const;
    // If we recently received model replies, treat as speaking; otherwise thinking
    return (audioHook.modelReplies?.length ?? 0) > 0 ? ('speaking' as const) : ('thinking' as const);
  }, [audioHook.isSocketReady, audioHook.isProcessing, audioHook.isRecording, audioHook.modelReplies]);

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
    }, [sessionId]),
  });

  // Sync camera state
  useEffect(() => {
    if (camera.isActive && camera.stream) {
      chatStateHook.setChatState(prev => ({
        ...prev,
        isCameraActive: true,
        cameraStream: camera.stream,
        cameraError: null,
        isCameraInitializing: false,
      }));
      if (camera.availableCameraCount !== undefined) {
        chatStateHook.setAvailableCameras(camera.availableCameraCount);
      }
    } else if (camera.isActive === false) {
      chatStateHook.setChatState(prev => ({
        ...prev,
        isCameraActive: false,
        cameraStream: null,
        cameraError: camera.error || null,
        isCameraInitializing: camera.isInitializing,
      }));
    }
  }, [camera.isActive, camera.stream, camera.error, camera.isInitializing, camera.availableCameraCount]);

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
    } else {
      console.log('🎤 [ChatInterface] Starting session...');
      await hook.startSession({ sessionId });
    }
  }, [sessionId]);

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
    showReasoning: true,  // Enable reasoning display (chain of thought)
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

  // CRITICAL FIX: Auto-trigger booking widget on exit intent
  useEffect(() => {
    if (detectedExitIntent && !bookingWidgetShown) {
      setBookingWidgetShown(true);
      // Trigger calendar widget
      openMeeting();
    }
  }, [detectedExitIntent, bookingWidgetShown, openMeeting]);

  const { chatState } = chatStateHook;
  const isExpanded = chatState.isExpanded;

  const streamedArtifacts = artifactsState.artifacts as StreamedArtifact[] | undefined;

  const artifactCards = useMemo<StreamedArtifact[]>(() => (
    streamedArtifacts ?? []
  ), [streamedArtifacts]);

  const exportArtifacts = artifactCards;

  const sessionIdForExport = messagesHook.sessionId || intelligenceHook.sessionId;

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
  }, [audioHook, chatState.isScreenSharing, chatState.screenShareStream, messagesHook.appendAssistantMessage, sessionId, voiceConnectionId]);

  // Expose for voice-triggered analyze
  useEffect(() => {
    analyzeScreenRef.current = handleAnalyzeScreen;
    return () => { analyzeScreenRef.current = null; }
  }, [handleAnalyzeScreen]);

  // Capture screen share frames and send to Gemini for analysis
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stream = chatState.screenShareStream;
    if (!chatState.isScreenSharing || !stream || !sessionId) {
      return;
    }

    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      toast.error('Failed to initialize screen capture');
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

    const CAPTURE_INTERVAL_MS = 500; // 2 FPS for continuous streaming (prototype pattern)
    const THUMBNAIL_INTERVAL_MS = 2000;
    const ANALYSIS_INTERVAL_MS = 4000;
    let captureIntervalId: number | null = null;
    let thumbnailIntervalId: number | null = null;
    let lastAnalysisAt = 0;

    const runScreenAnalysis = async (imageDataUrl: string, capturedAt: number, source: 'stream' | 'legacy') => {
      try {
        const response = await fetch('/api/tools/screen', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-intelligence-session-id': sessionId,
            ...(voiceConnectionId ? { 'x-voice-connection-id': voiceConnectionId } : {}),
          },
          body: JSON.stringify({
            image: imageDataUrl,
            type: 'screen',
            context: {
              trigger: audioHook.isSessionActive ? 'voice' : 'manual',
              prompt: audioHook.isSessionActive
                ? 'Provide a concise summary aligned with the current voice conversation.'
                : 'Analyze this screen and provide key insights.',
            },
          }),
        });

        if (!response.ok) {
          console.error('Screen analysis request failed with status', response.status);
          return;
        }

        const data = await response.json().catch(() => null);
        const analysis = data?.output?.analysis || data?.analysis;
        if (!analysis) return;

        setLastScreenSnapshot({ analysis, imageData: imageDataUrl, capturedAt });
        console.log('📸 Screen captured and analyzed', {
          trigger: audioHook.isSessionActive ? 'voice' : 'manual',
          analysisLength: analysis.length,
          timestamp: new Date(capturedAt).toLocaleTimeString()
        });

        if (!hasNotifiedCapture) {
          toast.success(source === 'stream'
            ? 'Screen sharing active - streaming frames continuously'
            : 'Screen sharing active - capturing regularly');
          setHasNotifiedCapture(true);
        }

        if (typeof audioHook.sendContextUpdate === 'function') {
          audioHook.sendContextUpdate({
            sessionId,
            modality: 'screen',
            analysis,
            imageData: imageDataUrl,
            capturedAt,
            metadata: {
              source: source === 'stream' ? 'screen_share_stream' : 'screen_capture',
              connectionId: voiceConnectionId,
            },
          });
        }
      } catch (err) {
        console.error('❌ Failed to analyze screen frame:', err);
      }
    };

    const captureFrame = async () => {
      if (cancelled || !ready || isUploading) {
        return;
      }
      
      // ✅ Check video is ready (prototype MediaStreamContext.tsx:162)
      if (video.readyState < 2) {
        return; // Skip this frame
      }
      
      isUploading = true;
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/jpeg', 0.7)
        );
        if (!blob) {
          isUploading = false;
          return;
        }

        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        const capturedAt = Date.now();
        const shouldAnalyze = capturedAt - lastAnalysisAt >= ANALYSIS_INTERVAL_MS;
        const hasRealtimeInput = typeof audioHook.sendRealtimeInput === 'function';

        if (hasRealtimeInput) {
          try {
            const base64Data = await blobToBase64(blob);
            audioHook.sendRealtimeInput([{
              mimeType: 'image/jpeg',
              data: base64Data,
            }]);
            console.log('📺 Screen frame streamed to Live API');
          } catch (err) {
            console.error('❌ Failed to stream screen frame:', err);
          }
        }

        if (hasRealtimeInput && !hasNotifiedCapture) {
          setLastScreenSnapshot({
            analysis: 'Screen frame captured - awaiting analysis...',
            imageData: dataUrl,
            capturedAt,
          });
        }

        if (!hasRealtimeInput || shouldAnalyze) {
          lastAnalysisAt = capturedAt;
          await runScreenAnalysis(dataUrl, capturedAt, hasRealtimeInput ? 'stream' : 'legacy');
        }
      } catch (err) {
        console.error('Screen share capture failed:', err);
      } finally {
        isUploading = false;
      }
    };

    const updateThumbnail = () => {
      if (cancelled || !ready) return;
      
      // ✅ Check video is ready
      if (video.readyState < 2) return;
      
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.5);
        setScreenThumbnail(thumbnailUrl);
      } catch (err) {
        console.debug('Thumbnail update skipped:', err);
      }
    };

    // ✅ Delay 1 second for video to be ready (prototype pattern)
    const startDelay = setTimeout(() => {
      captureIntervalId = window.setInterval(captureFrame, CAPTURE_INTERVAL_MS);
      thumbnailIntervalId = window.setInterval(updateThumbnail, THUMBNAIL_INTERVAL_MS);
      captureFrame();
      updateThumbnail();
    }, 1000);

    return () => {
      cancelled = true;
      clearTimeout(startDelay);
      if (captureIntervalId) {
        window.clearInterval(captureIntervalId);
      }
      if (thumbnailIntervalId) {
        window.clearInterval(thumbnailIntervalId);
      }
      video.pause();
      video.srcObject = null;
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      setScreenThumbnail(null);
      setHasNotifiedCapture(false);
    };
  }, [chatState.isScreenSharing, chatState.screenShareStream, audioHook.isSessionActive, audioHook.sendContextUpdate, voiceConnectionId, sessionId, hasNotifiedCapture]);

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

  // CRITICAL FIX: Quick booking handler
  const handleQuickBook = useCallback(() => {
    setDetectedExitIntent(true);
    openMeeting();
  }, [openMeeting]);

  // CRITICAL FIX: Skip to recap handler
  const handleSkipToRecap = useCallback(() => {
    const skipMessage = "Let's wrap this up and move to next steps.";
    messagesHook.handleSendMessage(skipMessage);
  }, [messagesHook]);

  // CRITICAL FIX: Skip current question handler
  const handleSkipQuestion = useCallback(() => {
    const skipMessage = "Let's move on to something else.";
    messagesHook.handleSendMessage(skipMessage);
  }, [messagesHook]);

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
  }, [messagesHook.messages.length]); // Only depend on array length, not the array itself

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

      {/* CRITICAL FIX: Floating Action Button for Quick Booking */}
      {chatStateHook.chatState.isOpen && (
        <motion.div
          className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-40"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={handleQuickBook}
            className="h-10 px-4 bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] hover:bg-[hsl(var(--accent))]/90 shadow-lg"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Book a Call
          </Button>
        </motion.div>
      )}

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

            {/* Legacy banners are disabled under the unified Conversation Bar */}

            <div className={cn("flex-1 overflow-hidden", isExpanded ? "px-0" : "px-5 sm:px-6")}>
              {intelligenceHook.hasAcceptedTerms && usage && (
                <div className={cn(isExpanded ? "mx-auto w-full max-w-3xl px-4 sm:px-6" : "px-0")}>
                  <SessionLimitWarning sessionId={sessionId} usage={usage} />
                </div>
              )}

              {/* CRITICAL FIX: Conversation Progress Indicator */}
              {intelligenceHook.hasAcceptedTerms && (
                <div className={cn("mb-4", isExpanded ? "mx-auto w-full max-w-3xl px-4 sm:px-6" : "px-0")}>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium">Discovery Progress</h3>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSkipToRecap}
                          className="h-8 px-3 text-xs"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Recap
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSkipQuestion}
                          className="h-8 px-3 text-xs"
                        >
                          <SkipForward className="h-3 w-3 mr-1" />
                          Skip
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {['goals', 'pain', 'data', 'readiness', 'budget', 'success'].map((category) => (
                        <div
                          key={category}
                          className={cn(
                            "px-2 py-1 rounded text-center",
                            messagesHook.messages.some(m => 
                              m.role === 'assistant' && 
                              m.content.toLowerCase().includes(category)
                            ) 
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          )}
                        >
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

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
            </div>

            <div className={cn("flex-shrink-0 border-t border-border/20 safe-area-inset-bottom", isExpanded ? "px-0 sm:px-0 py-0 pb-0" : "px-0 py-0 pb-0") }>
              {
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
              }
            </div>
          </div>
        )}
      </ChatContainer>

      {/* Meeting Overlay */}
      <MeetingOverlay
        open={isMeetingOpen}
        onClose={() => setIsMeetingOpen(false)}
      />

      {/* Settings Dialog */}
      <SettingsDialog
        isOpen={chatState.showSettings}
        onClose={chatStateHook.toggleSettings}
        isMonochrome={chatState.theme === 'mono'}
        onMonochromeChange={(mono) => chatStateHook.setTheme(mono ? 'mono' : 'default')}
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

      {/* Draggable overlays removed per consolidation: Conversation Bar owns media */}
    </ErrorBoundary>
  );
}
