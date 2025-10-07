import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AudioRecorder } from '@/lib/audio-recorder';
import { AudioStreamer } from '@/lib/audio-streamer';

export type VoiceSession = {
  connectionId: string;
  languageCode?: string;
  voiceName?: string;
  mock?: boolean;
};

type LiveServerEvent =
  | { type: 'connected'; payload: { connectionId: string } }
  | { type: 'session_started'; payload: { connectionId: string; languageCode?: string; voiceName?: string; mock?: boolean } }
  | { type: 'session_closed'; payload?: { reason?: string } }
  | { type: 'input_transcript'; payload: { text: string; final?: boolean } }
  | { type: 'model_text'; payload: { text: string } }
  | { type: 'text'; payload: { content: string } }
  | { type: 'audio'; payload: { audioData: string; mimeType?: string } }
  | { type: 'heartbeat'; payload?: { timestamp: number } }
  | { type: 'turn_complete' }
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
  onTurnComplete?: () => void;
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
  const [isMuted, setIsMuted] = useState(false);
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);

  // WebSocket and audio refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const connectionIdRef = useRef<string | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbacksRef = useRef(options);

  useEffect(() => {
    callbacksRef.current = options;
  }, [options]);

  const serverUrl = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const envUrl = process.env.NEXT_PUBLIC_LIVE_SERVER_URL;
    if (envUrl) return envUrl;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host;
    return `${protocol}://${host.replace(/:\d+$/, '')}:${process.env.NEXT_PUBLIC_LIVE_SERVER_PORT ?? '3001'}`
  }, []);

  // Send WebSocket message
  const sendMessage = useCallback((message: Record<string, unknown>) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify(message));
  }, []);

  // Reset state
  const resetState = useCallback((opts?: { soft?: boolean }) => {
    const callbacks = callbacksRef.current;
    if (!opts?.soft) {
      setSession(null);
      connectionIdRef.current = null;
    }
    setSessionActive(false);
    setIsProcessing(false);
    setPartialTranscript('');
    setError(null);
    callbacks?.onSessionStateChange?.({
      active: false,
      connectionId: connectionIdRef.current,
      mock: session?.mock,
      isProcessing: false,
    });
  }, [session?.mock]);

  // Initialize audio components
  useEffect(() => {
    audioRecorderRef.current = new AudioRecorder();
    audioStreamerRef.current = new AudioStreamer();

    // Check voice support
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      setIsVoiceSupported(true);
    }

    return () => {
      audioRecorderRef.current?.stop();
      audioStreamerRef.current?.destroy();
    };
  }, []);

  // Handle audio data from recorder
  useEffect(() => {
    const recorder = audioRecorderRef.current;
    if (!recorder) return;

    const handleAudioData = (base64: string) => {
      if (isSessionActive && !isMuted) {
        // Send audio chunk immediately
        sendMessage({
          type: 'user_audio',
          payload: {
            audioData: base64,
            mimeType: 'audio/pcm;rate=16000',
          },
        });
      }
    };

    recorder.on('data', handleAudioData);
    recorder.on('error', (error) => {
      console.error('🎤 [RealtimeVoice] Audio recorder error:', error);
      setError(error.message);
      callbacksRef.current?.onError?.(error.message);
    });

    return () => {
      recorder.off('data', handleAudioData);
      recorder.off('error', (error) => {
        console.error('🎤 [RealtimeVoice] Audio recorder error:', error);
        setError(error.message);
        callbacksRef.current?.onError?.(error.message);
      });
    };
  }, [isSessionActive, isMuted, sendMessage]);

  // Handle server events
  const handleServerEvent = useCallback((event: LiveServerEvent) => {
    const callbacks = callbacksRef.current;

    switch (event.type) {
      case 'connected': {
        connectionIdRef.current = event.payload.connectionId;
        setSocketReady(true);
        break;
      }
      case 'session_started': {
        console.log('🎤 [RealtimeVoice] Session started:', event.payload);
        setSession({
          connectionId: event.payload.connectionId,
          languageCode: event.payload.languageCode,
          voiceName: event.payload.voiceName,
          mock: event.payload.mock,
        });
        setSessionActive(true);
        setIsProcessing(false);
        setError(null);
        callbacks?.onSessionStateChange?.({
          active: true,
          connectionId: event.payload.connectionId,
          mock: event.payload.mock,
          isProcessing: false,
        });
        break;
      }
      case 'session_closed': {
        setSessionActive(false);
        callbacks?.onSessionStateChange?.({
          active: false,
          connectionId: connectionIdRef.current,
          mock: session?.mock,
          isProcessing: false,
        });
        break;
      }
      case 'input_transcript': {
        if (event.payload.final) {
          setTranscript((prev) => (prev ? `${prev}\n${event.payload.text}` : event.payload.text));
          setPartialTranscript('');
          callbacks?.onFinalTranscript?.(event.payload.text);
        } else {
          setPartialTranscript(event.payload.text);
          callbacks?.onPartialTranscript?.(event.payload.text);
        }
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
        // Play audio immediately as it arrives
        const audioData = event.payload.audioData;
        const audioBytes = Uint8Array.from(atob(audioData), (c) => c.charCodeAt(0));
        audioStreamerRef.current?.addPCM16(audioBytes);
        break;
      }
      case 'heartbeat': {
        // Respond to server heartbeat
        sendMessage({ type: 'heartbeat_ack', timestamp: Date.now() });
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
        callbacks?.onError?.(message);
        break;
      }
    }
  }, [session?.mock]);

  // Connect WebSocket
  const connectWebSocket = useCallback(() => {
    if (!serverUrl || wsRef.current) {
      console.log('🎤 [RealtimeVoice] WebSocket already exists or no server URL');
      return;
    }

    console.log('🎤 [RealtimeVoice] Connecting to:', serverUrl);
    try {
      const socket = new WebSocket(serverUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setSocketReady(true);
        setError(null);
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
        
        // Auto-reconnect
        if (!reconnectTimerRef.current) {
          reconnectTimerRef.current = setTimeout(() => {
            reconnectTimerRef.current = null;
            connectWebSocket();
          }, 1500);
        }
      };
    } catch (err) {
      console.error('🎤 [RealtimeVoice] Failed to connect:', err);
      setError('Failed to connect to voice server');
    }
  }, [handleServerEvent, resetState, serverUrl]);

  // Start voice session
  const startSession = useCallback(async (opts?: { languageCode?: string; voiceName?: string }) => {
    if (!isSocketReady || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('Voice server not ready');
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

      sendMessage({
        type: 'start',
        payload: {
          languageCode: opts?.languageCode,
          voiceName: opts?.voiceName,
        },
      });
    } catch (error) {
      console.error('🎤 [RealtimeVoice] Failed to start session:', error);
      setError(error instanceof Error ? error.message : 'Failed to start voice session');
      setIsProcessing(false);
    }
  }, [isSocketReady, sendMessage, session]);

  // Stop voice session
  const stopSession = useCallback(() => {
    if (!isSessionActive && !isProcessing) return;
    
    audioRecorderRef.current?.stop();
    setIsMuted(false);
    
    sendMessage({ type: 'TURN_COMPLETE' });
    setSessionActive(false);
    setIsProcessing(false);
  }, [isSessionActive, isProcessing, sendMessage]);

  // Toggle mute/unmute (the main control)
  const toggleMute = useCallback(async () => {
    if (!isSessionActive) {
      // Start session if not active
      await startSession();
      return;
    }

    const newMutedState = !isMuted;
    setIsMuted(newMutedState);

    if (newMutedState) {
      // Stop recording but keep session
      audioRecorderRef.current?.stop();
    } else {
      // Resume recording
      try {
        await audioRecorderRef.current?.start();
      } catch (error) {
        console.error('🎤 [RealtimeVoice] Failed to resume recording:', error);
        setError(error instanceof Error ? error.message : 'Failed to resume recording');
      }
    }
  }, [isSessionActive, isMuted, startSession]);

  // Initialize WebSocket connection
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connectWebSocket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioRecorderRef.current?.stop();
      audioStreamerRef.current?.destroy();
    };
  }, []);

  return {
    session,
    isSocketReady,
    isSessionActive,
    isProcessing,
    transcript,
    partialTranscript,
    modelReplies,
    error,
    isMuted,
    isVoiceSupported,
    startSession,
    stopSession,
    toggleMute,
  };
}
