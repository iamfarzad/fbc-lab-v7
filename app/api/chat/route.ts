import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { createRetryable } from 'ai-retry';
import {
  contentFilterTriggered,
  requestTimeout,
  requestNotRetryable,
  serviceOverloaded
} from 'ai-retry/retryables';
import { multimodalContextManager } from '@/src/core/context/multimodal-context';

// Type definitions
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequestBody {
  message?: string;
  messages?: ChatMessage[];
  sessionId?: string;
}

interface MultimodalContextResult {
  multimodalContext: {
    hasRecentImages: boolean;
  };
  systemPrompt: string;
}

// Create a retryable model with proper fallback strategies
const retryableModel = createRetryable({
  // Primary model - most capable
  model: google('gemini-2.5-flash'),
  
  // Retry strategies with fallback models
  retries: [
    // Handle rate limiting with a faster model
    serviceOverloaded(google('gemini-2.0-flash')),
    
    // Handle content filtering with a different model
    contentFilterTriggered(google('gemini-2.5-pro')),
    
    // Handle timeouts with a more reliable model
    requestTimeout(google('gemini-2.5-pro')),
    
    // Handle other retryable errors
    requestNotRetryable(google('gemini-2.0-flash')),
    
    // Final fallback to most available model
    google('gemini-2.0-flash')
  ]
});

export async function POST(req: Request) {
  try {
    const body: ChatRequestBody = await req.json();
    let messages: ChatMessage[];

    // Handle both formats: single message or messages array
    if (body.message) {
      // Convert single message to messages array format
      messages = [
        {
          role: 'user',
          content: body.message
        }
      ];
    } else if (body.messages && Array.isArray(body.messages)) {
      // Use existing messages array
      messages = body.messages;
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid request: message or messages array required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if Google API key is available
    if (!process.env.GOOGLE_API_KEY) {
      // Return a mock response for testing
      return new Response(
        JSON.stringify({
          response: `This is a test response to: "${body.message || body.messages[body.messages.length - 1].content}". Google API key not configured for actual AI responses.`,
          usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Build enhanced system prompt with multimodal context
    let systemPrompt = "You are F.B/c, an AI assistant for Farzad Bayat's website. You provide helpful, accurate, and engaging responses with real-time conversational capabilities."

    // Add multimodal context if session ID is available
    try {
      const sessionId = body.sessionId || req.headers.get('x-session-id')
      if (sessionId) {
        const multimodalContext: MultimodalContextResult = await multimodalContextManager.prepareChatContext(sessionId, true, false)
        if (multimodalContext.multimodalContext.hasRecentImages) {
          systemPrompt += '\n\n' + multimodalContext.systemPrompt
        }
      }
    } catch (error) {
      console.warn('Failed to load multimodal context for chat:', error)
    }

    // Use the retryable model with generateText
    const result = await generateText({
      model: retryableModel,
      messages,
      temperature: 0.7,
      system: systemPrompt,
    });

    return new Response(
      JSON.stringify({
        response: result.text,
        usage: result.usage
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    // The retry wrapper handles fallbacks automatically, so we just log the error
    console.error('Error in Gemini chat route:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to generate response',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
