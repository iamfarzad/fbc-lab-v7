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
      // Optimized audio processing to reduce crackling and improve voice quality
      let last = 0;
      // Much less aggressive noise gate - allow more quiet speech through
      const gate = 0.001; // ~-60 dB (very gentle, preserves quiet speech)
      const hp = 0.999;   // lighter high-pass filtering to preserve voice quality
      
      for (let j = 0; j < this.bufferSize; j++) {
        let s = Math.max(-1, Math.min(1, this.buffer[j]));
        
        // 1) Very gentle noise gate - only silence extremely quiet audio
        if (Math.abs(s) < gate) {
          s = 0;
        } else {
          // 2) Gentle DC removal (high-pass) - only for non-silent audio
          const hpOut = s - last + hp * (last || 0);
          last = s;
          s = Math.max(-1, Math.min(1, hpOut));
        }
        
        // 3) Soft clipping to prevent harsh distortion
        if (s > 0.95) {
          s = 0.95 + (s - 0.95) * 0.1; // Soft limiting
        } else if (s < -0.95) {
          s = -0.95 + (s + 0.95) * 0.1; // Soft limiting
        }
        
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
