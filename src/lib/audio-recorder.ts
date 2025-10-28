/**
 * Optimized Real-time Audio Recorder for Continuous Streaming
 * Uses AudioWorklet with minimal processing for best audio quality and low latency
 */
import { EventEmitter } from 'events';
import { arrayBufferToBase64, STANDARD_AUDIO_CONSTRAINTS } from './audio-utils';

const VERBOSE_AUDIO_LOGS = process.env.NEXT_PUBLIC_VOICE_VERBOSE_LOGS === 'true';
const debugLog = (...args: Parameters<typeof console.log>) => {
  if (!VERBOSE_AUDIO_LOGS) return;
  console.log(...args);
};

export interface AudioRecorderEvents {
  data: (base64: string) => void;
  error: (error: Error) => void;
  start: () => void;
  stop: () => void;
}

// Optimized AudioWorklet with smaller buffer for lower latency and better quality
const OPTIMIZED_AUDIO_WORKLET_SOURCE = `class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Reduced buffer size: 1024 samples = 64ms at 16kHz
    // This provides ~15 chunks/second for better responsiveness
    this.bufferSize = 1024;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (input.length > 0) {
      const inputChannel = input[0];
      
      // Direct processing without intermediate buffering when possible
      for (let i = 0; i < inputChannel.length; i++) {
        this.buffer[this.bufferIndex] = inputChannel[i];
        this.bufferIndex++;
        
        if (this.bufferIndex >= this.bufferSize) {
          // Optimized Float32 to Int16 conversion with minimal processing
          const int16Buffer = new Int16Array(this.bufferSize);
          for (let j = 0; j < this.bufferSize; j++) {
            const sample = this.buffer[j];
            // Fast clamping and conversion
            const clamped = Math.max(-1, Math.min(1, sample));
            int16Buffer[j] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
          }
          
          // Send immediately without delay
          this.port.postMessage({
            type: 'audioData',
            data: int16Buffer.buffer
          });
          
          this.bufferIndex = 0;
        }
      }
    }
    
    return true; // Keep processor alive
  }
}

registerProcessor('audio-processor', AudioProcessor);
`;

export class AudioRecorder extends EventEmitter {
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private recordingWorklet: AudioWorkletNode | null = null;
  private stream: MediaStream | null = null;
  private isActive = false;
  private actualSampleRate = 16000;

  constructor() {
    super();
  }

  async start(): Promise<void> {
    try {
      debugLog('🎤 [AudioRecorder] Starting optimized audio capture...');
      
      // Get microphone access with standard constraints
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: STANDARD_AUDIO_CONSTRAINTS
      });
      debugLog('🎤 [AudioRecorder] Microphone access granted');
      
      // Create audio context at 16kHz for optimal Live API compatibility
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      await this.audioContext.resume();
      this.actualSampleRate = this.audioContext.sampleRate ?? 16000;
      
      debugLog('🎤 [AudioRecorder] Audio context created:', {
        requested: 16000,
        actual: this.actualSampleRate
      });
      
      if (this.audioContext.sampleRate !== 16000) {
        console.warn('⚠️ [AudioRecorder] Sample rate mismatch:', this.audioContext.sampleRate);
      }
      
      // Create media stream source
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      debugLog('🎤 [AudioRecorder] Media stream source created');
      
      // Always use optimized AudioWorklet - fallback to ScriptProcessor only if absolutely necessary
      if (this.audioContext.audioWorklet) {
        try {
          // Load optimized worklet directly from inline source
          const blob = new Blob([OPTIMIZED_AUDIO_WORKLET_SOURCE], { type: 'application/javascript' });
          const url = URL.createObjectURL(blob);
          
          try {
            await this.audioContext.audioWorklet.addModule(url);
            debugLog('🎤 [AudioRecorder] Optimized AudioWorklet loaded');
          } finally {
            URL.revokeObjectURL(url);
          }
          
          // Create worklet node
          this.recordingWorklet = new AudioWorkletNode(this.audioContext, 'audio-processor');
          debugLog('🎤 [AudioRecorder] AudioWorklet node created');
          
          // Handle audio data with minimal processing
          this.recordingWorklet.port.onmessage = (event) => {
            if (event.data.type === 'audioData' && event.data.data instanceof ArrayBuffer) {
              const arrayBuffer = event.data.data;
              const base64 = arrayBufferToBase64(arrayBuffer);
              
              // Minimal logging for performance
              if (VERBOSE_AUDIO_LOGS && Math.random() < 0.01) {
                debugLog('🎤 [AudioRecorder] Audio chunk:', {
                  sampleRate: this.actualSampleRate,
                  bufferSize: arrayBuffer.byteLength,
                  base64Length: base64.length
                });
              }
              
              this.emit('data', base64);
            }
          };
          
          // Connect audio pipeline
          this.source.connect(this.recordingWorklet);
          debugLog('🎤 [AudioRecorder] Audio pipeline connected');
          
        } catch (workletError) {
          console.error('🎤 [AudioRecorder] AudioWorklet failed:', workletError);
          throw new Error('AudioWorklet initialization failed. Audio capture unavailable.');
        }
      } else {
        // Last resort fallback
        throw new Error('AudioWorklet not supported in this browser');
      }
      
      this.isActive = true;
      this.emit('start');
      debugLog('🎤 [AudioRecorder] Optimized audio capture started');
      
    } catch (error) {
      console.error('🎤 [AudioRecorder] Failed to start audio capture:', error);
      this.emit('error', error instanceof Error ? error : new Error('Failed to start audio capture'));
      this.cleanup();
    }
  }

  stop(): void {
    if (!this.isActive) {
      debugLog('🎤 [AudioRecorder] Stop called but already inactive - ignoring duplicate stop');
      return;
    }
    debugLog('🎤 [AudioRecorder] Stopping audio capture');
    console.trace('🎤 [AudioRecorder] Stop call stack:');
    this.cleanup();
    this.isActive = false;
    this.emit('stop');
  }

  private cleanup(): void {
    // Disconnect audio nodes
    if (this.recordingWorklet) {
      this.recordingWorklet.disconnect();
      this.recordingWorklet = null;
    }
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    // Stop media stream
    if (this.stream) {
      this.stream.getTracks().forEach((track) => {
        track.stop();
      });
      this.stream = null;
    }
  }

  get isRecording(): boolean {
    return this.isActive;
  }

  public getSampleRate(): number {
    return this.actualSampleRate;
  }

  /**
   * Returns underlying MediaStream used for capture, if available.
   * Useful for visualizers or diagnostics. May be null if not started yet
   * or if capture has been stopped.
   */
  public getStream(): MediaStream | null {
    return this.stream;
  }
}
