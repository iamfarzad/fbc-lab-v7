/**
 * Consolidated Audio Utilities
 * Single source of truth for all audio processing operations
 */

type GetAudioContextOptions = AudioContextOptions & {
  id?: string;
};

const map: Map<string, AudioContext> = new Map();

const parseBooleanEnv = (value: string | undefined, fallback: boolean): boolean => {
  if (typeof value !== 'string') return fallback;
  const normalised = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalised)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalised)) return false;
  return fallback;
};

export const audioContext: (
  options?: GetAudioContextOptions
) => Promise<AudioContext> = (() => {
  let didInteract: Promise<void> | null = null;

  const getInteractionPromise = () => {
    if (!didInteract && typeof window !== 'undefined') {
      didInteract = new Promise(res => {
        window.addEventListener('pointerdown', () => res(), { once: true });
        window.addEventListener('keydown', () => res(), { once: true });
      });
    }
    return didInteract;
  };

  return async (options?: GetAudioContextOptions) => {
    // Check if we're on the client side
    if (typeof window === 'undefined') {
      throw new Error('AudioContext can only be created in a browser environment');
    }

    try {
      const a = new Audio();
      a.src =
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      await a.play();
      if (options?.id && map.has(options.id)) {
        const ctx = map.get(options.id);
        if (ctx) {
          return ctx;
        }
      }
      const ctx = new AudioContext(options);
      if (options?.id) {
        map.set(options.id, ctx);
      }
      return ctx;
    } catch {
      const interactionPromise = getInteractionPromise();
      if (interactionPromise) {
        await interactionPromise;
      }
      if (options?.id && map.has(options.id)) {
        const ctx = map.get(options.id);
        if (ctx) {
          return ctx;
        }
      }
      const ctx = new AudioContext(options);
      if (options?.id) {
        map.set(options.id, ctx);
      }
      return ctx;
    }
  };
})();

// ============================================================================
// Base64 Conversions
// ============================================================================

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ============================================================================
// PCM Conversions
// ============================================================================

/**
 * Convert Float32 audio samples to PCM16 format
 * @param float32 Audio samples in range [-1, 1]
 * @returns PCM16 encoded as ArrayBuffer
 */
export function float32ToPCM16(float32: Float32Array): ArrayBuffer {
  const pcmBuffer = new ArrayBuffer(float32.length * 2);
  const view = new DataView(pcmBuffer);

  for (let i = 0; i < float32.length; i++) {
    const clampedSample = Math.max(-1, Math.min(1, float32[i]));
    const intSample = clampedSample < 0 ? clampedSample * 0x8000 : clampedSample * 0x7fff;
    view.setInt16(i * 2, intSample, true);
  }

  return pcmBuffer;
}

/**
 * Convert PCM16 data to Float32 audio samples
 * @param pcm16Data PCM16 as ArrayBuffer or Int16Array
 * @returns Float32 audio samples in range [-1, 1]
 */
export function pcm16ToFloat32(pcm16Data: ArrayBuffer | Int16Array): Float32Array {
  const int16Array = pcm16Data instanceof Int16Array 
    ? pcm16Data 
    : new Int16Array(pcm16Data);
  
  const float32 = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32[i] = int16Array[i] / 32768.0;
  }
  
  return float32;
}

/**
 * Decode base64-encoded PCM16 audio to Float32 samples
 * @param base64 Base64-encoded PCM16 data
 * @returns Float32 audio samples
 */
export function base64PCM16ToFloat32(base64: string): Float32Array {
  const arrayBuffer = base64ToArrayBuffer(base64);
  const float32 = pcm16ToFloat32(arrayBuffer);
  
  // Validate decoded data
  const hasNaN = float32.some(v => !Number.isFinite(v));
  const allZeros = float32.every(v => v === 0);
  
  if (hasNaN) {
    console.error('❌ [audio-utils] Decoded Float32 contains NaN values!', {
      base64Length: base64.length,
      sampleCount: float32.length
    });
  }
  
  if (allZeros && float32.length > 0) {
    console.warn('⚠️ [audio-utils] Decoded audio is all zeros (silence)', {
      base64Length: base64.length,
      sampleCount: float32.length
    });
  }
  
  return float32;
}

// ============================================================================
// Resampling
// ============================================================================

/**
 * Resample audio from one sample rate to another using linear interpolation
 * @param input Source audio samples
 * @param sourceRate Source sample rate (Hz)
 * @param targetRate Target sample rate (Hz)
 * @returns Resampled audio at target rate
 */
export function resampleAudio(
  input: Float32Array,
  sourceRate: number,
  targetRate: number
): Float32Array {
  if (sourceRate === targetRate) {
    return input;
  }

  const ratio = sourceRate / targetRate;
  const newLength = Math.max(1, Math.round(input.length / ratio));
  const result = new Float32Array(newLength);

  let offsetResult = 0;
  let offsetInput = 0;

  while (offsetResult < newLength) {
    const nextOffsetInput = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;

    for (let i = offsetInput; i < nextOffsetInput && i < input.length; i++) {
      accum += input[i];
      count++;
    }

    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetInput = nextOffsetInput;
  }

  return result;
}

// ============================================================================
// Audio Buffer Utilities
// ============================================================================

/**
 * Mix multi-channel audio buffer to mono
 * @param buffer Multi-channel AudioBuffer
 * @returns Mono Float32Array
 */
export function mixToMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) {
    return new Float32Array(buffer.getChannelData(0));
  }

  const frameCount = buffer.length;
  const mixed = new Float32Array(frameCount);

  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      mixed[i] += channelData[i];
    }
  }

  for (let i = 0; i < frameCount; i++) {
    mixed[i] /= buffer.numberOfChannels;
  }

  return mixed;
}

// ============================================================================
// Standard Configurations
// ============================================================================

/**
 * Standard audio constraints for getUserMedia
 * Optimized for voice capture at 16kHz mono with noise reduction
 */
const DEFAULT_DSP_STATE = parseBooleanEnv(process.env.NEXT_PUBLIC_VOICE_DSP_DEFAULT, false);

export const STANDARD_AUDIO_CONSTRAINTS = {
  channelCount: 1,
  sampleRate: 24000,
  sampleSize: 16,
  echoCancellation: parseBooleanEnv(process.env.NEXT_PUBLIC_VOICE_ECHO_CANCELLATION, DEFAULT_DSP_STATE),
  noiseSuppression: parseBooleanEnv(process.env.NEXT_PUBLIC_VOICE_NOISE_SUPPRESSION, DEFAULT_DSP_STATE),
  autoGainControl: parseBooleanEnv(process.env.NEXT_PUBLIC_VOICE_AUTO_GAIN, DEFAULT_DSP_STATE),
} as const;

// ============================================================================
// Stream Management
// ============================================================================

/**
 * Stop all tracks in a MediaStream and clean up
 * @param stream MediaStream to stop, or null
 */
export function stopMediaStream(stream: MediaStream | null): void {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
}
