import { useState, useCallback, useRef, useEffect } from "react";
import { useWebSocketVoice } from "@/hooks/useWebSocketVoice";
import { CHAT_CONSTANTS } from "../constants/chatConstants";

export function useChatAudio() {
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);

  const voice = useWebSocketVoice();
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const captureContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Audio processing utilities (moved from main component)
  const convertFloat32ToPCM16Buffer = useCallback((float32: Float32Array) => {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i += 1) {
      const sample = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }
    return int16.buffer;
  }, []);

  const downsampleToPCM16 = useCallback((input: Float32Array, inputSampleRate: number, targetSampleRate: number) => {
    if (targetSampleRate >= inputSampleRate) {
      return convertFloat32ToPCM16Buffer(input);
    }

    const sampleRateRatio = inputSampleRate / targetSampleRate;
    const newLength = Math.round(input.length / sampleRateRatio);
    const result = new Float32Array(newLength);

    let offset = 0;
    for (let i = 0; i < newLength; i += 1) {
      const nextOffset = Math.round((i + 1) * sampleRateRatio);
      let accum = 0;
      let count = 0;
      for (let j = offset; j < nextOffset && j < input.length; j += 1) {
        accum += input[j];
        count += 1;
      }
      result[i] = count > 0 ? accum / count : 0;
      offset = nextOffset;
    }

    return convertFloat32ToPCM16Buffer(result);
  }, [convertFloat32ToPCM16Buffer]);

  // Audio processing handler
  const handleAudioProcess = useCallback((event: any) => {
    if (!voice.isSessionActive) return;

    const channelData = event.inputBuffer.getChannelData(0);
    const pcmBuffer = downsampleToPCM16(channelData, event.inputBuffer.sampleRate, CHAT_CONSTANTS.AUDIO.TARGET_VOICE_SAMPLE_RATE);
    voice.sendAudioChunk(pcmBuffer, `audio/pcm;rate=${CHAT_CONSTANTS.AUDIO.TARGET_VOICE_SAMPLE_RATE}`);
  }, [voice, downsampleToPCM16]);

  // Setup audio recorder
  const setupRecorder = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: CHAT_CONSTANTS.AUDIO.TARGET_VOICE_SAMPLE_RATE,
          sampleSize: 16,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      mediaStreamRef.current = stream;
      const audioContext = new AudioContext({ sampleRate: CHAT_CONSTANTS.AUDIO.TARGET_VOICE_SAMPLE_RATE });
      captureContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      // Use AudioWorkletNode for better performance
      try {
        await audioContext.audioWorklet.addModule('/audio-processor.js');
        const processor = new AudioWorkletNode(audioContext, 'audio-processor');
        processorRef.current = processor;

        processor.port.onmessage = (event) => {
          if (event.data.type === 'audioData' && voice.isSessionActive) {
            const channelData = event.data.data;
            const pcmBuffer = downsampleToPCM16(channelData, audioContext.sampleRate, CHAT_CONSTANTS.AUDIO.TARGET_VOICE_SAMPLE_RATE);
            voice.sendAudioChunk(pcmBuffer, `audio/pcm;rate=${CHAT_CONSTANTS.AUDIO.TARGET_VOICE_SAMPLE_RATE}`);
          }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
      } catch (workletError) {
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
  }, [handleAudioProcess, voice, downsampleToPCM16]);

  // Teardown audio resources
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

  // Start voice session
  const startVoiceSession = useCallback(async () => {
    if (!isVoiceSupported) {
      throw new Error('Voice capture not supported in this browser');
    }

    try {
      await voice.startSession();

      // Wait for session to become active before setting up recorder
      const waitForSessionActive = () => {
        return new Promise<void>((resolve) => {
          const checkActive = () => {
            if (voice.isSessionActive) {
              resolve();
            } else {
              setTimeout(checkActive, 50);
            }
          };
          checkActive();
        });
      };

      await waitForSessionActive();
      await setupRecorder();
    } catch (error) {
      teardownAudio();
      throw error;
    }
  }, [isVoiceSupported, voice, setupRecorder, teardownAudio]);

  // Stop voice session
  const stopVoiceSession = useCallback(() => {
    teardownAudio();
    voice.stopSession();
  }, [teardownAudio, voice]);

  // Toggle voice functionality
  const toggleVoice = useCallback(async () => {
    if (!isVoiceSupported) {
      throw new Error('Voice capture not supported in this browser');
    }

    if (voice.isSessionActive) {
      stopVoiceSession();
    } else {
      await startVoiceSession();
    }
  }, [isVoiceSupported, voice.isSessionActive, startVoiceSession, stopVoiceSession]);

  // Check voice support on mount
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      setIsVoiceSupported(true);
    }
  }, []);

  return {
    voice,
    isVoiceSupported,
    voiceTranscript: voice.transcript,
    voicePartialTranscript: voice.partialTranscript,
    voiceError: voice.error,
    toggleVoice,
    startVoiceSession,
    stopVoiceSession,
  };
}



