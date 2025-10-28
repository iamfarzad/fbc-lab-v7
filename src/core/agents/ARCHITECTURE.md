# Multi-Agent Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     F.B/C MULTI-AGENT SYSTEM                    │
│                    Multimodal Sales Funnel AI                   │
└─────────────────────────────────────────────────────────────────┘

╔═══════════════════════════════════════════════════════════════╗
║  LAYER 1: MULTIMODAL INPUT CAPTURE                            ║
╚═══════════════════════════════════════════════════════════════╝

    ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
    │  VOICE   │   │  SCREEN  │   │  WEBCAM  │   │   TEXT   │
    │ (WebRTC) │   │  SHARE   │   │ (Camera) │   │  (Chat)  │
    └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘
         │              │              │              │
    Gemini Live    Every 8s        Every 12s      Direct
    16kHz PCM      Analysis        Analysis       Input
         │              │              │              │
         └──────────────┴──────────────┴──────────────┘
                        │
                        ↓
              multimodalContextManager
         ┌────────────────────────────────┐
         │ • conversationHistory          │
         │ • visualContext (screen/webcam)│
         │ • audioContext (transcripts)   │
         │ • uploadContext (documents)    │
         └────────────────────────────────┘

╔═══════════════════════════════════════════════════════════════╗
║  LAYER 2: INTELLIGENCE & CONTEXT                              ║
╚═══════════════════════════════════════════════════════════════╝

    Terms Accept → Lead Intelligence Research (Background)
         │
         ├─→ LinkedIn Profile
         ├─→ Company Enrichment
         ├─→ Industry Analysis
         ├─→ Tech Stack Detection
         │
         ↓
    Intelligence Context Stored
         ├─→ Role/Seniority
         ├─→ Company Size/Industry
         ├─→ Budget Signals
         └─→ Pain Points Inferred

╔═══════════════════════════════════════════════════════════════╗
║  LAYER 3: ORCHESTRATOR (Funnel State Machine)                ║
╚═══════════════════════════════════════════════════════════════╝

                   User Message
                        │
                        ↓
              ┌─────────────────┐
              │  ORCHESTRATOR   │
              │ (Stage Router)  │
              └────────┬────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ↓              ↓              ↓
   Categories     Has Fit        Pitch
   < 4 ?         Scores?       Delivered?
        │              │              │
        ↓              ↓              ↓
   DISCOVERY      SCORING    WORKSHOP_PITCH
                             CONSULTING_PITCH
                                   │
                                   ↓
                              No Booking?
                                   │
                                   ↓
                               CLOSING

╔═══════════════════════════════════════════════════════════════╗
║  LAYER 4: SPECIALIZED AGENTS                                  ║
╚═══════════════════════════════════════════════════════════════╝

┌────────────────────────────────────────────────────────────────┐
│ 1. DISCOVERY AGENT                                             │
│    Model: gemini-2.5-flash                                     │
│    Context: Intelligence + Conversation Flow + Multimodal      │
│                                                                │
│    Input:  "What do you do?"                                   │
│    Output: "Hey John, I see you're at Acme Corp in healthcare. │
│            What's prompting you to look at AI right now?"      │
│                                                                │
│    Systematically covers:                                      │
│    [Goals] [Pain] [Data] [Readiness] [Budget] [Success]       │
│      ✓      ✓      ✗        ✗         ✗        ✗             │
│    Next: "Where does your customer data live right now?"       │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ 2. SCORING AGENT                                               │
│    Model: gemini-2.5-flash                                     │
│    Triggered: 4+ categories covered                            │
│                                                                │
│    Calculates:                                                 │
│    • Role (C-level = 30pts) + Company (Enterprise = 25pts)    │
│    • Conversation (6 cats = 25pts) + Budget (timeline = 15pts)│
│    • Multimodal: Voice +10, Screen +15, Webcam +5, Docs +10   │
│                                                                │
│    Output: Lead Score: 85/100                                  │
│            Workshop Fit: 30%, Consulting Fit: 90%              │
│    → Routes to Consulting Sales Agent                          │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ 3. WORKSHOP SALES AGENT                                        │
│    Model: gemini-2.5-flash                                     │
│    Target: Mid-market, managers, $5K-$15K                      │
│    Tools: create_chart, create_calendar_widget                 │
│                                                                │
│    Pitch: "Your team struggles with manual reporting.          │
│           We run hands-on workshops where they learn to        │
│           automate that. [Chart: $50K productivity gains]      │
│           [Calendar: Book workshop consultation]"              │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ 4. CONSULTING SALES AGENT                                      │
│    Model: gemini-2.5-flash                                     │
│    Target: C-level, enterprise, $50K+                          │
│    Tools: create_chart, create_calendar_widget                 │
│                                                                │
│    Pitch: "When you showed me your dashboard, I saw manual     │
│           processes costing you $200K/year. We'd build a       │
│           custom AI system to automate that entirely.          │
│           [Chart: ROI projection] [Calendar: Strategy call]"   │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ 5. CLOSER AGENT                                                │
│    Model: gemini-2.5-flash                                     │
│    Triggered: Interest but no booking                          │
│                                                                │
│    Objection: "Too expensive..."                               │
│    Response: "This pays for itself in 3 months [chart].        │
│              You experienced our AI firsthand - voice,         │
│              screen share, real-time. This is what we build.   │
│              Next slot: [calendar]"                            │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ 6. SUMMARY AGENT                                               │
│    Model: gemini-2.5-pro                                       │
│    Triggered: Conversation ends                                │
│                                                                │
│    Analyzes:                                                   │
│    • Full conversation (all 6 categories)                      │
│    • Voice transcripts (12 min conversation)                   │
│    • Screen captures (dashboard showing revenue drop)          │
│    • Uploaded docs (business plan reviewed)                    │
│                                                                │
│    Generates:                                                  │
│    → JSON summary                                              │
│    → PDF via Puppeteer                                         │
│    → Email with attachment + calendar link                     │
└────────────────────────────────────────────────────────────────┘

╔═══════════════════════════════════════════════════════════════╗
║  LAYER 5: DELIVERY & NURTURE                                  ║
╚═══════════════════════════════════════════════════════════════╝

    Summary PDF Emailed → Lead Nurtured
         │
         ├─→ High Score (>70) + No Booking
         │   → Follow-up in 3 days (urgency)
         │
         ├─→ Email Failed + Retries < 3
         │   → Retry in 1 hour
         │
         └─→ Low Score (<40)
             → Nurture campaign (monthly)
```

---

## 🔄 Example Conversation Flow

```
USER: "Hi, what do you do?"
├─→ Orchestrator: Stage = DISCOVERY (0 categories covered)
├─→ Discovery Agent: "Hey Sarah, I see you're at Acme Corp in healthcare.
│                     What's prompting you to look at AI right now?"
└─→ Headers: X-Agent-Used: Discovery Agent, X-Funnel-Stage: DISCOVERY

USER: "We're spending too much time on manual data entry"
├─→ Discovery Agent: (Pain category covered ✓)
└─→ "Where does your customer data live right now? CRM, spreadsheets?"

USER: "Mostly Excel sheets"
├─→ Discovery Agent: (Data category covered ✓)
└─→ "If this works, what would success look like for you? Time saved? Revenue?"

USER: "We could reallocate 3 FTEs if this worked"
├─→ Discovery Agent: (Success category covered ✓)
└─→ "Let's talk timeline - is this 'needed yesterday' or 'do it right this quarter'?"

USER: "We need it by Q2"
├─→ Discovery Agent: (Budget category covered ✓ - 4 total)
├─→ Orchestrator: Stage = SCORING
├─→ Scoring Agent: Calculates score
│   • Role: Manager (10pts)
│   • Company: Mid-market (15pts)
│   • Conversation: 4 categories (15pts)
│   • Budget: Timeline urgency (15pts)
│   • Total: 55/100
│   • Fit: Workshop 0.8, Consulting 0.4
├─→ Orchestrator: Stage = WORKSHOP_PITCH
└─→ Workshop Agent: "So you mentioned 3 FTEs tied up in data entry.
                     We run hands-on workshops where your team learns to
                     automate that. For healthcare, we focus on HIPAA-compliant
                     automation. [create_chart: ROI] Want to explore this?"

USER: "Sounds interesting but we're tight on budget"
├─→ Orchestrator: Stage = CLOSING (interest but hesitation)
└─→ Closer Agent: "I get it - but consider: automating data entry pays for
                   the workshop in 2 months. [chart: payback analysis]
                   Plus you experienced AI in this chat. This is what we teach.
                   Next workshop: 3 weeks. [calendar]"

USER: "Let me think about it and get back to you"
├─→ Orchestrator: Trigger = conversation_end
├─→ Summary Agent: Analyzes conversation
│   → Generates PDF with:
│      • Executive summary
│      • Pain: Manual data entry (3 FTEs)
│      • Solution: Workshop ($8K-$12K)
│      • ROI: Payback in 2 months
│      • Next steps: Book call
└─→ Email sent: "Your AI Strategy Summary - Acme Corp"
    Attachment: FB-c_Summary_Acme_Corp.pdf
```

---

## 🎯 The Multi-Agent Advantage

### **Before (Single-Agent):**
```
Monolithic prompt (2000+ tokens):
"You are F.B/c AI. You can:
- Qualify leads
- Pitch workshops
- Pitch consulting
- Handle objections
- Do research
- Analyze screen shares
- [20 more capabilities...]

Tools available:
1. enable_voice
2. enable_screen_share
3. enable_webcam
4. create_calendar_widget
5. create_chart
6. search_web
7. capture_screen_snapshot
8. capture_webcam_snapshot
9. [10+ more tools...]"

Result: Tool confusion, generic responses, high token cost
```

### **After (Multi-Agent):**
```
Discovery Agent (500 tokens):
"You are a lead qualification specialist.
Ask about goals, pain, data, readiness, budget, success.
No tools needed - just conversation."

Result: Focused questions, follows conversation flow, -60% tokens

Workshop Agent (600 tokens):
"You are a workshop sales specialist.
Pitch training for mid-market companies.
Tools: create_chart, create_calendar_widget"

Result: Targeted pitch, relevant tools only, -40% tokens
```

**Total savings: ~32% across conversation**

---

## 📊 Metrics to Track

### **Agent Performance**
```typescript
// In admin dashboard:
SELECT 
  agent_used,
  COUNT(*) as conversations,
  AVG(lead_score) as avg_score,
  SUM(CASE WHEN calendar_booked THEN 1 ELSE 0 END)::float / COUNT(*) as conversion_rate
FROM conversations
WHERE agent_used IS NOT NULL
GROUP BY agent_used
ORDER BY conversion_rate DESC

/*
Expected results:
agent_used              | conversations | avg_score | conversion_rate
------------------------|---------------|-----------|----------------
Consulting Sales Agent  |     45        |   82.3    |     0.42
Workshop Sales Agent    |    123        |   68.5    |     0.35
Discovery Agent         |    234        |   55.2    |     0.18
*/
```

### **Multimodal Impact**
```typescript
// Track multimodal engagement bonus
SELECT 
  CASE 
    WHEN screen_share_used THEN 'Screen Share'
    WHEN voice_used THEN 'Voice Only'
    ELSE 'Text Only'
  END as engagement_type,
  AVG(lead_score) as avg_score,
  AVG(conversion_rate) as avg_conversion
FROM conversations
GROUP BY engagement_type

/*
Expected:
Screen Share users: 85 avg score, 50% conversion
Voice users: 72 avg score, 35% conversion
Text users: 58 avg score, 20% conversion
*/
```

---

## 🔧 Configuration

### **Environment Variables**

```bash
# Required (existing)
GEMINI_API_KEY=your_key

# Enable multi-agent (new)
ENABLE_MULTI_AGENT=true

# Optional: Agent-specific overrides
DISCOVERY_MODEL=gemini-2.5-flash
SCORING_MODEL=gemini-2.5-flash
SALES_MODEL=gemini-2.5-flash
SUMMARY_MODEL=gemini-2.5-pro
```

### **Runtime Configuration**

```typescript
// In orchestrator.ts, you can adjust:

// Minimum categories for scoring
const MIN_CATEGORIES_FOR_SCORING = 4

// Fit score thresholds
const WORKSHOP_FIT_THRESHOLD = 0.7
const CONSULTING_FIT_THRESHOLD = 0.7

// Agent selection priority
// If both fit scores > threshold, consulting takes precedence
```

---

## 🎓 Understanding the Agents

### **Discovery Agent - The Qualifier**
**Job:** Extract information systematically  
**Success:** All 6 categories covered with evidence  
**Handoff:** To Scoring Agent when 4+ categories covered

### **Scoring Agent - The Evaluator**
**Job:** Calculate value and fit  
**Success:** Accurate lead score + correct fit determination  
**Handoff:** To Workshop or Consulting Agent based on fit

### **Sales Agents - The Closers**
**Job:** Pitch the right product  
**Success:** Calendar widget clicked  
**Handoff:** To Closer Agent if interest but no booking

### **Closer Agent - The Negotiator**
**Job:** Overcome objections  
**Success:** Booking secured or high-quality follow-up scheduled  
**Handoff:** None (end of chat flow)

### **Summary Agent - The Documenter**
**Job:** Create shareable summary  
**Success:** Professional PDF that leads share internally  
**Handoff:** Email delivery system

---

## 🚧 Known Limitations

1. **Tools not fully integrated yet**
   - Agents define tools but execution needs artifact system integration
   - Currently tools are recognized but not fully executed
   - Phase 2 work

2. **Admin & Retargeting agents not implemented**
   - Planned for future phases
   - Architecture supports easy addition

3. **Server directory type errors**
   - Pre-existing, not related to multi-agent system
   - Won't affect runtime

4. **No real-time agent switching**
   - Stage changes happen between messages
   - Could enhance to switch mid-response

---

## 🎁 The Magic Moments

### **When Screen Share + Discovery Combine:**
```
User shares screen showing Excel dashboard
↓
Discovery Agent: "I see you're tracking 10K records in Excel - 
                 how long does it take your team to process those each week?"
↓
User: "About 20 hours of manual work"
↓
Discovery Agent: "And if we could cut that to 2 hours with AI, 
                 what would your team do with that freed-up time?"
```

**This is GOLD for sales - you're seeing AND discussing their pain.**

### **When Multimodal Becomes the Close:**
```
Closer Agent: "Look - you've experienced our AI capabilities firsthand 
               in this conversation. We had a voice discussion, I analyzed 
               your dashboard in real-time, I understood your business plan.
               This is exactly what we build for clients.
               
               You don't need to take my word for it - you just used it."
```

**The demo IS the product.**

---

## 📈 Success Metrics (Target vs Baseline)

| Metric | Baseline | Target | Strategy |
|--------|----------|--------|----------|
| **Conversion Rate** | 15% | 30% | Specialist agents + systematic discovery |
| **Token Cost per Lead** | 19K | 13K | Focused prompts per agent |
| **Discovery Quality** | 60% | 90% | Conversation flow tracking |
| **Multimodal Adoption** | 40% | 60% | Natural integration by agents |
| **Screen Share Conversion** | 30% | 50% | +15 points bonus = priority |
| **Lead Score Accuracy** | 70% | 85% | Multimodal data improves scoring |

---

## 🏁 Ready to Test

**To enable:**
```bash
echo "ENABLE_MULTI_AGENT=true" >> .env.local
pnpm dev
```

**To verify:**
```bash
# Open browser console during chat
# Look for: "🤖 [Multi-Agent] Routing..."
# Check headers: X-Agent-Used, X-Funnel-Stage
```

**Branch:** `multi-agent` (5 commits, 1008 lines of agent code)  
**Status:** ✅ Ready for testing  
**Next:** Enable flag and test discovery flow

---

## 🎭 Stage Visualization & Agent Transparency

### **Unified Branding Principle**
All agents present to users as **"F.B/c AI"** - never by their specialized names. Users should experience a cohesive, intelligent assistant that seamlessly transitions between capabilities rather than being aware of multiple agents switching.

### **Transparency Through Metadata**
While users see unified branding, transparency is achieved through rich metadata visualization:

```typescript
// Agent metadata flows from backend to UI components
interface AgentMetadata {
  agent: string;           // "Discovery Agent", "Scoring Agent", etc.
  stage: string;           // "DISCOVERY", "SCORING", "WORKSHOP_PITCH"
  chainOfThought: string;  // Agent's reasoning process
  contextUsage: {          // Token/context consumption
    usedTokens: number;
    maxTokens: number;
    usage: number;
  };
  tools: ToolUsage[];      // Tools activated by agent
  artifacts: Artifact[];   // Charts, calendars created
  sources: Source[];       // References used
}
```

### **Stage Visualization Component**
```tsx
// Located at: /src/components/ai-elements/StageVisualization.tsx
<StageVisualization 
  currentStage="DISCOVERY" 
  agentName="Discovery Agent"
  description="Qualifying your business needs and understanding goals"
  progress={{
    completed: ["Goals", "Pain Points"],
    current: "Data Infrastructure", 
    remaining: ["Readiness", "Budget", "Success Metrics"]
  }}
/>
```

**Visual Design:**
- **Progress Bar**: Shows discovery completeness (2/6 categories covered)
- **Stage Badge**: "Discovery Phase" (user-friendly, not "Discovery Agent")  
- **Current Focus**: "Understanding your data infrastructure"
- **Subtle Indicator**: Small icon showing multimodal capabilities active

### **User Experience Examples**

#### **Discovery Phase Transparency**
```
┌─────────────────────────────────────────────┐
│ F.B/c AI                              🔊 🖥️ │
├─────────────────────────────────────────────┤
│ Discovery Phase (2/6 complete)              │
│ ▓▓░░░░ Understanding your business needs    │
│                                             │
│ "So you mentioned manual data entry is      │  
│  taking up 3 FTEs. Where does your         │
│  customer data live right now?"             │
│                                             │
│💭 Reasoning: Need to understand data       │
│    infrastructure before proposing         │
│    automation solutions                     │
└─────────────────────────────────────────────┘
```

#### **Transition Transparency**  
```
┌─────────────────────────────────────────────┐
│ F.B/c AI                              🔊 🖥️ │
├─────────────────────────────────────────────┤
│ Analysis Phase                              │
│ ▓▓▓▓▓▓ Evaluating solution fit             │
│                                             │
│ 📊 Lead Analysis Complete                   │
│ • Role: Manager (10 pts)                    │
│ • Company: Mid-market (15 pts)              │
│ • Discovery: 4/6 categories (15 pts)       │
│ • Workshop Fit: 85% | Consulting: 40%      │
│                                             │
│ "Based on what you've shared, I think       │
│  our workshop approach would be perfect..." │
└─────────────────────────────────────────────┘
```

### **AI Elements Integration**

The `/src/components/ai-elements/` directory contains specialized UI components that visualize agent metadata:

#### **Context Component** 
Shows token usage and multimodal context integration
```tsx
<Context 
  tokenUsage="2,341 / 8,192 tokens"
  modalitiesActive={["voice", "screen"]}
  contextSources={["conversation", "screen_analysis", "voice_transcript"]}
/>
```

#### **ChainOfThought Component**
Reveals agent reasoning (expandable/collapsible)
```tsx
<ChainOfThought reasoning="User mentioned 3 FTEs on data entry. This indicates manual process pain. Need to quantify time investment before proposing automation ROI." />
```

#### **Tool Component**
Shows when agents activate capabilities
```tsx
<Tool 
  name="create_chart" 
  status="generating"
  description="Creating ROI projection chart"
/>
```

#### **Artifact Component**  
Displays agent-generated content
```tsx
<Artifact 
  type="chart"
  title="Data Entry Automation ROI"
  data={chartData}
  generated_by="Workshop Sales Agent"
/>
```

### **Stage Descriptions (User-Friendly)**

Instead of technical agent names, show business value:

| Technical Stage | User-Friendly Display | Description |
|----------------|----------------------|-------------|
| `DISCOVERY` | **Discovery Phase** | "Understanding your business needs and goals" |
| `SCORING` | **Analysis Phase** | "Evaluating solution fit for your situation" |
| `WORKSHOP_PITCH` | **Solution Design** | "Designing training approach for your team" |
| `CONSULTING_PITCH` | **Custom Solution** | "Architecting enterprise AI implementation" |
| `CLOSING` | **Proposal Finalization** | "Addressing questions and finalizing details" |
| `SUMMARY` | **Conversation Summary** | "Preparing your personalized AI strategy report" |

### **Metadata Flow Architecture**

```typescript
// 1. Agent generates response with metadata
const response = {
  content: "Based on your Excel dashboard...",
  metadata: {
    agent: "Workshop Sales Agent",
    stage: "WORKSHOP_PITCH", 
    chainOfThought: "User showed manual Excel process. Workshop targets exactly this use case.",
    contextUsage: { usedTokens: 1205, maxTokens: 8192 },
    tools: [{ name: "create_chart", status: "pending" }]
  }
}

// 2. Unified chat API preserves metadata
POST /api/chat/unified
Headers: { "x-session-id": "session-123" }

// 3. Frontend receives structured metadata
const { message, metadata } = await response.json()

// 4. LiveChatMessages.tsx renders ai-elements
{metadata.agent && (
  <StageVisualization 
    stage={metadata.stage}
    agent={metadata.agent}
    description={getStageDescription(metadata.stage)}
  />
)}
{metadata.chainOfThought && (
  <ChainOfThought reasoning={metadata.chainOfThought} />
)}
```

### **Benefits of This Approach**

✅ **Unified Experience**: Users interact with "F.B/c AI", not fragmented agents  
✅ **Full Transparency**: All agent decisions/reasoning visible via UI components  
✅ **Progress Clarity**: Users understand what phase they're in and why  
✅ **Trust Building**: Seeing the "thinking" process builds confidence  
✅ **Debugging**: Developers can trace agent behavior through metadata  
✅ **Optimization**: Clear metrics on which agents/stages convert best

### **Implementation Status**

- ✅ **Backend**: Agent metadata generation implemented
- ✅ **API**: Metadata preservation through unified chat endpoint  
- ✅ **Components**: AI elements library created (`/src/components/ai-elements/`)
- ⚠️ **Integration**: Stage visualization component needs creation
- ⚠️ **Rendering**: Agent/stage metadata not fully rendered in `LiveChatMessages.tsx`
- ⚠️ **Session Coordination**: Voice and chat need unified `sessionId` for context sharing

### **Next Steps for Full Transparency**

1. **Create Stage Visualization Component**
   ```bash
   # Create the missing component
   touch /src/components/ai-elements/StageVisualization.tsx
   ```

2. **Update LiveChatMessages.tsx**
   ```tsx
   // Add stage/agent rendering alongside existing metadata
   {metadata.stage && metadata.agent && (
     <StageVisualization 
       stage={metadata.stage}
       agent={metadata.agent} 
       description={getStageDescription(metadata.stage)}
     />
   )}
   ```

3. **Fix Session ID Coordination**
   - Ensure voice and chat share same `sessionId`
   - Fix multimodal context integration
   - Complete webcam analysis storage

**The goal**: Users experience seamless F.B/c AI while having full visibility into the sophisticated multi-agent orchestration happening behind the scenes.
