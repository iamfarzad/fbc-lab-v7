/**
 * Audio Streaming Queue - Sequential PCM16 playback
 * Extracted from working HTML test - prevents distortion by scheduling chunks sequentially
 */

import { base64PCM16ToFloat32 } from './audio-utils'

export class AudioStreamingQueue {
  private queue: Float32Array[] = []
  private playbackContext: AudioContext | null = null
  private isPlaying = false
  private nextScheduledTime = 0
  private readonly sampleRate: number

  constructor(sampleRate: number = 24000) {
    this.sampleRate = sampleRate
  }

  /**
   * Add PCM16 chunk (base64 encoded) to the playback queue
   */
  addChunk(pcm16Base64: string): void {
    try {
      // Decode base64 → PCM16 → Float32
      const float32 = base64PCM16ToFloat32(pcm16Base64)

      this.queue.push(float32)

      // Start playing if not already playing
      if (!this.isPlaying) {
        this.isPlaying = true
        this.playNext()
      }
    } catch (err) {
      console.error('Failed to add audio chunk:', err)
    }
  }

  /**
   * Play next chunk in queue with precise scheduling
   */
  private playNext(): void {
    if (this.queue.length === 0) {
      this.isPlaying = false
      return
    }

    const float32 = this.queue.shift()!

    try {
      // Ensure audio context exists and is running
      if (!this.playbackContext || this.playbackContext.state === 'closed') {
        this.playbackContext = new AudioContext({ sampleRate: this.sampleRate })
        this.nextScheduledTime = this.playbackContext.currentTime
      }

      // Handle autoplay policy - resume if suspended
      if (this.playbackContext.state === 'suspended') {
        this.playbackContext.resume().catch(err => {
          console.error('Failed to resume audio context:', err)
        })
      }

      // Create audio buffer
      const audioBuffer = this.playbackContext.createBuffer(1, float32.length, this.sampleRate)
      audioBuffer.copyToChannel(float32, 0)

      // Create source and connect to destination
      const source = this.playbackContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(this.playbackContext.destination)

      // Schedule at next available time (prevents gaps and overlaps)
      if (this.nextScheduledTime < this.playbackContext.currentTime) {
        this.nextScheduledTime = this.playbackContext.currentTime
      }

      source.start(this.nextScheduledTime)
      this.nextScheduledTime += audioBuffer.duration

      // Play next chunk when this one finishes
      source.onended = () => {
        this.playNext()
      }
    } catch (err) {
      console.error('Audio playback error:', err)
      this.isPlaying = false
    }
  }

  /**
   * Clear all queued audio chunks
   */
  clear(): void {
    this.queue = []
    this.nextScheduledTime = 0
    this.isPlaying = false
  }

  /**
   * Get current queue length
   */
  get queueLength(): number {
    return this.queue.length
  }

  /**
   * Check if audio is currently playing
   */
  get playing(): boolean {
    return this.isPlaying
  }

  /**
   * Get audio context state
   */
  get contextState(): AudioContextState | null {
    return this.playbackContext?.state || null
  }

  /**
   * Resume audio context if suspended
   */
  async resume(): Promise<void> {
    if (this.playbackContext && this.playbackContext.state === 'suspended') {
      await this.playbackContext.resume()
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clear()
    if (this.playbackContext && this.playbackContext.state !== 'closed') {
      this.playbackContext.close()
      this.playbackContext = null
    }
  }
}

