import type { MultimodalInput, AIResponse, AIProvider } from '../types';

class AIService {
  private provider: AIProvider;

  constructor(provider: AIProvider) {
    this.provider = provider;
  }

  async sendMultimodalRequest(input: MultimodalInput): Promise<AIResponse> {
    return {
      text: this.generateFallbackResponse(input),
      attachments: [],
    };
  }

  private generateFallbackResponse(input: MultimodalInput): string {
    if (input.images && input.images.length > 0) {
      return `I can see you've shared ${input.images.length} image(s). Unfortunately, live image analysis isn't connected yet. ${
        input.text ? `You mentioned: "${input.text}"` : ''
      }`;
    }

    if (input.audio) {
      return `I received your audio file, but real-time audio analysis isn't enabled. ${
        input.text ? `You wrote: "${input.text}"` : 'Please try again later or use text input.'
      }`;
    }

    if (input.text) {
      return `I received your message: "${input.text}". I'm here to help even while the multimodal pipeline finishes migrating.`;
    }

    return 'Hello! Share a message or upload content and I will analyse it once multimodal support is fully enabled.';
  }

  setProvider(provider: AIProvider) {
    this.provider = provider;
  }
}

export default AIService;
