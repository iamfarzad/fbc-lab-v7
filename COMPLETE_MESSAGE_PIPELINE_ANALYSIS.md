# Complete Message Pipeline Analysis
**Date:** October 20, 2025  
**Purpose:** Full understanding of all message sources and flows before AI SDK migration

---

## Executive Summary

**Critical Discovery**: ALL messages from different sources (HTTP chat, voice, screen/webcam analysis) converge into a **SINGLE message array** managed by `useUnifiedChat`. This is the core integration point for AI SDK migration.

---

## Message Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     ChatInterface Component                      │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              useChatMessages (State Manager)                │ │
│  │                                                              │ │
│  │    ┌──────────────────────────────────────────────┐        │ │
│  │    │      useUnifiedChat (Core Message Store)     │        │ │
│  │    │                                               │        │ │
│  │    │  messages: UnifiedMessage[]  ← SINGLE SOURCE │        │ │
│  │    │                                               │        │ │
│  │    └──────────────────────────────────────────────┘        │ │
│  │           ▲           ▲              ▲           ▲          │ │
│  │           │           │              │           │          │ │
│  │           │           │              │           │          │ │
│  │      HTTP Chat   Voice User    Voice AI   Screen/Webcam    │ │
│  │      Messages    Transcript    Response    Analysis        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    ChatMessages (Renderer)                  │ │
│  │                                                              │ │
│  │  Reads messages array → Renders AI Elements components     │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Pipeline #1: HTTP Chat (Typed Text)

### Flow
```
User types → ChatInput → useChatMessages.handleSendMessage()
                            ↓
                   useUnifiedChat.sendMessage()
                            ↓
                   POST /api/chat/unified
                            ↓
                   AI SDK streamText() 
                            ↓
                   SSE stream (custom format)
                            ↓
                   useUnifiedChat parses SSE
                            ↓
                   Messages array updated
                            ↓
                   ChatMessages renders
```

### Key Files
- **Entry**: `src/components/chat/components/ChatInput.tsx`
- **State**: `src/components/chat/hooks/useChatMessages.ts`
- **Transport**: `src/hooks/useUnifiedChat.ts`
- **Backend**: `app/api/chat/unified/route.ts`
- **Render**: `src/components/chat/components/ChatMessages.tsx`

### Message Format (User)
```typescript
{
  id: crypto.randomUUID(),
  role: 'user',
  content: "User's typed message",
  timestamp: new Date(),
  metadata: {
    type: 'text',
    attachments?: [...] // If files uploaded
  }
}
```

### Message Format (Assistant)
```typescript
{
  id: 'msg-123',
  role: 'assistant',
  content: "AI response text",
  timestamp: new Date(),
  metadata: {
    type: 'text',
    isStreaming: true → false,
    isComplete: true,
    reasoning?: "...",           // ❌ Parsed from <reasoning> tags
    chainOfThought?: {...},       // ❌ Parsed from <chain_of_thought> tags
    sources?: [...],              // ❌ Parsed from <sources> tags
    codeBlocks?: [...],           // ❌ Parsed from <code> tags
    ... // 20+ more metadata fields
  }
}
```

---

## Pipeline #2: Voice (User Speech → AI Speech)

### Flow
```
User speaks → AudioRecorder (AudioWorklet)
                 ↓
           PCM audio chunks (base64)
                 ↓
           WebSocket → ws://localhost:3001
                 ↓
           live-server.ts → Gemini Live API
                 ↓
           ┌─────────────────────────────────┐
           │  Server sends multiple events:  │
           │                                  │
           │  • input_transcript (partial)   │ → updatePartialUserTranscript()
           │  • input_transcript (final)     │ → appendVoiceUserMessage()
           │  • model_text / text            │ → appendVoiceAssistantChunk()
           │  • audio (PCM base64)           │ → AudioPlayer
           │  • output_transcript            │ → aiSpeechTranscript (captions)
           │  • turn_complete                │ → finalizeVoiceAssistantMessage()
           └─────────────────────────────────┘
                 ↓
           useRealtimeVoice receives events
                 ↓
           useVoicePipeline handles callbacks
                 ↓
           useChatMessages methods called
                 ↓
           Messages array updated
                 ↓
           ChatMessages renders
```

### Key Files
- **Audio Input**: `src/lib/audio/AudioRecorder.ts` (AudioWorklet)
- **WebSocket**: `src/hooks/useRealtimeVoice.ts`
- **Event Handler**: `src/components/chat/hooks/useVoicePipeline.ts`
- **State Update**: `src/components/chat/hooks/useChatMessages.ts`
- **Backend**: `server/live-server.ts`
- **Audio Output**: `src/lib/audio/AudioPlayer.ts`

### Message Flow in Detail

#### User Transcript (Partial → Final)
```typescript
// PARTIAL (while speaking)
handleVoicePartialTranscript(text) 
  → updatePartialUserTranscript(text)
  → Creates/updates message with isPartial: true

// FINAL (after speech ends)
handleVoiceFinalTranscript(text)
  → appendVoiceUserMessage(text)
  → Clears partial message
  → Adds complete user message:
  {
    role: 'user',
    content: "User's spoken text",
    metadata: {
      type: 'text',
      source: 'voice',
      modality: 'audio',
      isComplete: true
    }
  }
```

#### AI Response (Streaming → Complete)
```typescript
// STREAMING (chunks arriving)
handleVoiceAssistantText(chunk)
  → appendVoiceAssistantChunk(chunk)
  → Creates/updates assistant message:
  {
    role: 'assistant',
    content: "accumulating...",
    metadata: {
      type: 'text',
      source: 'voice',
      modality: 'audio',
      isStreaming: true
    }
  }

// COMPLETE (turn ends)
handleVoiceTurnComplete()
  → finalizeVoiceAssistantMessage()
  → Updates message:
  {
    metadata: {
      ...prev,
      isStreaming: false,
      isComplete: true
    }
  }
```

### Voice Context Storage
**Important**: Voice transcripts are ALSO stored separately in multimodal context:
```typescript
// In handleVoiceFinalTranscript:
multimodalContextManager.addVoiceTranscript(
  sessionId, 
  text, 
  'user', 
  true
)

// In handleVoiceAssistantText:
multimodalContextManager.addVoiceTranscript(
  sessionId, 
  text, 
  'assistant', 
  true
)
```

This context is then injected into HTTP chat requests!

---

## Pipeline #3: Screen Share Analysis

### Dual-Path System

#### Path A: Continuous Streaming (Prototype)
```
Screen share active → MediaStream
                        ↓
                   Canvas capture (2 FPS)
                        ↓
                   JPEG blob → base64
                        ↓
                   sendRealtimeInput([{
                     mimeType: 'image/jpeg',
                     data: base64
                   }])
                        ↓
                   WebSocket → Gemini Live API
                        ↓
                   AI has visual context for voice conversation
```

**No messages created** - just context for voice AI.

#### Path B: HTTP Analysis (Legacy)
```
Screen share active → MediaStream
                        ↓
                   Canvas capture (every 4s)
                        ↓
                   JPEG blob → base64
                        ↓
                   POST /api/tools/screen
                        ↓
                   {
                     image: base64,
                     type: 'screen',
                     context: {
                       prompt: "Analyze...",
                       trigger: 'voice' | 'manual'
                     }
                   }
                        ↓
                   Gemini Vision API analysis
                        ↓
                   { analysis: "..." }
                        ↓
                   setLastScreenSnapshot({ 
                     analysis, 
                     imageData, 
                     capturedAt 
                   })
                        ↓
                   sendContextUpdate() → WebSocket context
```

**Messages created** when explicitly requested:
```typescript
// In handleAnalyzeScreen (explicit user request):
messagesHook.appendAssistantMessage(analysis, { 
  source: 'screen', 
  modality: 'image', 
  tool: 'screen_analyze' 
})
```

### Key Files
- **Capture Logic**: `src/components/chat/hooks/useScreenShareSnapshots.ts`
- **HTTP API**: `app/api/tools/screen/route.ts`
- **Explicit Analysis**: `ChatInterface.tsx` (handleAnalyzeScreen)

---

## Pipeline #4: Webcam Analysis

### Very Similar to Screen Share

#### Path A: Continuous Streaming (Prototype)
```
Camera active → MediaStream
                  ↓
              Canvas capture (2 FPS)
                  ↓
              JPEG blob → base64
                  ↓
              sendRealtimeInput([{
                mimeType: 'image/jpeg',
                data: base64
              }])
                  ↓
              WebSocket → Gemini Live API
```

#### Path B: HTTP Analysis (Every 4s)
```
Camera active → MediaStream
                  ↓
              Canvas capture (every 4s)
                  ↓
              FormData with blob
                  ↓
              POST /api/tools/webcam
                  ↓
              Gemini Vision API analysis
                  ↓
              { analysis: "..." }
                  ↓
              setLastWebcamSnapshot({ 
                analysis, 
                capturedAt 
              })
                  ↓
              sendContextUpdate() → WebSocket context
```

**Messages**: Analysis stored in snapshot, used by voice tool calls. Not directly added to chat.

### Key Files
- **Capture Logic**: `src/hooks/useCamera.ts`
- **HTTP API**: `app/api/tools/webcam/route.ts`

---

## Pipeline #5: Tool Calls

### Two Types of Tool Systems

#### Type A: HTTP Tools (Chat Route)
```
AI response includes tool call
                  ↓
          SSE event: type='tool_call'
                  ↓
          {
            type: 'tool_call',
            id: '...',
            tool: 'enable_voice',
            arguments: {...},
            requiresApproval: true
          }
                  ↓
          useUnifiedChat receives
                  ↓
          Creates message with type='tool'
                  ↓
          {
            role: 'assistant',
            content: '',
            metadata: {
              type: 'tool',
              toolCall: {
                tool: 'enable_voice',
                requiresApproval: true,
                ...
              }
            }
          }
                  ↓
          ChatMessages renders ToolApprovalPrompt
                  ↓
          User approves → onApproveTool()
                  ↓
          Actually executes (toggleVoiceSession, etc.)
```

**Available HTTP Tools:**
- `enable_voice`
- `enable_screen_share`
- `enable_webcam`
- `create_calendar_widget`
- `create_chart`

#### Type B: Voice Tools (WebSocket)
```
AI in voice session calls tool
                  ↓
          WebSocket event: type='tool_call'
                  ↓
          {
            type: 'tool_call',
            payload: {
              functionCalls: [{
                name: 'capture_screen_snapshot',
                args: {...}
              }]
            }
          }
                  ↓
          useVoicePipeline.handleVoiceToolCall()
                  ↓
          Execute tool locally (read lastScreenSnapshot)
                  ↓
          Send result back via WebSocket
                  ↓
          sendToolResult([{
            id,
            name,
            response: { json: { success: true, result: {...} }}
          }])
                  ↓
          AI continues with result
```

**Available Voice Tools:**
- `search_web`
- `capture_screen_snapshot`
- `capture_webcam_snapshot`

**No messages created** - tools execute silently, AI uses results in voice response.

---

## Context Injection System

### Multimodal Context Manager
**Location**: `src/core/context/multimodal-context.ts`

**Stores**:
- Voice transcripts (user + assistant)
- Screen share analysis
- Webcam analysis

**Injected into**:
- HTTP chat requests (via system prompt)
- Voice tool calls (via snapshots)

### Flow
```
Voice transcript captured
        ↓
multimodalContextManager.addVoiceTranscript()
        ↓
Stored in context storage
        ↓
Next HTTP chat request
        ↓
prepareChatContext() called
        ↓
Recent transcripts added to system prompt:
"RECENT VOICE CONTEXT:
1. 'User said...'
2. 'AI responded...'"
        ↓
AI has full context of voice conversation in HTTP chat
```

---

## State Management Integration

### The Single Source of Truth

```typescript
// In useChatMessages.ts
const unifiedChat = useUnifiedChat({
  sessionId,
  context: { sessionId, enhancedResearch: false }
})

// This is the SINGLE message array for everything:
const messages = unifiedChat.messages

// All message sources update this array:
1. HTTP chat → runStream() → SSE parsing → commitMessages()
2. Voice user → appendVoiceUserMessage() → unifiedChat.addMessage()
3. Voice AI → appendVoiceAssistantChunk() → unifiedChat.setMessages()
4. Screen analysis → appendAssistantMessage() → unifiedChat.addMessage()
```

### Message Lifecycle

```
Message Created → Added to array → Rendered in UI
                      ↓
                  isStreaming=true (if applicable)
                      ↓
                  Content accumulates
                      ↓
                  isStreaming=false, isComplete=true
                      ↓
                  Final render with all metadata
```

---

## Rendering System

### ChatMessages Component

**Input**: `messages: ChatMessage[]` (from useChatMessages)

**Rendering Logic**:
```typescript
// For each message:
<Message>
  <MessageAvatar>{role}</MessageAvatar>
  <MessageContent>
    {/* Main text */}
    <Response>{sanitizeAIContent(content)}</Response>
    
    {/* AI Elements based on metadata */}
    {metadata?.reasoning && (
      <Reasoning>
        <ReasoningTrigger>Reasoning</ReasoningTrigger>
        <ReasoningContent>{metadata.reasoning}</ReasoningContent>
      </Reasoning>
    )}
    
    {metadata?.chainOfThought && (
      <ChainOfThought>
        {metadata.chainOfThought.steps.map(step => (
          <ChainOfThoughtStep {...step} />
        ))}
      </ChainOfThought>
    )}
    
    {metadata?.sources && (
      <Sources>
        {metadata.sources.map(source => (
          <Source {...source} />
        ))}
      </Sources>
    )}
    
    {/* Tool calls */}
    {metadata?.type === 'tool' && metadata.toolCall && (
      <ToolApprovalPrompt
        tool={metadata.toolCall.tool}
        arguments={metadata.toolCall.arguments}
        onApprove={onApproveTool}
        onDecline={onDeclineTool}
      />
    )}
  </MessageContent>
</Message>
```

**Key Point**: All AI Elements read from `message.metadata`, which is populated by:
- HTTP: `parseStructuredResponse()` extracts from `<tags>`
- Voice: Manually set in `appendVoiceUserMessage()`

---

## Critical Integration Points for AI SDK Migration

### 1. **useUnifiedChat → useChat()**
**Current**: Custom SSE parsing, manual message management  
**Target**: AI SDK's `useChat()` hook with native parts system

**Challenge**: Voice messages added manually need to work with AI SDK state

### 2. **Message Metadata → Message Parts**
**Current**: 
```typescript
message.metadata.reasoning = "..."
message.metadata.chainOfThought = {...}
```

**Target**:
```typescript
message.parts = [
  { type: 'text', text: '...' },
  { type: 'reasoning', text: '...' }
]
```

**Challenge**: Update all rendering logic to read from parts

### 3. **Dual Transport (HTTP + WebSocket)**
**Current**: HTTP chat and voice use same message array  
**Target**: Keep WebSocket separate, sync message format

**Challenge**: Voice messages need to be compatible with AI SDK format

### 4. **Context Injection**
**Current**: Voice transcripts manually injected into system prompt  
**Target**: Maintain this pattern, ensure AI SDK allows custom context

**Challenge**: AI SDK request format must support context injection

---

## Migration Strategy Insights

### What Can Be Migrated Cleanly

✅ **HTTP Chat Route**
- Already using AI SDK's `streamText()`
- Just need to change SSE format to AI SDK native

✅ **Message Rendering**
- Update to read from `message.parts` instead of `message.metadata`
- AI Elements components can stay, just change props

✅ **Tool Calling**
- AI SDK has native tool support
- Just need to adapt approval flow

### What Needs Careful Handling

⚠️ **Voice Message Integration**
- Voice messages added manually via `addMessage()`
- Need to ensure AI SDK's `useChat()` allows external message injection
- Or keep voice messages in separate array and merge for display

⚠️ **Context Injection**
- Current system injects voice/screen/webcam context into prompts
- Need to verify AI SDK allows custom system prompts per request

⚠️ **Streaming Parts**
- Reasoning should stream as separate part
- Need to handle partial parts during streaming (shimmer states)

### What Should Stay Separate

✅ **WebSocket System**
- Voice pipeline stays unchanged
- Just sync message format at integration points

✅ **Media Capture**
- Camera/screen capture logic unchanged
- Just update how analysis results become messages

✅ **Multimodal Context Manager**
- Context storage unchanged
- Just update how it's injected

---

## Next Steps for Migration Planning

1. **Verify AI SDK Capabilities**
   - Can `useChat()` accept externally-added messages?
   - Does it support custom system prompts per request?
   - How does it handle reasoning as parts?

2. **Design Hybrid Approach**
   - HTTP chat uses `useChat()` fully
   - Voice messages sync with AI SDK state
   - Context injection adapts to AI SDK format

3. **Update Message Type**
   - Define new `Message` type with `parts`
   - Create adapter for voice messages
   - Update all rendering to use parts

4. **Phase the Migration**
   - Phase 1: Backend SSE format
   - Phase 2: Frontend `useChat()` hook
   - Phase 3: Voice integration
   - Phase 4: Parts rendering

---

## Key Metrics

- **Total Message Sources**: 5 (HTTP chat, voice user, voice AI, screen, webcam)
- **Message Arrays**: 1 (single unified array)
- **Transport Types**: 2 (HTTP SSE, WebSocket)
- **Tool Systems**: 2 (HTTP approval flow, voice silent execution)
- **Context Systems**: 1 (multimodal context manager)
- **Rendering Paths**: 1 (ChatMessages component)

**Bottom Line**: Everything converges on a single message array. Migrate that core state to AI SDK's `useChat()`, and everything else follows.

