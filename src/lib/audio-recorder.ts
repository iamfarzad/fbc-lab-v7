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

      // Create audio context
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      
      // Create source
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      
      // Load and create AudioWorklet
      await this.audioContext.audioWorklet.addModule('/audio-processor.js');
      this.recordingWorklet = new AudioWorkletNode(this.audioContext, 'audio-processor');
      
      // Handle audio data from worklet
      this.recordingWorklet.port.onmessage = (event) => {
        if (event.data.type === 'audioData') {
          const arrayBuffer = event.data.data.int16arrayBuffer;
          const base64 = this.arrayBufferToBase64(arrayBuffer);
          this.emit('data', base64);
        }
      };
      
      // Connect audio nodes
      this.source.connect(this.recordingWorklet);
      this.recordingWorklet.connect(this.audioContext.destination);
      
      this.isActive = true;
      this.emit('start');
      console.log('🎤 [AudioRecorder] Continuous audio capture started');
      
    } catch (error) {
      console.error('🎤 [AudioRecorder] Failed to start audio capture:', error);
      this.emit('error', error instanceof Error ? error : new Error('Failed to start audio capture'));
      this.cleanup();
    }
  }

  stop(): void {
    console.log('🎤 [AudioRecorder] Stopping audio capture');
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

