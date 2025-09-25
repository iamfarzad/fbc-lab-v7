/**
 * Examples of how to use ai-retry with different AI SDK functions
 * These examples show how to integrate retry logic into your existing codebase
 */

import { streamText, generateText, generateObject } from 'ai';
import { 
  createRetryableGemini, 
  createRetryableGeminiStream, 
  createRetryableGeminiReliable 
} from './retry-model';

// Example 1: Basic streaming with retry
export async function streamWithRetry(messages: any[]) {
  const retryableModel = createRetryableGeminiStream();
  
  return await streamText({
    model: retryableModel,
    messages,
    temperature: 0.7,
    system: "You are a helpful AI assistant.",
    abortSignal: AbortSignal.timeout(30_000), // 30 second timeout
  });
}

// Example 2: Generate text with retry (non-streaming)
export async function generateWithRetry(messages: any[]) {
  const retryableModel = createRetryableGemini();
  
  return await generateText({
    model: retryableModel,
    messages,
    temperature: 0.7,
    system: "You are a helpful AI assistant.",
    abortSignal: AbortSignal.timeout(20_000), // 20 second timeout
  });
}

// Example 3: Generate structured data with retry
export async function generateObjectWithRetry<T>(
  messages: any[], 
  schema: any
): Promise<{ object: T }> {
  const retryableModel = createRetryableGeminiReliable();
  
  return await generateObject({
    model: retryableModel,
    messages,
    schema,
    temperature: 0.3, // Lower temperature for structured data
    system: "You are a helpful AI assistant that generates structured data.",
    abortSignal: AbortSignal.timeout(25_000),
  });
}

// Example 4: High-priority request with maximum reliability
export async function criticalRequestWithRetry(messages: any[]) {
  const retryableModel = createRetryableGeminiReliable();
  
  return await generateText({
    model: retryableModel,
    messages,
    temperature: 0.1, // Very low temperature for consistency
    system: "You are a critical AI assistant that must provide accurate responses.",
    abortSignal: AbortSignal.timeout(45_000), // Longer timeout for critical requests
  });
}

// Example 5: Fast response with fallbacks
export async function fastResponseWithRetry(messages: any[]) {
  const retryableModel = createRetryableGeminiStream();
  
  return await streamText({
    model: retryableModel,
    messages,
    temperature: 0.8,
    system: "You are a fast AI assistant that provides quick responses.",
    abortSignal: AbortSignal.timeout(15_000), // Shorter timeout for fast responses
  });
}

// Example 6: Error handling with custom retry logic
export async function robustRequestWithRetry(messages: any[]) {
  try {
    const retryableModel = createRetryableGemini();
    
    return await generateText({
      model: retryableModel,
      messages,
      temperature: 0.7,
      system: "You are a helpful AI assistant.",
      abortSignal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    console.error('All retry attempts failed:', error);
    
    // Custom fallback logic
    if (error instanceof Error && error.message.includes('rate limit')) {
      throw new Error('Service temporarily unavailable due to high demand. Please try again in a moment.');
    }
    
    if (error instanceof Error && error.message.includes('timeout')) {
      throw new Error('Request timed out. Please try again with a shorter prompt.');
    }
    
    throw new Error('Unable to process request at this time. Please try again later.');
  }
}

// Example 7: Batch processing with retry
export async function batchProcessWithRetry(messagesList: any[][]) {
  const retryableModel = createRetryableGemini();
  const results = [];
  
  for (let i = 0; i < messagesList.length; i++) {
    try {
      const result = await generateText({
        model: retryableModel,
        messages: messagesList[i],
        temperature: 0.7,
        system: "You are a helpful AI assistant.",
        abortSignal: AbortSignal.timeout(20_000),
      });
      
      results.push({ success: true, result, index: i });
      
      // Add delay between requests to avoid rate limiting
      if (i < messagesList.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Batch item ${i} failed:`, error);
      results.push({ success: false, error, index: i });
    }
  }
  
  return results;
}
