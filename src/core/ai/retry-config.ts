/**
 * Configuration for AI retry logic
 * Adjust these settings based on your needs
 */

export const RETRY_CONFIG = {
  // Timeout settings (in milliseconds)
  timeouts: {
    fast: 15_000,      // 15 seconds - for quick responses
    standard: 30_000,  // 30 seconds - for normal requests
    reliable: 45_000,  // 45 seconds - for critical requests
    batch: 20_000,     // 20 seconds - for batch processing
  },
  
  // Model preferences
  models: {
    // Primary models (most capable)
    primary: 'gemini-2.5-flash',
    primaryStream: 'gemini-1.5-flash',
    primaryReliable: 'gemini-1.5-pro',
    
    // Fallback models (more available)
    fallback: 'gemini-1.5-flash',
    fallbackFast: 'gemini-1.5-flash-8b',
    fallbackReliable: 'gemini-1.5-flash',
    
    // Final fallback (most available)
    final: 'gemini-1.5-flash',
  },
  
  // Retry behavior
  retry: {
    maxAttempts: 5,           // Maximum number of retry attempts
    baseDelay: 1000,          // Base delay between retries (ms)
    maxDelay: 10000,          // Maximum delay between retries (ms)
    backoffMultiplier: 2,     // Exponential backoff multiplier
  },
  
  // Rate limiting
  rateLimit: {
    requestsPerMinute: 50,    // Conservative limit
    burstLimit: 10,           // Burst requests allowed
    delayBetweenBatches: 100, // Delay between batch requests (ms)
  },
  
  // Error handling
  errors: {
    retryable: [
      'rate_limit_exceeded',
      'request_timeout',
      'service_unavailable',
      'internal_server_error',
      'too_many_requests',
    ],
    notRetryable: [
      'invalid_api_key',
      'quota_exceeded',
      'model_not_found',
      'bad_request',
      'forbidden',
    ],
  },
};

/**
 * Get timeout based on request type
 */
export function getTimeout(type: 'fast' | 'standard' | 'reliable' | 'batch' = 'standard'): number {
  return RETRY_CONFIG.timeouts[type];
}

/**
 * Check if an error should be retried
 */
export function shouldRetry(error: Error): boolean {
  const errorMessage = error.message.toLowerCase();
  
  return RETRY_CONFIG.errors.retryable.some(retryableError => 
    errorMessage.includes(retryableError.toLowerCase())
  );
}

/**
 * Get delay for retry attempt (exponential backoff)
 */
export function getRetryDelay(attempt: number): number {
  const { baseDelay, maxDelay, backoffMultiplier } = RETRY_CONFIG.retry;
  const delay = baseDelay * Math.pow(backoffMultiplier, attempt - 1);
  return Math.min(delay, maxDelay);
}
