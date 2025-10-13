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
          // Convert Float32 (-1.0 to 1.0) to Int16 (-32768 to 32767)
          const int16Buffer = new Int16Array(this.bufferSize);
      // Simple noise gate + soft DC removal before PCM16 conversion
      let last = 0;
      const gate = 0.008; // ~-42 dB
      const hp = 0.995;   // one-pole high-pass coefficient
      for (let j = 0; j < this.bufferSize; j++) {
        let s = Math.max(-1, Math.min(1, this.buffer[j]));
        // 1) Noise gate
        if (Math.abs(s) < gate) s = 0;
        // 2) Very light DC removal (high-pass)
        const hpOut = s - last + hp * (last || 0);
        last = s;
        const v = Math.max(-1, Math.min(1, hpOut));
        int16Buffer[j] = v < 0 ? v * 0x8000 : v * 0x7FFF;
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
