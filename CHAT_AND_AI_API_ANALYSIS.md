# Complete Chat Functions & AI API Analysis

**Generated:** October 15, 2025  
**Project:** F.B/c AI Consultant Website

---

## 🎯 Executive Summary

Your chat system is a **multi-modal, multi-agent AI platform** powered by Google Gemini models with realtime voice, visual input, and intelligent research capabilities.

### Core Architecture:
- **Frontend:** React hooks (`useUnifiedChat`, `useRealtimeVoice`)
- **Backend:** Unified AI SDK chat API + WebSocket Live server
- **AI Models:** Gemini Flash/Pro (text), Gemini Live API (voice)
- **Transport:** HTTP SSE (text), WebSocket (voice/realtime)

---

## 🤖 AI Models & APIs

### 1. **Gemini Flash (Primary Text Chat)**
**Model:** `gemini-flash-latest` (auto-updates to newest)  
**Usage:** Primary HTTP chat endpoint  
**Location:** `app/api/chat/unified/route.ts:965`

```typescript
const streamingModel = google('gemini-flash-lite-latest')
```

**Features:**
- Streaming text generation
- Tool calling (multimodal features, artifacts)
- 8K token context window
- Research integration

### 2. **Gemini Pro (Fallback)**
**Model:** `gemini-2.5-pro`  
**Usage:** Fallback for content filtering, timeouts  
**Location:** `src/core/ai/retry-model.ts:36-44`

```typescript
retries: [
  serviceOverloaded(google(GEMINI_MODELS.FLASH_LITE_LATEST)),
  contentFilterTriggered(google(GEMINI_MODELS.PRO)),
  requestTimeout(google(GEMINI_MODELS.PRO))
]
```

### 3. **Gemini Live API (Voice)**
**Model:** `gemini-2.0-flash-exp`  
**Usage:** Realtime voice conversations  
**Location:** `server/live-server.ts:274`

```typescript
const model = `models/${process.env.GEMINI_LIVE_MODEL || GEMINI_MODELS.DEFAULT_VOICE}`
```

**Features:**
- Bidirectional audio streaming
- Real-time transcription (input + output)
- Visual input (webcam/screen frames)
- Tool calling during voice conversation
- 24kHz PCM audio output
- 16kHz PCM audio input

### 4. **Multi-Agent System** ✨ NEW
**Status:** Feature flagged (`ENABLE_MULTI_AGENT=true`)  
**Location:** `app/api/chat/unified/route.ts:817-934`

```typescript
const agentResult = await routeToAgent({
  messages: aiMessages,
  context: agentContext,
  trigger: context?.voiceActive ? 'voice' : 'chat'
})
```

**Agents:**
- Discovery Agent (lead qualification)
- Nurture Agent (relationship building)
- Close Agent (conversion)
- **Routing based on:** conversation stage, lead score, fit score

---

## 🔄 Chat System Architecture

### **Frontend Flow**

#### 1. **Text Chat Hook** (`useUnifiedChat.ts`)
```typescript
// Location: src/hooks/useUnifiedChat.ts
const { messages, sendMessage, isLoading } = useUnifiedChat({
  sessionId: 'session-123',
  context: { intelligenceContext, multimodalData }
})
```

**Responsibilities:**
- Message state management
- HTTP SSE streaming
- Tool call handling
- Context management
- Error handling

**API Endpoint:** `POST /api/chat/unified`  
**Transport:** HTTP with Server-Sent Events (SSE)  
**Streaming:** ✅ Yes (text-delta chunks)

#### 2. **Voice Chat Hook** (`useRealtimeVoice.ts`)
```typescript
// Location: src/hooks/useRealtimeVoice.ts
const audioHook = useRealtimeVoice({
  onPartialTranscript: (text) => console.log('User said:', text),
  onAssistantText: (text) => console.log('AI said:', text),
  onToolCall: async (toolCall) => { /* handle tools */ }
})
```

**Responsibilities:**
- WebSocket connection management
- Audio recording (16kHz PCM)
- Audio playback (24kHz PCM)
- Transcription handling
- Tool call coordination
- Context injection

**WebSocket URL:** `WEBSOCKET_CONFIG.URL` (auto-switches dev/prod)  
**Transport:** WebSocket (persistent connection)  
**Audio Format:** Base64-encoded PCM

---

### **Backend Flow**

#### 1. **Unified Chat API** (`app/api/chat/unified/route.ts`)
**Endpoint:** `POST /api/chat/unified`  
**Framework:** AI SDK (Vercel)  
**Runtime:** Node.js

**Request Format:**
```typescript
interface ChatRequest {
  messages: UnifiedMessage[]
  context?: {
    sessionId?: string
    intelligenceContext?: IntelligenceContext
    conversationFlow?: ConversationFlowSnapshot
    voiceActive?: boolean
    enhancedResearch?: boolean
  }
  stream?: boolean
}
```

**Response Format (SSE):**
```typescript
// Meta event
event: meta
data: { reqId: 'uuid', type: 'meta' }

// Text chunks
data: { id: 'msg-id', role: 'assistant', content: 'Hello...', metadata: { isStreaming: true } }

// Completion
data: { id: 'msg-id', role: 'assistant', content: 'Hello world!', metadata: { isComplete: true, sources: [...] } }
```

**Features:**
- ✅ Streaming text generation
- ✅ Tool calling (6 tools)
- ✅ Multi-agent routing
- ✅ Research integration
- ✅ Context management
- ✅ AI elements parsing
- ✅ Usage limits & cost protection

#### 2. **Live WebSocket Server** (`server/live-server.ts`)
**Port:** 3001 (dev), 3000 (prod via Fly.io)  
**Protocol:** WebSocket (WS/WSS)  
**Runtime:** Node.js

**Message Types:**
```typescript
// Client → Server
{ type: 'start', payload: { languageCode: 'en-US', voiceName: 'Puck' } }
{ type: 'user_audio', payload: { audioData: 'base64...', mimeType: 'audio/pcm;rate=16000' } }
{ type: 'REALTIME_INPUT', payload: { chunks: [{ mimeType: 'image/jpeg', data: 'base64...' }] } }
{ type: 'CONTEXT_UPDATE', payload: { modality: 'screen', analysis: '...', imageData: '...' } }
{ type: 'TOOL_RESULT', payload: { responses: [...] } }
{ type: 'TURN_COMPLETE' }

// Server → Client
{ type: 'connected', payload: { connectionId: 'uuid' } }
{ type: 'session_started', payload: { connectionId, voiceName, languageCode } }
{ type: 'input_transcript', payload: { text: '...', isFinal: true } }
{ type: 'output_transcript', payload: { text: '...', isFinal: true } }
{ type: 'text', payload: { content: '...' } }
{ type: 'audio', payload: { audioData: 'base64...', mimeType: 'audio/pcm;rate=24000' } }
{ type: 'tool_call', payload: { functionCalls: [...] } }
{ type: 'turn_complete', payload: { turnComplete: true } }
```

**Live API Configuration:**
```typescript
{
  responseModalities: [Modality.AUDIO, Modality.IMAGE],
  speechConfig: { 
    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } 
  },
  inputAudioTranscription: {},  // User speech → text
  outputAudioTranscription: {}, // AI speech → text (closed captions)
  systemInstruction: { parts: [{ text: CHAT_PERSONALITY }] },
  tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }]
}
```

---

## 🛠️ Tool Integrations

### **HTTP Chat Tools** (6 tools)

#### 1. **`enable_voice`** - Voice activation
```typescript
{
  description: 'Suggest enabling voice chat when user wants to talk verbally',
  inputSchema: z.object({
    reason: z.string().describe('Why voice would be helpful')
  })
}
```
**Requires:** User approval  
**Action:** Opens voice session via WebSocket

#### 2. **`enable_screen_share`** - Screen sharing
```typescript
{
  description: 'Suggest enabling screen share when user wants to show something visual',
  inputSchema: z.object({
    reason: z.string().describe('Why screen share would be helpful')
  })
}
```
**Requires:** User approval  
**Action:** Activates screen capture (continuous streaming at 2 FPS)

#### 3. **`enable_webcam`** - Camera activation
```typescript
{
  description: 'Suggest enabling webcam when user wants video interaction',
  inputSchema: z.object({
    reason: z.string().describe('Why webcam would be helpful')
  })
}
```
**Requires:** User approval  
**Action:** Activates camera (continuous streaming at 2 FPS)

#### 4. **`create_calendar_widget`** - Calendly embedding
```typescript
{
  description: 'Create inline calendar booking widget',
  inputSchema: z.object({
    title: z.string(),
    description: z.string().optional(),
    url: z.string().optional() // Defaults to Farzad's Calendly
  })
}
```
**Result:** Inline Calendly iframe artifact

#### 5. **`create_chart`** - Data visualization
```typescript
{
  description: 'Create inline chart/graph to visualize data',
  inputSchema: z.object({
    type: z.enum(['bar', 'line', 'pie', 'area']),
    title: z.string(),
    data: z.array(z.object({ label: z.string(), value: z.number() })),
    description: z.string().optional()
  })
}
```
**Result:** Inline chart artifact

---

### **Voice Tools** (3 tools)

#### 1. **`search_web`** - Web search
```typescript
{
  name: 'search_web',
  description: 'Search the web for current information',
  parameters: {
    query: { type: 'string' },
    urls: { type: 'array', items: { type: 'string' }, optional: true }
  }
}
```
**Handler:** Client-side (`ChatInterface.tsx:186-210`)  
**API:** `POST /api/tools/search`  
**Provider:** Google Grounding API

#### 2. **`capture_screen_snapshot`** - Screen context retrieval
```typescript
{
  name: 'capture_screen_snapshot',
  description: 'Retrieve latest screen-share context',
  parameters: {
    summaryOnly: { type: 'boolean' }
  }
}
```
**Handler:** Client-side (`ChatInterface.tsx:212-221`)  
**Data:** From `lastScreenSnapshot` state (updated every 500ms during screen share)

#### 3. **`capture_webcam_snapshot`** - Camera context retrieval
```typescript
{
  name: 'capture_webcam_snapshot',
  description: 'Retrieve latest webcam context',
  parameters: {
    summaryOnly: { type: 'boolean' }
  }
}
```
**Handler:** Client-side (`ChatInterface.tsx:223-232`)  
**Data:** From `lastWebcamSnapshot` state (updated every 500ms during camera use)

---

## 📊 Research & Intelligence

### **Google Grounding API Integration**
**Provider:** `GoogleGroundingProvider`  
**Location:** `src/core/intelligence/providers/search/google-grounding.ts`  
**Endpoint:** Google Search Grounding API

**Trigger Logic:**
```typescript
function analyzeResearchNeed(content: string, context?: ChatContext) {
  // 1. Explicit search: "search for", "look up", "find information about"
  // 2. URL detected in message
  // 3. Screen share + technical issue keywords
  // 4. Force flag: context.enhancedResearch === true
}
```

**Research Flow:**
1. User message triggers research
2. Query sent to Google Grounding API
3. Combines: Search grounding + URL context
4. Returns: `{ combinedAnswer, citations, urlsUsed }`
5. Injected into system prompt as context
6. AI references inline using clean domains

**Cost Protection:**
- ✅ Usage limits (per session)
- ✅ Research throttling
- ✅ Smart trigger logic (avoid unnecessary searches)

---

## 🎥 Multimodal Features

### **1. Screen Share**
**Implementation:** `ChatInterface.tsx:500-706`  
**Capture Rate:** 2 FPS (500ms interval)  
**Resolution:** Max 1280px width (scaled)  
**Quality:** JPEG 70%  
**Delivery:** Continuous streaming via `sendRealtimeInput()`

**Flow:**
1. User enables screen share
2. Canvas captures frame every 500ms
3. Convert to JPEG blob → Base64
4. Send via `audioHook.sendRealtimeInput([{ mimeType: 'image/jpeg', data: base64 }])`
5. Gemini Live API receives frames in realtime
6. AI analyzes visually + responds in voice

**API Route (Legacy):** `POST /api/tools/screen`  
**Handler:** Fallback if `sendRealtimeInput` unavailable

### **2. Webcam**
**Implementation:** `src/hooks/useCamera.ts`  
**Capture Rate:** 2 FPS (500ms interval)  
**Resolution:** Max 640px (maxDimension)  
**Quality:** JPEG 85%  
**Delivery:** Continuous streaming via `sendRealtimeInput()`

**Flow:**
1. User enables camera
2. Video element captures frame every 500ms
3. Canvas → JPEG blob → Base64
4. Send via `audioHook.sendRealtimeInput([{ mimeType: 'image/jpeg', data: base64 }])`
5. Gemini Live API receives frames
6. AI sees user face/environment + responds

**API Route (Legacy):** `POST /api/tools/webcam`

### **3. Voice**
**Implementation:** `useRealtimeVoice.ts` + `live-server.ts`  
**Input Audio:** 16kHz PCM, mono, 16-bit  
**Output Audio:** 24kHz PCM, mono, 16-bit  
**Transcription:** Bidirectional (user + AI)

**Flow:**
1. User clicks voice button
2. `startSession()` → WebSocket `{ type: 'start' }`
3. Server connects to Gemini Live API
4. Client starts mic recording → chunks sent via `{ type: 'user_audio' }`
5. Live API processes + responds with audio + transcript
6. Client plays audio via `AudioStreamingQueue`
7. Transcript displayed in UI

**Features:**
- ✅ Voice activity detection
- ✅ Interruption handling
- ✅ Turn management
- ✅ Tool calling during voice
- ✅ Visual context injection
- ✅ Closed captions

---

## 🧠 Intelligence & Context

### **Session Intelligence**
**Location:** `src/hooks/useChatIntelligence.ts`  
**API:** `POST /api/intelligence/session-init`

**Gathered Data:**
- User name, email
- Company context (name, industry, size)
- Role & seniority
- Previous conversations
- Intent analysis

**Usage:** Injected into system prompt for personalized responses

### **Multimodal Context Manager**
**Location:** `src/core/context/multimodal-context.ts`  
**Storage:** In-memory + database

**Tracked:**
- Voice transcripts (user + AI)
- Webcam captures
- Screen captures
- Image analysis results

**API:**
```typescript
await multimodalContextManager.addVoiceTranscript(sessionId, text, 'user', true)
await multimodalContextManager.getVoiceTranscripts(sessionId, 3) // Last 3 transcripts
```

### **Conversation Flow Tracking**
**Categories:** `['goals', 'pain', 'data', 'readiness', 'budget', 'success']`

```typescript
interface ConversationFlowSnapshot {
  covered: Record<string, boolean>
  recommendedNext: string | null
  evidence: Record<string, string[]>
  totalUserTurns: number
  shouldOfferRecap: boolean
}
```

**Used for:** Guided discovery conversation strategy

---

## 🔐 Security & Limits

### **Cost Protection**
**Location:** `src/lib/usage-limits.ts`

**Limits:**
- Messages: Per session tracking
- Research: Throttled per session
- Tool calls: Rate limited

**Implementation:**
```typescript
const limitCheck = await usageLimiter.checkLimit(sessionId, 'message')
if (!limitCheck.allowed) {
  return NextResponse.json({ error: limitCheck.reason, limit_reached: true }, { status: 429 })
}
await usageLimiter.trackUsage(sessionId, 'message')
```

### **Session Management**
- Timeout: 30 minutes
- Warning: 25 minutes
- Heartbeat: 60 seconds
- Auto-cleanup: On timeout or close

---

## 📈 AI Elements & Metadata

### **Structured Response Parsing**
**Location:** `app/api/chat/unified/route.ts:138-294`

**Extracted Elements:**
- `<reasoning>...</reasoning>` → Chain of thought
- `<chain_of_thought>Step 1:...</chain_of_thought>` → Steps
- `<code language="ts">...</code>` → Code blocks
- `<sources>...</sources>` → Citations
- `<image>...</image>` → Generated images
- `<citation href="...">...</citation>` → Inline citations
- `<task status="...">...</task>` → Action items
- `<web_preview url="...">...</web_preview>` → Link previews

**Output:** Metadata attached to message for UI rendering

---

## 🎯 Use Cases

### **1. Discovery Call (Voice + Screen)**
```
User: "Let's talk about my workflow"
→ AI calls enable_voice()
→ User approves
→ Voice session starts
User: "Let me show you my dashboard"
→ AI calls enable_screen_share()
→ User approves
→ Screen frames streamed to Live API
→ AI analyzes dashboard visually while talking
```

### **2. Research Query (HTTP Chat)**
```
User: "What are the latest trends in healthcare AI?"
→ Triggers research (keyword: "latest trends")
→ Google Grounding API search
→ Returns 5 citations + summary
→ AI response with inline citations
```

### **3. Multi-Agent Routing**
```
User: "I'm interested in your services" (early stage)
→ Routes to Discovery Agent
→ Asks qualifying questions
→ Scores lead (fitScore, leadScore)

User: "What's the next step?" (later in conversation)
→ Routes to Close Agent
→ Suggests booking call
→ Creates calendar widget artifact
```

---

## 🔧 Configuration

### **Environment Variables**
```bash
# AI Models
GEMINI_API_KEY=your_api_key
GEMINI_LIVE_MODEL=gemini-2.0-flash-exp

# WebSocket Server
PORT=3001  # or 3000 on Fly.io
LIVE_SERVER_TLS=false  # true for local HTTPS

# Feature Flags
ENABLE_MULTI_AGENT=true
MOCK_UNIFIED_CHAT=false
LIVE_SERVER_INJECT_ON_CONTEXT_UPDATE=1

# Timing
LIVE_SERVER_VISUAL_INJECT_THROTTLE_MS=8000
LIVE_SERVER_CONTEXT_INJECT_DEBOUNCE_MS=600
```

### **Model Selection Strategy**
**Primary:** `gemini-flash-latest` (auto-updates)  
**Fallback 1:** `gemini-flash-lite-latest` (fast)  
**Fallback 2:** `gemini-2.5-pro` (reliable)  
**Voice:** `gemini-2.0-flash-exp` (optimized for voice)

---

## 🚀 Performance

### **Streaming Performance**
- **Text chunks:** ~50ms latency
- **Voice latency:** ~200ms (transcription + audio)
- **Screen/webcam:** 2 FPS (500ms interval)
- **Research:** ~2-3s (with caching)

### **Optimization Techniques**
1. **Connection pooling:** Reuse WebSocket connections
2. **Audio queue:** Smooth playback via `AudioStreamingQueue`
3. **Debouncing:** Context injection throttled (600ms + 8s cooldown)
4. **Smart research:** Only trigger when needed
5. **Cost limits:** Per-session throttling

---

## 🧪 Testing & Debugging

### **Test Files**
- `test-voice-connection.js` - WebSocket voice test
- `test-websocket-connection.js` - Connection test
- `test-simple-gemini.js` - Model API test

### **Debug Tools**
- `AIDevtools` (development only)
- Session logger (`server/session-logger.ts`)
- Browser DevTools → Network → WS
- Console logs with connection IDs

---

## 📋 API Reference

### **Chat Endpoints**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat/unified` | POST | Main chat (text/streaming) |
| `/api/tools/search` | POST | Web search |
| `/api/tools/screen` | POST | Screen analysis (legacy) |
| `/api/tools/webcam` | POST | Webcam analysis (legacy) |
| `/api/intelligence/session-init` | POST | Intelligence gathering |
| `/api/usage/[sessionId]` | GET | Usage stats |
| `/api/export-summary` | POST | Export conversation |

### **WebSocket Messages**

| Client → Server | Description |
|-----------------|-------------|
| `start` | Start voice session |
| `user_audio` | Audio chunk (16kHz PCM base64) |
| `REALTIME_INPUT` | Visual input (webcam/screen) |
| `CONTEXT_UPDATE` | Multimodal context |
| `TOOL_RESULT` | Tool execution result |
| `TURN_COMPLETE` | End user turn |

| Server → Client | Description |
|-----------------|-------------|
| `connected` | Connection established |
| `session_started` | Voice session ready |
| `input_transcript` | User speech transcribed |
| `output_transcript` | AI speech transcribed |
| `text` | AI text response |
| `audio` | AI audio chunk (24kHz PCM) |
| `tool_call` | Tool requested |
| `turn_complete` | AI turn finished |

---

## 🎓 Key Learnings

### ✅ **What Works Well**
1. **Unified architecture** - Single chat API for all modes
2. **Continuous streaming** - Real-time visual input during voice
3. **Tool calling** - Seamless multimodal feature activation
4. **Research integration** - Smart triggering saves costs
5. **Multi-agent routing** - Personalized conversation strategy

### ⚠️ **Watch Out For**
1. **Cost:** Research API can be expensive - use smart triggering
2. **Latency:** Visual streaming adds overhead - optimize frame rate
3. **Context window:** 8K tokens fills up fast with multimodal data
4. **WebSocket stability:** Implement reconnection logic
5. **Browser limits:** Safari has WebSocket connection limits

---

## 🔮 Future Enhancements

### **Potential Additions**
- [ ] PDF document upload + analysis
- [ ] Multi-participant voice (group calls)
- [ ] Screen annotation during calls
- [ ] Voice cloning (Farzad's voice)
- [ ] Offline transcription fallback
- [ ] Mobile app (React Native)
- [ ] Admin dashboard for session monitoring
- [ ] A/B testing framework for agent prompts

---

## 📚 Related Documentation

- `CHAT_PIPELINE_ARCHITECTURE.md` - Architecture overview
- `CHAT_COMPONENTS_QUICK_REFERENCE.md` - Component reference
- `HOW_TO_USE_MULTIMODAL.md` - Multimodal guide
- `src/config/constants.ts` - Configuration reference
- `src/types/core.ts` - Type definitions

---

**Last Updated:** October 15, 2025  
**Maintained By:** F.B/c AI Development Team

