# Conversational Flow Code Mapping

**Repository**: `iamfarzad/fbc-lab-v7`  
**Last Updated**: October 29, 2025  
**Scope**: Complete mapping of chat functions, conversational flow, and AI response system to code files

---

## 📋 Table of Contents

1. [Core Chat API](#core-chat-api)
2. [Client-Side Hooks & State](#client-side-hooks--state)
3. [AI Agent System](#ai-agent-system)
4. [Multimodal Context Management](#multimodal-context-management)
5. [UI Components](#ui-components)
6. [Intelligence & Research](#intelligence--research)
7. [Tools & Artifacts](#tools--artifacts)
8. [Logging & Analytics](#logging--analytics)
9. [Type Definitions](#type-definitions)
10. [Configuration](#configuration)

---

## 1. Core Chat API

### Main Unified Chat Endpoint
**File**: `app/api/chat/unified/route.ts` (1,595 lines)

**Key Functions**:
- `POST(req: NextRequest)` - Main chat handler (lines 514-1513)
  - Request validation & parsing (522-558)
  - Rate limiting (560-572)
  - Session management (535-549)
  - Exit intent detection (584-618)
  - System prompt generation (620-695)
  - Context gathering (697-1150)
  - AI SDK `streamText()` call (1165-1182)
  - Response streaming (1184-1350)
  - Non-streaming fallback (1400-1493)
  
- `GET(req: NextRequest)` - Capabilities endpoint (1519-1566)
  - `/api/chat/unified?action=capabilities`
  - `/api/chat/unified?action=status`

**Key Imports**:
```typescript
// AI SDK
import { streamText, generateText } from 'ai'
import { google } from '@ai-sdk/google'

// Core Systems
import { multimodalContextManager } from '@/core/context/multimodal-context'
import { routeToAgent } from '@/core/agents'
import { GoogleGroundingProvider } from '@/core/intelligence/providers/search/google-grounding'
```

**Related Files**:
- `app/api/chat/attachments/route.ts` - File upload handling
- `app/api/chat/transcribe/route.ts` - Voice transcription

---

## 2. Client-Side Hooks & State

### Unified Chat Hook
**File**: `src/hooks/useUnifiedChat.ts` (569 lines)

**Main Export**: `useUnifiedChat(options: UnifiedChatOptions)`

**Key Functions**:
- `runStream()` - SSE connection & streaming (142-316)
- `sendMessage()` - Message submission (318-378)
- `regenerate()` - Response regeneration (380-421)
- `stop()` - Abort streaming (132-140)
- `normaliseStreamMessage()` - Parse SSE messages (20-66)

**State Management Integration**:
- Syncs with `unified-chat-store.ts` (527-542)
- Uses Zustand store for global state

### Unified Chat Store
**File**: `src/core/chat/state/unified-chat-store.ts` (112 lines)

**Exports**:
- `useUnifiedChatMessages()` - Get messages from store
- `useUnifiedChatError()` - Get error state
- `useUnifiedChatActions()` - Get all chat actions
- `syncUnifiedChatStoreState()` - Update store state
- `resetUnifiedChatStore()` - Clear store

**Store ID**: `UNIFIED_CHAT_STORE_ID` (default: `'unified-chat'`)

### Chat Intelligence Hook
**File**: `src/components/chat/hooks/useChatIntelligence.ts` (340 lines)

**Main Export**: `useChatIntelligence(id?: string, options?: { forceTermsReset?: boolean })`

**Features**:
- Lead research initialization
- Suggestions fetching
- Terms acceptance management
- Context preparation

### Conversation Flow Hook
**File**: `src/components/chat/hooks/useConversationFlow.ts`

**Purpose**: Manages conversation state machine and flow progression

---

## 3. AI Agent System

### Agent Orchestrator
**File**: `src/core/agents/orchestrator.ts` (271 lines)

**Main Function**: `routeToAgent({ messages, context, trigger })`

**Agent Types**:
- Discovery Agent
- Summary Agent
- Admin Agent

**Agent Routing Logic** (lines 22-271):
- Analyzes conversation context
- Determines which agent to use
- Returns `AgentResult` with agent type and response

### Discovery Agent
**File**: `src/core/agents/discovery-agent.ts`

**Purpose**: Lead qualification and business discovery
- Structured questioning
- Goal identification
- Pain point discovery

### Summary Agent
**File**: `src/core/agents/summary-agent.ts` (177 lines)

**Main Function**: `summaryAgent(messages: ChatMessage[], context: AgentContext)`

**Purpose**: Generates conversation summaries
- Executive summaries
- Key findings extraction
- Next steps recommendations

### Agent Types
**File**: `src/core/agents/types.ts` (42 lines)

**Interfaces**:
- `AgentContext` - Context passed to agents
- `IntelligenceContext` - Research & intelligence data
- `AgentResult` - Agent response structure

---

## 4. Multimodal Context Management

### Multimodal Context Manager
**File**: `src/core/context/multimodal-context.ts` (1,212 lines)

**Class**: `MultimodalContextManager`

**Key Methods**:
- `initializeSession()` - Create new session context (164-188)
- `addTextMessage()` - Add chat messages (190-260)
- `addConversationTurn()` - Track conversation turns
- `addVisualContext()` - Screen/webcam analysis storage
- `addUploadContext()` - Document/image upload tracking
- `getContext()` - Retrieve full context for AI
- `summarizeContext()` - Compress context for token limits

**Context Types**:
```typescript
interface MultimodalContext {
  sessionId: string
  conversationHistory: ConversationEntry[]
  conversationTurns: ConversationTurn[]
  visualContext: VisualEntry[]
  audioContext: AudioEntry[]
  uploadContext: UploadEntry[]
  leadContext: LeadContext
  metadata: ContextMetadata
}
```

### Context Storage
**File**: `src/core/context/context-storage.ts`

**Class**: `ContextStorage`

**Purpose**: Persistent storage for conversation contexts
- Session persistence
- Context retrieval
- Context updates

### Context Types
**File**: `src/core/context/context-types.ts`

**All Type Definitions**:
- `MultimodalContext`
- `ConversationEntry`
- `VisualEntry`
- `AudioEntry`
- `UploadEntry`
- `LeadContext`
- `ConversationTurn`

---

## 5. UI Components

### Live Chat Messages
**File**: `src/components/agent-ui/app/LiveChatMessages.tsx` (310 lines)

**Component**: `LiveChatMessages({ messages, className })`

**Renders**:
- Message bubbles (user/assistant)
- AI Elements (Sources, Reasoning, Code Blocks)
- Artifacts (Charts, Calendars, Summaries)
- Inline citations
- Tools execution results
- Web previews
- Images
- Actions/Buttons

**AI Elements Integration**:
- Uses `@/components/ai-elements/core/*` components
- Serializes content with `serializeToText()`
- Maps tool states with `mapToolState()`

### Chat Interface
**File**: `app/chat/page.tsx`

**Main Chat Page**: Server component for chat UI

### Chat Input Components
**Files**:
- `src/components/agent-ui/livekit/agent-control-bar/chat-input.tsx` - LiveKit chat input
- `src/components/ai-elements/interactive/prompt-input.tsx` - AI Elements prompt input (539 lines)

### Chat Terms Acceptance
**File**: `src/components/chat/components/ChatTermsAcceptance.tsx`

**Purpose**: GDPR terms acceptance UI

---

## 6. Intelligence & Research

### Google Grounding Provider
**File**: `src/core/intelligence/providers/search/google-grounding.ts`

**Class**: `GoogleGroundingProvider`

**Purpose**: Real-time web search integration
- Google Grounding API integration
- Research result formatting
- Source citation generation

### Intelligence API Routes
**Files**:
- `app/api/intelligence/analyze-image/route.ts` - Image analysis
- `app/api/intelligence/context/route.ts` - Context building
- `app/api/intelligence/lead-research/route.ts` - Lead research
- `app/api/intelligence/session-init/route.ts` - Session initialization
- `app/api/intelligence/suggestions/route.ts` - Conversation suggestions

---

## 7. Tools & Artifacts

### AI Tools Definition
**Location**: `app/api/chat/unified/route.ts` (lines 1114-1157)

**Available Tools**:
```typescript
const tools = {
  enable_voice: { ... },
  enable_screen_share: { ... },
  enable_webcam: { ... },
  create_calendar_widget: { ... },
  create_chart: { ... }
}
```

### Artifact Components
**Files**:
- `src/components/chat/artifacts/SummaryArtifact.tsx` - Session summaries
- `src/components/chat/artifacts/CalendarWidget.tsx` - Booking widgets
- `src/components/chat/artifacts/ChartWidget.tsx` - Data visualization

**Index**: `src/components/chat/artifacts/index.ts`

---

## 8. Logging & Analytics

### JSONL Logger
**File**: `src/lib/jsonl-logger.ts`

**Function**: `logJsonl(category: string, event: string, data: any)`

**Log Categories**:
- `chat` - Chat messages and responses
- `live` - Voice/live interactions
- `webcam` - Webcam captures
- `screen` - Screen shares
- `document` - Document uploads
- `image` - Image uploads
- `url` - URL analysis

**Log Locations**: `logs/{category}/{category}-YYYYMMDD.jsonl`

### Analytics Routes
**Files**:
- `app/api/analytics/chat-flow/route.ts` - Conversation flow analytics

---

## 9. Type Definitions

### Core Types
**File**: `src/types/core.ts`

**Key Types**:
```typescript
interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string | ContentPart[]
  timestamp: Date
  metadata?: MessageMetadata
}

interface ChatContext {
  sessionId: string
  conversationFlow?: ConversationFlowSnapshot
  multimodalData?: MultimodalData
  intelligenceContext?: IntelligenceContext
  // ... more fields
}
```

### Unified Chat Types
**File**: `src/core/chat/unified-types.ts` (72 lines)

**Exports**:
- `UnifiedMessage` - Message format for unified chat
- `UnifiedContext` - Context format
- `UnifiedChatOptions` - Hook options
- `UnifiedChatReturn` - Hook return type
- `UnifiedChatRequest` - API request format

### Chat Component Types
**File**: `src/components/chat/types/chatTypes.ts`

**Component-specific types**

---

## 10. Configuration

### Constants
**File**: `src/config/constants.ts`

**Key Exports**:
- `GEMINI_MODELS` - Model configurations
- `GEMINI_CONFIG` - Gemini API settings
- `WEBSOCKET_CONFIG` - WebSocket URLs
- `API_ENDPOINTS` - API route paths

### Environment
**File**: `src/config/env.ts`

**Function**: `getResolvedGeminiApiKey()` - API key resolution

### Conversation Phrases
**File**: `src/core/chat/conversation-phrases.ts`

**Export**: `PHRASE_BANK` - Pre-defined conversation phrases

### Chat Constants
**File**: `src/components/chat/constants/chatConstants.ts`

**Default suggestions, configurations, etc.**

---

## 🗺️ Conversational Flow Map

### Request Flow
```
User Input
  ↓
[useUnifiedChat.ts] sendMessage()
  ↓
POST /api/chat/unified
  ↓
[route.ts] POST handler
  ├─→ Rate limiting
  ├─→ Session resolution
  ├─→ Exit intent detection
  ├─→ Context gathering
  │   ├─→ [multimodal-context.ts] getContext()
  │   ├─→ [routeToAgent()] agent routing
  │   └─→ Intelligence context
  ├─→ System prompt generation
  ├─→ AI SDK streamText()
  │   ├─→ Model: gemini-2.5-flash-lite-latest
  │   ├─→ Tools: enable_voice, enable_screen_share, etc.
  │   └─→ Messages: formatted for AI SDK
  └─→ SSE Response Stream
      ↓
[useUnifiedChat.ts] runStream() processes SSE
      ↓
[LiveChatMessages.tsx] renders messages
```

### Context Building Flow
```
Session Start
  ↓
[multimodal-context.ts] initializeSession()
  ↓
User Message
  ↓
[multimodal-context.ts] addTextMessage()
  ├─→ Entity extraction
  ├─→ Topic extraction
  ├─→ Sentiment analysis
  └─→ Priority calculation
  ↓
Visual/Audio/Upload
  ↓
[multimodal-context.ts] addVisualContext() / addUploadContext()
  ├─→ Analysis storage
  └─→ Metadata tracking
  ↓
Before AI Generation
  ↓
[multimodal-context.ts] getContext()
  ├─→ Summarization if needed
  ├─→ Token counting
  └─→ Context compression
  ↓
Included in AI prompt
```

### Agent Routing Flow
```
Chat Message
  ↓
[route.ts] Context analysis
  ↓
[orchestrator.ts] routeToAgent()
  ├─→ Analyze conversation state
  ├─→ Check exit intents
  ├─→ Determine trigger
  └─→ Route to appropriate agent
      ├─→ Discovery Agent (DISCOVERY stage)
      ├─→ Summary Agent (SUMMARY stage)
      └─→ Default Agent
  ↓
Agent generates system prompt enhancement
  ↓
Included in streamText() call
```

---

## 📁 File Structure Summary

```
fbc-lab-v7/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   ├── unified/route.ts          # Main chat endpoint
│   │   │   ├── attachments/route.ts      # File uploads
│   │   │   └── transcribe/route.ts       # Voice transcription
│   │   ├── intelligence/                 # Intelligence APIs
│   │   └── analytics/                    # Analytics endpoints
│   └── chat/page.tsx                     # Chat UI page
│
├── src/
│   ├── components/
│   │   ├── agent-ui/
│   │   │   └── app/
│   │   │       └── LiveChatMessages.tsx   # Message rendering
│   │   ├── chat/
│   │   │   ├── hooks/
│   │   │   │   ├── useChatIntelligence.ts
│   │   │   │   └── useConversationFlow.ts
│   │   │   ├── artifacts/                # Artifact components
│   │   │   └── constants/                # Chat constants
│   │   └── ai-elements/                  # AI Elements framework
│   │
│   ├── core/
│   │   ├── agents/
│   │   │   ├── orchestrator.ts           # Agent routing
│   │   │   ├── discovery-agent.ts        # Discovery logic
│   │   │   ├── summary-agent.ts         # Summary generation
│   │   │   └── types.ts                 # Agent types
│   │   ├── chat/
│   │   │   ├── state/
│   │   │   │   └── unified-chat-store.ts # Zustand store
│   │   │   ├── conversation-phrases.ts   # Phrase bank
│   │   │   └── unified-types.ts         # Type definitions
│   │   ├── context/
│   │   │   ├── multimodal-context.ts     # Context manager
│   │   │   ├── context-storage.ts        # Persistence
│   │   │   ├── context-types.ts          # Context types
│   │   │   └── context-summarizer.ts     # Context compression
│   │   └── intelligence/
│   │       └── providers/
│   │           └── search/
│   │               └── google-grounding.ts
│   │
│   ├── hooks/
│   │   ├── useUnifiedChat.ts            # Main chat hook
│   │   ├── useRealtimeVoice.ts          # Voice hook
│   │   └── useLiveApi.ts                # Live API wrapper
│   │
│   ├── types/
│   │   └── core.ts                      # Core type definitions
│   │
│   └── config/
│       ├── constants.ts                 # App constants
│       └── env.ts                       # Environment config
│
└── logs/                                # JSONL log files
    ├── chat/
    ├── live/
    ├── webcam/
    ├── screen/
    └── document/
```

---

## 🔗 Key Dependencies

### External Packages
- `ai` - AI SDK (Vercel)
- `@ai-sdk/google` - Google/Gemini adapter
- `zod` - Schema validation
- `zustand` - State management

### Internal Dependencies
- `@/core/*` - Core business logic
- `@/lib/*` - Shared utilities
- `@/components/*` - UI components
- `@/types/*` - Type definitions

---

## 📊 Log Locations

### Transcript Logs (Past 2 Days)
- **Chat**: `logs/chat/chat-20251027.jsonl`, `chat-20251028.jsonl`, `chat-20251029.jsonl`
- **Voice**: `logs/client-live/client-live-20251027.jsonl`, `client-live-20251028.jsonl`, `client-live-20251029.jsonl`
- **Webcam**: `logs/webcam/webcam-20251027.jsonl`, `webcam-20251028.jsonl`
- **Screen Share**: `logs/screen/screen-20251028.jsonl`
- **Documents**: `logs/document/document-20251024.jsonl`

### Session Transcripts
- `session-transcript-7cca2496.json` - Session metadata
- `session-transcript-7cca2496-FULL-RAW.jsonl` - Full raw transcript

---

## 🎯 Quick Reference

### Start a Chat
1. Component calls `useUnifiedChat({ sessionId })`
2. Hook initializes state from `unified-chat-store.ts`
3. User types message → `sendMessage()` called
4. POST to `/api/chat/unified` with messages & context
5. API builds context via `multimodalContextManager.getContext()`
6. Routes to agent via `routeToAgent()`
7. Calls AI SDK `streamText()` with context
8. Streams SSE response back to client
9. Hook processes SSE and updates state
10. UI re-renders via `LiveChatMessages` component

### Add Multimodal Context
1. User shares screen/webcam/uploads document
2. API endpoint processes (e.g., `/api/tools/screen`)
3. Calls `multimodalContextManager.addVisualContext()` or `addUploadContext()`
4. Context stored in memory (session-scoped)
5. Next chat message includes visual context automatically
6. AI receives enriched context for response

### Agent Routing
1. Message received by `/api/chat/unified`
2. Calls `routeToAgent({ messages, context })`
3. Orchestrator analyzes conversation state
4. Determines stage (DISCOVERY, SUMMARY, etc.)
5. Routes to appropriate agent
6. Agent enhances system prompt
7. Enhanced prompt used in `streamText()` call

---

**Document Generated**: October 29, 2025  
**Repository**: `github.com/iamfarzad/fbc-lab-v7`  
**Branch**: `main`

