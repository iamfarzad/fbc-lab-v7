# Voice & Transcript Issues Analysis

## Summary of Findings

### From manual_conversation_test.md (Lines 1-237)

**Critical issues documented:**

1. ❌ **Stuck in discovery mode** - Voice responses never transition out of discovery
2. ❌ **No voice audio** - Text-only responses, no audio playback
3. ❌ **No webcam** - Webcam not processed/rendered
4. ❌ **No screenshare** - Screenshare not processed/rendered
5. ❌ **No PDF summary** - Failed to generate summary
6. ❌ **No tool calling** - Tools not invoked
7. ❌ **No AI elements rendering** - Buttons/components not showing
8. ❌ **Message limit at 50** - Should be 200 for longer conversations

### From Transcript Analysis

**Voice transcripts:**
- Total files: 18,523
- Files with transcripts: 102 (0.5%)
- Input transcripts: 2,405 fragments (streaming chunks)
- Output transcripts: 3,462 fragments (streaming chunks)

**Chat outputs:**
- Total AI responses: 196
- Pattern: All follow formulaic discovery questions
- Issue: Only AI responses logged, user inputs missing

**Fragmentation:**
- Voice transcripts are **streaming chunks**, not complete utterances
- This is by design for real-time display
- Problem: No unified conversation view exists

## Root Causes

### 1. Voice Stuck in Discovery Mode

**Location**: `src/core/agents/orchestrator.ts`, `src/core/agents/discovery-agent.ts`

**Issue**: Voice sessions stay in DISCOVERY stage, never advance. The orchestrator syncs voice every 3/8/13 turns but the stage determination (`determineFunnelStage`) always returns DISCOVERY.

**Evidence**:
```typescript
// server/live-server.ts:968-974
if (turnCount === 3 || (turnCount > 3 && (turnCount - 3) % 5 === 0)) {
  syncVoiceToOrchestrator(client.sessionId, connectionId, client)
}
```

**Fix**: Stage determination logic needs to advance based on voice conversation progress, not just chat.

### 2. No Audio Playback

**Location**: `src/hooks/useRealtimeVoice.ts:647-687`

**Issue**: Audio events are received but not logged in JSONL. Client may not be receiving audio events from server.

**Evidence**: `server/live-server.ts:912-919` shows audio is being sent:
```typescript
safeSend(ws, JSON.stringify({ 
  type: MESSAGE_TYPES.AUDIO, 
  payload: { audioData: audioBase64, mimeType: 'audio/pcm;rate=24000' } 
}));
```

But no audio events found in transcripts = either:
- Audio not reaching client
- Audio events not being logged
- Client not processing audio events

**Fix**: Check WebSocket message handling and audio player initialization.

### 3. AI Elements Not Rendering

**Location**: `src/components/agent-ui/app/LiveChatMessages.tsx:50-310`

**Issue**: AI elements (Actions, Sources, Reasoning, etc.) require metadata from agent responses, but metadata is not being set or passed through.

**Evidence**: 
```typescript
// Actions exist at line 294
{Array.isArray(meta.actions) && meta.actions.length>0 && (
  <Actions className="mt-2">
    {meta.actions.map((a:any, idx:number) => (
      <Action key={idx} title={a.tooltip} aria-label={a.label}>
        {a.label}
      </Action>
    ))}
  </Actions>
)}
```

But no actions being rendered = metadata not set.

**Fix**: Agent responses must include `metadata.actions` for rendering.

### 4. Screenshare/Webcam Not Working

**Location**: `src/hooks/useScreenShare.ts`, `src/hooks/useCamera.ts`

**Issue**: From manual test (line 171-192):
- User shares screen → AI says "I see dashboard" (hallucinating)
- User says "that's wrong" → AI admits "cannot load screen share content"
- Webcam activated → AI says "interface does not include webcam analysis"

**Root cause**: Visual context may not be reaching Gemini Live API, or context injection is failing.

**Evidence**: `server/live-server.ts:815-858` has visual trigger injection logic but it's conditional.

**Fix**: Ensure screen/webcam captures are sent to Gemini Live with proper MIME types.

### 5. No Summary Generated

**Location**: `src/core/agents/summary-agent.ts`

**Issue**: "Failed to generate summary" error in manual test.

**Possible causes**:
- Summary agent not being triggered
- Summary agent failing to generate content
- PDF export failing

**Fix**: Check summary agent logic and PDF generation pipeline.

### 6. No Tool Calling

**Location**: `src/core/agents/*-agent.ts`

**Issue**: Agents return text but no tool calls are made.

**Evidence**: No tool invocation logs, no tool results.

**Fix**: Agents need to return `metadata.tools` array for tool invocation.

## Recommended Fixes (Priority Order)

### P0 - Critical (Break voice entirely)

1. **Fix voice audio playback**
   - Check `AudioPlayer` initialization in `useRealtimeVoice.ts`
   - Verify WebSocket audio events are received
   - Add logging for audio event flow

2. **Fix stage transition for voice**
   - Update `determineFunnelStage` to respect voice progress
   - Add voice-specific stage advancement logic

3. **Fix visual context injection**
   - Ensure screen/webcam captures reach Gemini Live API
   - Fix MIME type handling for visual data

### P1 - High (Prevents full experience)

4. **Add AI elements metadata**
   - Update agents to return `metadata.actions`
   - Add `metadata.sources`, `metadata.reasoning` where appropriate
   - Test rendering in `LiveChatMessages.tsx`

5. **Fix summary generation**
   - Debug summary agent failure
   - Fix PDF export pipeline
   - Add error logging

6. **Implement tool calling**
   - Wire up agent tool invocations
   - Add tool result handling
   - Test tool execution

### P2 - Medium (Polish)

7. **Unified transcript view**
   - Create view that combines chat + voice transcripts
   - Filter out partial fragments
   - Show complete conversation turns

8. **Raise message limit to 200**
   - Update usage limits config
   - Test extended conversations

## Next Steps

1. **Debug audio flow** - Add logging from server → WebSocket → client
2. **Test stage transitions** - Verify voice can advance stages
3. **Test visual capture** - Ensure screen/webcam data reaches Gemini
4. **Add metadata** - Make agents return proper metadata for UI
5. **Fix summary** - Debug and fix summary generation
6. **Implement tools** - Wire up agent tool calling

## Test Plan

1. Start voice session → Verify audio received and played
2. Speak multiple turns → Verify stage advances beyond DISCOVERY
3. Share screen → Verify AI sees actual screen content
4. Enable webcam → Verify AI sees webcam feed
5. Request summary → Verify summary generated and downloadable
6. Request tool → Verify tool executes and returns results
7. Check transcript view → Verify unified conversation shown

## References

- `manual_conversation_test.md` - Full test results
- `src/core/agents/orchestrator.ts` - Agent routing
- `src/hooks/useRealtimeVoice.ts` - Voice hook
- `server/live-server.ts` - WebSocket server
- `src/components/agent-ui/app/LiveChatMessages.tsx` - Message rendering
