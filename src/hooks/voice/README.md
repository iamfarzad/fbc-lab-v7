# Voice Hooks - Single Source of Truth

## ✅ USE THIS:
- **`useRealtimeVoice.ts`** - For ALL voice interactions

## ❌ DEPRECATED (DO NOT USE):
- **`useWebSocketVoice.ts`** - Scheduled for deletion after migration

## Correct Gemini Live API Usage

### ✅ CORRECT
```typescript
import { useRealtimeVoice } from '@/hooks/useRealtimeVoice'

// In your component
const { session } = useRealtimeVoice()

// Sending input
session.sendRealtimeInput({ text: 'hello' })
```

### ❌ WRONG
```typescript
// session.send() does NOT exist on Gemini Live API
session.send('hello') // ERROR: Property 'send' does not exist
```

## WebSocket URL Configuration

### ✅ CORRECT
```typescript
import { WEBSOCKET_CONFIG } from '@/config/constants'

const ws = new WebSocket(WEBSOCKET_CONFIG.URL)
```

### ❌ WRONG
```typescript
// NO hardcoded URLs - these are examples of what NOT to do
const ws = new WebSocket('wss://fb-consulting-websocket.fly.dev') // WRONG
const ws = new WebSocket('ws://localhost:3001') // WRONG
```

## Model Selection

### ✅ CORRECT
```typescript
import { GEMINI_MODELS } from '@/config/constants'

const model = GEMINI_MODELS.DEFAULT_VOICE
```

### ❌ WRONG
```typescript
const model = 'gemini-2.0-flash-exp' // WRONG - hardcoded
const model = 'gemini-1.5-pro-latest' // WRONG - deprecated model
```

## Migration Checklist

When migrating from `useWebSocketVoice` to `useRealtimeVoice`:

1. ✅ Update import statement
2. ✅ Replace `session.send()` with `session.sendRealtimeInput()`
3. ✅ Use `WEBSOCKET_CONFIG.URL` for WebSocket connections
4. ✅ Use `GEMINI_MODELS.DEFAULT_VOICE` for model selection
5. ✅ Test voice input/output functionality
6. ✅ Mark old hook usage with `// TODO: migrate to useRealtimeVoice`

## Why Only One Voice Hook?

Having multiple voice hooks causes:
- Components don't know which to use
- Inconsistent API usage (send vs sendRealtimeInput)
- Different WebSocket connection patterns
- Duplicate bug fixes in both hooks
- 15+ commits fixing "voice session loop" issues

**Pattern:** When consolidating, DELETE the old implementation in the SAME commit.

