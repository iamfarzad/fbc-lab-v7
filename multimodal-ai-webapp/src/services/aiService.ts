import type { MultimodalInput, AIResponse, AIProvider } from '../types';
import { google } from '@ai-sdk/google';

class AIService {
  private provider: AIProvider;

  constructor(provider: AIProvider) {
    this.provider = provider;
  }

  async sendMultimodalRequest(input: MultimodalInput): Promise<AIResponse> {
    try {
      if (!this.provider.apiKey) {
        throw new Error('Google AI API key is required');
      }

      // Create content parts for Google AI
      const content: any[] = [];

      // Add text content
      if (input.text) {
        content.push({
          text: input.text,
        });
      }

      // Add image content (Google AI Gemini supports images)
      if (input.images && input.images.length > 0) {
        for (const image of input.images) {
          // Convert image to base64
          const base64Image = await this.fileToBase64(image);
          content.push({
            inline_data: {
              mime_type: image.type,
              data: base64Image,
            },
          });
        }
      }

      // Set up Google AI with API key
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = this.provider.apiKey;

      // Use Google AI SDK to generate response
      const model = google('gemini-1.5-flash-latest');
      const result = await model.doGenerate({
        input: [{
          role: 'user',
          content: content,
        }],
        mode: 'regular',
        temperature: 0.7,
        maxTokens: 1024,
      });

      // Get the text response
      const responseText = result.text;

      return {
        text: responseText || 'I apologize, but I couldn\'t generate a response.',
        attachments: [],
      };

    } catch (error) {
      console.error('Error sending multimodal request to Google AI:', error);
      
      // Fallback to mock response if API fails
      return {
        text: this.generateFallbackResponse(input),
        attachments: [],
      };
    }
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get pure base64
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private generateFallbackResponse(input: MultimodalInput): string {
    if (input.images && input.images.length > 0) {
      return `I can see you've shared ${input.images.length} image(s). Unfortunately, I'm having trouble processing them right now. ${
        input.text ? `You mentioned: "${input.text}"` : ''
      }`;
    }
    
    if (input.audio) {
      return `I received your audio file, but I'm currently unable to process audio input. ${
        input.text ? `You wrote: "${input.text}"` : 'Please try again later or use text input.'
      }`;
    }
    
    if (input.text) {
      return `I received your message: "${input.text}". I'm experiencing some technical difficulties with the Google AI service, but I'm here to help!`;
    }
    
    return 'Hello! I\'m your AI assistant. I seem to be having some connectivity issues with the Google AI service right now. Please try again in a moment.';
  }

  setProvider(provider: AIProvider) {
    this.provider = provider;
  }
}

export default AIService;
