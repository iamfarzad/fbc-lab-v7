// PCM16 AudioWorklet processor for real-time audio
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || input.length === 0) {
      return true;
    }
    
    const channelData = input[0];
    if (!channelData || channelData.length === 0) {
      return true;
    }
    
    for (let i = 0; i < channelData.length; i++) {
      let sample = channelData[i];
      
      // Simple noise gate - reduce very quiet samples to prevent background noise
      if (Math.abs(sample) < 0.01) {
        sample = 0;
      }
      
      this.buffer[this.bufferIndex++] = sample;
      
      if (this.bufferIndex >= this.bufferSize) {
        // Convert Float32 to Int16 PCM with proper clamping
        const int16Buffer = new Int16Array(this.bufferSize);
        for (let j = 0; j < this.bufferSize; j++) {
          // Clamp and convert with better precision
          const clamped = Math.max(-1.0, Math.min(1.0, this.buffer[j]));
          int16Buffer[j] = Math.round(clamped * 32767);
        }
        
        // Send to main thread
        this.port.postMessage({
          type: 'audioData',
          data: {
            float32arrayBuffer: this.buffer.slice(0),
            int16arrayBuffer: int16Buffer.buffer
          }
        });
        
        this.bufferIndex = 0;
      }
    }
    
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);