/**
 * Test script to verify retry logic is working
 * Run this to test your retry configuration
 */

import { generateText } from 'ai';
import { createRetryableGemini } from './retry-model';

export async function testRetryLogic() {
  console.log('🧪 Testing retry logic...');
  
  try {
    const retryableModel = createRetryableGemini();
    
    const result = await generateText({
      model: retryableModel,
      messages: [
        { role: 'user', content: 'Say "Retry test successful!" and nothing else.' }
      ],
      temperature: 0.1,
      system: "You are a test assistant. Respond exactly as requested.",
      abortSignal: AbortSignal.timeout(10_000),
    });
    
    console.log('✅ Retry test successful!');
    console.log('Response:', result.text);
    
    return { success: true, response: result.text };
  } catch (error) {
    console.error('❌ Retry test failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Uncomment to run the test
// testRetryLogic().then(result => console.log('Test result:', result));
