/**
 * Simple, Reliable Audio Recorder for Crisp Audio Quality
 * Addresses "crisp" to "bad" audio degradation issue
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

// Proven AudioWorklet pattern for crisp audio
const CRISP_AUDIO_WORKLET = `class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Small buffer for crisp, responsive audio: 512 samples = ~21ms at 24kHz
    this.bufferSize = 512;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (input.length > 0) {
      const inputChannel = input[0];
      
      for (let i = 0; i < inputChannel.length; i++) {
        this.buffer[this.bufferIndex] = inputChannel[i];
        this.bufferIndex++;
        
        if (this.bufferIndex >= this.bufferSize) {
          // Proven Float32 to Int16 conversion
          const int16Buffer = new Int16Array(this.bufferSize);
          for (let j = 0; j < this.bufferSize; j++) {
            const sample = this.buffer[j];
            int16Buffer[j] = sample * 32767;
          }
          
          this.port.postMessage({
            type: 'audioData',
            data: int16Buffer.buffer
          });
          
          this.bufferIndex = 0;
        }
      }
    }
    
    return true;
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
      debugLog('🎤 [AudioRecorder] Starting crisp audio capture...');
      
      // Get microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: STANDARD_AUDIO_CONSTRAINTS
      });
      debugLog('🎤 [AudioRecorder] Microphone access granted');
      
      // Create audio context targeting 24kHz to align with Gemini Live API expectations
      this.audioContext = new AudioContext({ sampleRate: 24000 });
      await this.audioContext.resume();
      this.actualSampleRate = this.audioContext.sampleRate ?? 24000;
      
      debugLog('🎤 [AudioRecorder] Audio context:', {
        requested: 24000,
        actual: this.actualSampleRate
      });
      
      // Create media stream source
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      
      // Use proven crisp AudioWorklet
      if (this.audioContext.audioWorklet) {
        try {
          // Load worklet from proven pattern
          const blob = new Blob([CRISP_AUDIO_WORKLET], { type: 'application/javascript' });
          const url = URL.createObjectURL(blob);
          
          try {
            await this.audioContext.audioWorklet.addModule(url);
            debugLog('🎤 [AudioRecorder] Crisp AudioWorklet loaded');
          } finally {
            URL.revokeObjectURL(url);
          }
          
          // Create worklet node
          this.recordingWorklet = new AudioWorkletNode(this.audioContext, 'audio-processor');
          
          // Handle audio data with proven pattern
          this.recordingWorklet.port.onmessage = (event) => {
            if (event.data.type === 'audioData' && event.data.data instanceof ArrayBuffer) {
              const arrayBuffer = event.data.data;
              const base64 = arrayBufferToBase64(arrayBuffer);
              
              if (VERBOSE_AUDIO_LOGS && Math.random() < 0.01) {
                debugLog('🎤 [AudioRecorder] Crisp audio chunk:', {
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
          debugLog('🎤 [AudioRecorder] Crisp audio pipeline connected');
          
        } catch (workletError) {
          console.error('🎤 [AudioRecorder] AudioWorklet failed:', workletError);
          throw new Error('AudioWorklet initialization failed. Audio capture unavailable.');
        }
      } else {
        throw new Error('AudioWorklet not supported in this browser');
      }
      
      this.isActive = true;
      this.emit('start');
      debugLog('🎤 [AudioRecorder] Crisp audio capture started');
      
    } catch (error) {
      console.error('🎤 [AudioRecorder] Failed to start audio capture:', error);
      this.emit('error', error instanceof Error ? error : new Error('Failed to start audio capture'));
      this.cleanup();
    }
  }

  stop(): void {
    if (!this.isActive) {
      debugLog('🎤 [AudioRecorder] Stop called but already inactive');
      return;
    }
    
    debugLog('🎤 [AudioRecorder] Stopping crisp audio capture');
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

  public getStream(): MediaStream | null {
    return this.stream;
  }
}
