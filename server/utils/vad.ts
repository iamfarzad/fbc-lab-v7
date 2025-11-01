/**
 * Voice Activity Detection (VAD) and Half-Duplex control
 */

export interface VADConfig {
  threshold: number // dB threshold for speech detection
  silenceDurationMs: number // Duration of silence before considering speech ended
  speechDurationMs: number // Minimum duration to consider it speech (not noise)
}

const DEFAULT_VAD_CONFIG: VADConfig = {
  threshold: -50, // dB
  silenceDurationMs: 300,
  speechDurationMs: 100
}

/**
 * Simple VAD based on audio level
 */
export class SimpleVAD {
  private config: VADConfig
  private speechStartTime: number | null = null
  private silenceStartTime: number | null = null
  private isSpeaking = false
  
  constructor(config: Partial<VADConfig> = {}) {
    this.config = { ...DEFAULT_VAD_CONFIG, ...config }
  }

  /**
   * Process audio chunk and return VAD state
   */
  process(base64Audio: string): { isSpeaking: boolean; level: number } {
    const level = this.calculateLevel(base64Audio)
    const now = Date.now()
    const aboveThreshold = level > this.config.threshold
    
    if (aboveThreshold) {
      // Potential speech detected
      if (!this.isSpeaking) {
        // Start counting speech duration
        if (this.speechStartTime === null) {
          this.speechStartTime = now
        }
        
        // Only mark as speaking if we've been above threshold long enough
        if (now - (this.speechStartTime || now) >= this.config.speechDurationMs) {
          this.isSpeaking = true
          this.silenceStartTime = null
        }
      } else {
        // Already speaking, reset silence timer
        this.silenceStartTime = null
      }
    } else {
      // Below threshold - potential silence
      if (this.isSpeaking) {
        // Start counting silence duration
        if (this.silenceStartTime === null) {
          this.silenceStartTime = now
        }
        
        // Only mark as not speaking if we've been silent long enough
        if (now - (this.silenceStartTime || now) >= this.config.silenceDurationMs) {
          this.isSpeaking = false
          this.speechStartTime = null
        }
      } else {
        // Already silent, reset speech timer
        this.speechStartTime = null
      }
    }
    
    return { isSpeaking: this.isSpeaking, level }
  }

  /**
   * Calculate audio level in dB
   */
  private calculateLevel(base64Audio: string): number {
    try {
      const binary = atob(base64Audio)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      
      // Convert to Int16 samples
      const samples = new Int16Array(bytes.buffer)
      if (samples.length === 0) return -Infinity
      
      // Calculate RMS
      let sumSquares = 0
      for (let i = 0; i < samples.length; i++) {
        const normalized = samples[i] / 32768
        sumSquares += normalized * normalized
      }
      
      const rms = Math.sqrt(sumSquares / samples.length)
      const db = rms > 0 ? 20 * Math.log10(rms) : -Infinity
      
      return db
    } catch {
      return -Infinity
    }
  }

  reset(): void {
    this.isSpeaking = false
    this.speechStartTime = null
    this.silenceStartTime = null
  }
}

/**
 * Half-duplex state machine to prevent double-talk
 */
export class HalfDuplexController {
  private micOpen = true
  private ttsPlaying = false
  private lastTTSEndTime = 0
  private readonly turnSilenceMs = 300 // Silence after TTS before reopening mic
  
  constructor(private vad?: SimpleVAD) {}

  /**
   * Check if microphone should be open
   */
  shouldMicBeOpen(): boolean {
    if (this.ttsPlaying) return false
    if (Date.now() - this.lastTTSEndTime < this.turnSilenceMs) return false
    return this.micOpen
  }

  /**
   * Notify that TTS started playing
   */
  onTTSStart(): void {
    this.ttsPlaying = true
    this.micOpen = false
    this.vad?.reset()
  }

  /**
   * Notify that TTS finished playing
   */
  onTTSEnd(): void {
    this.ttsPlaying = false
    this.lastTTSEndTime = Date.now()
    // Mic will reopen after turnSilenceMs via shouldMicBeOpen()
  }

  /**
   * Handle user barge-in (interrupt TTS)
   */
  onBargeIn(): void {
    this.ttsPlaying = false
    this.micOpen = true
    this.vad?.reset()
  }

  /**
   * Force mic open (e.g., for user-initiated speech)
   */
  forceMicOpen(): void {
    this.micOpen = true
    this.ttsPlaying = false
    this.lastTTSEndTime = 0
  }

  /**
   * Force mic closed (e.g., for system maintenance)
   */
  forceMicClosed(): void {
    this.micOpen = false
  }

  getState(): { micOpen: boolean; ttsPlaying: boolean } {
    return {
      micOpen: this.shouldMicBeOpen(),
      ttsPlaying: this.ttsPlaying
    }
  }
}
