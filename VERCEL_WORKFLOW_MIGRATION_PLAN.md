# Vercel Workflow Migration Plan for F.B/c Multiagent System

## Executive Summary

This document analyzes the current F.B/c multiagent architecture and provides a comprehensive migration plan to replace it with Vercel Workflow. The current system uses a sophisticated multiagent orchestration pattern with specialized agents for lead qualification, scoring, and sales, all coordinated through a central orchestrator.

## Current Architecture Analysis

### 1. Multiagent System Overview

The F.B/c system implements a **5-layer multimodal sales funnel AI**:

```
┌─────────────────────────────────────────────────────────────────┐
│                     F.B/C MULTI-AGENT SYSTEM                    │
│                    Multimodal Sales Funnel AI                   │
└─────────────────────────────────────────────────────────────────┘

Layer 1: MULTIMODAL INPUT CAPTURE
├── Voice (WebRTC) - Gemini Live 16kHz PCM
├── Screen Share - Every 8s Analysis  
├── Webcam (Camera) - Every 12s Analysis
└── Text (Chat) - Direct Input

Layer 2: INTELLIGENCE & CONTEXT
├── Lead Intelligence Research (Background)
├── LinkedIn Profile Analysis
├── Company Enrichment
├── Industry Analysis
└── Tech Stack Detection

Layer 3: ORCHESTRATOR (Funnel State Machine)
├── Stage Determination Logic
├── Agent Routing
└── Context Preservation

Layer 4: SPECIALIZED AGENTS
├── Discovery Agent (6-category qualification)
├── Scoring Agent (0-100 lead scoring)
├── Workshop Sales Agent (mid-market pitch)
├── Consulting Sales Agent (enterprise pitch)
├── Closer Agent (objection handling)
└── Summary Agent (post-conversation analysis)

Layer 5: DELIVERY & NURTURE
├── PDF Generation
├── Email Automation
└── Follow-up Campaigns
```

### 2. Key Components

#### A. Orchestrator (`src/core/agents/orchestrator.ts`)
- **Purpose**: Routes conversations to specialized agents based on funnel stage
- **Logic**: State machine determining which agent to use
- **Context**: Preserves multimodal context across handoffs
- **Usage Limits**: Enforces quotas and rate limiting

#### B. Specialized Agents
1. **Discovery Agent** (`discovery-agent.ts`)
   - Systematically covers 6 categories: goals, pain, data, readiness, budget, success
   - Multimodal-aware (references voice, screen, webcam, uploads)
   - Exit detection and booking triggers

2. **Scoring Agent** (`scoring-agent.ts`)
   - Calculates lead score (0-100) based on role, company, conversation quality
   - Multimodal bonuses: voice (+10), screen (+15), webcam (+5), uploads (+10)
   - Determines fit scores for workshop vs consulting

3. **Sales Agents** (`workshop-sales-agent.ts`, `consulting-sales-agent.ts`)
   - Target-specific pitches based on fit scores
   - Tool integration: create_chart, create_calendar_widget
   - Multimodal context integration

4. **Closer Agent** (`closer-agent.ts`)
   - Handles objections and hesitation
   - Uses multimodal context for persuasion

5. **Summary Agent** (`summary-agent.ts`)
   - Post-conversation analysis
   - PDF generation via Puppeteer
   - Email automation

#### C. Multimodal Context Manager (`src/core/context/multimodal-context.ts`)
- **Purpose**: Centralized context management across all modalities
- **Storage**: Redis (active) + Supabase (archived)
- **Features**: PII detection, audit logging, conversation summarization
- **Integration**: Works with all agents and voice system

#### D. Voice System (`src/hooks/useRealtimeVoice.ts`)
- **WebSocket**: Real-time voice communication
- **Live API**: Google Gemini Live integration
- **Audio Processing**: PCM16 encoding, AudioWorklet
- **Context Integration**: Voice transcripts stored in multimodal context

#### E. WebSocket Server (`server/live-server.ts`)
- **Purpose**: Handles real-time voice communication
- **Features**: Session management, context injection, tool calls
- **Integration**: Connects to multimodal context manager

### 3. Current Strengths

1. **Sophisticated State Management**: Funnel stages with clear transitions
2. **Multimodal Integration**: Seamless voice, screen, webcam, document handling
3. **Context Preservation**: Rich context maintained across agent handoffs
4. **Specialized Expertise**: Each agent optimized for specific tasks
5. **Real-time Processing**: WebSocket-based voice with Live API
6. **Comprehensive Logging**: Full audit trail and session tracking

### 4. Current Challenges

1. **Complexity**: 5-layer architecture with many moving parts
2. **State Management**: Manual state transitions and context passing
3. **Error Handling**: Distributed error handling across agents
4. **Testing**: Complex integration testing across agents
5. **Scaling**: Manual orchestration doesn't scale well
6. **Maintenance**: High coupling between agents and orchestrator

## Vercel Workflow Analysis

### 1. What is Vercel Workflow?

Vercel Workflow is a serverless workflow orchestration platform that allows you to:
- Define complex, multi-step processes as code
- Handle state management automatically
- Provide built-in retry logic and error handling
- Scale automatically based on demand
- Integrate with Vercel's ecosystem (Functions, Edge, etc.)

### 2. Key Capabilities

#### A. Workflow Definition
- **YAML/JSON Configuration**: Declarative workflow definitions
- **TypeScript Support**: Type-safe workflow development
- **Visual Designer**: Drag-and-drop workflow builder
- **Version Control**: Git-based workflow management

#### B. State Management
- **Automatic State**: Workflow state managed by platform
- **Persistence**: State survives function restarts
- **Sharing**: State accessible across workflow steps
- **Versioning**: State versioning and rollback

#### C. Error Handling & Retries
- **Built-in Retries**: Configurable retry policies
- **Error Recovery**: Automatic error handling and recovery
- **Dead Letter Queues**: Failed step handling
- **Monitoring**: Built-in observability

#### D. Integration
- **Vercel Functions**: Native integration with serverless functions
- **External APIs**: HTTP/Webhook integration
- **Database**: Direct database connections
- **Event Streaming**: Real-time event processing

### 3. Limitations for Current Use Case

1. **Real-time Requirements**: Not designed for real-time voice/WebSocket
2. **Multimodal Processing**: Limited support for complex multimodal workflows
3. **State Complexity**: May not handle complex conversation state well
4. **WebSocket Support**: No native WebSocket support
5. **Audio Processing**: No built-in audio processing capabilities

## Migration Strategy

### Phase 1: Assessment & Planning (Week 1-2)

#### 1.1 Feasibility Analysis
- **Voice System**: Keep WebSocket server for real-time voice
- **Multimodal Context**: Migrate to Vercel Workflow state management
- **Agent Logic**: Convert to workflow steps
- **Orchestration**: Replace with workflow engine

#### 1.2 Architecture Design
```
┌─────────────────────────────────────────────────────────────────┐
│                    VERCEL WORKFLOW ARCHITECTURE                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WebSocket     │    │  Vercel Workflow│    │  Multimodal     │
│   Server        │    │  Engine         │    │  Context        │
│   (Voice Only)  │    │  (Orchestration)│    │  (State)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Workflow Steps │
                    │  (Agents)       │
                    └─────────────────┘
```

### Phase 2: Core Migration (Week 3-6)

#### 2.1 Workflow Definition
```yaml
# fbc-sales-workflow.yaml
name: fbc-sales-funnel
version: 1.0.0
description: F.B/c multimodal sales funnel workflow

triggers:
  - type: webhook
    path: /api/workflow/trigger
    method: POST

steps:
  - id: receive-input
    type: function
    function: receive-multimodal-input
    timeout: 30s
    
  - id: load-context
    type: function
    function: load-conversation-context
    depends_on: [receive-input]
    
  - id: determine-stage
    type: function
    function: determine-funnel-stage
    depends_on: [load-context]
    
  - id: route-agent
    type: switch
    condition: ${steps.determine-stage.output.stage}
    cases:
      - case: DISCOVERY
        step: discovery-agent
      - case: SCORING
        step: scoring-agent
      - case: WORKSHOP_PITCH
        step: workshop-sales-agent
      - case: CONSULTING_PITCH
        step: consulting-sales-agent
      - case: CLOSING
        step: closer-agent
      - case: SUMMARY
        step: summary-agent
        
  - id: discovery-agent
    type: function
    function: discovery-agent
    depends_on: [route-agent]
    
  - id: scoring-agent
    type: function
    function: scoring-agent
    depends_on: [route-agent]
    
  - id: workshop-sales-agent
    type: function
    function: workshop-sales-agent
    depends_on: [route-agent]
    
  - id: consulting-sales-agent
    type: function
    function: consulting-sales-agent
    depends_on: [route-agent]
    
  - id: closer-agent
    type: function
    function: closer-agent
    depends_on: [route-agent]
    
  - id: summary-agent
    type: function
    function: summary-agent
    depends_on: [route-agent]
    
  - id: update-context
    type: function
    function: update-conversation-context
    depends_on: [route-agent]
    
  - id: send-response
    type: function
    function: send-response-to-client
    depends_on: [update-context]
```

#### 2.2 Agent Migration
Convert each agent to a Vercel Function:

```typescript
// app/api/workflow/agents/discovery-agent.ts
import { NextRequest } from 'next/server'
import { WorkflowContext } from '@vercel/workflow'

export async function discoveryAgent(
  request: NextRequest,
  context: WorkflowContext
) {
  const { messages, intelligenceContext, conversationFlow, multimodalContext } = 
    await context.getState('conversation')
    
  // Discovery agent logic (simplified)
  const systemPrompt = buildDiscoveryPrompt(
    intelligenceContext,
    conversationFlow,
    multimodalContext
  )
  
  const result = await generateText({
    model: google(GEMINI_MODELS.DEFAULT_CHAT),
    messages,
    system: systemPrompt,
    temperature: 0.7
  })
  
  // Update workflow state
  await context.setState('agent_result', {
    agent: 'Discovery Agent',
    output: result.text,
    metadata: {
      stage: 'DISCOVERY',
      categoriesCovered: calculateCategoriesCovered(conversationFlow)
    }
  })
  
  return { success: true }
}
```

#### 2.3 State Management Migration
Replace multimodal context manager with Vercel Workflow state:

```typescript
// app/api/workflow/state/conversation-context.ts
export class ConversationContextManager {
  constructor(private context: WorkflowContext) {}
  
  async loadContext(sessionId: string) {
    return await this.context.getState(`conversation:${sessionId}`)
  }
  
  async updateContext(sessionId: string, updates: any) {
    const current = await this.loadContext(sessionId)
    const updated = { ...current, ...updates }
    await this.context.setState(`conversation:${sessionId}`, updated)
  }
  
  async addMultimodalData(sessionId: string, data: any) {
    const context = await this.loadContext(sessionId)
    context.multimodalData = [...(context.multimodalData || []), data]
    await this.updateContext(sessionId, context)
  }
}
```

### Phase 3: Voice Integration (Week 7-8)

#### 3.1 WebSocket Server Adaptation
Keep WebSocket server for real-time voice, integrate with workflow:

```typescript
// server/live-server.ts (modified)
async function handleUserMessage(connectionId: string, ws: WebSocket, payload: any) {
  // ... existing voice processing ...
  
  // Trigger workflow instead of direct agent routing
  const workflowResponse = await fetch('/api/workflow/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: client.sessionId,
      messages: [{
        role: 'user',
        content: transcription,
        modality: 'voice'
      }],
      multimodalContext: client.latestContext
    })
  })
  
  const result = await workflowResponse.json()
  
  // Send response back to client
  safeSend(ws, JSON.stringify({
    type: MESSAGE_TYPES.TEXT,
    payload: { content: result.output }
  }))
}
```

#### 3.2 Workflow Trigger Endpoint
```typescript
// app/api/workflow/trigger/route.ts
import { Workflow } from '@vercel/workflow'

export async function POST(request: NextRequest) {
  const { sessionId, messages, multimodalContext } = await request.json()
  
  const workflow = new Workflow('fbc-sales-funnel')
  
  const result = await workflow.execute({
    sessionId,
    messages,
    multimodalContext,
    timestamp: new Date().toISOString()
  })
  
  return Response.json({
    output: result.output,
    agent: result.agent,
    metadata: result.metadata
  })
}
```

### Phase 4: Testing & Optimization (Week 9-10)

#### 4.1 Testing Strategy
1. **Unit Tests**: Each workflow step as individual function
2. **Integration Tests**: Full workflow execution
3. **Voice Tests**: WebSocket + workflow integration
4. **Performance Tests**: Load testing with multiple concurrent workflows

#### 4.2 Monitoring & Observability
- **Vercel Analytics**: Built-in workflow monitoring
- **Custom Metrics**: Business metrics (conversion rates, lead scores)
- **Error Tracking**: Workflow step failures and retries
- **Performance**: Step execution times and bottlenecks

### Phase 5: Deployment & Rollout (Week 11-12)

#### 5.1 Gradual Migration
1. **Feature Flag**: Toggle between old and new systems
2. **A/B Testing**: Compare performance metrics
3. **Gradual Rollout**: 10% → 50% → 100% traffic
4. **Rollback Plan**: Quick revert to old system if needed

#### 5.2 Performance Optimization
1. **Caching**: Cache frequently accessed context data
2. **Parallel Execution**: Run independent steps in parallel
3. **Resource Optimization**: Right-size function memory/CPU
4. **Database Optimization**: Optimize Supabase queries

## Implementation Details

### 1. Workflow Configuration

```yaml
# vercel.json (updated)
{
  "version": 2,
  "workflows": {
    "fbc-sales-funnel": {
      "file": "workflows/fbc-sales-funnel.yaml",
      "timeout": 300,
      "memory": 1024
    }
  },
  "functions": {
    "app/api/workflow/**/*.ts": {
      "maxDuration": 60
    }
  }
}
```

### 2. Environment Variables

```bash
# .env.local (additional)
VERCEL_WORKFLOW_API_KEY=your_workflow_api_key
VERCEL_WORKFLOW_PROJECT_ID=your_project_id
WORKFLOW_ENABLED=true
```

### 3. Database Schema Updates

```sql
-- Add workflow tracking to existing tables
ALTER TABLE conversations ADD COLUMN workflow_id VARCHAR(255);
ALTER TABLE conversations ADD COLUMN workflow_status VARCHAR(50);
ALTER TABLE conversations ADD COLUMN workflow_metadata JSONB;

-- Create workflow execution log
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id VARCHAR(255) NOT NULL,
  session_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB
);
```

## Benefits of Migration

### 1. Simplified Architecture
- **Reduced Complexity**: Single workflow definition vs complex orchestrator
- **Better Maintainability**: Declarative configuration vs imperative code
- **Easier Testing**: Individual step testing vs full system integration

### 2. Improved Reliability
- **Built-in Retries**: Automatic retry logic for failed steps
- **Error Handling**: Centralized error handling and recovery
- **State Management**: Automatic state persistence and recovery

### 3. Better Observability
- **Workflow Visualization**: Visual representation of execution flow
- **Step-level Metrics**: Granular performance and error tracking
- **Debugging**: Easy step-by-step debugging and replay

### 4. Scalability
- **Automatic Scaling**: Vercel handles scaling based on demand
- **Resource Optimization**: Right-sized functions for each step
- **Cost Efficiency**: Pay only for actual execution time

## Risks and Mitigation

### 1. Real-time Requirements
- **Risk**: Vercel Workflow not designed for real-time voice
- **Mitigation**: Keep WebSocket server for voice, use workflow for orchestration

### 2. State Complexity
- **Risk**: Complex conversation state may not fit workflow state model
- **Mitigation**: Use external state storage (Supabase) for complex state

### 3. Performance
- **Risk**: Workflow overhead may impact response times
- **Mitigation**: Optimize workflow steps, use caching, parallel execution

### 4. Vendor Lock-in
- **Risk**: Tight coupling to Vercel platform
- **Mitigation**: Abstract workflow logic, maintain fallback to current system

## Success Metrics

### 1. Technical Metrics
- **Response Time**: < 2s average workflow execution time
- **Error Rate**: < 1% workflow step failure rate
- **Availability**: 99.9% uptime for workflow execution
- **Scalability**: Handle 100+ concurrent workflows

### 2. Business Metrics
- **Conversion Rate**: Maintain or improve current conversion rates
- **Lead Quality**: Maintain lead scoring accuracy
- **User Experience**: No degradation in chat experience
- **Cost**: Reduce infrastructure costs by 20%

## Timeline

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| 1 | 2 weeks | Feasibility analysis, architecture design |
| 2 | 4 weeks | Core workflow migration, agent conversion |
| 3 | 2 weeks | Voice integration, WebSocket adaptation |
| 4 | 2 weeks | Testing, optimization, monitoring |
| 5 | 2 weeks | Deployment, rollout, performance tuning |
| **Total** | **12 weeks** | **Complete migration to Vercel Workflow** |

## Conclusion

The migration to Vercel Workflow offers significant benefits in terms of simplified architecture, improved reliability, and better observability. However, it requires careful planning to handle the real-time voice requirements and complex multimodal context management.

The proposed phased approach allows for gradual migration with minimal risk, while maintaining the sophisticated sales funnel logic that makes the F.B/c system effective. The key is to keep the WebSocket server for real-time voice while using Vercel Workflow for the orchestration and state management.

This migration will position the F.B/c system for better scalability, maintainability, and future enhancements while preserving its core multimodal sales funnel capabilities.