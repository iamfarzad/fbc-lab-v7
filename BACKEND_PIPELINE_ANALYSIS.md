# Backend Pipeline Analysis & Agent Placement Validation

## Current Architecture

```
flowchart TD
  A[Client] --> B[Input Router]
  
  subgraph Inputs
    C1[Chat] --> B
    C2["Voice<br/>(Mic to STT)"] --> B
    C3["Webcam<br/>(frames)"] --> B
    C4["Screen/Docs<br/>(PDF, files)"] --> B
    C5[Image Upload] --> B
    C6["URL in Chat<br/>(auto-fetch)"] --> B
  end
  
  B --> D[Context Engine]
  
  subgraph D2[Context Engine]
    D21["Preprocessors<br/>(OCR, ASR, chunking)"]
    D22["URL Fetch + Parser<br/>(HTML to text, robots-aware)"]
    D23[Multimodal Fusion]
    D24["Short-term Buffer<br/>(turn context window)"]
    D25[User/Profile Store]
  end
  
  D -->|normalized context| E[Processing Core]
  
  subgraph E2[Processing Core]
    E21[Orchestrator]
    E22["Specialized Agents<br/>(DISCOVERY, SCORING, SALES, CLOSER, SUMMARY)"]
    E23[Tool Router]
    E24[Memory Manager]
  end
  
  E23 --> T1[Grounded Web Search]
  E23 --> T2[URL Reader/Scraper]
  E23 --> T3["Vision Analysis<br/>(images/webcam/screens)"]
  E23 --> T4[Doc/PDF Parser + Summarizer]
  E23 --> T5[Quote/Proposal Builder]
  E23 --> T6[Lead/CRM Writer]
  E23 --> T7[Calendar/Booking]
  
  E24 --- S1[("Supabase Postgres<br/>RLS + vectors")]
  E24 --- S2[("Object store<br/>artifacts")]
  
  E2 --- Q[(Queue/Jobs)]
  E2 --- LOG[Analytics/Logs]
  
  E21 --> M1[LLM API]
  C2 --> WS[(WebSocket Voice Server)]
  WS --> M2["Live Model<br/>(TTS+LLM)"]
  M2 --> VOUT[Audio Stream]
  
  E2 --> O[Output]
  O --> O1[Text]
  O --> O2[Voice TTS]
  O --> O3["Visual PDF<br/>(quote, recap)"]
  VOUT --> O2
  
  O --> F[User Feedback]
  F --> D25
  F --> E24
```

## Question

**Where do you place the agents? Analyze and validate.**

## Validation Result: ✅ CORRECT

**Agent Placement: AFTER Context Engine, BEFORE Output**

### Current Implementation

**Location:** `src/core/agents/orchestrator.ts`

**Flow:**
```
Input Router → Context Engine → Orchestrator → Agent → Output
```

### Why This Placement Works

#### 1. **Context-Prepared Input**
Agents receive enriched context from the Context Engine:
- Normalized multimodal data (voice, visual, uploads)
- Past conversation history
- Semantic search results (vector similarity)
- User profile/preferences

```typescript:151:156:src/core/agents/orchestrator.ts
// Build enhanced context for agent
const enhancedContext: AgentContext = {
  ...context,
  multimodalContext,
  stage
}
```

#### 2. **Orchestrator as Stage Router**
Agents are selected based on funnel progression:

```typescript:279:337:src/core/agents/orchestrator.ts
function determineFunnelStage({
  conversationFlow,
  intelligenceContext,
  trigger,
  override
}: {
  conversationFlow?: any
  intelligenceContext?: any
  trigger?: string
  override?: FunnelStage
}): FunnelStage {
  // Override takes precedence
  if (override) return override;
  // Admin queries
  if (trigger === 'admin') return 'ADMIN'

  // Conversation ended
  if (trigger === 'conversation_end') return 'SUMMARY'

  // Explicit proposal request
  if (trigger === 'proposal_request') return 'PROPOSAL'

  // Scheduled retargeting
  if (trigger === 'retargeting') return 'RETARGETING'

  // Discovery phase - if less than 4 categories covered
  if (!conversationFlow || Object.values(conversationFlow.covered).filter(Boolean).length < 4) {
    return 'DISCOVERY'
  }

  // Scoring phase - 4+ categories covered, but no fit score yet
  if (!intelligenceContext?.fitScore) {
    return 'SCORING'
  }

  // Closing phase - pitch delivered but no booking (check this FIRST)
  if (intelligenceContext.pitchDelivered && !intelligenceContext.calendarBooked) {
    return 'CLOSING'
  }

  // Sales pitch phase - fit determined
  const { workshop, consulting } = intelligenceContext.fitScore
  if (workshop > consulting && workshop > 0.7) {
    return 'WORKSHOP_PITCH'
  }
  if (consulting > workshop && consulting > 0.7) {
    return 'CONSULTING_PITCH'
  }

  // If fit scores are low or equal, stay in discovery
  if (workshop < 0.7 && consulting < 0.7) {
    return 'DISCOVERY'
  }

  // Default back to discovery
  return 'DISCOVERY'
}
```

#### 3. **Agent Execution Flow**

```typescript:161:243:src/core/agents/orchestrator.ts
switch (stage) {
  case 'DISCOVERY':
    result = await discoveryAgent(messages, enhancedContext)
    break

  case 'SCORING':
    result = await scoringAgent(messages, enhancedContext)
    // Update intelligence context with scores
    if (result.metadata?.leadScore && context.intelligenceContext) {
      context.intelligenceContext.leadScore = result.metadata.leadScore
      context.intelligenceContext.fitScore = result.metadata.fitScore
    }
    // After scoring, immediately route to sales
    const nextStage = determineFunnelStage({
      conversationFlow: context.conversationFlow,
      intelligenceContext: context.intelligenceContext,
      trigger
    })
    if (nextStage !== 'SCORING') {
      // Re-route to sales agent
      return routeToAgent({ messages, context: { ...context, stage: nextStage }, trigger })
    }
    break

  case 'WORKSHOP_PITCH':
    result = await workshopSalesAgent(messages, enhancedContext)
    break

  case 'CONSULTING_PITCH':
    result = await consultingSalesAgent(messages, enhancedContext)
    break

  case 'CLOSING':
    result = await closerAgent(messages, enhancedContext)
    break

  case 'SUMMARY':
    result = await summaryAgent(messages, enhancedContext)
    break

  case 'PROPOSAL':
    result = await proposalAgent(messages, enhancedContext)
    break

  case 'ADMIN':
    result = await adminAgent(messages, {
      sessionId: context.sessionId || 'admin',
      adminId: context.intelligenceContext?.email
    })
    break

  case 'RETARGETING':
    // Retargeting is typically triggered by scheduled jobs, not chat
    result = await retargetingAgent(messages, enhancedContext)
    break

  case 'BOOKING_REQUESTED':
    {
      const booking: AgentResult = {
        output: "Perfect! I'll open our calendar. Pick a time that works for you.",
        agent: 'Booking Agent',
        metadata: {
          stage: 'BOOKING_REQUESTED' as FunnelStage,
          triggerBooking: true,
          action: 'show_calendar_widget',
        },
      }
      result = booking
    }
    break

  case 'FORCE_EXIT':
    result = await summaryAgent(messages, enhancedContext)
    break

  default:
    // Fallback to discovery
    result = await discoveryAgent(messages, enhancedContext)
}
```

### Architectural Validation

#### ✅ Correct Design Decisions

1. **Separation of Concerns**
   - Context Engine prepares data
   - Orchestrator routes based on stage
   - Agents execute specialized logic
   - Tools are capabilities, not agents

2. **Dependency Flow**
   - Agents depend on enriched context
   - Context Engine is dependency-free
   - Proper layering: Input → Context → Process → Output

3. **Tool Accessibility**
   - Tools are invoked BY agents (not separate agents)
   - Correct flow: Agent → Tool Router → Tool execution
   - Tools sit at same level as agents in Processing Core

#### ⚠️ Notes on Current Architecture

1. **Voice Path is Parallel**
   - Voice (Gemini Live) routes through `server/live-server.ts`
   - Bypasses orchestrator for real-time audio
   - Still receives context, just different transport
   - This is intentional and correct

2. **Lead Intelligence is Separate**
   - Runs async after terms acceptance
   - Independent of main chat flow
   - Feeds intelligence context into agents
   - Correct architecture for background enrichment

3. **Tool vs Agent Distinction**
   The diagram confusingly lists tools in the agent section. Clarification:
   - **Agents**: Orchestrator → discovery/scoring/sales agents
   - **Tools**: Agent → Tool Router → search/url/vision/pdf/calendar tools

### Recommended Pipeline Flow

```
┌─────────────────────────────────────────┐
│           INPUT LAYER                   │
│  Chat/Voice/Webcam/Screen/Docs/URL     │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│         CONTEXT ENGINE                  │
│  • Preprocessors (OCR, ASR, chunking)   │
│  • URL Parser (robots.txt compliant)    │
│  • Multimodal Fusion                    │
│  • Short-term Buffer + Semantic Search  │
│  • User/Profile Store                   │
└────────────┬────────────────────────────┘
             ↓ normalized context
┌─────────────────────────────────────────┐
│        PROCESSING CORE                  │
│  ┌──────────────┐                       │
│  │ ORCHESTRATOR │                       │
│  │ Stage Router │                       │
│  └──────┬───────┘                       │
│         ↓                                │
│  ┌──────────────┐                       │
│  │    AGENTS    │                       │
│  │  Discovery   │                       │
│  │  Scoring     │                       │
│  │  Sales       │                       │
│  │  Closer      │                       │
│  │  Summary     │                       │
│  └──────┬───────┘                       │
│         ↓                                │
│  ┌──────────────┐                       │
│  │ TOOL ROUTER  │                       │
│  │ (if needed)  │                       │
│  └──────┬───────┘                       │
│         ↓                                │
│  ┌──────────────┐                       │
│  │    TOOLS     │                       │
│  │  Search      │                       │
│  │  URL         │                       │
│  │  Vision      │                       │
│  │  PDF/Calendar│                       │
│  └──────────────┘                       │
│                                         │
│  ┌──────────────┐                       │
│  │  MEMORY      │                       │
│  │  MANAGER     │                       │
│  └──────┬───────┘                       │
└─────────┼───────────────────────────────┘
          ↓
    ┌─────────────┐
    │   OUTPUT    │
    │ Text/Voice  │
    │    PDF      │
    └─────────────┘
```

### Conclusion

**Agent placement is CORRECT. They belong in Processing Core, after Context Engine, before Output.**

This architecture provides:
- ✅ Clean data preparation before agent execution
- ✅ Context-aware agent selection via orchestrator
- ✅ Separation of routing logic from agent logic
- ✅ Tools accessible by agents when needed
- ✅ Memory/feedback loop properly managed

No changes needed to current architecture.

---

## 🔍 GAP ANALYSIS

### Critical Gaps Identified

#### 1. **Agent Result Persistence ❌ MISSING**

**Issue:** Agent output updates conversation flow and intelligence context, but those updates aren’t written to Supabase.

**Current Flow:**
```typescript:953:957:app/api/chat/unified/route.ts
const agentResult = await routeToAgent({
  messages: aiMessages,
  context: agentContext,
  trigger: context?.voiceActive ? 'voice' : 'chat'
})
```

**What's Missing:**
```typescript
// After agent execution, we need:
await contextStorage.update(sessionId, {
  conversation_flow: {
    // Update categories covered based on agent output
  },
  intelligence_context: {
    lead_score: agentResult.metadata?.leadScore,
    fit_score: agentResult.metadata?.fitScore,
    pitch_delivered: agentResult.metadata?.stage === 'WORKSHOP_PITCH' || agentResult.metadata?.stage === 'CONSULTING_PITCH'
  }
})
```

**Location:** `app/api/chat/unified/route.ts` line 957

**Impact:** High - Conversation state is lost between sessions

---

#### 2. **Tool Execution Feedback Loop ⚠️ PARTIAL**

**Current State:** Tool calls are tracked in context but not persisted.

```typescript:452:478:src/core/context/multimodal-context.ts
async addToolCallToLastTurn(sessionId: string, toolCall: { name: string; args: Record<string, any>; id?: string }): Promise<void> {
  const context = await this.getOrCreateContext(sessionId)
  
  if (!context.conversationTurns) {
    context.conversationTurns = []
  }

  // Add as a separate turn or attach to last AI turn
  const lastTurn = context.conversationTurns[context.conversationTurns.length - 1]
  
  if (lastTurn && lastTurn.role === 'agent' && !lastTurn.isFinal) {
    // Attach tool call to in-progress AI turn
    lastTurn.toolCall = toolCall
  } else {
    // Create new turn for tool call
    context.conversationTurns.push({
      role: 'agent',
      text: `[Tool: ${toolCall.name}]`,
      isFinal: true,
      timestamp: new Date().toISOString(),
      toolCall
    })
  }

  context.metadata.lastUpdated = new Date().toISOString()
  await this.saveContext(sessionId, context)
}
```

**What's Missing:** Tool execution results aren’t written to the DB.

**Impact:** Medium - Tool usage data is missing for analytics

---

#### 3. **Agent Trigger Event Logging ❌ MISSING**

**Issue:** Agent routing decisions aren’t logged.

**What's Needed:**
```typescript
// After line 957 in unified/route.ts
await auditLogger.log({
  event: 'agent_routed',
  sessionId,
  agent: agentResult.agent,
  stage: agentResult.metadata?.stage,
  trigger,
  metadata: {
    categories_covered: conversationFlow?.covered,
    lead_score: context.intelligenceContext?.leadScore,
    fit_scores: context.intelligenceContext?.fitScore
  }
})
```

**Impact:** Medium - Limited observability into agent behavior

---

#### 4. **Voice → Agent Context Integration ⚠️ WEAK**

**Issue:** Voice path (`server/live-server.ts`) doesn’t share context with agents.

**Current:** Voice has its own context management.

**What's Needed:**
```typescript
// In server/live-server.ts, after receiving transcript
await multimodalContextManager.addConversationTurn(sessionId, {
  role: 'user',
  text: transcript,
  isFinal: true,
  modality: 'voice'
})

// Then trigger agent routing
const agentResult = await routeToAgent({
  messages: [...existingMessages, { role: 'user', content: transcript }],
  context: agentContext,
  trigger: 'voice'
})
```

**Impact:** High - Voice and chat are disconnected

---

#### 5. **Conversation Flow State Updates ❌ MISSING**

**Issue:** Discovery Agent updates aren’t persisted.

**Current:**
```typescript:169:172:src/core/agents/orchestrator.ts
if (result.metadata?.leadScore && context.intelligenceContext) {
  context.intelligenceContext.leadScore = result.metadata.leadScore
  context.intelligenceContext.fitScore = result.metadata.fitScore
}
```

**What's Missing:**
```typescript
// Update database
await contextStorage.update(sessionId, {
  intelligence_context: context.intelligenceContext
})

// Also track conversation flow
const conversationFlow = await updateConversationFlow(
  sessionId, 
  discoveryAgent.detectCategories(result.output)
)
```

**Impact:** High - Progress isn’t tracked

---

### Priority Fixes

#### **HIGH PRIORITY**

1. Persist agent results (orchestrator.ts:169-172) → `contextStorage.update()`
2. Update conversation flow after each agent execution
3. Connect voice transcripts to agent routing

#### **MEDIUM PRIORITY**

4. Log agent routing decisions to audit_log
5. Persist tool execution results to database
6. Track agent performance metrics

#### **LOW PRIORITY**

7. Agent-level caching
8. Agent switching mid-response
9. Real-time analytics dashboard

---

### Recommended Implementation Order

1. **Week 1:** Fix #1 (Agent Result Persistence)
2. **Week 1:** Fix #5 (Conversation Flow Updates)
3. **Week 2:** Fix #3 (Voice Integration)
4. **Week 2:** Fix #4 (Logging)
5. **Week 3:** Fix #2 (Tool Execution)
6. **Week 4:** Analytics/metrics

---

### Implementation Example

**File:** `app/api/chat/unified/route.ts`

```typescript
// After line 957 (after agentResult received)

// PERSIST AGENT RESULTS
if (sessionId !== 'anonymous' && agentResult.metadata) {
  try {
    const { contextStorage } = await import('@/core/context/context-storage')
    const storage = new contextStorage()
    
    // Update intelligence context
    if (agentResult.metadata.leadScore || agentResult.metadata.fitScore) {
      await storage.update(sessionId, {
        intelligence_context: {
          ...context.intelligenceContext,
          leadScore: agentResult.metadata.leadScore,
          fitScore: agentResult.metadata.fitScore
        }
      })
    }
    
    // Track pitch delivery
    if (agentResult.metadata.stage === 'WORKSHOP_PITCH' || 
        agentResult.metadata.stage === 'CONSULTING_PITCH') {
      await storage.update(sessionId, {
        intelligence_context: {
          ...context.intelligenceContext,
          pitchDelivered: true,
          pitchType: agentResult.metadata.stage
        }
      })
    }
    
    console.log('✅ Agent results persisted')
  } catch (error) {
    console.error('Failed to persist agent results:', error)
  }
}
```

---

## ✅ Implementation Complete

**Date Completed:** January 31, 2025

### Agent Result Persistence - COMPLETED

All planned features have been implemented with production-ready safeguards:

#### Core Implementation Files:

1. **`src/core/agents/agent-persistence.ts`** - AgentPersistenceService
2. **`src/core/context/context-storage.ts`** - `updateWithVersionCheck()` method
3. **`src/core/agents/orchestrator.ts`** - Persistence integration (lines 258-272)
4. **`src/core/context/context-types.ts`** - New agent tracking fields
5. **`supabase/migrations/20250131_add_agent_fields.sql`** - Schema migration
6. **`src/core/queue/workers.ts`** - Retry & analytics workers
7. **Tests:** `tests/backend/agent-persistence.spec.ts`, `tests/flows/agent-persistence-flow.spec.ts`

#### Production Features:

✅ Race condition prevention (optimistic locking)  
✅ Idempotent retries (event deduplication)  
✅ PII protection (hashing/masking)  
✅ Timeout protection (80ms sync limit)  
✅ Redis fallback (24h TTL)  
✅ Dead letter queue (max 5 retries)  
✅ Metrics logging  

**Status: Production-Ready** 🚀

---

## ✅ All Gaps Fixed - Complete Implementation Summary

**Date Completed:** January 31, 2025

### All Priority Fixes Implemented:

#### HIGH PRIORITY (All Complete ✅)

1. ✅ **Agent Result Persistence** (Week 1)
   - Hybrid sync/async persistence model
   - Optimistic locking for race conditions
   - Retry logic with dead letter queue
   - Redis fallback for reliability
   
2. ✅ **Conversation Flow Updates** (Week 1)
   - Hybrid client/server flow detection
   - Enhanced flow from agent reasoning
   - Server-side persistence via orchestrator
   - SSE events for real-time updates

3. ✅ **Voice → Agent Integration** (Week 2)
   - Voice server syncs to orchestrator at milestones
   - Turn tracking (3, 8, 13, 18...)
   - System prompt parity (branding, guidance, context)
   - Visual "F.B/c AI is analyzing..." indicator

#### MEDIUM PRIORITY (All Complete ✅)

4. ✅ **Agent Logging** (Week 2)
   - Structured routing decision logging
   - Stage transition tracking
   - Performance metrics (duration, success/failure)
   - Audit log integration with new event types

5. ✅ **Tool Execution Logging** (Week 3)
   - Unified tool execution layer
   - Retry logic (3 attempts, exponential backoff)
   - Redis caching for idempotent operations
   - Performance metrics per tool

6. ✅ **Agent Performance Metrics** (Week 4)
   - Agent analytics service
   - Tool analytics service
   - System health monitoring
   - Analytics dashboard UI

### Files Created/Modified:

**New Files:**
- `src/core/agents/agent-persistence.ts` - Agent persistence service
- `src/core/tools/tool-executor.ts` - Tool execution wrapper
- `src/core/tools/types.ts` - Tool execution types
- `src/core/analytics/tool-analytics.ts` - Tool metrics service
- `src/components/admin/AgentAnalyticsPanel.tsx` - Analytics UI
- `app/api/admin/analytics/route.ts` - Analytics API endpoint
- `supabase/migrations/20250131_add_agent_fields.sql` - Agent tracking migration
- `supabase/migrations/20250131_tool_execution.sql` - Tool tracking migration

**Modified Files:**
- `src/core/agents/orchestrator.ts` - Added persistence & logging
- `src/core/security/audit-logger.ts` - Added agent & tool logging methods
- `src/core/agents/consulting-sales-agent.ts` - Wrapped tools with executor
- `src/core/agents/workshop-sales-agent.ts` - Wrapped tools with executor
- `src/core/agents/closer-agent.ts` - Wrapped tools with executor
- `src/core/context/context-storage.ts` - Added version-based optimistic locking
- `src/core/context/context-types.ts` - Added agent tracking fields
- `src/core/queue/workers.ts` - Added retry & analytics handlers
- `src/components/admin/AdminDashboard.tsx` - Integrated analytics panel
- `server/live-server.ts` - Voice orchestrator sync & logging
- `env.production.example` - Added tool & analytics environment variables

### Key Features Delivered:

**Observability:**
- Real-time analytics dashboard in admin panel
- Agent performance tracking (success rate, latency)
- Tool usage statistics (cache hit rate, execution time)
- Funnel progression visualization
- System health monitoring

**Reliability:**
- Automatic retry logic for transient failures
- Optimistic locking prevents race conditions
- Redis fallback ensures data durability
- Dead letter queue for failed retries
- Idempotent operations prevent duplicates

**Performance:**
- Tool result caching (5min TTL) reduces duplicate calls
- Async analytics processing (non-blocking)
- Efficient query patterns with proper indexes
- Structured logging with minimal overhead

### Environment Variables Added:

```bash
# Agent Audit
ENABLE_AGENT_AUDIT=false  # Enable in production

# Tool Execution
ENABLE_TOOL_CACHING=true
TOOL_RETRY_MAX=3

# Analytics
ANALYTICS_REFRESH_INTERVAL=30000  # 30 seconds
```

### Next Steps:

1. **Test in Production:**
   - Enable `ENABLE_AGENT_AUDIT=true`
   - Monitor analytics dashboard
   - Verify tool execution logs

2. **Monitor:**
   - Check error rates weekly
   - Review funnel conversion metrics
   - Optimize slow agents/tools

3. **Enhance:**
   - Add alerts for high error rates
   - Export analytics to CSV
   - Historical trend charts

---

**🎉 All backend pipeline gaps addressed. System is production-ready with full observability and reliability.**

