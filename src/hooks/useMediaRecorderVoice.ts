import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioRecorder } from '@/lib/audio-recorder';
import {
  arrayBufferToBase64,
  mixToMono,
  resampleAudio,
  float32ToPCM16,
  STANDARD_AUDIO_CONSTRAINTS
} from '@/lib/audio-utils';

export type MediaRecorderVoiceResult = {
  base64: string;
  mimeType: string;
  durationMs: number;
};

export interface UseMediaRecorderVoiceOptions {
  targetSampleRate?: number;
}

export interface StartRecordingOptions {
  onChunk?: (chunk: MediaRecorderVoiceResult) => void;
}

type SupportedRecorderEvent = BlobEvent | Event;
type RecorderErrorEvent = Event & { error?: DOMException; message?: string };

const hasAudioWorkletSupport = () => {
  if (typeof window === 'undefined') return false;
  return typeof (window as any).AudioWorkletNode !== 'undefined';
};

const estimateDurationMs = (base64: string, sampleRate: number): number => {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  const bytes = (base64.length * 3) / 4 - padding;
  const samples = bytes / 2;
  return samples > 0 ? (samples / sampleRate) * 1000 : 0;
};

export function useMediaRecorderVoice(options: UseMediaRecorderVoiceOptions = {}) {
  const targetSampleRate = options.targetSampleRate ?? 16000;

  const [isSupported, setIsSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mimeTypeRef = useRef<string>('audio/webm');
  const chunkHandlerRef = useRef<StartRecordingOptions['onChunk'] | null>(null);
  const conversionsInFlightRef = useRef(0);
  const audioWorkletRecorderRef = useRef<AudioRecorder | null>(null);
  const usingAudioWorkletRef = useRef(false);

  const handleRecorderError = useCallback((event: SupportedRecorderEvent) => {
    const recorderEvent = event as RecorderErrorEvent;
    const message = recorderEvent?.message || recorderEvent?.error?.message || 'MediaRecorder error';
    setError(message);
  }, []);

  const handleWorkletData = useCallback((base64: string) => {
    const handler = chunkHandlerRef.current;
    if (!handler || !base64) return;

    handler({
      base64,
      mimeType: `audio/pcm;rate=${targetSampleRate}`,
      durationMs: estimateDurationMs(base64, targetSampleRate),
    });
  }, [targetSampleRate]);

  const handleWorkletError = useCallback((error: Error) => {
    console.error('🎤 [useMediaRecorderVoice] AudioWorklet error:', error);
    setError(error.message);
  }, []);

  const cleanupStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setMicStream(null);
    mediaRecorderRef.current = null;
  }, []);

  const cleanupAudioWorklet = useCallback(async () => {
    if (audioWorkletRecorderRef.current) {
      audioWorkletRecorderRef.current.off('data', handleWorkletData);
      audioWorkletRecorderRef.current.off('error', handleWorkletError);
      try {
        await audioWorkletRecorderRef.current.stop();
      } catch {
        // ignore stop errors during cleanup
      }
      audioWorkletRecorderRef.current = null;
    }
    usingAudioWorkletRef.current = false;
    setMicStream(null);
  }, [handleWorkletData, handleWorkletError]);

  const pickMimeType = useCallback(() => {
    if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
      return '';
    }

    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
    ];

    for (const candidate of candidates) {
      if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(candidate)) {
        return candidate;
      }
    }

    return '';
  }, []);

  const convertToPCM = useCallback(async (arrayBuffer: ArrayBuffer) => {
    if (typeof window === 'undefined') {
      throw new Error('Audio conversion is only available in the browser');
    }

    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) {
      throw new Error('Web Audio API not supported');
    }

    const audioContext = new AudioContextCtor();
    let decoded: AudioBuffer;

    try {
      decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    } finally {
      await audioContext.close().catch(() => undefined);
    }

    const monoData = mixToMono(decoded);
    const resampled = resampleAudio(monoData, decoded.sampleRate, targetSampleRate);
    const pcmBuffer = float32ToPCM16(resampled);
    const durationMs = resampled.length > 0 ? (resampled.length / targetSampleRate) * 1000 : 0;

    return { pcmBuffer, durationMs };
  }, [targetSampleRate]);

  const processChunk = useCallback(async (blob: Blob) => {
    try {
      conversionsInFlightRef.current += 1;
      setIsProcessing(true);

      const arrayBuffer = await blob.arrayBuffer();
      const { pcmBuffer, durationMs } = await convertToPCM(arrayBuffer);
      const base64 = arrayBufferToBase64(pcmBuffer);

      chunkHandlerRef.current?.({
        base64,
        mimeType: `audio/pcm;rate=${targetSampleRate}`,
        durationMs,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to process audio chunk';
      setError(message);
    } finally {
      conversionsInFlightRef.current = Math.max(0, conversionsInFlightRef.current - 1);
      if (conversionsInFlightRef.current === 0) {
        setIsProcessing(false);
      }
    }
  }, [convertToPCM, targetSampleRate]);

  const handleDataAvailable = useCallback((event: SupportedRecorderEvent) => {
    const blobEvent = event as BlobEvent;
    if (blobEvent.data && blobEvent.data.size > 0) {
      void processChunk(blobEvent.data);
    }
  }, [processChunk]);

  const startRecording = useCallback(async (options?: StartRecordingOptions) => {
    if (!isSupported) {
      throw new Error('Media capture not supported in this browser');
    }

    setError(null);
    chunkHandlerRef.current = options?.onChunk ?? null;

    if (hasAudioWorkletSupport()) {
      try {
        if (!audioWorkletRecorderRef.current) {
          const recorder = new AudioRecorder();
          recorder.on('data', handleWorkletData);
          recorder.on('error', handleWorkletError);
          recorder.on('stop', () => {
            console.log('🎤 [useMediaRecorderVoice] AudioRecorder stopped');
            setIsRecording(false);
          });
          audioWorkletRecorderRef.current = recorder;
        }

        await audioWorkletRecorderRef.current.start();
        usingAudioWorkletRef.current = true;
        setIsRecording(true);
        try {
          const stream = (audioWorkletRecorderRef.current as any)?.getStream?.() ?? null;
          if (stream) setMicStream(stream);
        } catch {}
        return;
      } catch (err) {
        console.warn('[useMediaRecorderVoice] AudioWorklet start failed, falling back to MediaRecorder.', err);
        await cleanupAudioWorklet();
        setError(err instanceof Error ? err.message : 'AudioWorklet start failed, using fallback');
      }
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: STANDARD_AUDIO_CONSTRAINTS,
      });

      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mimeTypeRef.current = mimeType || recorder.mimeType || 'audio/webm';
      recorder.addEventListener('dataavailable', handleDataAvailable as EventListener);
      recorder.addEventListener('error', handleRecorderError as EventListener);

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      mediaStreamRef.current = stream;
      setMicStream(stream);
      usingAudioWorkletRef.current = false;
      setIsRecording(true);
    } catch (err) {
      cleanupStream();
      const message = err instanceof Error ? err.message : 'Failed to start recording';
      setError(message);
      throw err;
    }
  }, [cleanupAudioWorklet, cleanupStream, handleDataAvailable, handleRecorderError, handleWorkletData, handleWorkletError, isSupported, pickMimeType, targetSampleRate]);

  const stopRecording = useCallback(async () => {
    console.log('🎤 [useMediaRecorderVoice] stopRecording called');
    console.trace('🎤 [useMediaRecorderVoice] stopRecording call stack:');
    
    if (usingAudioWorkletRef.current && audioWorkletRecorderRef.current) {
      try {
        await audioWorkletRecorderRef.current.stop();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to stop recording';
        setError(message);
      } finally {
        chunkHandlerRef.current = null;
        usingAudioWorkletRef.current = false;
        setIsRecording(false);
        setMicStream(null);
      }
      return;
    }

    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      chunkHandlerRef.current = null;
      return;
    }

    if (recorder.state === 'inactive') {
      cleanupStream();
      chunkHandlerRef.current = null;
      setIsRecording(false);
      return;
    }

    await new Promise<void>((resolve) => {
      const handleStop = () => {
        recorder.removeEventListener('stop', handleStop);
        resolve();
      };
      recorder.addEventListener('stop', handleStop, { once: true });

      try {
        recorder.stop();
      } catch (err) {
        recorder.removeEventListener('stop', handleStop);
        const message = err instanceof Error ? err.message : 'Failed to stop recording';
        setError(message);
        resolve();
      }
    });

    await new Promise<void>((resolve) => {
      const check = () => {
        if (conversionsInFlightRef.current === 0) {
          resolve();
        } else {
          setTimeout(check, 25);
        }
      };
      check();
    });

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.removeEventListener('dataavailable', handleDataAvailable as EventListener);
      mediaRecorderRef.current.removeEventListener('error', handleRecorderError as EventListener);
      mediaRecorderRef.current = null;
    }

    cleanupStream();
    chunkHandlerRef.current = null;
    setIsRecording(false);
    setMicStream(null);
  }, [cleanupStream, handleDataAvailable, handleRecorderError]);

  const resetRecording = useCallback(async () => {
    await cleanupAudioWorklet();

    const recorder = mediaRecorderRef.current;
    if (recorder) {
      recorder.removeEventListener('dataavailable', handleDataAvailable as EventListener);
      recorder.removeEventListener('error', handleRecorderError as EventListener);
      try {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      } catch {
        // Ignore failures during teardown
      }
    }

    chunkHandlerRef.current = null;
    conversionsInFlightRef.current = 0;
    cleanupStream();
    setIsRecording(false);
    setIsProcessing(false);
  }, [cleanupAudioWorklet, cleanupStream, handleDataAvailable, handleRecorderError]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const supported = typeof navigator !== 'undefined'
      && Boolean(navigator.mediaDevices?.getUserMedia);

    setIsSupported(supported);
    if (!supported) {
      setError('Voice capture is not supported in this browser.');
    }
  }, []);

  useEffect(() => {
    return () => {
      void resetRecording();
    };
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
  };
}
