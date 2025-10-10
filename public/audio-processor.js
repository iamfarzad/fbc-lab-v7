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
    if (input.length > 0) {
      const channelData = input[0];
      
      for (let i = 0; i < channelData.length; i++) {
        this.buffer[this.bufferIndex++] = channelData[i];
        
        if (this.bufferIndex >= this.bufferSize) {
          // Convert Float32 to Int16 PCM
          const int16Buffer = new Int16Array(this.bufferSize);
          for (let j = 0; j < this.bufferSize; j++) {
            int16Buffer[j] = Math.max(-32768, Math.min(32767, this.buffer[j] * 32768));
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
    }
    
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);