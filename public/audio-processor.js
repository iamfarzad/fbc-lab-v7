 class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Increased buffer size to reduce chunk frequency and prevent resource exhaustion
    // At 16kHz: 4096 samples = 256ms, ~4 chunks per second (vs 8 chunks)
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
          // Convert Float32 (-1.0 to 1.0) to Int16 (-32768 to 32767)
          const int16Buffer = new Int16Array(this.bufferSize);
      // Minimal processing path to avoid artifacts: clamp and quantize only
      for (let j = 0; j < this.bufferSize; j++) {
        let s = this.buffer[j];
        if (s > 1) s = 1; else if (s < -1) s = -1;
        int16Buffer[j] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
          
          // Send the buffer to the main thread
          this.port.postMessage({
            type: 'audioData',
            data: {
              int16arrayBuffer: int16Buffer.buffer
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
