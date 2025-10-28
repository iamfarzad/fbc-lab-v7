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

const INLINE_AUDIO_WORKLET_SOURCE = `class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
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
          const int16Buffer = new Int16Array(this.bufferSize);
          let last = 0;
          const gate = 0.001;
          const hp = 0.999;

          for (let j = 0; j < this.bufferSize; j++) {
            let s = Math.max(-1, Math.min(1, this.buffer[j]));

            if (Math.abs(s) < gate) {
              s = 0;
            } else {
              const hpOut = s - last + hp * (last || 0);
              last = s;
              s = Math.max(-1, Math.min(1, hpOut));
            }

            if (s > 0.95) {
              s = 0.95 + (s - 0.95) * 0.1;
            } else if (s < -0.95) {
              s = -0.95 + (s + 0.95) * 0.1;
            }

            int16Buffer[j] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

          this.port.postMessage({
            type: 'audioData',
            data: {
              int16arrayBuffer: int16Buffer.buffer
            }
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

async function loadAudioProcessorModule(audioContext: AudioContext): Promise<void> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeout = controller ? window.setTimeout(() => controller.abort(), 8000) : undefined;

  try {
    const response = await fetch('/audio-processor.js', {
      signal: controller?.signal,
      cache: 'reload'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const source = await response.text();
    const blob = new Blob([source], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);

    try {
      await audioContext.audioWorklet.addModule(url);
      return;
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.warn('⚠️ [AudioRecorder] Falling back to inline audio worklet module', error);
    const blob = new Blob([INLINE_AUDIO_WORKLET_SOURCE], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    try {
      await audioContext.audioWorklet.addModule(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export class AudioRecorder extends EventEmitter {
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private recordingWorklet: AudioWorkletNode | null = null;
  private legacyProcessor: ScriptProcessorNode | null = null;
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
      try {
        await this.audioContext.resume();
      } catch {
        // Some browsers may reject resume when already running; ignore
      }
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
      
      let captureNode: AudioNode | null = null;

      if (this.audioContext.audioWorklet) {
        console.log('🎤 [AudioRecorder] Loading audio worklet module...');
        try {
          await loadAudioProcessorModule(this.audioContext);
          console.log('🎤 [AudioRecorder] Audio worklet module loaded');
          console.log('🎤 [AudioRecorder] Creating audio worklet node...');
          this.recordingWorklet = new AudioWorkletNode(this.audioContext, 'audio-processor');
          console.log('🎤 [AudioRecorder] Audio worklet node created');

          this.recordingWorklet.port.onmessage = (event) => {
            if (event.data.type !== 'audioData') return;
            const payload = event.data?.data;

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

          captureNode = this.recordingWorklet;
        } catch (workletError) {
          console.warn('🎤 [AudioRecorder] AudioWorklet unavailable, using ScriptProcessor fallback', workletError);
          this.recordingWorklet = null;
        }
      } else {
        console.warn('🎤 [AudioRecorder] AudioWorklet not supported; using ScriptProcessor fallback');
      }

      if (!captureNode) {
        this.legacyProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
        console.log('🎤 [AudioRecorder] ScriptProcessorNode fallback initialized');
        this.legacyProcessor.onaudioprocess = (event) => {
          const input = event.inputBuffer?.getChannelData(0);
          if (!input || input.length === 0) {
            return;
          }

          const pcm16 = new Int16Array(input.length);
          for (let i = 0; i < input.length; i++) {
            const sample = Math.max(-1, Math.min(1, input[i]));
            pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
          }

          const base64 = arrayBufferToBase64(pcm16.buffer);
          this.emit('data', base64);

          const output = event.outputBuffer?.getChannelData(0);
          if (output) {
            output.fill(0);
          }
        };

        captureNode = this.legacyProcessor;
      }

      if (!captureNode) {
        throw new Error('Unable to initialize audio capture node');
      }

      console.log('🎤 [AudioRecorder] Connecting audio nodes...');
      this.source.connect(captureNode);

      if (captureNode === this.legacyProcessor && this.audioContext) {
        this.legacyProcessor.connect(this.audioContext.destination);
      }
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
    if (this.legacyProcessor) {
      try {
        this.legacyProcessor.disconnect();
      } catch {
        // ignore disconnect errors during teardown
      }
      this.legacyProcessor.onaudioprocess = null;
      this.legacyProcessor = null;
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
