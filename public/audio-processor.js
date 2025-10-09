class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const inputChannel = input[0];
      
      for (let i = 0; i < inputChannel.length; i++) {
        this.buffer[this.bufferIndex] = inputChannel[i];
        this.bufferIndex++;
        
        if (this.bufferIndex >= this.bufferSize) {
          // Convert Float32 samples (-1..1) to PCM16 for transmission
          const pcm16Buffer = new Int16Array(this.bufferSize);
          for (let j = 0; j < this.bufferSize; j++) {
            const sample = Math.max(-1, Math.min(1, this.buffer[j]));
            pcm16Buffer[j] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
          }

          // Send PCM16 buffer to main thread
          this.port.postMessage({
            type: 'audioData',
            data: {
              int16arrayBuffer: pcm16Buffer.buffer
            }
          });
          this.bufferIndex = 0;
        }
      }
    }
    
    return true; // Keep the processor alive
  }
}

registerProcessor('audio-processor', AudioProcessor);
