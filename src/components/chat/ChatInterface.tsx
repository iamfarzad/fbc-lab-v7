"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ErrorBoundary } from "@/components/ui/error-boundary";

// Import AI Elements components
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  PromptInputButton,
  PromptInputSubmit,
  PromptInputAttachments,
  PromptInputAttachment,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionMenuItem,
  PromptInputActionAddAttachments,
} from "@/components/ai-elements/prompt-input";
import { Loader } from "@/components/ai-elements/loader";
import { Suggestion } from "@/components/ai-elements/suggestion";
import { EnhancedMessage } from "@/components/ai-elements/enhanced-message";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton
} from "@/components/ai-elements/conversation";
import { AIDevtools } from "@ai-sdk-tools/devtools";
import { generateId } from "ai";
import { useAIElements } from "@/hooks/useAIElements";
import { EnhancedChatMessage } from "@/types/chat-enhanced";
import { useWebSocketVoice } from "@/hooks/useWebSocketVoice";

// UI Components
import { Button } from "@/components/ui/button";
import { MeetingOverlay } from "@/components/meeting/MeetingOverlay";
import { Badge } from "@/components/ui/badge";

// Icons
import {
  MessageCircle,
  X,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Monitor,
  MonitorOff,
  Settings,
  Minimize2,
  Expand,
  Shrink,
  Plus,
  RotateCcw,
  FileText,
  ExternalLink,
} from "lucide-react";

const DEFAULT_SUGGESTIONS = [
  "What AI consulting services do you offer?",
  "Tell me about your workshops",
  "How can AI help my business?",
  "What's your implementation process?",
  "Do you offer custom AI solutions?",
  "Schedule a strategy call"
];

const MEETING_KEYWORDS = [
  "book",
  "schedule",
  "meeting",
  "call",
  "consultation",
  "strategy call",
  "calendar",
  "cal.com",
  "calendly"
];

const TARGET_VOICE_SAMPLE_RATE = 16000;

function convertFloat32ToPCM16Buffer(float32: Float32Array) {
  const int16 = new Int16Array(float32.length)
  for (let i = 0; i < float32.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, float32[i]))
    int16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
  }
  return int16.buffer
}

function downsampleToPCM16(input: Float32Array, inputSampleRate: number, targetSampleRate: number) {
  if (targetSampleRate >= inputSampleRate) {
    return convertFloat32ToPCM16Buffer(input)
  }

  const sampleRateRatio = inputSampleRate / targetSampleRate
  const newLength = Math.round(input.length / sampleRateRatio)
  const result = new Float32Array(newLength)

  let offset = 0
  for (let i = 0; i < newLength; i += 1) {
    const nextOffset = Math.round((i + 1) * sampleRateRatio)
    let accum = 0
    let count = 0
    for (let j = offset; j < nextOffset && j < input.length; j += 1) {
      accum += input[j]
      count += 1
    }
    result[i] = count > 0 ? accum / count : 0
    offset = nextOffset
  }

  return convertFloat32ToPCM16Buffer(result)
}

// Types - Using EnhancedChatMessage from chat-enhanced.ts
interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  type?: 'text' | 'voice' | 'image' | 'screen';
  metadata?: {
    fileName?: string;
    fileType?: string;
  };
}

interface ChatState {
  isOpen: boolean;
  isMinimized: boolean;
  isExpanded: boolean;
  isScreenSharing: boolean;
  isCameraActive: boolean;
  isListening: boolean;
  showSettings: boolean;
}

interface Props {
  id?: string | null;
}

// Camera service hook (simplified)
const useCameraService = () => {
  const [cameraState, setCameraState] = useState({
    isActive: false,
    availableDevices: ['default', 'front'],
    currentDevice: 'default'
  });

  const startCamera = async () => {
    setCameraState(prev => ({ ...prev, isActive: true }));
  };

  const stopCamera = () => {
    setCameraState(prev => ({ ...prev, isActive: false }));
  };

  const switchCamera = () => {
    setCameraState(prev => ({
      ...prev,
      currentDevice: prev.currentDevice === 'default' ? 'front' : 'default'
    }));
  };

  return {
    cameraState,
    startCamera,
    stopCamera,
    switchCamera
  };
};

export function ChatInterface({ id }: Props) {
  // Enhanced AI elements hook
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

  // Chat state
  const [chatState, setChatState] = useState<ChatState>({
    isOpen: false,
    isMinimized: false,
    isExpanded: false,
    isScreenSharing: false,
    isCameraActive: false,
    isListening: false,
    showSettings: false
  });

  // Messages and loading state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const [contextReady, setContextReady] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(() => {
    // Check localStorage for terms acceptance
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fbc-terms-accepted') === 'true';
    }
    return false;
  });
  const sessionIdRef = useRef<string>(id || generateId());
  const hasInitialisedRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  
  // Enhanced messages state
  const [enhancedMessages, setEnhancedMessages] = useState<EnhancedChatMessage[]>([]);
  const [isMeetingOpen, setIsMeetingOpen] = useState(false);

  // Voice streaming state
  const voice = useWebSocketVoice();
  const [isListening, setIsListening] = useState(false);
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const captureContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const voiceUserSegmentsRef = useRef<string[]>([]);
  const voiceAssistantSegmentsRef = useRef<string[]>([]);

  const { 
    cameraState, 
    startCamera, 
    stopCamera, 
    switchCamera 
  } = useCameraService();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const fetchSuggestions = useCallback(async () => {
    try {
      const response = await fetch('/api/intelligence/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionIdRef.current })
      });

      if (!response.ok) {
        setSuggestions(DEFAULT_SUGGESTIONS);
        return;
      }

      const data = await response.json();
      const raw = Array.isArray(data?.suggestions) ? data.suggestions : data?.output?.suggestions;
      if (!Array.isArray(raw) || raw.length === 0) {
        setSuggestions(DEFAULT_SUGGESTIONS);
        return;
      }

      setSuggestions(
        raw.map((item: any) =>
          (item?.label || item?.text || '').toString().trim() || 'Ask another question'
        )
      );
    } catch (error) {
      console.warn('Suggestion fetch failed', error);
      setSuggestions(DEFAULT_SUGGESTIONS);
    }
  }, []);

  const initialiseSession = useCallback(async () => {
    if (hasInitialisedRef.current) return;

    // For inline terms acceptance, we don't need to show a modal
    // Terms acceptance is handled inline in the chat interface
    if (!hasAcceptedTerms) {
      return; // Wait for user to accept terms inline
    }

    // Initialize session after terms acceptance
    try {
      setContextReady(false);
      const response = await fetch('/api/intelligence/session-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          consentGiven: true
        })
      });

      if (!response.ok) {
        console.warn('Failed to initialise intelligence session', await response.text());
        return;
      }

      hasInitialisedRef.current = true;
      setContextReady(true);
      await fetchSuggestions();
    } catch (error) {
      console.warn('Session initialisation failed', error);
    }
  }, [hasAcceptedTerms, fetchSuggestions]);


  const handleTermsAcceptance = async () => {
    if (!agreed) return;

    // Store acceptance in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('fbc-terms-accepted', 'true');
    }

    setHasAcceptedTerms(true);
    setAgreed(false);

    // Initialize session if not already done
    if (!hasInitialisedRef.current) {
      await initialiseSession();
    }

    toast.success('Welcome to F.B/c AI! Your personalized consultation begins now.');
  };

  useEffect(() => {
    if (chatState.isOpen) {
      void initialiseSession();
    }
  }, [chatState.isOpen, initialiseSession]);

  const teardownAudio = useCallback(() => {
    try {
      processorRef.current?.disconnect();
    } catch {}
    processorRef.current = null;

    try {
      sourceNodeRef.current?.disconnect();
    } catch {}
    sourceNodeRef.current = null;

    if (captureContextRef.current) {
      captureContextRef.current.close().catch(() => undefined);
      captureContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      mediaStreamRef.current = null;
    }
  }, []);

  const handleAudioProcess = useCallback((event: any) => {
    console.log('🎤 ScriptProcessorNode audio process, session active:', voice.isSessionActive);
    if (!voice.isSessionActive) {
      console.log('🎤 Session not active, skipping audio processing');
      return;
    }
    const channelData = event.inputBuffer.getChannelData(0);
    const pcmBuffer = downsampleToPCM16(channelData, event.inputBuffer.sampleRate, TARGET_VOICE_SAMPLE_RATE);
    console.log('🎤 ScriptProcessorNode sending audio chunk, size:', pcmBuffer.byteLength);
    voice.sendAudioChunk(pcmBuffer, `audio/pcm;rate=${TARGET_VOICE_SAMPLE_RATE}`);
  }, [voice]);

  const setupRecorder = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: TARGET_VOICE_SAMPLE_RATE,
          sampleSize: 16,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      mediaStreamRef.current = stream;
      const audioContext = new AudioContext({ sampleRate: TARGET_VOICE_SAMPLE_RATE });
      captureContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      // Use AudioWorkletNode instead of deprecated ScriptProcessorNode
      try {
        await audioContext.audioWorklet.addModule('/audio-processor.js');
        const processor = new AudioWorkletNode(audioContext, 'audio-processor');
        processorRef.current = processor;
        
        // Handle audio data from the worklet
        processor.port.onmessage = (event) => {
          console.log('🎤 AudioWorklet message received:', event.data.type);
          if (event.data.type === 'audioData') {
            // Use both React state and ref to check session status
            const sessionActive = voice.isSessionActive;
            console.log('🎤 Processing audio data, session active:', sessionActive);

            if (sessionActive) {
              const channelData = event.data.data;
              const pcmBuffer = downsampleToPCM16(channelData, audioContext.sampleRate, TARGET_VOICE_SAMPLE_RATE);
              console.log('🎤 Sending audio chunk, size:', pcmBuffer.byteLength);
              voice.sendAudioChunk(pcmBuffer, `audio/pcm;rate=${TARGET_VOICE_SAMPLE_RATE}`);
            } else {
              console.log('🎤 Audio data received but session not yet active, buffering...', {
                type: event.data.type,
                sessionActive: voice.isSessionActive,
                bufferedCount: 0 // This would show buffered count if we exposed it
              });
            }
          }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
      } catch (workletError) {
        console.warn('AudioWorklet not supported, falling back to ScriptProcessorNode:', workletError);
        
        // Fallback to ScriptProcessorNode for older browsers
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        processor.onaudioprocess = handleAudioProcess;
        source.connect(processor);
        processor.connect(audioContext.destination);
      }
    } catch (error) {
      teardownAudio();
      throw error;
    }
  }, [handleAudioProcess, teardownAudio, voice]);

  const startVoiceSession = useCallback(async () => {
    if (!isVoiceSupported) {
      toast.error('Voice capture not supported in this browser');
      return;
    }

    try {
      setIsLoading(true);
      aiElements.setLoading(true);

      // Start session first and wait for it to be active
      console.log('🔊 Starting voice session...');
      await voice.startSession();

      // Wait for session to become active before setting up recorder
      // This prevents the race condition where audio starts before session is ready
      const waitForSessionActive = () => {
        return new Promise<void>((resolve) => {
          const checkActive = () => {
            if (voice.isSessionActive) {
              console.log('🔊 Session is now active, setting up recorder...');
              resolve();
            } else {
              setTimeout(checkActive, 50); // Check every 50ms
            }
          };
          checkActive();
        });
      };

      await waitForSessionActive();
      await setupRecorder();

      voiceUserSegmentsRef.current = [];
      voiceAssistantSegmentsRef.current = [];
      setIsListening(true);
      console.log('🔊 Voice session fully started and recorder setup complete');
    } catch (error) {
      console.error('Failed to start voice session', error);
      toast.error('Unable to start voice session');
      setIsListening(false);
      setIsLoading(false);
      aiElements.setLoading(false);
      voice.stopSession();
      teardownAudio();
    }
  }, [aiElements, isVoiceSupported, setupRecorder, teardownAudio, voice]);

  const stopVoiceSession = useCallback(() => {
    teardownAudio();
    voice.stopSession();
    setIsListening(false);
    setIsLoading(false);
    aiElements.setLoading(false);
  }, [aiElements, teardownAudio, voice]);

  // Removed appendVoiceMessage function - logic moved inline to prevent infinite loops

  useEffect(() => {
    const segments = voice.transcript ? voice.transcript.split('\n').filter(Boolean) : [];
    if (segments.length > voiceUserSegmentsRef.current.length) {
      const newSegments = segments.slice(voiceUserSegmentsRef.current.length);
      voiceUserSegmentsRef.current = segments;
      newSegments.forEach((segment) => {
        if (!segment) return;
        const message: ChatMessage = {
          id: generateId(),
          content: segment,
          role: 'user',
          timestamp: new Date(),
          type: 'voice'
        };

        const enhanced = aiElements.createEnhancedMessage(segment, 'user', {
          fileType: 'audio/pcm',
          fileName: 'voice-input'
        });

        setMessages(prev => {
          const next = [...prev, message];
          messagesRef.current = next;
          return next;
        });
        setEnhancedMessages(prev => [...prev, enhanced]);
      });
    }
  }, [voice.transcript]);

  useEffect(() => {
    const segments = voice.modelReplies;
    if (segments.length > voiceAssistantSegmentsRef.current.length) {
      const newSegments = segments.slice(voiceAssistantSegmentsRef.current.length);
      voiceAssistantSegmentsRef.current = segments;
      newSegments.forEach((segment) => {
        if (!segment) return;
        const message: ChatMessage = {
          id: generateId(),
          content: segment,
          role: 'assistant',
          timestamp: new Date(),
          type: 'voice'
        };

        const enhanced = aiElements.createEnhancedMessage(segment, 'assistant', {
          fileType: 'audio/pcm',
          fileName: 'voice-response'
        });

        setMessages(prev => {
          const next = [...prev, message];
          messagesRef.current = next;
          return next;
        });
        setEnhancedMessages(prev => [...prev, enhanced]);
        setIsLoading(false);
        aiElements.setLoading(false);
      });
    }
  }, [voice.modelReplies]);

  useEffect(() => {
    if (voice.error) {
      // Only stop if we're actually in a session to prevent infinite loops
      if (isListening || voice.isSessionActive) {
        teardownAudio();
        voice.stopSession();
        setIsListening(false);
        setIsLoading(false);
        aiElements.setLoading(false);
      }
    }
  }, [voice.error, isListening, voice.isSessionActive]);

  // Sync refs and auto-scroll when messages update
  useEffect(() => {
    messagesRef.current = messages;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      setIsVoiceSupported(true);
    }
  }, []);

  // Focus input when chat opens
  useEffect(() => {
    if (chatState.isOpen && inputRef.current && !chatState.isMinimized) {
      inputRef.current.focus();
    }
  }, [chatState.isOpen, chatState.isMinimized]);

  // Cleanup when chat closes
  useEffect(() => {
    if (!chatState.isOpen) {
      if (cameraState.isActive) {
        stopCamera();
      }
      if (isListening || voice.isSessionActive) {
        teardownAudio();
        voice.stopSession();
        setIsListening(false);
        setIsLoading(false);
        aiElements.setLoading(false);
      }
    }
  }, [chatState.isOpen, cameraState.isActive, isListening]);

  // Removed problematic cleanup effect that was causing infinite re-renders

  // Handle sending messages
  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const trimmed = content.trim();
    const normalized = trimmed.toLowerCase();
    const voiceActive = isListening || voice.isSessionActive;
    const userMessage: ChatMessage = {
      id: generateId(),
      content: trimmed,
      role: 'user',
      timestamp: new Date(),
      type: voiceActive ? 'voice' : 'text'
    };

    const enhancedUserMessage = aiElements.createEnhancedMessage(trimmed, 'user', {
      fileName: voiceActive ? 'voice-recording' : undefined,
      fileType: voiceActive ? 'audio/wav' : undefined
    });

    if (MEETING_KEYWORDS.some(keyword => normalized.includes(keyword))) {
      setIsMeetingOpen(true);
    }

    const priorMessages = messagesRef.current;
    const nextMessages = [...priorMessages, userMessage];
    setMessages(nextMessages);
    messagesRef.current = nextMessages;
    setEnhancedMessages(prev => [...prev, enhancedUserMessage]);
    setInputValue('');
    setIsLoading(true);
    aiElements.setLoading(true);

    try {
      const payload = {
        messages: nextMessages.map(({ role, content }) => ({ role, content })),
        context: {
          sessionId: sessionIdRef.current,
          enhancedResearch: true // Enable automatic enhanced grounding research
        },
        mode: 'standard',
        stream: false
      };

      const response = await fetch('/api/chat/unified', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-intelligence-session-id': sessionIdRef.current
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Chat request failed with status ${response.status}`);
      }

      const data = await response.json();
      const assistantContent = (typeof data === 'string' ? data : data?.content) || '';

      const aiResponse: ChatMessage = {
        id: data?.id ?? generateId(),
        content: assistantContent || 'I had trouble generating a response. Could you try again?',
        role: 'assistant',
        timestamp: new Date(),
        metadata: response.metadata?.research ? {
          research: response.metadata.research
        } : undefined
      };

      const enhancedAiMessage = aiElements.createEnhancedMessage(aiResponse.content, 'assistant');

      setMessages(prev => {
        const updated = [...prev, aiResponse];
        messagesRef.current = updated;
        return updated;
      });
      setEnhancedMessages(prev => [...prev, enhancedAiMessage]);
      aiElements.setLoading(false);
      setIsLoading(false);

      setTimeout(() => {
        aiElements.updateMessageStatus(enhancedAiMessage.id, 'delivered');
        setTimeout(() => {
          aiElements.updateMessageStatus(enhancedAiMessage.id, 'read');
        }, 500);
      }, 300);

      void fetchSuggestions();
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: generateId(),
        content: 'I apologize, but I encountered an error. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
        metadata: { error: true }
      };

      const enhancedErrorMessage = aiElements.createEnhancedMessage(
        'I apologize, but I encountered an error. Please try again.',
        'assistant'
      );

      setMessages(prev => {
        const updated = [...prev, errorMessage];
        messagesRef.current = updated;
        return updated;
      });
      setEnhancedMessages(prev => [...prev, enhancedErrorMessage]);
      aiElements.setLoading(false);
      setIsLoading(false);
      aiElements.setError('Failed to process message');
      setSuggestions(DEFAULT_SUGGESTIONS);
    }
  }, [aiElements, fetchSuggestions, isListening, isLoading, voice.isSessionActive]);

  // Toggle functions
  const toggleChat = () => {
    setChatState(prev => ({ ...prev, isOpen: !prev.isOpen }));
  };

  const openMeeting = () => {
    setIsMeetingOpen(true);
  };

  const toggleMinimize = () => {
    setChatState(prev => ({ ...prev, isMinimized: !prev.isMinimized, isExpanded: false }));
  };

  const toggleExpand = () => {
    setChatState(prev => ({ ...prev, isExpanded: !prev.isExpanded, isMinimized: false }));
  };

  const toggleVoice = useCallback(() => {
    if (!isVoiceSupported) {
      toast.error('Voice capture not supported in this browser');
      return;
    }

    if (isListening || voice.isSessionActive) {
      stopVoiceSession();
    } else {
      void startVoiceSession();
    }
  }, [isListening, isVoiceSupported, startVoiceSession, stopVoiceSession, voice.isSessionActive]);

  const toggleCamera = async () => {
    try {
      if (cameraState.isActive) {
        stopCamera();
      } else {
        await startCamera();
      }
    } catch (error) {
      toast.error("Camera access failed", {
        description: "Please check camera permissions and try again"
      });
    }
  };

  const toggleScreenShare = () => {
    setChatState(prev => ({ ...prev, isScreenSharing: !prev.isScreenSharing }));
  };

  const toggleSettings = () => {
    setChatState(prev => ({ ...prev, showSettings: !prev.showSettings }));
  };

  // Get current input display value
  const getInputDisplayValue = () => {
    if (isListening || voice.isSessionActive) {
      if (voice.partialTranscript) return voice.partialTranscript;
      if (voice.transcript) return voice.transcript.split('\n').slice(-1)[0] || '';
      return '';
    }
    return inputValue;
  };

  // Get appropriate placeholder text
  const getPlaceholder = () => {
    if (isListening || voice.isSessionActive) {
      return "Listening... speak now";
    }
    return "Ask about AI consulting...";
  };

  return (
    <ErrorBoundary>
      {/* Chat Toggle Button */}
      <motion.div 
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          onClick={toggleChat}
          data-chat-trigger
          aria-label={chatState.isOpen ? "Close chat" : "Open chat"}
          aria-expanded={chatState.isOpen}
          className="h-12 w-12 sm:h-14 sm:w-14 bg-black text-white hover:bg-gray-800 shadow-lg relative"
        >
          {chatState.isOpen ? (
            <X className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
          ) : (
            <>
              <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-[#FF6B35]"></div>
              <span className="sr-only">Unread messages</span>
            </>
          )}
        </Button>
      </motion.div>

      {/* Chat Interface */}
      <AnimatePresence>
        {chatState.isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed ${
              chatState.isMinimized 
                ? 'bottom-16 right-4 sm:bottom-24 sm:right-6 w-72 sm:w-80 h-12' 
                : chatState.isExpanded
                  ? 'top-0 left-0 right-0 bottom-0 w-full flex items-center justify-center p-4'
                  : 'bottom-4 left-4 right-4 sm:bottom-6 sm:right-6 sm:left-auto sm:w-96 h-[70vh] sm:h-[600px] max-h-[600px] md:w-[28rem] lg:w-[32rem]'
            } z-[100] bg-background border border-border midday-shadow-lg flex flex-col transition-all duration-300 safe-area-inset-bottom backdrop-blur-sm bg-opacity-95`}
          >
            {chatState.isMinimized ? (
              /* Minimized State */
              <motion.div
                className="h-full flex items-center justify-between px-4 cursor-pointer"
                onClick={toggleMinimize}
              >
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-pulse rounded-full midday-bg-primary"></div>
                  <span className="text-sm truncate midday-font-sans">
                    F.B/c AI
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleChat();
                  }}
                  className="h-6 w-6 p-0 midday-transition-colors"
                >
                  <X className="h-3 w-3" />
                </Button>
              </motion.div>
            ) : (
              /* Normal and Expanded Layout */
              <div className={`flex flex-col h-full ${chatState.isExpanded ? 'max-w-4xl w-full' : ''}`}>
                {/* Header */}
                <div className={`${chatState.isExpanded ? 'pt-10 sm:pt-16' : 'pt-4'} pb-4 px-4 sm:px-6 border-b border-border/60 midday-bg-card/95 flex items-center justify-between backdrop-blur ${chatState.isExpanded ? 'safe-area-inset-top' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center midday-rounded-full border border-border/50 text-xs font-medium midday-text-primary">
                      F•B
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold font-mono">F.B/c Assistant</p>
                      <p className="text-xs text-muted-foreground midday-font-sans">Strategic AI guidance tailored to your session</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="hidden sm:inline-flex h-8 px-3 font-medium hover-scale focus-ring-offset interactive"
                      onClick={openMeeting}
                      aria-label="Book a strategy call"
                    >
                      Book a call
                    </Button>
                    <div className="flex items-center gap-1">
                      {!chatState.isExpanded && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={toggleExpand}
                          className="h-6 w-6 p-0 touch-manipulation midday-transition-colors hover-scale focus-ring-offset interactive"
                          title="Expand chat interface"
                          aria-label="Expand chat"
                        >
                          <Expand className="h-3 w-3" aria-hidden="true" />
                        </Button>
                      )}
                      {chatState.isExpanded && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={toggleExpand}
                          className="h-8 w-8 sm:h-6 sm:w-6 p-0 touch-manipulation midday-transition-colors hover-scale focus-ring-offset interactive"
                          title="Exit fullscreen mode"
                          aria-label="Exit fullscreen"
                        >
                          <Shrink className="h-4 w-4 sm:h-3 sm:w-3" aria-hidden="true" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleMinimize}
                        className={`${chatState.isExpanded ? 'h-8 w-8 sm:h-6 sm:w-6' : 'h-6 w-6'} p-0 touch-manipulation midday-transition-colors hover-scale focus-ring-offset interactive`}
                        title="Minimize chat"
                        aria-label="Minimize chat"
                      >
                        <Minimize2 className={`${chatState.isExpanded ? 'h-4 w-4 sm:h-3 sm:w-3' : 'h-3 w-3'}`} aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleChat}
                        className={`${chatState.isExpanded ? 'h-8 w-8 sm:h-6 sm:w-6' : 'h-6 w-6'} p-0 touch-manipulation midday-transition-colors hover-scale focus-ring-offset interactive`}
                        title="Close chat"
                        aria-label="Close chat"
                      >
                        <X className={`${chatState.isExpanded ? 'h-4 w-4 sm:h-3 sm:w-3' : 'h-3 w-3'}`} aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Video/Screen Area for expanded mode */}
                {chatState.isExpanded && (cameraState.isActive || chatState.isScreenSharing) && (
                  <div className="relative">
                    {cameraState.isActive ? (
                      <div className="relative h-64 sm:h-80 border-b border-border bg-muted/20">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center space-y-2">
                            <Camera className="h-12 w-12 text-muted-foreground mx-auto" />
                            <span className="text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                              CAMERA ACTIVE
                            </span>
                          </div>
                        </div>
                        <div className="absolute top-2 right-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={stopCamera}
                            className="h-6 w-6 p-0 bg-background/80"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : chatState.isScreenSharing ? (
                      <div className="relative h-64 sm:h-80 bg-muted/20 border-b border-border">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center space-y-2">
                            <Monitor className="h-12 w-12 text-muted-foreground mx-auto" />
                            <span className="text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                              SCREEN SHARING
                            </span>
                          </div>
                        </div>
                        <div className="absolute top-2 right-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setChatState(prev => ({ ...prev, isScreenSharing: false }))}
                            className="h-6 w-6 p-0 bg-background/80"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Enhanced Research Status Indicator */}
                {sessionIdRef.current && (
                  <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Enhanced Research Active</span>
                      <Badge variant="secondary" className="text-xs">
                        Auto-grounding + URL context
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Messages Area */}
                <div className="flex-1 overflow-hidden relative">
                  <Conversation className="h-full">
                    <ConversationContent className="px-6 py-8 space-y-6">
                      {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-6">
                          <ConversationEmptyState
                            title={`Welcome to F.B/c AI${contextReady && currentContext?.person?.fullName ? `, ${currentContext.person.fullName}` : ''}`}
                            description={contextReady
                              ? `I'm here to help you navigate AI strategy and implementation. Based on your ${currentContext?.company?.name || 'organization'}, I can provide tailored guidance.`
                              : 'Gathering company intelligence tailored to you...'}
                            icon={<MessageCircle className="h-6 w-6 text-muted-foreground" />}
                          />

                          {/* Inline Terms Acceptance */}
                          {!hasAcceptedTerms && (
                            <div className="max-w-md mx-auto p-6 bg-card border border-border rounded-lg shadow-sm">
                              <div className="space-y-4">
                                <div className="text-center">
                                  <h3 className="text-lg font-semibold text-foreground mb-2">Terms & Conditions</h3>
                                  <p className="text-sm text-muted-foreground">
                                    To provide personalized AI guidance, please accept our terms for research and data processing.
                                  </p>
                                </div>

                                <div className="space-y-3 text-sm text-muted-foreground">
                                  <div className="flex items-start space-x-2">
                                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                                    <p>We'll use your information to research your company and role for tailored suggestions</p>
                                  </div>
                                  <div className="flex items-start space-x-2">
                                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                                    <p>Your data is protected under GDPR and used only for AI personalization</p>
                                  </div>
                                  <div className="flex items-start space-x-2">
                                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                                    <p>You can request data deletion at any time</p>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-2 pt-2">
                                  <input
                                    type="checkbox"
                                    id="inline-terms"
                                    checked={agreed}
                                    onChange={(e) => {
                                      setAgreed(e.target.checked);
                                      if (e.target.checked) {
                                        handleTermsAcceptance();
                                      }
                                    }}
                                    className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary"
                                  />
                                  <label htmlFor="inline-terms" className="text-sm text-foreground cursor-pointer">
                                    I accept the terms and conditions for AI-powered personalization
                                  </label>
                                </div>

                                <button
                                  onClick={handleTermsAcceptance}
                                  disabled={!agreed}
                                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-md text-sm font-medium transition-colors"
                                >
                                  Continue to AI Consultation
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Show suggestions only after terms acceptance */}
                          {hasAcceptedTerms && (
                            <div className="max-w-md mx-auto">
                              <p className="text-sm text-muted-foreground text-center mb-4">
                                What would you like to explore today?
                              </p>
                              <div className="grid grid-cols-1 gap-2">
                                {contextReady && currentContext?.person?.role && (
                                  <button
                                    onClick={() => handleSendMessage(`As ${currentContext.person.role} at ${currentContext.company?.name}, what AI strategy would you recommend?`)}
                                    className="w-full text-left p-3 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors"
                                  >
                                    🤖 AI strategy for {currentContext.person.role}s
                                  </button>
                                )}
                                <button
                                  onClick={() => handleSendMessage('What AI consulting services do you offer?')}
                                  className="w-full text-left p-3 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors"
                                >
                                  💼 Consulting services overview
                                </button>
                                <button
                                  onClick={() => handleSendMessage('Tell me about your workshops')}
                                  className="w-full text-left p-3 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors"
                                >
                                  🎓 Workshop and training options
                                </button>
                                <button
                                  onClick={() => handleSendMessage('How can AI help my business?')}
                                  className="w-full text-left p-3 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors"
                                >
                                  🚀 AI implementation guidance
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        enhancedMessages.map((message) => (
                          <EnhancedMessage
                            key={message.id}
                            message={message}
                            config={aiElements.config}
                            onAction={aiElements.executeAction}
                            onReaction={(emoji) => {
                              console.log('Reaction:', emoji, 'for message:', message.id);
                            }}
                          />
                        ))
                      )}

                      {messages.length > 0 && (
                        <div className="rounded-2xl border border-border/60 bg-card/70 p-4 text-sm text-muted-foreground">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-medium text-foreground">Ready to explore next steps?</p>
                              <p>Book a live strategy session with Farzad to map out your AI roadmap.</p>
                            </div>
                            <Button onClick={openMeeting} className="sm:self-start">
                              Schedule a call
                            </Button>
                          </div>
                        </div>
                      )}

                      {isLoading && (
                        <div className="flex justify-center py-6">
                          <Loader />
                        </div>
                      )}

                      <div ref={messagesEndRef} />
                    </ConversationContent>
                    <ConversationScrollButton className="shadow-md" />
                  </Conversation>
                </div>

                {/* Input Area */}
                <div className="border-t border-border bg-card safe-area-inset-bottom">
                  <div className="flex items-center gap-2 p-4">
                    <PromptInput
                      className="mx-2 sm:mx-4 my-2 sm:my-4 flex flex-col gap-2 midday-rounded-3xl border border-border/60 midday-bg-background/95 px-3 pb-2 pt-3 midday-shadow-lg midday-shadow-md backdrop-blur"
                      accept="image/*,.pdf"
                      onSubmit={async (message, event) => {
                        event.preventDefault();

                        if (message.files && message.files.length > 0) {
                          toast.info('File analysis is coming soon. The attachment was noted but not yet processed.');
                        }

                        if (message.text) {
                          await handleSendMessage(message.text);
                        }
                      }}
                    >
                      <PromptInputBody className="flex flex-col gap-2">
                        <PromptInputAttachments className="px-2">
                          {(attachment) => (
                            <PromptInputAttachment key={attachment.id} data={attachment} />
                          )}
                        </PromptInputAttachments>

                        <PromptInputTextarea
                          className="midday-rounded-2xl bg-transparent px-2 sm:px-4 text-base sm:text-base leading-relaxed placeholder:text-muted-foreground/70 midday-font-sans"
                          value={getInputDisplayValue()}
                          onChange={(e) => setInputValue(e.target.value)}
                          placeholder={getPlaceholder()}
                          disabled={isLoading || isListening}
                          ref={inputRef}
                        />

                        {(isListening || voice.isSessionActive) && (voice.partialTranscript || voice.transcript) && (
                          <div className="px-2 text-xs text-muted-foreground/80">
                            <span className="font-medium text-muted-foreground">Voice preview:</span>{' '}
                            {voice.partialTranscript || voice.transcript?.split('\n').slice(-1)[0]}
                          </div>
                        )}

                        {voice.error && (
                          <div className="px-2 text-xs text-destructive/80">
                            {voice.error}
                          </div>
                        )}

                        <PromptInputToolbar className="items-center px-2 pb-1 pt-0">
                          <PromptInputTools className="gap-0.5 sm:gap-1.5">
                            {/* Upload/Attachment button - moved to left */}
                            <PromptInputActionMenu>
                              <PromptInputActionMenuTrigger className="h-8 sm:h-9 midday-rounded-full px-2 sm:px-3 text-xs sm:text-sm midday-transition-colors hover-scale focus-ring-offset interactive border border-border/60 midday-bg-background" aria-label="Upload files">
                                <Plus className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
                              </PromptInputActionMenuTrigger>
                              <PromptInputActionMenuContent align="start" className="midday-rounded-2xl border border-border/40 midday-bg-background/95 midday-shadow-lg midday-shadow-xl">
                                <PromptInputActionAddAttachments label="Upload photos & files" />
                                <PromptInputActionMenuItem
                                  onClick={() => toast.info('PDF summaries are on the roadmap. Stay tuned!')}
                                >
                                  <FileText className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                  Generate summary (soon)
                                </PromptInputActionMenuItem>
                              </PromptInputActionMenuContent>
                            </PromptInputActionMenu>

                            {/* Voice button */}
                            <PromptInputButton
                              variant={(isListening || voice.isSessionActive) ? 'default' : 'ghost'}
                              className="h-8 sm:h-9 midday-rounded-full px-2 sm:px-3 text-xs sm:text-sm midday-transition-colors hover-scale focus-ring-offset interactive"
                              onClick={toggleVoice}
                              disabled={!isVoiceSupported}
                              aria-label={!isVoiceSupported ? 'Voice capture not supported in this browser' : (isListening || voice.isSessionActive) ? 'Stop voice conversation' : 'Start voice conversation'}
                              title={!isVoiceSupported ? 'Voice capture not supported in this browser' : (isListening || voice.isSessionActive) ? 'Stop voice conversation' : 'Start voice conversation'}
                            >
                              {(isListening || voice.isSessionActive)
                                ? <Mic className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
                                : <MicOff className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />}
                            </PromptInputButton>

                            {/* Camera button */}
                            <PromptInputButton
                              variant={cameraState.isActive ? 'default' : 'ghost'}
                              className="h-8 sm:h-9 midday-rounded-full px-2 sm:px-3 text-xs sm:text-sm midday-transition-colors hover-scale focus-ring-offset interactive"
                              onClick={toggleCamera}
                              aria-label={`${cameraState.isActive ? 'Disable' : 'Enable'} camera`}
                              title={`${cameraState.isActive ? 'Disable' : 'Enable'} camera`}
                            >
                              {cameraState.isActive ? <Camera className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" /> : <CameraOff className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />}
                            </PromptInputButton>

                            {/* Screen share button */}
                            <PromptInputButton
                              variant={chatState.isScreenSharing ? 'default' : 'ghost'}
                              className="h-8 sm:h-9 midday-rounded-full px-2 sm:px-3 text-xs sm:text-sm midday-transition-colors hover-scale focus-ring-offset interactive"
                              onClick={toggleScreenShare}
                              aria-label="Toggle screen share"
                              title="Toggle screen share"
                            >
                              {chatState.isScreenSharing ? <Monitor className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" /> : <MonitorOff className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />}
                            </PromptInputButton>

                            {/* Camera switch button - only show when camera is active */}
                            {cameraState.isActive && cameraState.availableDevices.length > 1 && (
                              <PromptInputButton
                                variant="ghost"
                                className="h-8 sm:h-9 midday-rounded-full px-2 sm:px-3 text-xs sm:text-sm midday-transition-colors hover-scale focus-ring-offset interactive"
                                onClick={switchCamera}
                                aria-label="Switch camera"
                                title="Switch camera"
                              >
                                <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
                              </PromptInputButton>
                            )}

                            {/* Settings button */}
                            <PromptInputButton
                              variant={chatState.showSettings ? 'default' : 'ghost'}
                              className="h-8 sm:h-9 midday-rounded-full px-2 sm:px-3 text-xs sm:text-sm midday-transition-colors hover-scale focus-ring-offset interactive"
                              onClick={toggleSettings}
                              aria-label="Chat settings"
                              title="Chat settings"
                            >
                              <Settings className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
                            </PromptInputButton>
                          </PromptInputTools>

                          <PromptInputSubmit
                            className="h-8 w-8 sm:h-10 sm:w-10 midday-rounded-full midday-bg-primary midday-chat-user-text hover:bg-primary/90 midday-transition-colors hover-scale focus-ring-offset interactive"
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
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>


      {/* AI SDK Devtools - Temporarily disabled to prevent infinite loops */}
      {false && process.env.NODE_ENV === "development" && (
        <AIDevtools
          config={{
            streamCapture: {
              enabled: false,
              endpoint: "/api/demo-chat",
              autoConnect: false,
            },
          }}
        />
      )}
      <MeetingOverlay
        open={isMeetingOpen}
        onClose={() => setIsMeetingOpen(false)}
      />
    </ErrorBoundary>
  );
}
