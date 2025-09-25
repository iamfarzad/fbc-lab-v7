import { createRetryableGeminiStream } from '@/core/ai/retry-model';
import { streamText } from 'ai';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Use retryable Gemini model with automatic fallbacks
    const result = await streamText({
      model: createRetryableGeminiStream(),
      messages,
      temperature: 0.7,
      system: "You are F.B/c, an AI assistant for Farzad Bayat's website. You provide helpful, accurate, and engaging responses with real-time conversational capabilities.",
    });

    return result.toTextStreamResponse();

  } catch (error) {
    // The retry wrapper handles fallbacks automatically, so we just log the error
    console.error('Error in Gemini chat route (retry wrapper will handle fallbacks):', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate response' }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
