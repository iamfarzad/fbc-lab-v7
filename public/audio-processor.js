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
          // Send the buffer to the main thread
          this.port.postMessage({
            type: 'audioData',
            data: new Float32Array(this.buffer)
          });
          this.bufferIndex = 0;
        }
      }
    }
    
    return true; // Keep the processor alive
  }
}

registerProcessor('audio-processor', AudioProcessor);
