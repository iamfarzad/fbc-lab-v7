import { google } from '@ai-sdk/google';
import { createRetryable } from 'ai-retry';
import { 
  contentFilterTriggered, 
  requestTimeout, 
  requestNotRetryable,
  serviceOverloaded 
} from 'ai-retry/retryables';
import { GEMINI_MODELS } from '@/config/constants';

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
 * 1. Primary: gemini-flash-latest (auto-updates to latest)
 * 2. Fallback 1: gemini-flash-lite-latest (faster, more available)
 * 3. Fallback 2: gemini-2.5-pro (most reliable)
 */
export const createRetryableGemini = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }
  
  return createRetryable({
    // Primary model - auto-updates to latest
    model: google(GEMINI_MODELS.FLASH_LATEST),
    
    // Retry strategies with fallback models
    retries: [
      // Handle rate limiting with a faster model
      serviceOverloaded(google(GEMINI_MODELS.FLASH_LITE_LATEST)),
      
      // Handle content filtering with a different model
      contentFilterTriggered(google(GEMINI_MODELS.PRO)),
      
      // Handle timeouts with a more reliable model
      requestTimeout(google(GEMINI_MODELS.PRO)),
      
      // Handle other retryable errors
      requestNotRetryable(google(GEMINI_MODELS.FLASH_LITE_LATEST)),
      
      // Final fallback to most available model
      google(GEMINI_MODELS.FLASH_LITE_LATEST)
    ]
  });
};

/**
 * Create a retryable model specifically for streaming
 * Uses faster models for better streaming performance
 */
export const createRetryableGeminiStream = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }
  
  return createRetryable({
    model: google(GEMINI_MODELS.FLASH_LATEST), // Latest for streaming
    
    retries: [
      // Rate limiting - try lite version
      serviceOverloaded(google(GEMINI_MODELS.FLASH_LITE_LATEST)),
      
      // Content filtering
      contentFilterTriggered(google(GEMINI_MODELS.FLASH_LATEST)),
      
      // Timeouts
      requestTimeout(google(GEMINI_MODELS.FLASH_LATEST)),
      
      // Other errors
      requestNotRetryable(google(GEMINI_MODELS.FLASH_LITE_LATEST)),
      
      // Final fallback
      google(GEMINI_MODELS.FLASH_LITE_LATEST)
    ]
  });
};

/**
 * Create a retryable model for high-priority requests
 * Uses the most reliable models with conservative fallbacks
 */
export const createRetryableGeminiReliable = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }
  
  return createRetryable({
    model: google(GEMINI_MODELS.PRO), // Most reliable
    
    retries: [
      // Rate limiting - fallback to flash
      serviceOverloaded(google(GEMINI_MODELS.FLASH_LATEST)),
      
      // Content filtering - try different model
      contentFilterTriggered(google(GEMINI_MODELS.FLASH_LITE_LATEST)),
      
      // Timeouts - try faster model
      requestTimeout(google(GEMINI_MODELS.FLASH_LATEST)),
      
      // Other errors
      requestNotRetryable(google(GEMINI_MODELS.FLASH_LATEST)),
      
      // Final fallback
      google(GEMINI_MODELS.FLASH_LATEST)
    ]
  });
};
