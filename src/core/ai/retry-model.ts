import { google } from '@ai-sdk/google';
import { createRetryable } from 'ai-retry';
import { 
  contentFilterTriggered, 
  requestTimeout, 
  requestNotRetryable,
  serviceOverloaded 
} from 'ai-retry/retryables';

/**
 * Create a retryable Gemini model with fallback strategies
 * 
 * This configuration handles:
 * - Rate limiting (429 errors)
 * - Content filtering issues
 * - Request timeouts
 * - General retryable errors
 * 
 * Fallback strategy:
 * 1. Primary: gemini-2.5-flash (latest, most capable)
 * 2. Fallback 1: gemini-2.0-flash (faster, more available)
 * 3. Fallback 2: gemini-2.5-pro (most reliable)
 */
export const createRetryableGemini = () => {
  return createRetryable({
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
};

/**
 * Create a retryable model specifically for streaming
 * Uses faster models for better streaming performance
 */
export const createRetryableGeminiStream = () => {
  return createRetryable({
    model: google('gemini-2.5-flash'), // Start with fastest for streaming
    
    retries: [
      // Rate limiting - try even faster model
      serviceOverloaded(google('gemini-2.0-flash')),
      
      // Content filtering
      contentFilterTriggered(google('gemini-2.5-flash')),
      
      // Timeouts
      requestTimeout(google('gemini-2.5-flash')),
      
      // Other errors
      requestNotRetryable(google('gemini-2.0-flash')),
      
      // Final fallback
      google('gemini-2.0-flash')
    ]
  });
};

/**
 * Create a retryable model for high-priority requests
 * Uses the most reliable models with conservative fallbacks
 */
export const createRetryableGeminiReliable = () => {
  return createRetryable({
    model: google('gemini-2.5-pro'), // Most reliable
    
    retries: [
      // Rate limiting - fallback to flash
      serviceOverloaded(google('gemini-2.5-flash')),
      
      // Content filtering - try different model
      contentFilterTriggered(google('gemini-2.0-flash')),
      
      // Timeouts - try faster model
      requestTimeout(google('gemini-2.5-flash')),
      
      // Other errors
      requestNotRetryable(google('gemini-2.5-flash')),
      
      // Final fallback
      google('gemini-2.5-flash')
    ]
  });
};
