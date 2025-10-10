/**
 * Real-time Audio Recorder for Continuous Streaming
 * Uses AudioWorklet to capture audio continuously and emit base64 chunks
 */

import { EventEmitter } from 'events';

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

  constructor() {
    super();
  }

  async start(): Promise<void> {
    try {
      console.log('🎤 [AudioRecorder] Starting continuous audio capture...');
      
      // Get microphone access
      console.log('🎤 [AudioRecorder] Requesting microphone access...');
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      console.log('🎤 [AudioRecorder] Microphone access granted');

      // Create audio context
      console.log('🎤 [AudioRecorder] Creating audio context...');
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      console.log('🎤 [AudioRecorder] Audio context created, state:', this.audioContext.state);
      
      // Create source
      console.log('🎤 [AudioRecorder] Creating media stream source...');
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      console.log('🎤 [AudioRecorder] Media stream source created');
      
      // Load and create AudioWorklet
      console.log('🎤 [AudioRecorder] Loading audio worklet module...');
      await this.audioContext.audioWorklet.addModule('/audio-processor.js');
      console.log('🎤 [AudioRecorder] Audio worklet module loaded');
      
      console.log('🎤 [AudioRecorder] Creating audio worklet node...');
      this.recordingWorklet = new AudioWorkletNode(this.audioContext, 'audio-processor');
      console.log('🎤 [AudioRecorder] Audio worklet node created');
      
      // Handle audio data from worklet
      this.recordingWorklet.port.onmessage = (event) => {
        if (event.data.type === 'audioData') {
          const arrayBuffer = event.data.data.int16arrayBuffer;
          const base64 = this.arrayBufferToBase64(arrayBuffer);
          this.emit('data', base64);
        }
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

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  get isRecording(): boolean {
    return this.isActive;
  }
}

