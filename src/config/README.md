# Configuration Constants

This directory contains all centralized configuration for the application.

## DO NOT HARDCODE VALUES

All configuration values must be imported from `constants.ts`. 

**❌ WRONG (examples of what NOT to do):**
```typescript
const ws = new WebSocket('wss://fb-consulting-websocket.fly.dev')
const model = 'gemini-2.0-flash-exp'
```

**✅ CORRECT:**
```typescript
import { WEBSOCKET_CONFIG, GEMINI_MODELS } from '@/config/constants'

const ws = new WebSocket(WEBSOCKET_CONFIG.URL)
const model = GEMINI_MODELS.DEFAULT_CHAT
```

## Why This Matters

Hardcoded values cause:
- Production bugs when URLs change
- Difficulty updating model names across codebase
- Inconsistent configuration across components
- 47+ changes to unified/route.ts because WebSocket URL keeps changing

## Configuration Files

- `constants.ts` - All application constants
- `README.md` - This file

## Usage Examples

### WebSocket Connection
```typescript
import { WEBSOCKET_CONFIG } from '@/config/constants'

// Automatically uses correct URL based on environment
const ws = new WebSocket(WEBSOCKET_CONFIG.URL)
```

### Gemini Models
```typescript
import { GEMINI_MODELS } from '@/config/constants'

const model = GEMINI_MODELS.DEFAULT_VOICE // for voice
const model = GEMINI_MODELS.DEFAULT_CHAT // for text chat
const model = GEMINI_MODELS.DEFAULT_MULTIMODAL // for images/video
```

### Live API
```typescript
import { LIVE_API_CONFIG } from '@/config/constants'

// Correct method name
session[LIVE_API_CONFIG.METHOD_NAME]({ text: 'hello' })
// Becomes: session.sendRealtimeInput({ text: 'hello' })
```

## Adding New Constants

1. Add to `constants.ts`
2. Export as `const` assertion: `as const`
3. Add TypeScript type if needed
4. Document in this README
5. Update `.cursorrules` if it's a common mistake pattern

