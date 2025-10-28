import { base64PCM16ToFloat32 } from '@/lib/audio-utils'

const DEBUG_AUDIO = process.env.NEXT_PUBLIC_VOICE_VERBOSE_LOGS === 'true'
const debugLog = (...args: Parameters<typeof console.log>) => {
  if (!DEBUG_AUDIO) return
  console.log(...args)
}

// Unified audio player - Google's schedule-ahead buffering pattern
export class AudioPlayer {
  private queue: Float32Array[] = []
  private ctx: AudioContext | null = null
  private outputNode: GainNode | null = null
  private filterNode: BiquadFilterNode | null = null
  private isPlaying = false
  private scheduledTime = 0
  private sampleRate: number
  private volume: number
  private readonly highpassFrequency: number
  private lastChunkTime = 0
  private chunkCount = 0
  private checkInterval: ReturnType<typeof setTimeout> | null = null
  // Google's buffering pattern
  private readonly initialBufferTime = 0.1  // 100ms initial delay
  private readonly scheduleAheadTime = 0.2  // Schedule 200ms ahead

  constructor(sampleRate = 24000, options?: { volume?: number; highpassFrequency?: number }) {
    this.sampleRate = sampleRate
    this.volume = options?.volume ?? 1
    this.highpassFrequency = options?.highpassFrequency ?? 70
  }

  addBase64PCM16(chunkBase64: string) {
    try {
      const now = performance.now()
      const float32 = base64PCM16ToFloat32(chunkBase64)
      
      // Check if queue was empty before this chunk
      const wasQueueEmpty = this.queue.length === 0
      this.queue.push(float32)
      this.chunkCount++
      
      // If transitioning from empty to non-empty and not playing, force restart
      const shouldForceRestart = wasQueueEmpty && !this.isPlaying && this.ctx
      if (shouldForceRestart) {
        if (DEBUG_AUDIO) {
          debugLog('🔄 [AudioPlayer] Forcing playback restart (queue was empty)')
        }
      }

      if (DEBUG_AUDIO) {
        const metrics = this.calculateSignalMetrics(float32)
        const chunkDurationMs = (float32.length / this.sampleRate) * 1000
        const timeSinceLastChunk = this.lastChunkTime > 0 ? now - this.lastChunkTime : 0
        
        debugLog('🔊 [AudioPlayer] Chunk received', {
          queue: this.queue.length,
          samples: float32.length,
          durationMs: chunkDurationMs.toFixed(1),
          intervalMs: timeSinceLastChunk > 0 ? timeSinceLastChunk.toFixed(1) : 'N/A',
          peak: metrics.peak.toFixed(3),
          rms: metrics.rms.toFixed(3),
          clipped: metrics.clipped,
          silenceRatio: (metrics.silenceRatio * 100).toFixed(1) + '%',
          contextState: this.ctx?.state || 'no-context'
        })
      }

      this.lastChunkTime = now

      // Ensure context is valid and running before scheduling
      if (!this.ctx || this.ctx.state === 'closed') {
        if (DEBUG_AUDIO) {
          debugLog('🎵 [AudioPlayer] Recreating AudioContext (was closed/missing)')
        }
        this.ensureContext()
      }

      // Resume context if suspended (common after user interaction gaps)
      if (this.ctx && this.ctx.state === 'suspended') {
        if (DEBUG_AUDIO) {
          debugLog('🔊 [AudioPlayer] Resuming suspended AudioContext')
        }
        this.ctx.resume().catch(err => {
          console.warn('[AudioPlayer] Failed to resume AudioContext:', err)
        })
      }

      if (!this.isPlaying) {
        this.isPlaying = true
        // Google's pattern: Add initial buffer delay
        this.scheduledTime = this.ctx!.currentTime + this.initialBufferTime
        if (DEBUG_AUDIO) {
          debugLog('🎵 [AudioPlayer] Starting playback with initial buffer', {
            initialDelay: (this.initialBufferTime * 1000).toFixed(0) + 'ms',
            scheduleAhead: (this.scheduleAheadTime * 1000).toFixed(0) + 'ms',
            contextState: this.ctx!.state,
            currentTime: this.ctx!.currentTime.toFixed(3)
          })
        }
        this.scheduleBuffers()
      }
    } catch (err) {
      console.error('[AudioPlayer] Failed to enqueue chunk:', err)
    }
  }

  private calculateSignalMetrics(samples: Float32Array) {
    let peak = 0
    let sumSquares = 0
    let clipped = 0
    let silent = 0
    const silenceThreshold = 0.01

    for (let i = 0; i < samples.length; i++) {
      const abs = Math.abs(samples[i])
      if (abs > peak) peak = abs
      sumSquares += samples[i] * samples[i]
      if (abs >= 0.999) clipped++
      if (abs < silenceThreshold) silent++
    }

    const rms = Math.sqrt(sumSquares / samples.length)
    const silenceRatio = silent / samples.length

    return { peak, rms, clipped, silenceRatio }
  }

  // Google's schedule-ahead pattern - schedule multiple chunks at once
  private scheduleBuffers() {
    if (!this.ctx) return

    // Schedule multiple chunks ahead (up to scheduleAheadTime)
    while (
      this.queue.length > 0 &&
      this.scheduledTime < this.ctx.currentTime + this.scheduleAheadTime
    ) {
      const float32 = this.queue.shift()!
      
      const buffer = this.ctx.createBuffer(1, float32.length, this.sampleRate)
      const channelData = new Float32Array(float32.length)
      channelData.set(float32)
      buffer.copyToChannel(channelData, 0)
      
      const src = this.ctx.createBufferSource()
      src.buffer = buffer
      const destination = this.getDestination()
      if (!destination) {
        this.queue = []
        this.isPlaying = false
        return
      }

      // Ensure we never schedule in the past
      const startAt = Math.max(this.scheduledTime, this.ctx.currentTime)
      
      src.connect(destination)
      src.start(startAt)
      this.scheduledTime = startAt + buffer.duration

      if (DEBUG_AUDIO) {
        const aheadMs = (startAt - this.ctx.currentTime) * 1000
        debugLog('⏱️ [AudioPlayer] Scheduled chunk', {
          startAt: startAt.toFixed(3) + 's',
          ahead: aheadMs.toFixed(0) + 'ms',
          duration: (buffer.duration * 1000).toFixed(1) + 'ms',
          queueRemaining: this.queue.length
        })
      }
    }

    // Always clear existing interval to prevent race conditions
    if (this.checkInterval) {
      clearTimeout(this.checkInterval)
      this.checkInterval = null
    }

    // Then set new interval if needed
    if (this.queue.length > 0) {
      const nextCheckMs = Math.max(0, (this.scheduledTime - this.ctx.currentTime) * 1000 - 50)
      this.checkInterval = setTimeout(() => this.scheduleBuffers(), nextCheckMs)
    } else {
      // Queue empty - wait for more chunks
      this.checkInterval = setTimeout(() => {
        if (this.queue.length > 0) {
          this.scheduleBuffers()
        } else {
          this.isPlaying = false
          if (DEBUG_AUDIO) {
            debugLog('📭 [AudioPlayer] Queue empty, stopping playback')
          }
        }
      }, 100)
    }
  }

  clear() {
    if (DEBUG_AUDIO && this.queue.length > 0) {
      debugLog('🗑️ [AudioPlayer] Clearing queue', { 
        chunksDropped: this.queue.length,
        wasPlaying: this.isPlaying 
      })
    }
    
    // Critical: Clear interval first to prevent race conditions
    if (this.checkInterval) {
      clearTimeout(this.checkInterval)
      this.checkInterval = null
    }
    
    // Reset all playback state atomically
    this.isPlaying = false
    this.queue = []
    this.scheduledTime = 0
    this.lastChunkTime = 0
    
    if (DEBUG_AUDIO) {
      debugLog('✅ [AudioPlayer] State fully reset for next turn')
    }
  }

  setSampleRate(sampleRate: number) {
    if (!Number.isFinite(sampleRate) || sampleRate <= 0) return
    if (this.sampleRate === sampleRate) return
    
    if (DEBUG_AUDIO) {
      debugLog('🔄 [AudioPlayer] Sample rate changed', {
        from: this.sampleRate,
        to: sampleRate,
        queueCleared: this.queue.length
      })
    }
    
    if (this.checkInterval) {
      clearTimeout(this.checkInterval)
      this.checkInterval = null
    }
    
    this.sampleRate = sampleRate
    this.queue = []
    this.isPlaying = false
    this.scheduledTime = 0
    this.lastChunkTime = 0
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
    if (this.checkInterval) {
      clearTimeout(this.checkInterval)
      this.checkInterval = null
    }
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

    this.scheduledTime = this.ctx.currentTime

    if (DEBUG_AUDIO) {
      debugLog('🎵 [AudioPlayer] AudioContext initialized', {
        requestedRate: this.sampleRate,
        actualRate: this.ctx.sampleRate,
        mismatch: this.ctx.sampleRate !== this.sampleRate,
        latencyHint: 'interactive',
        highpassFilter: this.highpassFrequency > 0 ? this.highpassFrequency + 'Hz' : 'disabled',
        baseLatency: this.ctx.baseLatency ? this.ctx.baseLatency.toFixed(4) + 's' : 'unknown'
      })

      if (this.ctx.sampleRate !== this.sampleRate) {
        console.warn('⚠️ [AudioPlayer] Sample rate mismatch!', {
          requested: this.sampleRate,
          actual: this.ctx.sampleRate,
          impact: 'Browser will resample - possible quality degradation'
        })
      }
    }
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
