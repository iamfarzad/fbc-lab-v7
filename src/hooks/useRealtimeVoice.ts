import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AudioRecorder, AudioPlayer } from '@/lib/audio';
import { WEBSOCKET_CONFIG } from '@/config/constants';
import type { LiveServerEvent } from '@/core/live/types'
import { LiveClientWS } from '@/core/live/client'
import type { LiveClientWS as LiveClientType } from '@/core/live/client'

export type VoiceSession = {
  connectionId: string;
  languageCode?: string;
  voiceName?: string;
  mock?: boolean;
};

// Local recorder result type (inlined to remove dependency on separate hook)
type MediaRecorderVoiceResult = {
  base64: string;
  mimeType: string;
  durationMs: number;
};

const DEFAULT_SERVER_SAMPLE_RATE = 24000;
const SAMPLE_RATE_PATTERN = /rate=(\d+)/i;

const extractSampleRate = (mimeType?: string): number | undefined => {
  if (!mimeType) return undefined;
  const match = SAMPLE_RATE_PATTERN.exec(mimeType);
  if (!match) return undefined;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : undefined;
};

// Inlined minimal recorder hook using AudioWorklet via AudioRecorder
function useInlineRecorder(options: { targetSampleRate?: number } = {}) {
  const targetSampleRate = options.targetSampleRate ?? 16000;

  const [isSupported, setIsSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);

  const audioWorkletRecorderRef = useRef<AudioRecorder | null>(null);
  const usingAudioWorkletRef = useRef(false);
  const chunkHandlerRef = useRef<((chunk: MediaRecorderVoiceResult) => void) | null>(null);
  const sampleRateRef = useRef(targetSampleRate);

  const hasAudioWorkletSupport = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return typeof (window as any).AudioWorkletNode !== 'undefined';
  }, []);

  const estimateDurationMs = useCallback((base64: string): number => {
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
    const bytes = (base64.length * 3) / 4 - padding;
    const samples = bytes / 2; // 16-bit PCM
    const rate = sampleRateRef.current || targetSampleRate;
    return samples > 0 ? (samples / rate) * 1000 : 0;
  }, [targetSampleRate]);

  const handleWorkletData = useCallback((base64: string) => {
    const handler = chunkHandlerRef.current;
    if (!handler || !base64) return;
    const declaredRate = sampleRateRef.current || targetSampleRate;
    handler({ base64, mimeType: `audio/pcm;rate=${declaredRate}`, durationMs: estimateDurationMs(base64) });
  }, [estimateDurationMs, targetSampleRate]);

  const handleWorkletError = useCallback((err: Error) => {
    console.error('🎤 [InlineRecorder] AudioWorklet error:', err);
    setError(err.message);
  }, []);

  const startRecording = useCallback(async (opts?: { onChunk?: (chunk: MediaRecorderVoiceResult) => void }) => {
    if (!isSupported) {
      const msg = 'Media capture not supported in this browser';
      console.error('🎤 [InlineRecorder]', msg);
      throw new Error(msg);
    }
    if (!hasAudioWorkletSupport()) {
      const msg = 'AudioWorklet required but not supported in this browser';
      console.error('🎤 [InlineRecorder]', msg);
      setError(msg);
      throw new Error(msg);
    }
    setError(null);
    chunkHandlerRef.current = opts?.onChunk ?? null;

    if (!audioWorkletRecorderRef.current) {
      const recorder = new AudioRecorder();
      recorder.on('data', handleWorkletData);
      recorder.on('error', handleWorkletError);
      recorder.on('stop', () => setIsRecording(false));
      audioWorkletRecorderRef.current = recorder;
    }

    await audioWorkletRecorderRef.current.start();
    // Fix: Check if recorder exists before calling getSampleRate
    if (audioWorkletRecorderRef.current && typeof audioWorkletRecorderRef.current.getSampleRate === 'function') {
      sampleRateRef.current = audioWorkletRecorderRef.current.getSampleRate() ?? targetSampleRate;
    } else {
      sampleRateRef.current = targetSampleRate;
    }
    usingAudioWorkletRef.current = true;
    setIsRecording(true);
    try {
      const stream = (audioWorkletRecorderRef.current as any)?.getStream?.() ?? null;
      if (stream) setMicStream(stream);
    } catch {}
  }, [handleWorkletData, handleWorkletError, hasAudioWorkletSupport, isSupported]);

  const stopRecording = useCallback(async () => {
    try {
      setIsProcessing(true);
      if (usingAudioWorkletRef.current && audioWorkletRecorderRef.current) {
        await audioWorkletRecorderRef.current.stop();
        // Force clear mic stream after stopping
        setMicStream(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to stop recording';
      setError(msg);
    } finally {
      chunkHandlerRef.current = null;
      usingAudioWorkletRef.current = false;
      setIsRecording(false);
      setMicStream(null);
      setIsProcessing(false);
    }
  }, []);

  const resetRecording = useCallback(async () => {
    try {
      if (audioWorkletRecorderRef.current) {
        audioWorkletRecorderRef.current.off('data', handleWorkletData);
        audioWorkletRecorderRef.current.off('error', handleWorkletError);
        try { await audioWorkletRecorderRef.current.stop(); } catch {}
        audioWorkletRecorderRef.current = null;
      }
    } finally {
      chunkHandlerRef.current = null;
      usingAudioWorkletRef.current = false;
      setIsRecording(false);
      setIsProcessing(false);
      setMicStream(null);
    }
  }, [handleWorkletData, handleWorkletError]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const supported = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
    setIsSupported(supported);
    if (!supported) setError('Voice capture is not supported in this browser.');
  }, []);

  useEffect(() => {
    return () => { void resetRecording(); };
  }, [resetRecording]);

  return {
    startRecording,
    stopRecording,
    resetRecording,
    isSupported,
    isRecording,
    isProcessing,
    error,
    micStream,
  } as const;
}

export type VoiceContextUpdate = {
  sessionId?: string | null;
  modality: 'screen' | 'webcam';
  analysis?: string;
  imageData?: string;
  capturedAt?: number;
  metadata?: Record<string, unknown>;
};

// LiveServerEvent is centralized in '@/core/live/types' to prevent drift

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
  liveClient?: LiveClientType;
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
    micStream,
  } = useInlineRecorder({ targetSampleRate: 16000 });

  const liveRef = useRef<LiveClientWS | null>(options.liveClient ?? null);
  const createdClientRef = useRef<boolean>(!options.liveClient);
  const listenerUnsubRef = useRef<Array<() => void>>([]);
  const hasBoundListenersRef = useRef<boolean>(false);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
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
    // Create AudioPlayer on mount to ensure it persists across voice turns
    audioPlayerRef.current = new AudioPlayer(DEFAULT_SERVER_SAMPLE_RATE);
    console.log('🎵 [RealtimeVoice] AudioPlayer created on mount', { 
      sampleRate: DEFAULT_SERVER_SAMPLE_RATE 
    });

    return () => {
      audioPlayerRef.current?.destroy();
      audioPlayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!recorderError) return;
    setError(recorderError);
    callbacksRef.current?.onError?.(recorderError);
  }, [recorderError]);

  const serverUrl = useMemo(() => {
    // Centralized WebSocket config handles both server and browser contexts safely.
    // Returning the computed URL unconditionally avoids hydration edge cases.
    return WEBSOCKET_CONFIG.URL;
  }, []);

  const sendMessage = useCallback((_message: Record<string, unknown>) => {
    console.warn('sendMessage called directly; prefer LiveClientWS methods');
  }, []);

  const sendToolResult = useCallback((responses: Array<Record<string, unknown>>) => {
    if (!responses || responses.length === 0) return;
    liveRef.current?.sendToolResponse(responses);
  }, []);

  const sendContextUpdate = useCallback((update: VoiceContextUpdate) => {
    if (!update || typeof update !== 'object') return;
    if (!update.analysis) return; // require analysis text for server injection
    liveRef.current?.sendContextUpdate({
      modality: update.modality,
      analysis: update.analysis,
      imageData: update.imageData,
      sessionId: update.sessionId ?? undefined,
      capturedAt: typeof update.capturedAt === 'number' ? update.capturedAt : Date.now(),
    });
  }, []);

  const sendRealtimeInput = useCallback((chunks: Array<{ mimeType: string; data: string }>) => {
    if (!session?.connectionId || !isSessionActive) {
      console.warn('Cannot send realtime input - no active session');
      return;
    }
    liveRef.current?.sendRealtimeInput(chunks);
  }, [session?.connectionId, isSessionActive]);

  // --- Dev diagnostics helpers ---
  const sineToPCM16Base64 = useCallback((frequency = 440, durationMs = 320, sampleRate = 16000) => {
    const totalSamples = Math.floor((durationMs / 1000) * sampleRate);
    const pcm = new Int16Array(totalSamples);
    const twoPiF = 2 * Math.PI * frequency;
    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const s = Math.sin(twoPiF * t) * 0.2; // -6 dBFS
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    // Convert to base64
    const buf = pcm.buffer;
    let binary = '';
    const bytes = new Uint8Array(buf);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
  }, []);

  const sendTestAudioChunk = useCallback((opts?: { frequency?: number; durationMs?: number }) => {
    const base64 = sineToPCM16Base64(opts?.frequency ?? 440, opts?.durationMs ?? 320, 16000);
    sendMessage({
      type: 'user_audio',
      payload: { audioData: base64, mimeType: 'audio/pcm;rate=16000' },
    });
  }, [sendMessage, sineToPCM16Base64]);

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
    audioPlayerRef.current?.clear();
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
        // Clear previous transcripts when starting new session
        setTranscript('');
        setPartialTranscript('');

        callbacks?.onSessionStateChange?.({
          active: true,
          connectionId: event.payload.connectionId,
          mock: event.payload.mock,
          isProcessing: recorderProcessing,
        });
        // Flush any audio chunks captured before the session opened
        if (pendingChunksRef.current.length > 0) {
          pendingChunksRef.current.forEach((chunk) => {
            liveRef.current?.sendAudioBase64PCM16(chunk.base64, chunk.mimeType)
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
        audioPlayerRef.current?.clear();
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
        // Use unified audio player for smooth playback
        const audioData = event.payload.audioData;
        if (!audioData) {
          console.warn('🎤 [RealtimeVoice] Received audio event without data');
          break;
        }

        const declaredRate = extractSampleRate(event.payload.mimeType);
        const playbackRate = declaredRate ?? DEFAULT_SERVER_SAMPLE_RATE;

        // Log audio event reception
        const padding = audioData.endsWith('==') ? 2 : audioData.endsWith('=') ? 1 : 0;
        const approxBytes = Math.max(0, Math.floor((audioData.length * 3) / 4) - padding);
        console.log('🎧 [RealtimeVoice] Audio event received', {
          base64Length: audioData.length,
          approxBytes,
          mimeType: event.payload.mimeType ?? 'not-specified',
          declaredRate: declaredRate ?? 'not-found',
          playbackRate,
          playerExists: !!audioPlayerRef.current,
          playerState: audioPlayerRef.current ? {
            playing: audioPlayerRef.current.playing,
            rate: audioPlayerRef.current.getSampleRate(),
            contextState: audioPlayerRef.current.contextState
          } : null
        });

        if (!audioPlayerRef.current) {
          console.error('🚫 [RealtimeVoice] AudioPlayer should exist but is missing!', { 
            sampleRate: playbackRate,
            playerExists: !!audioPlayerRef.current 
          });
          break;
        } else if (declaredRate && audioPlayerRef.current.getSampleRate() !== playbackRate) {
          console.warn('⚠️ [RealtimeVoice] Sample rate mismatch, updating player', {
            from: audioPlayerRef.current.getSampleRate(),
            to: playbackRate
          });
          audioPlayerRef.current.setSampleRate(playbackRate);
        }

        audioPlayerRef.current.addBase64PCM16(audioData);
        break;
      }
      case 'heartbeat': {
        liveRef.current?.ackHeartbeat();
        break;
      }
      case 'interrupted': {
        // User interrupted AI - clear audio queue immediately
        console.log('🔇 User interrupted AI - clearing audio queue')
        audioPlayerRef.current?.clear();
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
        // Clear transcripts when turn completes
        setTranscript('');
        setPartialTranscript('');
        callbacks?.onSessionStateChange?.({
          active: false,
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
        audioPlayerRef.current?.clear();
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

    liveRef.current?.sendAudioBase64PCM16(chunk.base64, chunk.mimeType);
  }, []);

  const connectWebSocket = useCallback(() => {
    console.log('🔌 [RealtimeVoice] connectWebSocket called', { serverUrl, hasLiveRef: !!liveRef.current });
    if (!serverUrl) {
      console.warn('🔌 [RealtimeVoice] No serverUrl, skipping connect');
      return;
    }
    if (!liveRef.current) {
      liveRef.current = options.liveClient ?? new LiveClientWS()
      createdClientRef.current = !options.liveClient
      hasBoundListenersRef.current = false;
    }
    const client = liveRef.current;
    if (!client) return;

    if (!hasBoundListenersRef.current) {
      // Remove any previous listeners before re-binding
      for (const teardown of listenerUnsubRef.current) {
        try { teardown(); } catch {}
      }
      listenerUnsubRef.current = [];

      listenerUnsubRef.current.push(
        client.on('open', () => {
          setSocketReady(true)
          setError(null)
          reconnectAttemptsRef.current = 0
        }),
        client.on('close', () => {
          setSocketReady(false)
          resetState({ soft: true })
          if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
            const msg = 'Failed to connect to voice server after multiple attempts. Please check if the server is running.'
            setError(msg)
            callbacksRef.current?.onError?.(msg)
            return
          }
          if (!reconnectTimerRef.current) {
            reconnectAttemptsRef.current++
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 16000)
            reconnectTimerRef.current = setTimeout(() => {
              reconnectTimerRef.current = null
              liveRef.current?.connect()
            }, delay)
          }
        }),
        client.on('error', (m) => {
          setError(typeof m === 'string' ? m : 'WebSocket connection error')
        }),
        client.on('connected', (id) => handleServerEvent({ type: 'connected', payload: { connectionId: id } })),
        client.on('session_started', (p) => handleServerEvent({ type: 'session_started', payload: { ...p } } as any)),
        client.on('session_closed', (reason) => handleServerEvent({ type: 'session_closed', payload: { reason } } as any)),
        client.on('input_transcript', (t, f) => handleServerEvent({ type: 'input_transcript', payload: { text: t, isFinal: f } })),
        client.on('output_transcript', (t, f) => handleServerEvent({ type: 'output_transcript', payload: { text: t, isFinal: f } })),
        client.on('text', (content) => handleServerEvent({ type: 'text', payload: { content } })),
        client.on('audio', (base64, mime) => handleServerEvent({ type: 'audio', payload: { audioData: base64, mimeType: mime } })),
        client.on('turn_complete', () => handleServerEvent({ type: 'turn_complete' } as any)),
        client.on('setup_complete', () => handleServerEvent({ type: 'setup_complete', payload: { setupComplete: true } })),
        client.on('interrupted', () => handleServerEvent({ type: 'interrupted', payload: { interrupted: true } })),
        client.on('tool_call', (p) => handleServerEvent({ type: 'tool_call', payload: p } as any)),
        client.on('tool_result', (p) => handleServerEvent({ type: 'tool_result', payload: p } as any))
      );
      hasBoundListenersRef.current = true;
    }

    client.connect();
  }, [callbacksRef, handleServerEvent, resetState, serverUrl, options.liveClient])

  const startSession = useCallback(async (opts?: { languageCode?: string; voiceName?: string; sessionId?: string }) => {
    console.log('🎤 [RealtimeVoice] startSession called', { isSocketReady, connectionId: connectionIdRef.current, opts });
    
    // If socket isn't ready yet, attempt a quick connect-and-wait before failing
    if (!isSocketReady || !liveRef.current) {
      try {
        liveRef.current?.connect()
        const ok = await new Promise<boolean>((resolve) => {
          let settled = false
          const timeout = setTimeout(() => { if (!settled) { settled = true; resolve(false) } }, 2000)
          const off = liveRef.current?.on('open', () => {
            if (!settled) { 
              settled = true
              clearTimeout(timeout)
              if (off) off()
              resolve(true)
            }
          })
        })
        if (!ok) {
          const message = 'Voice server not ready'
          console.error('🎤 [RealtimeVoice] Cannot start session - server not ready after wait:', { isSocketReady, serverUrl })
          setError(message)
          callbacksRef.current?.onError?.(message)
          return
        }
      } catch {
        const message = 'Voice server not ready'
        setError(message)
        callbacksRef.current?.onError?.(message)
        return
      }
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

      console.log('🎤 [RealtimeVoice] Sending start message');
      liveRef.current?.start({
        languageCode: opts?.languageCode,
        voiceName: opts?.voiceName,
        sessionId: opts?.sessionId,
      });
      console.log('🎤 [RealtimeVoice] Start message sent successfully; preparing microphone');

      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
        sessionTimeoutRef.current = null;
      }

      console.log('🎤 [RealtimeVoice] Requesting microphone permission...');
      await startRecording({ onChunk: handleRecorderChunk });
      console.log('🎤 [RealtimeVoice] Microphone permission granted and recording started');
      if (!isSessionActiveRef.current) {
        console.log('🎤 [RealtimeVoice] Awaiting session activation while buffering audio chunks');
      }
      
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
  }, [handleRecorderChunk, isSocketReady, sendMessage, session, startRecording, resetRecording, serverUrl]);

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

      // Notify server to mark turn complete and stop the Live session cleanly
      liveRef.current?.stop();

      setSessionActive(false);
      isSessionActiveRef.current = false;

      // Note: Context cleanup handled by server on disconnect (handleClose in live-server.ts)
      // and by client in ChatInterface component unmount
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stop voice session';
      console.error('🎤 [RealtimeVoice] Failed to stop session:', err);
      setError(message);
      setIsProcessing(false);
      callbacksRef.current?.onError?.(message);
    }
  }, [isSessionActive, isRecording, isProcessing, sendMessage, session, stopRecording]);

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
      if (createdClientRef.current) {
        liveRef.current?.disconnect();
      }
      for (const teardown of listenerUnsubRef.current) {
        try { teardown(); } catch {}
      }
      listenerUnsubRef.current = [];
      hasBoundListenersRef.current = false;
      liveRef.current = null;
    };
  }, [connectWebSocket]); // Connect on mount with proper dependency

  useEffect(() => {
    return () => {
      void resetRecording();
      if (audioPlayerRef.current) {
        audioPlayerRef.current.destroy();
        audioPlayerRef.current = null;
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
    micStream,
    startSession,
    stopSession,
    sendTestAudioChunk,
    sendToolResult,
    sendContextUpdate,
    sendRealtimeInput,
  };
}
