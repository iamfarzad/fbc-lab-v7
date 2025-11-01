/**
 * Audio utilities: resampling, chunking, and jitter buffer
 */

/**
 * Resample PCM16 audio from one sample rate to another using linear interpolation
 * This is a simple resampler - for production, consider using a library like resampler-js
 */
export function resamplePCM16(
  input: ArrayBuffer,
  fromRate: number,
  toRate: number
): ArrayBuffer {
  if (fromRate === toRate) return input
  
  const inputView = new Int16Array(input)
  const ratio = toRate / fromRate
  const outputLength = Math.floor(inputView.length * ratio)
  const output = new Int16Array(outputLength)
  
  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i / ratio
    const srcIndexFloor = Math.floor(srcIndex)
    const srcIndexCeil = Math.min(srcIndexFloor + 1, inputView.length - 1)
    const t = srcIndex - srcIndexFloor
    
    // Linear interpolation
    const sample = inputView[srcIndexFloor] * (1 - t) + inputView[srcIndexCeil] * t
    output[i] = Math.round(sample)
  }
  
  return output.buffer
}

/**
 * Convert base64 PCM16 to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Convert ArrayBuffer to base64 PCM16
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Resample base64 PCM16 audio from one sample rate to another
 */
export function resampleBase64PCM16(
  base64: string,
  fromRate: number,
  toRate: number
): string {
  const inputBuffer = base64ToArrayBuffer(base64)
  const outputBuffer = resamplePCM16(inputBuffer, fromRate, toRate)
  return arrayBufferToBase64(outputBuffer)
}

/**
 * Calculate audio chunk duration in milliseconds
 */
export function calculateAudioDurationMs(
  base64Length: number,
  sampleRate: number,
  bytesPerSample: number = 2 // 16-bit = 2 bytes
): number {
  const padding = base64Length.endsWith('==') ? 2 : base64Length.endsWith('=') ? 1 : 0
  const bytes = Math.max(0, Math.floor((base64Length.length * 3) / 4) - padding)
  const samples = bytes / bytesPerSample
  return (samples / sampleRate) * 1000
}

/**
 * Jitter buffer for smooth audio playback
 */
export class JitterBuffer {
  private buffer: Array<{ data: string; timestamp: number }> = []
  private readonly targetDelayMs: number
  private readonly maxDelayMs: number
  
  constructor(
    targetDelayMs: number = 160, // ~3-4 frames at 20ms
    maxDelayMs: number = 500
  ) {
    this.targetDelayMs = targetDelayMs
    this.maxDelayMs = maxDelayMs
  }

  add(data: string, timestamp: number): void {
    this.buffer.push({ data, timestamp })
    
    // Remove stale packets
    const now = Date.now()
    this.buffer = this.buffer.filter(
      item => now - item.timestamp < this.maxDelayMs
    )
  }

  getReady(): string[] {
    const now = Date.now()
    const ready: string[] = []
    
    // Sort by timestamp
    this.buffer.sort((a, b) => a.timestamp - b.timestamp)
    
    // Take packets that have aged enough
    while (this.buffer.length > 0) {
      const oldest = this.buffer[0]
      const age = now - oldest.timestamp
      
      if (age >= this.targetDelayMs) {
        ready.push(oldest.data)
        this.buffer.shift()
      } else {
        break // Not enough delay yet
      }
    }
    
    return ready
  }

  clear(): void {
    this.buffer = []
  }

  size(): number {
    return this.buffer.length
  }
}
