import { base64PCM16ToFloat32 } from '@/lib/audio-utils'

// Unified audio player - sequential PCM16 playback with smoothing filters
export class AudioPlayer {
  private queue: Float32Array[] = []
  private ctx: AudioContext | null = null
  private outputNode: GainNode | null = null
  private filterNode: BiquadFilterNode | null = null
  private isPlaying = false
  private nextAt = 0
  private sampleRate: number
  private volume: number
  private readonly fadeDuration = 0.01
  private readonly highpassFrequency: number

  constructor(sampleRate = 24000, options?: { volume?: number; highpassFrequency?: number }) {
    this.sampleRate = sampleRate
    this.volume = options?.volume ?? 1
    this.highpassFrequency = options?.highpassFrequency ?? 70
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
    this.ensureContext()

    try {
      if (!this.ctx) {
        this.isPlaying = false
        return
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(err => console.error('[AudioPlayer] resume failed:', err))
      }

      const buffer = this.ctx.createBuffer(1, float32.length, this.sampleRate)
      buffer.copyToChannel(float32, 0)

      const src = this.ctx.createBufferSource()
      src.buffer = buffer
      const destination = this.getDestination()
      if (!destination) {
        console.warn('[AudioPlayer] No destination node available; clearing queue')
        this.queue = []
        this.isPlaying = false
        return
      }

      const startAt = Math.max(this.nextAt, this.ctx.currentTime)
      const fade = Math.min(this.fadeDuration, buffer.duration / 2)
      const fadeInEnd = startAt + fade
      const fadeOutStart = startAt + buffer.duration - fade

      const chunkGain = this.ctx.createGain()
      chunkGain.gain.setValueAtTime(0, startAt)
      chunkGain.gain.linearRampToValueAtTime(1, fadeInEnd)
      chunkGain.gain.setValueAtTime(1, Math.max(fadeInEnd, fadeOutStart))
      chunkGain.gain.linearRampToValueAtTime(0, startAt + buffer.duration)

      src.connect(chunkGain)
      chunkGain.connect(destination)

      src.start(startAt)
      this.nextAt = startAt + buffer.duration
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

  setSampleRate(sampleRate: number) {
    if (!Number.isFinite(sampleRate) || sampleRate <= 0) return
    if (this.sampleRate === sampleRate) return
    this.sampleRate = sampleRate
    this.queue = []
    this.isPlaying = false
    this.nextAt = 0
    if (this.ctx) {
      this.teardownContext()
    }
  }

  get playing() {
    return this.isPlaying
  }

  getSampleRate() {
    return this.sampleRate
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
    this.teardownContext()
  }

  private ensureContext() {
    if (this.ctx && this.ctx.state !== 'closed') return

    this.ctx = new AudioContext({ sampleRate: this.sampleRate, latencyHint: 'interactive' })
    this.outputNode = this.ctx.createGain()
    this.outputNode.gain.value = this.volume
    this.outputNode.connect(this.ctx.destination)

    if (this.highpassFrequency > 0) {
      this.filterNode = this.ctx.createBiquadFilter()
      this.filterNode.type = 'highpass'
      this.filterNode.frequency.value = this.highpassFrequency
      this.filterNode.Q.value = 0.707
      this.filterNode.connect(this.outputNode)
    } else {
      this.filterNode = null
    }

    this.nextAt = this.ctx.currentTime
  }

  private teardownContext() {
    if (!this.ctx) return

    try {
      this.filterNode?.disconnect()
      this.outputNode?.disconnect()
      this.filterNode = null
      this.outputNode = null
    } catch (err) {
      console.warn('[AudioPlayer] Failed to disconnect nodes during teardown', err)
    }

    if (this.ctx.state !== 'closed') {
      this.ctx
        .close()
        .catch(err => console.warn('[AudioPlayer] Failed to close AudioContext', err))
    }
    this.ctx = null
  }

  private getDestination(): AudioNode | null {
    if (!this.ctx) return null
    if (this.filterNode) return this.filterNode
    if (this.outputNode) return this.outputNode
    return this.ctx.destination
  }
}
