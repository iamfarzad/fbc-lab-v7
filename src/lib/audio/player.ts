import { base64PCM16ToFloat32 } from '@/lib/audio-utils'

// Unified audio player - sequential PCM16 playback with precise scheduling
export class AudioPlayer {
  private queue: Float32Array[] = []
  private ctx: AudioContext | null = null
  private isPlaying = false
  private nextAt = 0
  private readonly sampleRate: number

  constructor(sampleRate = 24000) {
    this.sampleRate = sampleRate
  }

  addBase64PCM16(chunkBase64: string) {
    try {
      const float32 = base64PCM16ToFloat32(chunkBase64)
      this.queue.push(float32)
      if (!this.isPlaying) {
        this.isPlaying = true
        this.playNext()
      }
    } catch (err) {
      console.error('[AudioPlayer] Failed to enqueue chunk:', err)
    }
  }

  private playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false
      return
    }

    const float32 = this.queue.shift()!
    try {
      if (!this.ctx || this.ctx.state === 'closed') {
        this.ctx = new AudioContext({ sampleRate: this.sampleRate })
        this.nextAt = this.ctx.currentTime
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(err => console.error('[AudioPlayer] resume failed:', err))
      }

      const buffer = this.ctx.createBuffer(1, float32.length, this.sampleRate)
      buffer.copyToChannel(float32, 0)

      const src = this.ctx.createBufferSource()
      src.buffer = buffer
      src.connect(this.ctx.destination)

      if (this.nextAt < this.ctx.currentTime) this.nextAt = this.ctx.currentTime
      src.start(this.nextAt)
      this.nextAt += buffer.duration
      src.onended = () => this.playNext()
    } catch (err) {
      console.error('[AudioPlayer] playback error:', err)
      this.isPlaying = false
    }
  }

  clear() {
    this.queue = []
    this.nextAt = 0
    this.isPlaying = false
  }

  get playing() {
    return this.isPlaying
  }

  get contextState(): AudioContextState | null {
    return this.ctx?.state || null
  }

  async resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume()
    }
  }

  destroy() {
    this.clear()
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close()
      this.ctx = null
    }
  }
}
