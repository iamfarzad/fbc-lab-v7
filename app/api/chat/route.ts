import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Use the correct Gemini Live API model based on official Google AI documentation
    // The gemini-2.5-flash model is the current production model with best price-performance ratio
    const result = await streamText({
      model: google('gemini-2.5-flash'),
      messages,
      temperature: 0.7,
      system: "You are F.B/c, an AI assistant for Farzad Bayat's website. You provide helpful, accurate, and engaging responses with real-time conversational capabilities.",
    });

    return result.toTextStreamResponse();

  } catch (error) {
    console.error('Error in Gemini Live API chat route:', error);
    
    // Fallback to stable model if Live API model fails
    try {
      const { messages } = await req.json();
      const result = await streamText({
        model: google('gemini-2.0-flash'),
        messages,
        temperature: 0.7,
        system: "You are F.B/c, an AI assistant for Farzad Bayat's website. You provide helpful, accurate, and engaging responses.",
      });
      return result.toTextStreamResponse();
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate response' }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
}
