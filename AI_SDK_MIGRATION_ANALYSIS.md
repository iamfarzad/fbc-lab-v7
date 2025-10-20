# AI SDK Migration Analysis
**Date:** October 20, 2025  
**Analysis Type:** Pre-Migration Assessment

## Executive Summary

Your system is **partially** using AI SDK but **NOT following the AI SDK way**. You have AI SDK's `streamText()` and `generateText()` on the backend, but the frontend uses custom message handling instead of AI SDK's `useChat()` hook and parts system.

**Key Finding:** This is your **first actual attempt** at migrating to the AI SDK way. Previous commits only added AI SDK devtools and fixed API keys.

---

## Current Architecture Analysis

### 1. **Chat System (HTTP)**

#### Frontend (`src/components/chat/`)
- **Custom message handling**: Uses `useUnifiedChat` hook (custom implementation)
- **Custom message type**: `UnifiedMessage` with custom `metadata` field
- **Custom SSE streaming**: Manual SSE parsing in `useUnifiedChat.ts`
- **Reasoning parsing**: Extracts `<reasoning>` tags from text via `parseStructuredResponse()`
- **Message flow**: `useChatMessages` → `useUnifiedChat` → `/api/chat/unified`

**Key Files:**
```
src/components/chat/hooks/useChatMessages.ts      - Message state management
src/hooks/useUnifiedChat.ts                        - SSE streaming logic
app/api/chat/unified/route.ts                      - Backend AI SDK streaming
```

#### Backend (`app/api/chat/unified/route.ts`)
- **Using AI SDK**: `streamText()` from `ai` package ✅
- **Gemini model**: `google(GEMINI_MODELS.FLASH_LITE_LATEST)`
- **Custom SSE format**: Converts AI SDK stream to custom format
- **Structured response parsing**: Extracts `<reasoning>`, `<chain_of_thought>`, `<sources>` from text
- **Tool support**: Has tools defined (`enable_voice`, `create_calendar_widget`, etc.)

**Issues:**
- ❌ Not using AI SDK's message parts system
- ❌ Still parsing reasoning from `<tags>` instead of using parts
- ❌ Converting AI SDK stream to custom SSE format
- ❌ Reasoning should be a separate part, not embedded in text

---

### 2. **Voice System (WebSocket)**

#### Frontend
- **Voice pipeline**: `useVoicePipeline` → `useLiveApi` → `useRealtimeVoice`
- **WebSocket connection**: Direct WebSocket to `ws://localhost:3001`
- **Audio handling**: Custom AudioRecorder/AudioPlayer classes
- **Transcript handling**: Real-time transcript updates via WebSocket events

**Key Files:**
```
src/components/chat/hooks/useVoicePipeline.ts     - Voice event handling
src/hooks/useLiveApi.ts                            - Public API for voice + HTTP tools
src/hooks/useRealtimeVoice.ts                      - WebSocket implementation
```

#### Backend
- **WebSocket server**: `server/live-server.ts` (port 3001)
- **Gemini Live API**: Direct connection to Google's Live API
- **Tool calling**: Handled server-side, results sent to client
- **Context injection**: Screen/webcam context automatically injected

**Voice Flow:**
```
User speaks → AudioRecorder → WebSocket → live-server.ts → Gemini Live API
                ↓                                              ↓
              micStream                                  AI audio response
                                                              ↓
                ←                WebSocket                ←
                                                              ↓
                                                        AudioPlayer
```

---

### 3. **Webcam System**

#### Implementation
- **Hook**: `useCamera` in `src/hooks/useCamera.ts`
- **Capture mode**: Continuous streaming at 2 FPS when voice active
- **Two paths**:
  1. **Prototype pattern**: Stream frames via `sendRealtimeInput()` to Gemini Live API
  2. **Legacy mode**: Upload to `/api/tools/webcam` for analysis every 4 seconds

**Integration:**
```typescript
// In ChatInterface.tsx
const camera = useCamera({
  sendRealtimeInput: audioHook.sendRealtimeInput,  // For continuous streaming
  sendContextUpdate: audioHook.sendContextUpdate,  // For context updates
  onAnalysis: (analysis) => { ... }                // For legacy HTTP analysis
})
```

---

### 4. **Screen Share System**

#### Implementation
- **Hook**: `useScreenShareSnapshots` in `src/components/chat/hooks/useScreenShareSnapshots.ts`
- **Capture**: 2 FPS continuous streaming when active
- **Two paths**:
  1. **Stream mode**: Frames sent via `sendRealtimeInput()` 
  2. **Analysis mode**: HTTP POST to `/api/tools/screen` every 4 seconds

**Screen Share Flow:**
```
Screen → MediaStream → Canvas (1280x720) → JPEG blob
                                              ↓
                          ┌─────────────────┴──────────────────┐
                          ↓                                    ↓
                   sendRealtimeInput()                  HTTP Analysis
                (Continuous 2 FPS)                      (Every 4s)
                          ↓                                    ↓
                   Gemini Live API                    /api/tools/screen
```

---

## AI Elements Integration

### Current Implementation

**AI Elements are being used** but in a **custom way**:

#### Rendering (in `src/components/chat/components/ChatMessages.tsx`)
```typescript
{message.metadata?.reasoning && (
  <Reasoning defaultOpen={true}>
    <ReasoningTrigger>
      <Sparkles className="size-3" />
      <span>Reasoning</span>
    </ReasoningTrigger>
    <ReasoningContent>
      {message.metadata.reasoning}
    </ReasoningContent>
  </Reasoning>
)}

{message.metadata?.chainOfThought?.steps && (
  <ChainOfThought defaultOpen={false}>
    <ChainOfThoughtHeader>Chain of Thought</ChainOfThoughtHeader>
    <ChainOfThoughtContent>
      {message.metadata.chainOfThought.steps.map((step, idx) => (
        <ChainOfThoughtStep
          key={idx}
          label={step.label}
          description={step.description}
          status={step.status}
        />
      ))}
    </ChainOfThoughtContent>
  </ChainOfThought>
)}
```

#### Data Source
- **Parsing**: Backend extracts from `<reasoning>` and `<chain_of_thought>` tags
- **Storage**: Stored in `message.metadata` object
- **Problem**: AI SDK should handle this via parts, not text parsing

---

## Message Structure Comparison

### Current (Custom)
```typescript
interface UnifiedMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string  // ❌ Contains reasoning mixed in
  timestamp: Date
  metadata?: {
    type: 'text' | 'tool' | 'multimodal'
    reasoning?: string              // ❌ Parsed from text
    chainOfThought?: {              // ❌ Parsed from text
      steps: Array<{ ... }>
    }
    sources?: Array<{ ... }>        // ❌ Parsed from text
    codeBlocks?: Array<{ ... }>     // ❌ Parsed from text
    ... // 20+ more fields
  }
}
```

### AI SDK Way (Target)
```typescript
// Using ai/react's useChat
const { messages } = useChat()

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  parts?: MessagePart[]  // ✅ Structured parts
}

type MessagePart = 
  | { type: 'text'; text: string }
  | { type: 'reasoning'; text: string; thinking?: string }
  | { type: 'image'; image: string }
  | { type: 'tool-call'; toolCallId: string; toolName: string; args: any }
  | { type: 'tool-result'; toolCallId: string; result: any }
```

---

## Migration Scope

### What Needs to Change

#### 1. **Frontend Chat Hook**
- **Replace** `useUnifiedChat` → `useChat` from `ai/react`
- **Update** `useChatMessages` to work with AI SDK messages
- **Remove** custom SSE parsing logic
- **Update** message type usage throughout components

#### 2. **Backend API Route**
- **Change** SSE format to match AI SDK expectations
- **Remove** `parseStructuredResponse()` and tag extraction
- **Use** AI SDK's native parts system for reasoning
- **Update** tool calling to use AI SDK patterns

#### 3. **AI Elements Rendering**
- **Update** components to read from `message.parts` instead of `message.metadata`
- **Map** part types to appropriate UI components
- **Handle** streaming parts (partial rendering)

#### 4. **Voice/Multimodal Integration**
- **Keep** WebSocket system as-is (separate from HTTP chat)
- **Update** voice message appending to use AI SDK format
- **Maintain** context injection mechanisms

### What Can Stay the Same

✅ **Voice system** (WebSocket to Gemini Live API) - separate from HTTP chat  
✅ **Webcam/Screen share** capture logic - just update message format  
✅ **AI Elements components** - update props, keep rendering logic  
✅ **Backend tools** - already using AI SDK tool format  
✅ **Context management** - intelligence gathering, research, etc.  

---

## Key Challenges

### 1. **Reasoning as Parts**
**Problem**: Currently reasoning is extracted from text via regex  
**Solution**: Use AI SDK's experimental `reasoningPart` or custom part types

### 2. **Dual Transport (HTTP + WebSocket)**
**Problem**: HTTP chat uses AI SDK, voice uses WebSocket  
**Solution**: Keep separate for now, unify message format where they intersect

### 3. **Metadata Richness**
**Problem**: Current system has 20+ metadata fields  
**Solution**: Map essential metadata to parts, deprecate parsed tags

### 4. **Streaming Parts**
**Problem**: AI SDK streams parts incrementally  
**Solution**: Update UI to handle partial parts (shimmer states)

---

## Migration Strategy

### Phase 1: Backend First (Low Risk)
1. Update `/api/chat/unified` to use AI SDK's native streaming
2. Keep SSE format compatible temporarily
3. Add reasoning as separate part type
4. Test with existing frontend

### Phase 2: Frontend Hook (Medium Risk)
1. Replace `useUnifiedChat` with AI SDK's `useChat`
2. Create adapter layer for compatibility
3. Update message type throughout codebase
4. Test all chat features

### Phase 3: AI Elements (Low Risk)
1. Update components to read from `message.parts`
2. Add part-type mappers
3. Handle streaming states
4. Remove tag parsing logic

### Phase 4: Cleanup (Low Risk)
1. Remove custom SSE parsing
2. Remove `parseStructuredResponse()`
3. Remove `cleanParsedContent()`
4. Update TypeScript types

---

## Estimated Impact

### Files to Change: ~25-30 files
- `/app/api/chat/unified/route.ts` (backend)
- `/src/hooks/useUnifiedChat.ts` (replace with useChat)
- `/src/components/chat/hooks/useChatMessages.ts` (update)
- `/src/components/chat/components/ChatMessages.tsx` (rendering)
- `/src/components/ai-elements/*` (update props)
- `/src/types/core.ts` (update Message type)
- Various components using chat messages

### Breaking Changes
- ✅ **Message format**: Will break existing saved chat data
- ✅ **API contract**: Backend response format changes
- ⚠️ **Voice integration**: May need message format sync
- ⚠️ **Multimodal context**: Ensure compatibility

### Benefits
- ✅ Native AI SDK streaming (better performance)
- ✅ Reasoning as structured parts (no regex parsing)
- ✅ Better tool call handling
- ✅ Official AI SDK patterns
- ✅ Future-proof for AI SDK updates

---

## Recommendation

**Proceed with migration in phases**, starting with backend to minimize risk. The system is well-structured enough that this migration is feasible without a complete rewrite.

**Key Insight**: Your shimmer issue is likely because reasoning is still being parsed from text instead of being a proper streaming part. The AI SDK way will fix this naturally.

**Timeline Estimate**: 
- Phase 1 (Backend): 4-6 hours
- Phase 2 (Frontend): 6-8 hours  
- Phase 3 (AI Elements): 3-4 hours
- Phase 4 (Cleanup): 2-3 hours
- **Total**: ~15-21 hours of focused work

---

## Next Steps

1. ✅ **Confirm approach** with user (breaking changes acceptable?)
2. ⏳ **Create detailed migration plan** with specific code changes
3. ⏳ **Begin Phase 1** - backend streaming update
4. ⏳ **Test thoroughly** at each phase
5. ⏳ **Update documentation** and types

