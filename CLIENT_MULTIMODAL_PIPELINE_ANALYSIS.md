# Client-Side Multimodal Pipeline Analysis

**Date:** 2025-01-17  
**Status:** Complete Analysis

---

## Executive Summary

The client-side multimodal pipeline processes **7 input modalities** through a unified hook architecture (`useLiveApi`) that supports both **real-time streaming** (WebSocket) and **one-shot analysis** (HTTP). Visual context is automatically injected into voice conversations via debounced context updates.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│            CLIENT MULTIMODAL PIPELINE                        │
└─────────────────────────────────────────────────────────────┘

INPUT LAYER (7 Modalities)
    │
    ├─ Text (Chat Messages)
    ├─ Voice (Real-time WebSocket → Live API)
    ├─ Webcam (Canvas capture → HTTP + WebSocket)
    ├─ Screen Share (Canvas capture → HTTP + WebSocket)
    ├─ Image Upload (File → HTTP)
    ├─ Documents (PDF/File → HTTP)
    └─ URLs (Auto-fetch via server)
         │
         ↓
UNIFIED HOOK LAYER (useLiveApi)
    │
    ├─ useRealtimeVoice (WebSocket)
    ├─ sendWebcamAnalyze (HTTP)
    ├─ sendScreenShareMessage (HTTP)
    ├─ uploadAttachments (HTTP)
    ├─ sendRealtimeInput (WebSocket)
    └─ sendContextUpdate (WebSocket)
         │
         ↓
TRANSPORT LAYER
    │
    ├─ WebSocket (LiveClientWS → server/live-server.ts:3001)
    └─ HTTP (Next.js API Routes)
         │
         ↓
SERVER PROCESSING
    │
    ├─ Gemini Live API (Voice)
    ├─ Gemini Vision API (Images)
    ├─ MultimodalContextManager (Storage)
    └─ Unified Chat API (Text + context)
```

---

## Core Hooks & Components

### 1. `useLiveApi` - Unified Multimodal Hook

**Location:** `src/hooks/useLiveApi.ts`

**Purpose:** Single entry point for all multimodal operations

**API:**
```typescript
{
  // Real-time voice (from useRealtimeVoice)
  session, isSessionActive, isRecording,
  startSession, stopSession,
  transcript, partialTranscript,
  
  // One-shot HTTP operations
  sendWebcamAnalyze(blob, opts),
  sendScreenShareMessage(imageBase64, prompt, opts),
  uploadAttachments(files, sessionId),
  
  // Real-time streaming
  sendRealtimeInput(chunks),
  sendContextUpdate(update)
}
```

**Key Features:**
- Uses `useLiveApiContext()` for shared state when wrapped in `LiveApiProvider`
- Falls back to creating new `useRealtimeVoice` instance if no provider
- All operations accept optional `sessionId` and `voiceConnectionId`

---

### 2. `useRealtimeVoice` - Voice WebSocket Hook

**Location:** `src/hooks/useRealtimeVoice.ts`

**Purpose:** Manages real-time voice sessions via WebSocket

**Flow:**
```
startSession()
    ↓
LiveClientWS.connect() → WebSocket to server/live-server.ts:3001
    ↓
startRecording() → AudioRecorder (16kHz PCM via AudioWorklet)
    ↓
handleRecorderChunk() → sendAudioBase64PCM16()
    ↓
WebSocket → server → Gemini Live API
    ↓
Audio chunks stream back → AudioPlayer.play()
```

**Context Injection:**
```typescript
// Visual context injected via sendContextUpdate()
sendContextUpdate({
  sessionId,
  modality: 'screen' | 'webcam',
  analysis: string,  // Required - AI analysis text
  imageData?: string, // Optional - base64 image
  capturedAt?: number
})

// Direct visual frames via sendRealtimeInput()
sendRealtimeInput([{
  mimeType: 'image/jpeg',
  data: base64Data
}])
```

**Key Features:**
- AudioWorklet-based recording (16kHz PCM)
- Buffers audio chunks if session not ready yet
- Auto-resumes AudioContext on user interaction
- Auto-restarts session for continuous conversation
- Handles 15+ event types from server

---

### 3. `useScreenShare` - Screen Capture Hook

**Location:** `src/hooks/useScreenShare.ts`

**Purpose:** Captures screen share frames and routes to analysis

**Flow:**
```
startScreenShare()
    ↓
navigator.mediaDevices.getDisplayMedia()
    ↓
Canvas capture (every 4s by default)
    ↓
Dual Path:
    ├─→ sendRealtimeInput() [Continuous streaming]
    │   └─→ WebSocket → Live API (if voice active)
    │
    └─→ POST /api/tools/screen [Periodic analysis]
        └─→ Gemini Vision API
        └─→ sendContextUpdate() [Text context injection]
```

**Key Code:**
```typescript
// Continuous streaming (every capture)
if (sendRealtimeInput) {
  const base64Data = await blobToBase64(blob)
  sendRealtimeInput([{
    mimeType: 'image/jpeg',
    data: base64Data,
  }])
}

// Periodic analysis (every 4s, throttled)
if (sessionId && shouldAnalyze) {
  const result = await uploadToBackend(blob, imageData, sessionId)
  if (result?.analysis && sendContextUpdate) {
    sendContextUpdate({
      sessionId,
      modality: 'screen',
      analysis: result.analysis,
      imageData,
      capturedAt: capture.timestamp,
    })
  }
}
```

**Key Features:**
- Auto-capture interval: 4s default
- Max dimension: 1280px (configurable)
- JPEG quality: 0.7 (configurable)
- Throttled analysis: 4s minimum between HTTP calls
- Dual streaming: frames + analyzed context

---

### 4. `useCamera` - Webcam Capture Hook

**Location:** `src/hooks/useCamera.ts`

**Purpose:** Captures webcam frames and routes to analysis

**Flow:**
```
startCamera()
    ↓
navigator.mediaDevices.getUserMedia()
    ↓
Video element → Canvas capture
    ↓
Dual Path:
    ├─→ sendRealtimeInput() [Continuous streaming]
    │   └─→ WebSocket → Live API
    │
    └─→ POST /api/tools/webcam [Manual/periodic analysis]
        └─→ Gemini Vision API
        └─→ sendContextUpdate() [Text context injection]
```

**Key Features:**
- Similar to `useScreenShare` but for webcam
- Auto-capture interval: 12s default (configurable)
- Supports device selection (front/back camera)
- Mobile-friendly (handles orientation changes)

---

## WebSocket Client (`LiveClientWS`)

**Location:** `src/core/live/client.ts`

**Purpose:** Low-level WebSocket communication with voice server

**Connection:**
- URL: `WEBSOCKET_CONFIG.URL` (from `src/config/constants.ts`)
- Protocol: JSON messages over WebSocket
- Singleton pattern: `getLiveClientSingleton()` survives HMR

**Message Types (Client → Server):**
```typescript
{ type: 'start', payload: { languageCode?, voiceName?, sessionId? } }
{ type: 'stop' }
{ type: 'user_audio', payload: { audioData: base64, mimeType } }
{ type: 'REALTIME_INPUT', payload: { chunks: [{ mimeType, data }] } }
{ type: 'CONTEXT_UPDATE', payload: { modality, analysis, imageData?, ... } }
{ type: 'TOOL_RESULT', payload: { responses } }
{ type: 'heartbeat_ack', timestamp }
```

**Message Types (Server → Client):**
```typescript
'connected' → { connectionId }
'session_started' → { connectionId, languageCode, voiceName, mock }
'session_closed' → { reason }
'input_transcript' → { text, isFinal }
'output_transcript' → { text, isFinal }
'text' → { content }
'audio' → { audioData, mimeType }
'turn_complete'
'setup_complete'
'interrupted'
'tool_call' → { ... }
'tool_result' → { ... }
'stage_update' → { stage, agent, flow }
'error' → { message }
```

---

## HTTP API Routes

### 1. Webcam Analysis

**Route:** `POST /api/tools/webcam`

**Client Usage:**
```typescript
const { sendWebcamAnalyze } = useLiveApi()

// Capture webcam frame (via useCamera)
const blob = await captureFrame()

// Send for analysis
const { ok, analysis } = await sendWebcamAnalyze(blob, {
  sessionId,
  voiceConnectionId
})
```

**Server Processing:**
- FormData with `webcamCapture` file
- Generates image hash for caching (30min TTL)
- Gemini Vision API analysis
- Returns `{ analysis }` or `{ output: { analysis } }`

**Headers:**
- `x-intelligence-session-id`: Session ID
- `x-voice-connection-id`: Voice connection ID (optional)

---

### 2. Screen Share Analysis

**Route:** `POST /api/tools/screen`

**Client Usage:**
```typescript
const { sendScreenShareMessage } = useLiveApi()

// Capture screen frame (via useScreenShare)
const imageData = canvas.toDataURL('image/jpeg', 0.7)

// Send for analysis
const { ok, analysis } = await sendScreenShareMessage(imageData, prompt, {
  sessionId,
  voiceConnectionId,
  type: 'screen' | 'document'
})
```

**Server Processing:**
- JSON body with base64 `image` data URL
- Validates image format and size (10MB max)
- Rate limiting: 20 req/min
- Gemini Vision API analysis
- Stores in `MultimodalContextManager`
- Returns `{ success, output: { analysis, insights } }`

---

### 3. Image Upload

**Route:** `POST /api/tools/image`

**Client Usage:**
```typescript
const formData = new FormData()
formData.append('image', file)

const response = await fetch('/api/tools/image', {
  method: 'POST',
  headers: { 'x-intelligence-session-id': sessionId },
  body: formData
})
```

**Server Processing:**
- FormData with `image` file
- Generates hash for caching (30min TTL)
- Gemini Vision API analysis
- Stores in `MultimodalContextManager.addVisualAnalysis()`
- Returns `{ success, output: { analysis, filename, mimeType } }`

---

### 4. Document Upload

**Route:** `POST /api/tools/document`

**Client Usage:**
```typescript
const formData = new FormData()
formData.append('document', file)

const response = await fetch('/api/tools/document', {
  method: 'POST',
  headers: { 'x-intelligence-session-id': sessionId },
  body: formData
})
```

**Server Processing:**
- FormData with `document` file
- Generates hash for caching
- Gemini Vision API analysis (PDF/OCR)
- Extracts pages, summary
- Stores in `MultimodalContextManager.addUploadEntry()`
- Returns `{ success, output: { analysis, summary, pages } }`

---

### 5. Attachments Upload

**Route:** `POST /api/chat/attachments`

**Client Usage:**
```typescript
const { uploadAttachments } = useLiveApi()

const { ok, attachments, prompt, error } = await uploadAttachments(
  files,
  sessionId
)
```

**Server Processing:**
- FormData with multiple `files`
- Per-file processing:
  - Images → Vision API analysis
  - PDFs → OCR + extraction
  - Other → Metadata only
- Builds prompt summary
- Returns `{ ok, attachments, prompt }`

---

## Context Injection Flow

### Visual Context → Voice Session

**Method 1: Direct Frame Streaming**
```typescript
// Continuous streaming (every capture)
sendRealtimeInput([{
  mimeType: 'image/jpeg',
  data: base64Data
}])
```
- Route: WebSocket → `live-server.ts` → `handleRealtimeInput()`
- Forwards directly to Gemini Live API via `sendRealtimeInput()`
- No analysis - raw frames only

**Method 2: Analyzed Context Updates**
```typescript
// Periodic analysis (throttled)
sendContextUpdate({
  sessionId,
  modality: 'screen' | 'webcam',
  analysis: string,  // Required - AI analysis text
  imageData?: string, // Optional - base64 image
  capturedAt?: number
})
```
- Route: WebSocket → `live-server.ts` → `handleContextUpdate()`
- Server debounces (8s webcam, 12s screen)
- Sends both image + text analysis to Live API:
  1. Image first: `sendRealtimeInput({ media: { mimeType: 'image/jpeg', data } })`
  2. Text analysis: `sendRealtimeInput({ media: { mimeType: 'text/plain', data: '[modality context]: analysis' } })`

**Server Debouncing:**
```typescript
// server/live-server.ts:415-450
const VISUAL_INJECT_THROTTLE_MS = modality === 'webcam' ? 8000 : 12000

if (snap.lastInjected > now - VISUAL_INJECT_THROTTLE_MS) {
  return // Skip injection
}

// Send image + text analysis
await client.session.sendRealtimeInput({ 
  media: { mimeType: 'image/jpeg', data: base64Data } 
})
await client.session.sendRealtimeInput({ 
  media: { mimeType: 'text/plain', data: `[${modality} context]: ${analysis}` }
})
```

---

## Data Flow Examples

### Example 1: Voice + Screen Share (Dual Stream)

```
1. User starts voice session
   → useRealtimeVoice.startSession()
   → WebSocket connection established

2. User shares screen
   → useScreenShare.startScreenShare()
   → Auto-capture every 4s

3. Each capture:
   a) sendRealtimeInput([{ mimeType: 'image/jpeg', data }])
      → WebSocket → server → Gemini Live API (raw frame)
   
   b) Every 4s: POST /api/tools/screen
      → Gemini Vision API analysis
      → sendContextUpdate({ analysis: "...", imageData })
      → WebSocket → server (debounced 12s)
      → Gemini Live API (image + text analysis)

4. Voice conversation now has:
   - Continuous audio stream (16kHz PCM)
   - Periodic visual frames (JPEG)
   - Text context summaries (debounced)
```

### Example 2: Webcam Capture During Voice

```
1. Voice session active
   → useRealtimeVoice.isSessionActive === true

2. User captures webcam frame
   → useCamera.captureFrame()
   → sendRealtimeInput([{ mimeType: 'image/jpeg', data }])
   → WebSocket → server → Gemini Live API

3. Optional: Analysis for context
   → sendWebcamAnalyze(blob, { sessionId, voiceConnectionId })
   → POST /api/tools/webcam
   → Returns analysis
   → sendContextUpdate({ analysis, imageData })
   → Server debounces (8s) → Gemini Live API
```

### Example 3: Document Upload + Chat

```
1. User uploads PDF
   → uploadAttachments([file], sessionId)
   → POST /api/chat/attachments
   → Server: OCR + extraction
   → MultimodalContextManager.addUploadEntry()

2. User sends chat message
   → POST /api/chat/unified
   → Server: prepareChatContext(sessionId, includeVisual: true)
   → Retrieves document analysis from context
   → Includes in system prompt
   → AI generates response with document context
```

---

## Key Design Patterns

### 1. Dual-Path Streaming

**Visual inputs use two paths:**
- **Path A (Continuous):** Raw frames via `sendRealtimeInput()` for real-time visual awareness
- **Path B (Analyzed):** Text summaries via `sendContextUpdate()` for semantic context

**Why:**
- Raw frames: Low latency, full visual detail
- Text analysis: Semantic understanding, searchable context, reduces token usage

### 2. Debouncing Strategy

**Server-side debouncing prevents spam:**
- Webcam: 8s minimum between context injections
- Screen: 12s minimum between context injections

**Client-side throttling:**
- Screen: 4s capture interval
- Webcam: 12s capture interval (configurable)

### 3. Context Storage

**Server uses `MultimodalContextManager`:**
- Stores visual analyses (Redis + Supabase)
- Generates embeddings for semantic search
- Merges into chat context on `/api/chat/unified` requests

### 4. Singleton WebSocket

**`LiveClientWS` uses singleton pattern:**
```typescript
window.__fbc_liveClient = getLiveClientSingleton()
```
- Survives HMR in development
- Single connection per window
- Shared across all components

### 5. Unified Hook API

**`useLiveApi` wraps all operations:**
- Real-time: `useRealtimeVoice`
- One-shot HTTP: `sendWebcamAnalyze`, `sendScreenShareMessage`, `uploadAttachments`
- Context: `sendRealtimeInput`, `sendContextUpdate`

**Provider pattern:**
- `LiveApiProvider` creates shared instance
- Children use `useLiveApiContext()` for shared state
- Falls back to creating new instance if no provider

---

## Configuration

**WebSocket URL:** `WEBSOCKET_CONFIG.URL` from `src/config/constants.ts`

**Default Settings:**
- Audio sample rate: 16kHz (recording), 24kHz (playback)
- Screen capture: 4s interval, 1280px max, 0.7 quality
- Webcam capture: 12s interval, 1280px max, 0.7 quality
- Analysis throttling: 8s (webcam), 12s (screen)
- Image cache: 30min TTL

---

## Error Handling

**WebSocket:**
- Auto-reconnect with exponential backoff (max 5 attempts)
- Session timeout: 10s if server doesn't respond
- Graceful degradation: Falls back to mock mode if API key missing

**HTTP APIs:**
- Rate limiting: 20 req/min (screen), 20 req/min (webcam)
- File size limits: 10MB (images), configurable (attachments)
- Validation: Image format, base64 encoding, session ID

**Audio:**
- AudioContext suspension handling: Auto-resume on user interaction
- AudioWorklet errors: Permission denied, not supported
- Sample rate mismatches: Auto-adjust player rate

---

## Performance Considerations

**Memory Management:**
- Canvas elements reused (not recreated per capture)
- Audio chunks buffered if session not ready (prevents loss)
- Image compression: JPEG 0.7 quality, max 1280px dimension

**Network Optimization:**
- Image caching: Hash-based, 30min TTL
- Debouncing: Prevents excessive API calls
- Throttling: Client-side capture intervals

**Latency:**
- Direct frame streaming: Minimal latency (WebSocket only)
- Analyzed context: ~1-3s (HTTP + Vision API + WebSocket)
- Voice: ~100-200ms end-to-end (depends on network)

---

## Testing

**Unit Tests:**
- Hook state management
- WebSocket message routing
- Canvas capture logic

**Integration Tests:**
- Voice + screen share flow
- Context injection timing
- Error recovery

**E2E Tests:**
- Complete multimodal conversation
- File upload → chat integration
- Multiple modality combinations

---

## Known Issues & Limitations

1. **Screen share quality:** Fixed 0.7 JPEG quality, may need adaptive based on content
2. **Webcam orientation:** Mobile orientation changes may require re-capture
3. **Large documents:** PDFs >10MB may timeout (needs chunking)
4. **Network failures:** WebSocket reconnection may lose buffered audio chunks
5. **Audio context:** Requires user interaction to resume (browser policy)

---

## Future Enhancements

1. **Adaptive quality:** Adjust JPEG quality based on network conditions
2. **Chunked uploads:** Split large files for progressive upload
3. **Offline support:** Queue operations when network unavailable
4. **Compression:** Use WebP for better quality/size ratio
5. **Analytics:** Track capture success rates, latency metrics

---

## References

- `MULTIMODAL_PIPELINE_ANALYSIS.md` - Server-side pipeline analysis
- `src/hooks/useLiveApi.ts` - Unified hook implementation
- `src/hooks/useRealtimeVoice.ts` - Voice WebSocket hook
- `src/core/live/client.ts` - WebSocket client
- `server/live-server.ts` - WebSocket server

