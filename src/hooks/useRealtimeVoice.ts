import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AudioStreamingQueue } from '@/lib/audio-streaming-queue';
import { useMediaRecorderVoice, type MediaRecorderVoiceResult } from '@/hooks/useMediaRecorderVoice';

// AudioWorklet integration for PCM16 @ 16kHz
interface AudioWorkletMessage {
  type: 'audioData';
  data: {
    float32arrayBuffer: Float32Array;
    int16arrayBuffer: ArrayBuffer;
  };
}

export type VoiceSession = {
  connectionId: string;
  languageCode?: string;
  voiceName?: string;
  mock?: boolean;
};

export type VoiceContextUpdate = {
  sessionId?: string | null;
  modality: 'screen' | 'webcam';
  analysis?: string;
  imageData?: string;
  capturedAt?: number;
  metadata?: Record<string, unknown>;
};

type LiveServerEvent =
  | { type: 'connected'; payload: { connectionId: string } }
  | { type: 'session_started'; payload: { connectionId: string; languageCode?: string; voiceName?: string; mock?: boolean } }
  | { type: 'session_closed'; payload?: { reason?: string } }
  | { type: 'input_transcript'; payload: { text: string; isFinal?: boolean } }
  | { type: 'output_transcript'; payload: { text: string; isFinal?: boolean } }
  | { type: 'model_text'; payload: { text: string } }
  | { type: 'text'; payload: { content: string } }
  | { type: 'audio'; payload: { audioData: string; mimeType?: string } }
  | { type: 'heartbeat'; payload?: { timestamp: number } }
  | { type: 'turn_complete'; payload?: { turnComplete?: boolean } }
  | { type: 'setup_complete'; payload: { setupComplete: boolean } }
  | { type: 'interrupted'; payload: { interrupted: boolean } }
  | { type: 'tool_call'; payload: any }
  | { type: 'tool_result'; payload: any }
  | { type: 'tool_call_cancellation'; payload: any }
  | { type: 'error'; payload: { message: string; detail?: unknown } };

type SessionStateEvent = {
  active: boolean;
  connectionId?: string | null;
  mock?: boolean;
  isProcessing?: boolean;
};

export interface UseRealtimeVoiceOptions {
  onSessionStateChange?: (state: SessionStateEvent) => void;
  onPartialTranscript?: (text: string) => void;
  onFinalTranscript?: (text: string) => void;
  onAssistantText?: (text: string) => void;
  onOutputTranscript?: (text: string, isFinal: boolean) => void;
  onTurnComplete?: () => void;
  onInterrupted?: () => void;
  onSetupComplete?: () => void;
  onToolCall?: (toolCall: any) => void;
  onToolResult?: (result: any) => void;
  onError?: (message: string) => void;
}

export function useRealtimeVoice(options: UseRealtimeVoiceOptions = {}) {
  const [session, setSession] = useState<VoiceSession | null>(null);
  const [isSocketReady, setSocketReady] = useState(false);
  const [isSessionActive, setSessionActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [modelReplies, setModelReplies] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const {
    startRecording,
    stopRecording,
    resetRecording,
    isSupported: isVoiceSupported,
    isRecording,
    isProcessing: recorderProcessing,
    error: recorderError,
  } = useMediaRecorderVoice({ targetSampleRate: 16000 });

  const wsRef = useRef<WebSocket | null>(null);
  const audioQueueRef = useRef<AudioStreamingQueue | null>(null);
  const connectionIdRef = useRef<string | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbacksRef = useRef(options);
  const isSessionActiveRef = useRef(false);
  const pendingChunksRef = useRef<MediaRecorderVoiceResult[]>([]);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    callbacksRef.current = options;
  }, [options]);

  useEffect(() => {
    audioQueueRef.current = new AudioStreamingQueue(24000); // 24kHz for Gemini output
    return () => {
      audioQueueRef.current?.destroy();
      audioQueueRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!recorderError) return;
    setError(recorderError);
    callbacksRef.current?.onError?.(recorderError);
  }, [recorderError]);

  const serverUrl = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const envUrl = process.env.NEXT_PUBLIC_LIVE_SERVER_URL;
    if (envUrl) return envUrl;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host;
    return `${protocol}://${host.replace(/:\d+$/, '')}:${process.env.NEXT_PUBLIC_LIVE_SERVER_PORT ?? '3001'}`;
  }, []);

  const sendMessage = useCallback((message: Record<string, unknown>) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify(message));
  }, []);

  const sendToolResult = useCallback((responses: Array<Record<string, unknown>>) => {
    if (!responses || responses.length === 0) return;
    sendMessage({
      type: 'TOOL_RESULT',
      payload: { responses },
    });
  }, [sendMessage]);

  const sendContextUpdate = useCallback((update: VoiceContextUpdate) => {
    if (!update || typeof update !== 'object') return;
    sendMessage({
      type: 'CONTEXT_UPDATE',
      payload: {
        ...update,
        modality: update.modality,
        sessionId: update.sessionId ?? undefined,
        capturedAt: typeof update.capturedAt === 'number' ? update.capturedAt : Date.now(),
      },
    });
  }, [sendMessage]);

  const sendRealtimeInput = useCallback((chunks: Array<{ mimeType: string; data: string }>) => {
    if (!session?.connectionId || !isSessionActive) {
      console.warn('Cannot send realtime input - no active session');
      return;
    }

    sendMessage({
      type: 'REALTIME_INPUT',
      payload: {
        chunks,
        connectionId: session.connectionId,
      },
    });
  }, [session?.connectionId, isSessionActive, sendMessage]);

  const resetState = useCallback((opts?: { soft?: boolean }) => {
    // Clear session timeout
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }
    
    if (!opts?.soft) {
      setSession(null);
      connectionIdRef.current = null;
    }

    setSessionActive(false);
    isSessionActiveRef.current = false;
    setIsProcessing(false);
    setPartialTranscript('');
    setError(null);
    void resetRecording();
    pendingChunksRef.current = [];

    callbacksRef.current?.onSessionStateChange?.({
      active: false,
      connectionId: connectionIdRef.current,
      mock: session?.mock,
      isProcessing: false,
    });
  }, [resetRecording, session?.mock]);

  const handleServerEvent = useCallback((event: LiveServerEvent) => {
    const callbacks = callbacksRef.current;

    switch (event.type) {
      case 'connected': {
        connectionIdRef.current = event.payload.connectionId;
        setSocketReady(true);
        break;
      }
      case 'session_started': {
        // Clear session timeout since session started successfully
        if (sessionTimeoutRef.current) {
          clearTimeout(sessionTimeoutRef.current);
          sessionTimeoutRef.current = null;
        }
        
        setSession({
          connectionId: event.payload.connectionId,
          languageCode: event.payload.languageCode,
          voiceName: event.payload.voiceName,
          mock: event.payload.mock,
        });
        setSessionActive(true);
        isSessionActiveRef.current = true;
        setIsProcessing(false);
        setError(null);

        callbacks?.onSessionStateChange?.({
          active: true,
          connectionId: event.payload.connectionId,
          mock: event.payload.mock,
          isProcessing: recorderProcessing,
        });
        // Flush any audio chunks captured before the session opened
        if (pendingChunksRef.current.length > 0) {
          pendingChunksRef.current.forEach((chunk) => {
            sendMessage({
              type: 'user_audio',
              payload: {
                audioData: chunk.base64,
                mimeType: chunk.mimeType,
              },
            });
          });
          pendingChunksRef.current = [];
        }
        break;
      }
      case 'session_closed': {
        // Clear session timeout if it exists
        if (sessionTimeoutRef.current) {
          clearTimeout(sessionTimeoutRef.current);
          sessionTimeoutRef.current = null;
        }
        
        setSessionActive(false);
        isSessionActiveRef.current = false;
        setIsProcessing(false);
        // Clear audio queue on session close
        audioQueueRef.current?.clear();
        void resetRecording();
        callbacks?.onSessionStateChange?.({
          active: false,
          connectionId: connectionIdRef.current,
          mock: session?.mock,
          isProcessing: false,
        });
        break;
      }
      case 'input_transcript': {
        const isFinal = event.payload.isFinal === true
        if (isFinal) {
          setTranscript((prev) => (prev ? `${prev}\n${event.payload.text}` : event.payload.text));
          setPartialTranscript('');
          callbacks?.onFinalTranscript?.(event.payload.text);
        } else {
          setPartialTranscript(event.payload.text);
          callbacks?.onPartialTranscript?.(event.payload.text);
        }
        break;
      }
      case 'output_transcript': {
        // AI speech-to-text (closed captions)
        const text = event.payload.text
        const isFinal = event.payload.isFinal ?? false
        callbacks?.onOutputTranscript?.(text, isFinal)
        break;
      }
      case 'model_text':
      case 'text': {
        const text = 'content' in event.payload ? event.payload.content : event.payload.text;
        if (text) {
          setModelReplies((prev) => [...prev, text]);
          callbacks?.onAssistantText?.(text);
        }
        break;
      }
      case 'audio': {
        // Use new audio queue for smooth playback
        const audioData = event.payload.audioData;
        audioQueueRef.current?.addChunk(audioData);
        break;
      }
      case 'heartbeat': {
        sendMessage({ type: 'heartbeat_ack', timestamp: Date.now() });
        break;
      }
      case 'interrupted': {
        // User interrupted AI - clear audio queue immediately
        console.log('🔇 User interrupted AI - clearing audio queue')
        audioQueueRef.current?.clear();
        callbacks?.onInterrupted?.();
        break;
      }
      case 'setup_complete': {
        console.log('✅ Voice session setup complete')
        callbacks?.onSetupComplete?.();
        break;
      }
      case 'tool_call': {
        console.log('🛠️ Tool call received:', event.payload)
        callbacks?.onToolCall?.(event.payload);
        break;
      }
      case 'tool_result': {
        console.log('🛠️ Tool result received:', event.payload)
        callbacks?.onToolResult?.(event.payload);
        break;
      }
      case 'tool_call_cancellation': {
        console.log('🛠️ Tool call cancelled')
        break;
      }
      case 'turn_complete': {
        setIsProcessing(false);
        callbacks?.onSessionStateChange?.({
          active: true,
          connectionId: connectionIdRef.current,
          mock: session?.mock,
          isProcessing: false,
        });
        callbacks?.onTurnComplete?.();
        break;
      }
      case 'error': {
        const message = event.payload?.message ?? 'Voice session error';
        setError(message);
        // Clear audio queue on errors
        audioQueueRef.current?.clear();
        callbacks?.onError?.(message);
        break;
      }
    }
  }, [recorderProcessing, resetRecording, sendMessage, session?.mock]);

  const handleRecorderChunk = useCallback((chunk: MediaRecorderVoiceResult) => {
    if (!chunk?.base64) return;

    if (!isSessionActiveRef.current) {
      pendingChunksRef.current.push(chunk);
      return;
    }

    sendMessage({
      type: 'user_audio',
      payload: {
        audioData: chunk.base64,
        mimeType: chunk.mimeType,
      },
    });
  }, [sendMessage]);

  const connectWebSocket = useCallback(() => {
    if (!serverUrl || wsRef.current) {
      return;
    }

    try {
      const socket = new WebSocket(serverUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setSocketReady(true);
        setError(null);
        reconnectAttemptsRef.current = 0; // Reset on successful connection
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as LiveServerEvent;
          handleServerEvent(data);
        } catch (err) {
          console.error('🎤 [RealtimeVoice] Failed to parse server event:', err);
        }
      };

      socket.onerror = (err) => {
        console.error('🎤 [RealtimeVoice] WebSocket error:', err);
        setError('WebSocket connection error');
      };

      socket.onclose = (event) => {
        console.log('🎤 [RealtimeVoice] WebSocket closed:', event.code, event.reason);
        wsRef.current = null;
        setSocketReady(false);
        resetState({ soft: true });

        // Check if we should attempt reconnection
        if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          const msg = 'Failed to connect to voice server after multiple attempts. Please check if the server is running.';
          console.error('🎤 [RealtimeVoice] Max reconnection attempts reached');
          setError(msg);
          callbacksRef.current?.onError?.(msg);
          return;
        }

        if (!reconnectTimerRef.current) {
          reconnectAttemptsRef.current++;
          // Exponential backoff: 1s, 2s, 4s, 8s, 16s
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 16000);
          console.log(`🎤 [RealtimeVoice] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimerRef.current = setTimeout(() => {
            reconnectTimerRef.current = null;
            connectWebSocket();
          }, delay);
        }
      };
    } catch (err) {
      console.error('🎤 [RealtimeVoice] Failed to connect:', err);
      setError('Failed to connect to voice server');
    }
  }, [handleServerEvent, resetState, serverUrl]);

  const startSession = useCallback(async (opts?: { languageCode?: string; voiceName?: string; sessionId?: string }) => {
    console.log('🎤 [RealtimeVoice] startSession called', { 
      isSocketReady, 
      wsState: wsRef.current?.readyState, 
      connectionId: connectionIdRef.current,
      opts 
    });
    
    if (!isSocketReady || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      const message = 'Voice server not ready';
      console.error('🎤 [RealtimeVoice] Cannot start session - server not ready:', { 
        isSocketReady, 
        wsState: wsRef.current?.readyState,
        serverUrl 
      });
      setError(message);
      callbacksRef.current?.onError?.(message);
      return;
    }

    try {
      console.log('🎤 [RealtimeVoice] Starting session - setting processing state');
      setIsProcessing(true);
      callbacksRef.current?.onSessionStateChange?.({
        active: false,
        connectionId: connectionIdRef.current,
        mock: session?.mock,
        isProcessing: true,
      });

      console.log('🎤 [RealtimeVoice] Starting audio recording');
      console.log('🎤 [RealtimeVoice] Requesting microphone permission...');
      await startRecording({ onChunk: handleRecorderChunk });
      console.log('🎤 [RealtimeVoice] Microphone permission granted and recording started');
      
      console.log('🎤 [RealtimeVoice] Audio recording started, sending start message');
      sendMessage({
        type: 'start',
        payload: {
          languageCode: opts?.languageCode,
          voiceName: opts?.voiceName,
          sessionId: opts?.sessionId,
        },
      });
      
      console.log('🎤 [RealtimeVoice] Start message sent successfully');
      
      // Set timeout to handle case where server never responds
      sessionTimeoutRef.current = setTimeout(() => {
        console.log('🎤 [RealtimeVoice] Session timeout check:', {
          isSessionActive: isSessionActiveRef.current,
          hasSession: session !== null,
          isRecording
        });
        
        // Only timeout if session truly didn't start
        if (!isSessionActiveRef.current && !session) {
          const timeoutMsg = 'Voice session failed to start - server did not respond in time';
          console.error('🎤 [RealtimeVoice] Session timeout triggered');
          setError(timeoutMsg);
          setIsProcessing(false);
          callbacksRef.current?.onError?.(timeoutMsg);
          void stopRecording();
        } else {
          console.log('🎤 [RealtimeVoice] Session timeout check passed - session is active');
        }
      }, 10000); // 10 second timeout
    } catch (err) {
      // Clear session timeout on error
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
        sessionTimeoutRef.current = null;
      }
      
      const message = err instanceof Error ? err.message : 'Failed to start voice session';
      console.error('🎤 [RealtimeVoice] Failed to start session:', err);
      setError(message);
      setIsProcessing(false);
      callbacksRef.current?.onError?.(message);
      await resetRecording();
    }
  }, [handleRecorderChunk, isSocketReady, sendMessage, session?.mock, startRecording, resetRecording, serverUrl]);

  const stopSession = useCallback(async () => {
    console.log('🎤 [RealtimeVoice] stopSession called', {
      isSessionActive,
      isRecording,
      isProcessing
    });
    console.trace('🎤 [RealtimeVoice] stopSession call stack:');
    
    if (!isSessionActive && !isRecording && !isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);
      callbacksRef.current?.onSessionStateChange?.({
        active: false,
        connectionId: connectionIdRef.current,
        mock: session?.mock,
        isProcessing: true,
      });

      await stopRecording();
      pendingChunksRef.current = [];

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        sendMessage({ type: 'TURN_COMPLETE' });
      }

      setSessionActive(false);
      isSessionActiveRef.current = false;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stop voice session';
      console.error('🎤 [RealtimeVoice] Failed to stop session:', err);
      setError(message);
      setIsProcessing(false);
      callbacksRef.current?.onError?.(message);
    }
  }, [isSessionActive, isRecording, isProcessing, sendMessage, session?.mock, stopRecording]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
        sessionTimeoutRef.current = null;
      }
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connectWebSocket]);

  useEffect(() => {
    return () => {
      void resetRecording();
      if (audioQueueRef.current) {
        audioQueueRef.current.destroy();
        audioQueueRef.current = null;
      }
    };
  }, [resetRecording]);

  return {
    session,
    isSocketReady,
    isSessionActive,
    isProcessing: isProcessing || recorderProcessing,
    isRecording,
    transcript,
    partialTranscript,
    modelReplies,
    error,
    isVoiceSupported,
    startSession,
    stopSession,
    sendToolResult,
    sendContextUpdate,
    sendRealtimeInput,
  };
}
