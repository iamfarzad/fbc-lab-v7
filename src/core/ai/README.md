# AI Retry Logic

This directory contains retry logic for handling AI model failures gracefully.

## 🚀 **Quick Start**

```typescript
import { createRetryableGemini } from '@/core/ai/retry-model';
import { generateText } from 'ai';

// Create a retryable model
const retryableModel = createRetryableGemini();

// Use it like any other AI SDK model
const result = await generateText({
  model: retryableModel,
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

## 📁 **Files**

- **`retry-model.ts`** - Main retry configurations
- **`retry-examples.ts`** - Usage examples
- **`retry-config.ts`** - Configuration settings
- **`test-retry.ts`** - Test script

## 🔧 **Available Models**

### `createRetryableGemini()`
- **Primary**: `gemini-2.5-flash` (most capable)
- **Fallbacks**: `gemini-1.5-flash` → `gemini-1.5-pro`
- **Use for**: General purpose requests

### `createRetryableGeminiStream()`
- **Primary**: `gemini-1.5-flash` (fastest)
- **Fallbacks**: `gemini-1.5-flash-8b` → `gemini-1.5-flash`
- **Use for**: Streaming responses

### `createRetryableGeminiReliable()`
- **Primary**: `gemini-1.5-pro` (most reliable)
- **Fallbacks**: `gemini-1.5-flash` → `gemini-2.5-flash`
- **Use for**: Critical requests

## 🛠️ **Retry Conditions**

The retry logic handles:
- **Rate limiting** (`serviceOverloaded`)
- **Content filtering** (`contentFilterTriggered`)
- **Timeouts** (`requestTimeout`)
- **Other retryable errors** (`requestNotRetryable`)

## 📝 **Usage Examples**

### Basic Streaming
```typescript
import { createRetryableGeminiStream } from '@/core/ai/retry-model';
import { streamText } from 'ai';

const result = await streamText({
  model: createRetryableGeminiStream(),
  messages: [{ role: 'user', content: 'Hello!' }],
  abortSignal: AbortSignal.timeout(30_000),
});
```

### Structured Data Generation
```typescript
import { createRetryableGeminiReliable } from '@/core/ai/retry-model';
import { generateObject } from 'ai';

const result = await generateObject({
  model: createRetryableGeminiReliable(),
  messages: [{ role: 'user', content: 'Generate user data' }],
  schema: userSchema,
});
```

### Error Handling
```typescript
try {
  const result = await generateText({
    model: createRetryableGemini(),
    messages: messages,
    abortSignal: AbortSignal.timeout(30_000),
  });
} catch (error) {
  if (error.message.includes('rate limit')) {
    // Handle rate limiting
  }
}
```

## ⚙️ **Configuration**

Adjust settings in `retry-config.ts`:
- **Timeouts**: Fast (15s), Standard (30s), Reliable (45s)
- **Models**: Primary and fallback model preferences
- **Retry behavior**: Max attempts, delays, backoff strategy

## 🧪 **Testing**

Run the test script to verify retry logic:
```typescript
import { testRetryLogic } from '@/core/ai/test-retry';
await testRetryLogic();
```

## 🔄 **How It Works**

1. **Primary Request**: Tries the primary model first
2. **Error Detection**: Identifies retryable errors
3. **Fallback Strategy**: Switches to appropriate fallback model
4. **Exponential Backoff**: Adds delays between retries
5. **Final Fallback**: Uses most available model as last resort

## 🎯 **Benefits**

- **Automatic Recovery**: Handles temporary failures
- **Model Fallbacks**: Uses different models when one fails
- **Rate Limit Handling**: Switches to faster models under load
- **Timeout Protection**: Prevents hanging requests
- **Content Filter Bypass**: Uses alternative models for filtered content

