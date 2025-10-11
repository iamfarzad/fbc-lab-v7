# F.B/C Multi-Agent System

This directory contains the multi-agent orchestration system for the F.B/c sales funnel.

## Architecture

The system uses specialized AI agents to handle different stages of the sales funnel:

```
User → Orchestrator → [Specialized Agent] → Response
         ↓
    Funnel Stage
    Determination
```

## Agents

### 1. **Discovery Agent** (`discovery-agent.ts`)
- **Purpose**: Systematically qualifies leads through conversation
- **Model**: `gemini-2.5-flash`
- **Covers 6 Categories**:
  1. Goals - What they're trying to achieve
  2. Pain - What's broken/frustrating
  3. Data - Where their data lives
  4. Readiness - Team buy-in signals
  5. Budget - Timeline and investment range
  6. Success - Metrics that matter
- **Multimodal-Aware**: References voice, screen share, webcam, uploads naturally
- **Output**: Focused questions based on conversation flow

### 2. **Scoring Agent** (`scoring-agent.ts`)
- **Purpose**: Calculate lead score (0-100) and fit scores
- **Model**: `gemini-2.5-flash`
- **Scoring Criteria**:
  - Role seniority (30 points)
  - Company size (25 points)
  - Conversation quality (25 points)
  - Budget signals (20 points)
  - **Multimodal bonuses**:
    - Voice: +10 points
    - Screen share: +15 points (high intent)
    - Webcam: +5 points
    - Uploads: +10 points
- **Output**: Lead score + workshop/consulting fit scores

### 3. **Workshop Sales Agent** (`workshop-sales-agent.ts`)
- **Purpose**: Pitch in-person AI workshops
- **Model**: `gemini-2.5-flash`
- **Target**: Mid-size companies, team leads, $5K-$15K budget
- **Tools**:
  - `create_chart`: ROI visualization
  - `create_calendar_widget`: Booking embed
- **Output**: Workshop pitch with embedded tools

### 4. **Consulting Sales Agent** (`consulting-sales-agent.ts`)
- **Purpose**: Pitch custom AI implementations
- **Model**: `gemini-2.5-flash`
- **Target**: C-level/VPs, enterprise, $50K+ budget
- **Tools**:
  - `create_chart`: Cost savings visualization
  - `create_calendar_widget`: Strategy call booking
- **Output**: Consulting pitch with ROI data

### 5. **Closer Agent** (`closer-agent.ts`)
- **Purpose**: Handle objections and final push to booking
- **Model**: `gemini-2.5-flash`
- **Trigger**: Interest shown but no calendar click
- **Tactics**:
  - Objection handling ("too expensive", "need to think")
  - Uses multimodal experience as proof
  - Creates urgency
- **Output**: Objection responses + final CTA

### 6. **Summary Agent** (`summary-agent.ts`)
- **Purpose**: Post-conversation analysis for PDF generation
- **Model**: `gemini-2.5-pro` (needs reliability)
- **Trigger**: Conversation ends (goodbye, timeout, limits)
- **Analyzes**:
  - Full conversation history
  - All multimodal interactions
  - Discovery findings
  - Lead score
- **Output**: Structured JSON for PDF generation

## Orchestrator (`orchestrator.ts`)

The orchestrator routes conversations to the appropriate agent based on funnel stage:

### Funnel Stage Determination

```typescript
DISCOVERY         → Less than 4 categories covered
SCORING           → 4+ categories covered, no fit score yet
WORKSHOP_PITCH    → Workshop fit > 0.7
CONSULTING_PITCH  → Consulting fit > 0.7
CLOSING           → Pitch delivered but no booking
SUMMARY           → Conversation ended
```

### Features

- **Automatic routing**: Determines stage from conversation state
- **Context preservation**: All agents share multimodal context
- **Usage tracking**: Enforces session limits
- **Error handling**: Falls back gracefully on agent failures

## Usage

### Enable Multi-Agent System

Set environment variable:

```bash
ENABLE_MULTI_AGENT=true
```

### In Code

```typescript
import { routeToAgent } from '@/core/agents'

const result = await routeToAgent({
  messages: chatMessages,
  context: {
    sessionId: 'session-123',
    intelligenceContext: { /* lead data */ },
    conversationFlow: { /* 6 categories */ },
    voiceActive: false
  },
  trigger: 'chat' // or 'voice' | 'conversation_end'
})

// result.output: Agent's response
// result.agent: Which agent handled it
// result.metadata: Stage, scores, etc.
```

## Integration

The system integrates with:

- **`/app/api/chat/unified/route.ts`**: Main chat endpoint
- **`multimodalContextManager`**: Shared context across all agents
- **`usageLimiter`**: Cost protection (50 messages, 10 min voice, etc.)
- **`conversationFlow`**: 6-category discovery tracking
- **Intelligence context**: Lead research from LinkedIn/company enrichment

## Benefits vs Single-Agent

| Aspect | Single-Agent | Multi-Agent |
|--------|-------------|-------------|
| **Tools** | 10+ tools always visible | 2-3 tools per specialist |
| **Context** | 2000+ token prompts | 500-800 token focused prompts |
| **Cost** | Uses Pro for all queries | Flash for 90%, Pro for summary |
| **Quality** | Generic responses | Specialist expertise |
| **Routing** | LLM decides (slow) | Stage-based (instant) |
| **Token Cost** | Baseline | -25% estimated |

## Testing

### Manual Testing

```bash
# Enable multi-agent
export ENABLE_MULTI_AGENT=true

# Start dev server
pnpm dev

# Chat should now use multi-agent system
# Check console for: "🤖 [Multi-Agent] Routing to..."
```

### Check Agent Used

Response headers include:
- `X-Agent-Used`: Which agent handled the request
- `X-Funnel-Stage`: Current stage (DISCOVERY, SCORING, etc.)

## Monitoring

Track these metrics:
- **Routing accuracy**: % routed to correct agent (manual audit)
- **Token savings**: Compare total tokens vs single-agent baseline
- **Conversion rate**: % of qualified leads booking calls
- **Multimodal engagement**: % using voice/screen/webcam

## Future Enhancements

- [ ] Admin AI Agent (semantic search across conversations)
- [ ] Proposal Agent (formal consulting quotes)
- [ ] Retargeting Agent (automated follow-ups)
- [ ] A/B testing framework (multi-agent vs single-agent)
- [ ] Real-time agent switching during conversation
