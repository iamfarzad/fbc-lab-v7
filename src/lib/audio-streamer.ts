/**
 * Real-time Audio Streamer for Immediate Playback
 * Plays PCM chunks as they arrive with minimal latency
 */

export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private audioQueue: Float32Array[] = [];
  private isPlaying = false;
  private nextScheduledTime = 0;
  private sampleRate = 24000;

  constructor(sampleRate: number = 24000) {
    this.sampleRate = sampleRate;
    this.initAudioContext();
  }

  private initAudioContext(): void {
    if (typeof window === 'undefined') return;
    
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContextCtor({ sampleRate: this.sampleRate });
  }

  /**
   * Add PCM16 chunk to the playback queue
   * Converts to Float32 and schedules immediate playback
   */
  addPCM16(chunk: Uint8Array): void {
    if (!this.audioContext) {
      this.initAudioContext();
      if (!this.audioContext) return;
    }

    // Convert PCM16 to Float32
    const float32Array = new Float32Array(chunk.length / 2);
    const dataView = new DataView(chunk.buffer);
    
    for (let i = 0; i < chunk.length; i += 2) {
      const sample = dataView.getInt16(i, true);
      float32Array[i / 2] = sample / 32768.0;
    }

    this.audioQueue.push(float32Array);

    if (!this.isPlaying) {
      this.isPlaying = true;
      this.scheduleNextBuffer();
    }
  }

  /**
   * Schedule the next audio buffer for playback
   * Uses Web Audio API's precise timing for minimal latency
   */
  private scheduleNextBuffer(): void {
    if (!this.audioContext || this.audioContext.state === 'closed' || this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    const float32Array = this.audioQueue.shift()!;
    const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, this.sampleRate);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    // Schedule playback at the earliest possible time
    if (this.nextScheduledTime === 0) {
      this.nextScheduledTime = this.audioContext.currentTime;
    }

    source.onended = () => {
      this.scheduleNextBuffer();
    };

    source.start(this.nextScheduledTime);
    this.nextScheduledTime += audioBuffer.duration;
  }

  /**
   * Clear all queued audio buffers
   */
  clear(): void {
    this.audioQueue = [];
    this.nextScheduledTime = 0;
  }

  /**
   * Check if the streamer is currently playing audio
   */
  get playing(): boolean {
    return this.isPlaying;
  }

  /**
   * Get the current audio context state
   */
  get contextState(): AudioContextState | null {
    return this.audioContext?.state || null;
  }

  /**
   * Resume the audio context if it's suspended
   */
  async resumeContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clear();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
