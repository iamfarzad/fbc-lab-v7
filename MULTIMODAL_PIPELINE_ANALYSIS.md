# Multimodal Pipeline Analysis

**Date:** 2025-01-17  
**Status:** Complete Analysis

---

## Executive Summary

The multimodal pipeline is a unified system that processes **7 input modalities** (text, voice, webcam, screen share, images, documents, URLs) through a centralized context manager and routes them to appropriate AI services. The pipeline supports both **real-time streaming** (via Gemini Live API for voice) and **one-shot analysis** (via HTTP APIs for visual content).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  MULTIMODAL PIPELINE                        │
└─────────────────────────────────────────────────────────────┘

INPUT LAYER (7 Modalities)
    │
    ├─ Text (Chat Messages)
    ├─ Voice (WebSocket → Gemini Live API)
    ├─ Webcam (Frame Capture)
    ├─ Screen Share (Frame Capture)
    ├─ Image Upload (File Upload)
    ├─ Documents (PDF/File Upload)
    └─ URLs (Auto-fetch with robots.txt)
         │
         ↓
CONTEXT ENGINE (MultimodalContextManager)
    │
    ├─ Preprocessing (OCR, ASR, Chunking)
    ├─ Context Storage (Redis + Supabase)
    ├─ Semantic Search (Vector embeddings)
    └─ Context Fusion (Multi-modal merging)
         │
         ↓
PROCESSING LAYER
    │
    ├─ Gemini Live API (Voice streaming)
    ├─ Gemini Vision API (Image analysis)
    ├─ Unified Chat API (Text + context)
    └─ Agent Orchestrator (Stage routing)
         │
         ↓
OUTPUT LAYER
    │
    ├─ Text Streaming
    ├─ Voice TTS
    └─ Generated Documents
```

---

## Input Sources & Processing

### 1. Text Input (Chat)
**Route:** `app/api/chat/unified/route.ts`

**Flow:**
```
User types message
    ↓
POST /api/chat/unified
    ↓
MultimodalContextManager.prepareChatContext()
    ↓
Build enhanced context (visual + audio + uploads)
    ↓
Route to agent (Discovery/Scoring/Sales)
    ↓
Generate response via AI SDK
    ↓
Stream back to client
```

**Key Features:**
- Merges multimodal context into system prompt
- Supports multi-agent routing based on funnel stage
- Includes semantic search context (vector similarity)

---

### 2. Voice Input (Real-time)
**Route:** `server/live-server.ts` (WebSocket on port 3001)  
**Client Hook:** `src/hooks/useRealtimeVoice.ts`

**Flow:**
```
Client captures mic audio (16kHz PCM)
    ↓
WebSocket → server/live-server.ts
    ↓
Forward to Gemini Live API
    model: gemini-2.5-flash-native-audio-preview-09-2025
    ↓
Live API performs STT → LLM → TTS
    ↓
Stream audio chunks back via WebSocket
    ↓
Client plays TTS audio
```

**Context Injection:**
- Visual context (webcam/screen) injected via `sendRealtimeInput()`
- Text context updates sent via `sendContextUpdate()`
- Debounced injection (8s for webcam, 12s for screen) to avoid spam

**Key Code:**
```typescript
// server/live-server.ts:426-439
if (typeof client.session.sendRealtimeInput === 'function') {
  // Send image first if available
  if (snap.imageData) {
    await client.session.sendRealtimeInput({ 
      media: { mimeType: 'image/jpeg', data: base64Data } 
    });
  }
  // Then send text context
  await client.session.sendRealtimeInput({ 
    media: { mimeType: 'text/plain', data: `[${modality} context]: ${snap.analysis}` }
  });
}
```

---

### 3. Webcam Input
**Route:** `app/api/tools/webcam/route.ts`  
**Client Hook:** `src/hooks/useLiveApi.ts` → `sendWebcamAnalyze()`

**Flow:**
```
User captures webcam frame (Blob)
    ↓
POST /api/tools/webcam (FormData)
    ↓
Generate image hash (cache key)
    ↓
Cached analysis (30min TTL)
    ↓
Gemini Vision API → Analysis
    ↓
Store in MultimodalContextManager
    ↓
Return analysis text
```

**Live Session Integration:**
- If voice session active, can also stream frame via `sendRealtimeInput()`
- Visual context automatically injected into voice conversation

**Key Features:**
- Image caching (hash-based, 30min TTL)
- Rate limiting (20 req/min)
- Mock mode when no API key

---

### 4. Screen Share Input
**Route:** `app/api/tools/screen/route.ts`  
**Client Hook:** `src/hooks/useScreenShare.ts`

**Flow:**
```
User shares screen → Canvas capture
    ↓
Dual Path:
    ├─→ Stream to Live API (if voice active)
    │   └─→ sendRealtimeInput([{ mimeType: 'image/jpeg', data }])
    │
    └─→ HTTP Analysis (every 12s interval)
        └─→ POST /api/tools/screen
            └─→ Gemini Vision API
            └─→ sendContextUpdate() for voice
```

**Key Code:**
```typescript
// src/hooks/useScreenShare.ts:351-390
if (sendRealtimeInput) {
  // Stream frame directly to Live API
  sendRealtimeInput([{
    mimeType: 'image/jpeg',
    data: base64Data,
  }])
}

// Then send analyzed context update
if (analysisText && sendContextUpdate) {
  sendContextUpdate({
    sessionId,
    modality: 'screen',
    analysis: analysisText,
    imageData,
    capturedAt: capture.timestamp,
  })
}
```

**Features:**
- Continuous streaming (every capture)
- Periodic analysis (12s throttled)
- Automatic context injection into voice sessions

---

### 5. Image Upload
**Route:** `app/api/tools/image/route.ts`

**Flow:**
```
User uploads image file
    ↓
POST /api/tools/image (FormData)
    ↓
Generate image hash
    ↓
Cached analysis (30min TTL)
    ↓
Gemini Vision API
    ↓
multimodalContextManager.addVisualAnalysis()
    ↓
Store in context for future queries
```

**Features:**
- Hash-based caching
- Stored with data URL for reference
- Available for semantic search

---

### 6. Document Upload
**Route:** `app/api/tools/document/route.ts`

**Flow:**
```
User uploads PDF/document
    ↓
POST /api/tools/document
    ↓
Extract text (PDF parser)
    ↓
Generate document hash
    ↓
Cached analysis + summary
    ↓
multimodalContextManager.addUploadEntry()
    ↓
Store full document + analysis
```

**Features:**
- Page extraction and chunking
- Summary generation
- OCR for scanned documents
- Full document stored in context

---

### 7. URL Input
**Route:** `app/api/tools/url/route.ts`

**Flow:**
```
User pastes URL in chat
    ↓
POST /api/tools/url
    ↓
Check robots.txt compliance ✅
    ↓
Fetch HTML (cached 1h, 3s timeout)
    ↓
Parse and extract content
    ↓
Gemini analysis
    ↓
multimodalContextManager.addUploadEntry()
    ↓
Store URL + content + analysis
```

**Features:**
- Robots.txt validation
- HTML parsing and cleaning
- Cached fetching
- Stored as upload entry

---

## Context Management

### MultimodalContextManager
**Location:** `src/core/context/multimodal-context.ts`

**Core Functions:**
1. **`prepareChatContext(sessionId, includeVisual, includeAudio)`**
   - Retrieves conversation history
   - Gets recent visual analyses (webcam/screen/images)
   - Gets recent voice transcripts
   - Gets recent uploads (documents/URLs)
   - Merges into unified context object

2. **`addVisualAnalysis(sessionId, analysis, modality, bytes, imageData)`**
   - Stores visual context (webcam, screen, image)
   - Tracks timestamp and source
   - Available for future queries

3. **`addUploadEntry(sessionId, upload)`**
   - Stores document/URL analyses
   - Links to original file/data
   - Indexed for search

4. **`getSemanticContext(query, limit)`**
   - Vector similarity search
   - Retrieves past similar conversations
   - Enhances context with relevant history

**Storage:**
- **Redis/Upstash:** Fast access cache
- **Supabase:** Persistent storage + vector search
- **Embeddings:** Automatic generation (1536 dims)

---

## Context Injection into Voice

### Real-time Streaming
**Method:** `sendRealtimeInput(chunks)`

**Supported Media Types:**
- `audio/pcm;rate=16000` - Audio chunks
- `image/jpeg` - Visual frames
- `text/plain` - Text context

**Flow:**
```
Visual capture → Analysis → sendContextUpdate()
    ↓
WebSocket → live-server.ts
    ↓
Debounced handler (8s webcam, 12s screen)
    ↓
sendRealtimeInput({ media: { mimeType, data } })
    ↓
Gemini Live API receives multimodal input
    ↓
Model sees: Audio stream + Visual frames + Text context
```

**Key Code:**
```typescript
// server/live-server.ts:415-450
async function handleContextUpdate(connectionId, client, payload) {
  // Debounce: Only inject if not recently injected
  if (snap.lastInjected > now - VISUAL_INJECT_THROTTLE_MS) return;
  
  // Send image if available
  if (snap.imageData) {
    await client.session.sendRealtimeInput({ 
      media: { mimeType: 'image/jpeg', data: base64Data } 
    });
  }
  
  // Send text context
  await client.session.sendRealtimeInput({ 
    media: { mimeType: 'text/plain', data: `[${modality} context]: ${snap.analysis}` }
  });
}
```

---

## Unified Chat Integration

**Route:** `app/api/chat/unified/route.ts`

**Multimodal Context Integration:**
```typescript
// Lines 880-918
const multimodalContext = await multimodalContextManager.prepareChatContext(
  sessionId,
  true,  // include visual
  false  // include audio (optional)
)

// Build system prompt with multimodal context
if (multimodalContext.hasRecentImages) {
  systemPrompt += `\n\nRecent visual context: ${recentImagesSummary}`
}

if (multimodalContext.hasRecentUploads) {
  systemPrompt += `\n\nRecent uploads analyzed: ${recentUploadsSummary}`
}

// Add semantic context from vector search
const semanticContext = await multimodalContextManager.getSemanticContext(
  lastMessage,
  3  // top 3 similar past conversations
)
```

---

## Data Flow Examples

### Example 1: Voice + Screen Share
```
1. User starts voice session
   → WebSocket connection to live-server.ts
   → Gemini Live API session created

2. User shares screen
   → useScreenShare captures frames
   → Streams frames via sendRealtimeInput()
   → Every 12s: Analysis via /api/tools/screen
   → sendContextUpdate() sends analysis
   → live-server injects context into Live API
   → Voice response includes screen context

3. User speaks
   → Audio → Live API → STT → LLM (with screen context) → TTS
   → Response references screen content
```

### Example 2: Text + Image + URL
```
1. User uploads image
   → POST /api/tools/image
   → Stored in multimodalContextManager

2. User pastes URL
   → POST /api/tools/url
   → Fetched, analyzed, stored

3. User sends text message
   → POST /api/chat/unified
   → multimodalContextManager.prepareChatContext()
   → Retrieves recent image + URL analyses
   → Merges into system prompt
   → Agent generates response referencing both
```

---

## Key Files

### Core Pipeline
- `src/core/context/multimodal-context.ts` - Context manager (1212 lines)
- `server/live-server.ts` - Voice WebSocket server
- `app/api/chat/unified/route.ts` - Unified chat endpoint
- `src/hooks/useLiveApi.ts` - Public API for components

### Input Routes
- `app/api/tools/webcam/route.ts` - Webcam analysis
- `app/api/tools/screen/route.ts` - Screen share analysis
- `app/api/tools/image/route.ts` - Image upload
- `app/api/tools/document/route.ts` - Document upload
- `app/api/tools/url/route.ts` - URL analysis

### Client Hooks
- `src/hooks/useRealtimeVoice.ts` - Voice session management
- `src/hooks/useScreenShare.ts` - Screen capture
- `src/hooks/useCamera.ts` - Webcam capture

---

## Performance Characteristics

### Caching
- **Image/Webcam:** 30min TTL, hash-based keys
- **Documents:** 1h TTL, content+filename hash
- **URLs:** 1h TTL, URL-based keys

### Rate Limiting
- **Screen analysis:** 20 req/min per IP
- **Webcam analysis:** Similar limits
- **Voice:** No rate limit (Live API handles)

### Throttling
- **Screen analysis:** 12s minimum interval
- **Webcam analysis:** 8s minimum interval
- **Context injection:** Debounced (VISUAL_INJECT_THROTTLE_MS)

---

## Strengths

1. **Unified Context:** All modalities stored in one manager
2. **Real-time Integration:** Visual context seamlessly injected into voice
3. **Caching:** Efficient reuse of expensive analyses
4. **Semantic Search:** Vector search for relevant past context
5. **Dual Paths:** Supports both streaming (Live API) and one-shot (HTTP)

---

## Potential Improvements

1. **Batch Processing:** Group multiple frames before analysis
2. **Compression:** Compress images before sending to Live API
3. **Context Pruning:** Remove old context after time limit
4. **Streaming Analysis:** Stream video analysis instead of frame-by-frame
5. **Error Recovery:** Retry failed context injections

---

## Testing

**E2E Tests:** `tests/flows/complete-user-journey.spec.ts`
- Tests multimodal switching flows
- Verifies context persistence
- Validates context injection

**Test Coverage:**
- Voice + Screen share integration
- Image + Text integration
- Document + URL integration
- Context retrieval and fusion

---

**Last Updated:** 2025-01-17

