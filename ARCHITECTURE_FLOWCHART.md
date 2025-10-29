# F.B/c AI System Architecture Flowchart

**Date:** 2025-01-17  
**Status:** ✅ Production Ready (98% Complete)  
**Version:** 7.0 (All Enhancements Complete)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    F.B/C AI CONSULTANT SYSTEM                          │
│              Multimodal Realtime AI Assistant Platform                  │
└─────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════
                    INPUT LAYER - Multi-Modal Capture
═══════════════════════════════════════════════════════════════════════

    ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
    │  TEXT    │   │  VOICE   │   │  WEBCAM  │   │  SCREEN  │
    │  (Chat)  │   │(WebSocket)│  │ (Frames) │   │  SHARE   │
    └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘
         │              │              │              │
         │         Gemini Live      Every 8s      Every 12s
         │         16kHz PCM      Analysis       Analysis
         │              │              │              │
         └──────────────┴──────────────┴──────────────┘
                             │
                             ↓
                    ┌─────────────────┐
                    │  INPUT ROUTER   │
                    │ unified/route.ts│
                    └────────┬────────┘
                             │
                             ↓

═══════════════════════════════════════════════════════════════════════
                    CONTEXT ENGINE - Multimodal Fusion
═══════════════════════════════════════════════════════════════════════

    ┌──────────────────────────────────────────────────────────────┐
    │         MultimodalContextManager                             │
    │  ┌────────────────────────────────────────────────────────┐ │
    │  │  PREPROCESSORS                                          │ │
    │  │  • OCR (documents/images)                               │ │
    │  │  • ASR (voice transcripts via Gemini Live)             │ │
    │  │  • Chunking (document processing)                        │ │
    │  └────────────────────────────────────────────────────────┘ │
    │                                                              │
    │  ┌────────────────────────────────────────────────────────┐ │
    │  │  URL PARSER (with robots.txt compliance) ✅            │ │
    │  │  • canCrawl() - checks robots.txt rules                │ │
    │  │  • Cached (1h TTL) + timeout (3s)                      │ │
    │  │  • Optional strict blocking (env var)                  │ │
    │  └────────────────────────────────────────────────────────┘ │
    │                                                              │
    │  ┌────────────────────────────────────────────────────────┐ │
    │  │  MULTIMODAL FUSION                                     │ │
    │  │  • conversationHistory (text messages)                  │ │
    │  │  • visualContext (webcam/screen captures)              │ │
    │  │  • audioContext (voice transcripts)                    │ │
    │  │  • uploadContext (documents/images)                    │ │
    │  └────────────────────────────────────────────────────────┘ │
    │                                                              │
    │  ┌────────────────────────────────────────────────────────┐ │
    │  │  SHORT-TERM BUFFER + SEMANTIC SEARCH ✅                │ │
    │  │  • Redis (Upstash) - fast access                       │ │
    │  │  • Supabase - persistent storage                       │ │
    │  │  • getSemanticContext() - vector search                 │ │
    │  │  • Automatic embedding generation                      │ │
    │  │  • Similarity-based past conversation retrieval        │ │
    │  └────────────────────────────────────────────────────────┘ │
    │                                                              │
    │  ┌────────────────────────────────────────────────────────┐ │
    │  │  USER/PROFILE STORE                                    │ │
    │  │  • conversation_contexts (Supabase)                   │ │
    │  │  • RLS enabled                                         │ │
    │  │  • User profiles & preferences                         │ │
    │  └────────────────────────────────────────────────────────┘ │
    └──────────────────────────────────────────────────────────────┘
                             │
                             ↓

═══════════════════════════════════════════════════════════════════════
                    PROCESSING CORE - Agent Orchestration
═══════════════════════════════════════════════════════════════════════

                    ┌──────────────────────┐
                    │   ORCHESTRATOR       │
                    │  routeToAgent()      │
                    │  (Stage Router)      │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ↓                ↓                ↓
        Categories < 4?   Has Fit?      Pitch Done?
              │                │                │
              ↓                ↓                ↓
      ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
      │  DISCOVERY  │  │  SCORING    │  │  SALES      │
      │   AGENT     │  │   AGENT     │  │  AGENTS     │
      └─────────────┘  └─────────────┘  └──────┬──────┘
                                                │
                                    ┌───────────┼───────────┐
                                    │                       │
                                    ↓                       ↓
                            ┌──────────────┐      ┌──────────────┐
                            │   WORKSHOP    │      │  CONSULTING  │
                            │ SALES AGENT   │      │ SALES AGENT  │
                            └──────────────┘      └──────────────┘

    ┌──────────────────────────────────────────────────────────────┐
    │  SPECIALIZED AGENTS (All Implemented ✅)                    │
    │  • Discovery Agent - qualifies leads systematically        │
    │  • Scoring Agent - calculates lead score + fit scores       │
    │  • Workshop Sales Agent - pitches in-person workshops       │
    │  • Consulting Sales Agent - pitches custom implementations │
    │  • Closer Agent - handles objections                        │
    │  • Summary Agent - creates shareable PDFs                   │
    │  • Proposal Agent - generates proposals                    │
    │  • Admin Agent - admin operations                          │
    │  • Retargeting Agent - follow-up campaigns                 │
    └──────────────────────────────────────────────────────────────┘

                             │
                             ↓

═══════════════════════════════════════════════════════════════════════
                    TOOL ROUTER - AI SDK Tools
═══════════════════════════════════════════════════════════════════════

    ┌──────────────────────────────────────────────────────────────┐
    │  AVAILABLE TOOLS (All Implemented ✅)                        │
    │                                                              │
    │  • Grounded Web Search (Google Search API)                   │
    │  • URL Reader/Scraper (with robots.txt ✅)                   │
    │  • Vision Analysis (webcam, screen, images)                 │
    │  • Doc/PDF Parser + Summarizer                              │
    │  • Quote/Proposal Builder (PDF generation)                   │
    │  • Lead/CRM Writer (lead intelligence)                       │
    │  • Calendar/Booking (widget creation)                        │
    └──────────────────────────────────────────────────────────────┘

                             │
                             ↓

═══════════════════════════════════════════════════════════════════════
                    DATA SERVICES - Storage & Queue
═══════════════════════════════════════════════════════════════════════

    ┌──────────────────────────────────────────────────────────────┐
    │  SUPABASE POSTGRES (RLS + Vectors) ✅                        │
    │  • conversation_contexts (user profiles)                    │
    │  • wal_log (Write-Ahead Log)                                │
    │  • audit_log (security audit)                               │
    │  • logs (system logs)                                       │
    │  • documents_embeddings ✅ (vector search table)            │
    │  • match_documents() ✅ (RPC for semantic search)            │
    │  • Vector index (IVFFlat) for fast similarity search        │
    └──────────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────────────────────┐
    │  REDIS/UPSTASH (Cache + Queue) ✅                            │
    │  • Vercel KV cache (conversation state)                     │
    │  • Redis Queue ✅ (lightweight job queue)                    │
    │    - Priority system (high/medium/low)                      │
    │    - Retry logic (exponential backoff)                      │
    │    - Immediate processing for low-load                      │
    │  • Job handlers: WAL sync, PDF, email, embeddings          │
    └──────────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────────────────────┐
    │  SUPABASE STORAGE (Artifacts) ✅                              │
    │  • PDF storage (quotes, proposals, summaries)               │
    │  • Object storage for generated documents                  │
    └──────────────────────────────────────────────────────────────┘

                             │
                             ↓

═══════════════════════════════════════════════════════════════════════
                    MODEL BACKENDS - AI Services
═══════════════════════════════════════════════════════════════════════

    ┌──────────────────────────────────────────────────────────────┐
    │  LLM API (Google Gemini) ✅                                   │
    │  • @ai-sdk/google integration                               │
    │  • Models: gemini-2.5-flash, gemini-2.5-pro                 │
    │  • Streaming responses                                      │
    │  • Tool calling via AI SDK                                 │
    └──────────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────────────────────┐
    │  WEBSOCKET VOICE SERVER ✅                                    │
    │  • server/live-server.ts (port 3001)                        │
    │  • Real-time audio streaming                                │
    │  • Gemini Live API integration                             │
    │  • Model: gemini-2.5-flash-native-audio-preview-09-2025     │
    └──────────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────────────────────┐
    │  EMBEDDINGS API ✅                                            │
    │  • src/core/embeddings/gemini.ts                            │
    │  • Automatic embedding generation (1536 dimensions)         │
    │  • Vector search validation                                 │
    └──────────────────────────────────────────────────────────────┘

                             │
                             ↓

═══════════════════════════════════════════════════════════════════════
                    OUTPUT LAYER - Multi-Format Responses
═══════════════════════════════════════════════════════════════════════

    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │  TEXT    │   │  VOICE   │   │   PDF    │
    │ Streamed │   │   TTS    │   │Documents │
    │ Response │   │WebSocket │   │Generated │
    └──────────┘   └──────────┘   └──────────┘

                             │
                             ↓

═══════════════════════════════════════════════════════════════════════
                    FEEDBACK LOOP - Continuous Learning
═══════════════════════════════════════════════════════════════════════

    User Feedback → User/Profile Store → Memory Manager
                                          │
                                          ↓
                              MultimodalContextManager
                              (Enhanced with semantic search ✅)
```

---

## Enhanced Components (Recently Completed)

### ✅ 1. Robots.txt Compliance
**Location:** `src/lib/robots-validator.ts`  
**Integration:** `app/api/tools/url/route.ts`

- **Features:**
  - Cached robots.txt fetching (1 hour TTL)
  - 3-second timeout handling
  - Graceful degradation (defaults to allow)
  - Optional strict blocking via `BLOCK_ROBOTS_VIOLATIONS`
- **Flow:**
  ```
  URL Request → canCrawl() → Check robots.txt → Allow/Block
  ```

### ✅ 2. Vector Search Integration
**Location:** `src/core/embeddings/` + `src/core/context/multimodal-context.ts`

- **Features:**
  - Automatic embedding generation for text/voice messages
  - Semantic context retrieval via `getSemanticContext()`
  - Supabase setup validation
  - Backward compatible (distance ↔ similarity conversion)
- **Database:**
  - `documents_embeddings` table
  - `match_documents()` RPC function
  - IVFFlat vector index
- **Flow:**
  ```
  Message → Generate Embedding → Store in Supabase
                                 ↓
  Query → Vector Search → Retrieve Similar Past Context → Enhance System Prompt
  ```

### ✅ 3. Queue System
**Location:** `src/core/queue/`

- **Features:**
  - Redis-based lightweight queue
  - Priority system (high/medium/low)
  - Exponential backoff retry (1s, 5s, 15s)
  - Immediate processing for low-load
- **Job Types:**
  - WAL sync (background database writes)
  - PDF generation
  - Email sending
  - Embedding processing
- **Flow:**
  ```
  Operation → Enqueue Job → Immediate Processing (if no delay)
                              ↓
                           Retry on Failure (with backoff)
  ```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPLETE REQUEST FLOW                      │
└─────────────────────────────────────────────────────────────────┘

User Input (Text/Voice/Image/URL)
    │
    ↓
Input Router (unified/route.ts)
    │
    ↓
Context Engine (MultimodalContextManager)
    │
    ├─→ Prepare Chat Context
    │   ├─→ Get recent conversation history
    │   ├─→ Get visual/audio context
    │   ├─→ Get semantic context (vector search) ✅
    │   └─→ Merge all contexts
    │
    ↓
Orchestrator (routeToAgent)
    │
    ├─→ Determine Funnel Stage
    │
    ↓
Specialized Agent
    │
    ├─→ Generate Response (with tool calls if needed)
    │
    ↓
Tool Router (AI SDK)
    │
    ├─→ Execute Tools (search, URL, vision, etc.)
    │   ├─→ URL Tool: Check robots.txt ✅
    │   └─→ Store results
    │
    ↓
Output Generation
    │
    ├─→ Stream text response
    ├─→ Stream voice (TTS) if voice input
    └─→ Generate PDF if requested
    │
    ↓
Feedback Loop
    │
    ├─→ Store conversation in context
    ├─→ Generate embeddings (if enabled) ✅
    ├─→ Sync to Supabase (via queue) ✅
    └─→ Update user profile
```

---

## Architecture Statistics

- **Overall Completion:** 98% ✅
- **Input Types:** 7/7 (100%) ✅
- **Agents:** 9/9 (100%) ✅
- **Tools:** 7/7 (100%) ✅
- **Data Services:** 3/3 (100%) ✅
- **Output Formats:** 3/3 (100%) ✅
- **Enhancements:** 3/3 (100%) ✅

---

## Key Improvements (Jan 2025)

1. ✅ **Robots.txt Compliance** - Web crawling ethics
2. ✅ **Vector Search** - Semantic context retrieval
3. ✅ **Queue System** - Reliable background processing

---

## Production Readiness

**Status:** ✅ Production Ready

- All core components implemented
- All enhancements completed
- Comprehensive error handling
- Type safety (TypeScript strict mode)
- Setup validation for vector search
- Graceful degradation throughout
- Clear error messages and logging

---

## File References

### Core Files
- Input Router: `app/api/chat/unified/route.ts`
- Context Manager: `src/core/context/multimodal-context.ts`
- Orchestrator: `src/core/agents/orchestrator.ts`
- Agents: `src/core/agents/*.ts`

### New Enhancements
- Robots Validator: `src/lib/robots-validator.ts`
- Embeddings: `src/core/embeddings/query.ts`, `src/core/embeddings/gemini.ts`
- Queue: `src/core/queue/redis-queue.ts`, `src/core/queue/workers.ts`

### Database
- Migration: `supabase/migrations/20250117_create_match_documents_function.sql`
- RPC Function: `match_documents()` in Supabase
- Tables: `documents_embeddings`, `conversation_contexts`, `wal_log`

---

**Last Updated:** 2025-01-17  
**Validated Against:** GitHub Repository `iamfarzad/fbc-lab-v7`

