/**
 * Real-time Audio Recorder for Continuous Streaming
 * Uses AudioWorklet to capture audio continuously and emit base64 chunks
 */

import { EventEmitter } from 'events';
import { arrayBufferToBase64, STANDARD_AUDIO_CONSTRAINTS } from './audio-utils';

export interface AudioRecorderEvents {
  data: (base64: string) => void;
  error: (error: Error) => void;
  start: () => void;
  stop: () => void;
}

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
      console.log('🎤 [AudioRecorder] Starting continuous audio capture...');
      
      // Get microphone access
      console.log('🎤 [AudioRecorder] Requesting microphone access...');
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: STANDARD_AUDIO_CONSTRAINTS
      });
      console.log('🎤 [AudioRecorder] Microphone access granted');

      // Create audio context with forced 16kHz for Gemini compatibility
      console.log('🎤 [AudioRecorder] Creating audio context...');
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      console.log('🎤 [AudioRecorder] Audio context created');
      console.log('🎤 [AudioRecorder] Requested sample rate: 16000');
      console.log('🎤 [AudioRecorder] Actual sample rate:', this.audioContext.sampleRate);
      this.actualSampleRate = this.audioContext.sampleRate ?? 16000;
      
      if (this.audioContext.sampleRate !== 16000) {
        console.warn('⚠️ [AudioRecorder] Hardware does not support 16kHz! Using:', this.audioContext.sampleRate);
        console.warn('⚠️ [AudioRecorder] Audio quality may be degraded - resampling required');
      } else {
        console.log('✅ [AudioRecorder] Sample rate verified: 16kHz');
      }
      
      // Create source
      console.log('🎤 [AudioRecorder] Creating media stream source...');
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      console.log('🎤 [AudioRecorder] Media stream source created');
      
      // Load and create AudioWorklet
      console.log('🎤 [AudioRecorder] Loading audio worklet module...');
      
      // First verify the file exists
      try {
        const testFetch = await fetch('/audio-processor.js');
        if (!testFetch.ok) {
          throw new Error(`Audio processor file not found: ${testFetch.status} ${testFetch.statusText}`);
        }
        console.log('🎤 [AudioRecorder] Audio processor file verified');
      } catch (fetchError) {
        console.error('❌ [AudioRecorder] Failed to fetch audio processor:', fetchError);
        throw new Error(`Cannot load /audio-processor.js: ${fetchError}`);
      }
      
      // Add timeout to detect hanging promises
      const addModulePromise = this.audioContext.audioWorklet.addModule('/audio-processor.js');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AudioWorklet module loading timed out after 5s')), 5000)
      );
      
      await Promise.race([addModulePromise, timeoutPromise]);
      console.log('🎤 [AudioRecorder] Audio worklet module loaded');
      
      console.log('🎤 [AudioRecorder] Creating audio worklet node...');
      this.recordingWorklet = new AudioWorkletNode(this.audioContext, 'audio-processor');
      console.log('🎤 [AudioRecorder] Audio worklet node created');
      
      // Handle audio data from worklet (supports PCM16 or Float32 fallback)
      this.recordingWorklet.port.onmessage = (event) => {
        if (event.data.type !== 'audioData') return;
        const payload = event.data?.data;

        // Preferred: PCM16 from worklet
        if (payload && payload.int16arrayBuffer instanceof ArrayBuffer) {
          const arrayBuffer = payload.int16arrayBuffer as ArrayBuffer;
          const base64 = arrayBufferToBase64(arrayBuffer);
          if (Math.random() < 0.02) {
            console.log('🎤 [AudioRecorder] Sending audio chunk:', {
              declaredRate: this.actualSampleRate,
              actualContextRate: this.audioContext?.sampleRate,
              pcm16BufferSize: arrayBuffer.byteLength,
              base64Length: base64.length
            });
          }
          this.emit('data', base64);
          return;
        }

        // Fallback: older worklet posted Float32Array directly
        if (payload && (payload instanceof Float32Array || (payload?.buffer instanceof ArrayBuffer && payload?.BYTES_PER_ELEMENT === 4))) {
          const float32 = payload instanceof Float32Array ? payload : new Float32Array(payload.buffer);
          const pcm16 = new Int16Array(float32.length);
          for (let i = 0; i < float32.length; i++) {
            const s = Math.max(-1, Math.min(1, float32[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          const base64 = arrayBufferToBase64(pcm16.buffer);
          this.emit('data', base64);
          return;
        }

        console.warn('🎤 [AudioRecorder] Unrecognized worklet payload shape', payload);
      };
      
      // Connect audio nodes
      console.log('🎤 [AudioRecorder] Connecting audio nodes...');
      this.source.connect(this.recordingWorklet);
      // DON'T connect to destination - we're recording, not playing back!
      // This prevents echo/feedback and reduces noise
      console.log('🎤 [AudioRecorder] Audio nodes connected');
      
      this.isActive = true;
      this.emit('start');
      console.log('🎤 [AudioRecorder] Continuous audio capture started successfully');
      
    } catch (error) {
      console.error('🎤 [AudioRecorder] Failed to start audio capture:', error);
      this.emit('error', error instanceof Error ? error : new Error('Failed to start audio capture'));
      this.cleanup();
    }
  }

  stop(): void {
    if (!this.isActive) {
      console.log('🎤 [AudioRecorder] Stop called but already inactive - ignoring duplicate stop');
      return;
    }
    console.log('🎤 [AudioRecorder] Stopping audio capture');
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
      this.stream.getTracks().forEach(track => track.stop());
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
   * Returns the underlying MediaStream used for capture, if available.
   * Useful for visualizers or diagnostics. May be null if not started yet
   * or if capture has been stopped.
   */
  public getStream(): MediaStream | null {
    return this.stream;
  }
}
